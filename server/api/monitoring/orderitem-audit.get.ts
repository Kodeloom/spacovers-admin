/**
 * API endpoint for OrderItem audit trail monitoring
 * Provides detailed audit information for debugging relationship issues
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const orderId = query.orderId as string;
    const orderItemId = query.orderItemId as string;
    const timeRangeHours = parseInt(query.timeRange as string) || 24;
    const includeRelationships = query.includeRelationships === 'true';

    // Validate parameters
    if (!orderId && !orderItemId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either orderId or orderItemId must be provided'
      });
    }

    if (timeRangeHours < 1 || timeRangeHours > 168) { // Max 7 days
      throw createError({
        statusCode: 400,
        statusMessage: 'Time range must be between 1 and 168 hours'
      });
    }

    const cutoffTime = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000));

    let auditData: any = {
      timestamp: new Date().toISOString(),
      timeRangeHours,
      filters: { orderId, orderItemId }
    };

    // Get ItemStatusLog entries
    const statusLogWhere: any = {
      timestamp: { gte: cutoffTime }
    };

    if (orderItemId) {
      statusLogWhere.orderItemId = orderItemId;
    } else if (orderId) {
      statusLogWhere.orderItem = {
        orderId: orderId
      };
    }

    const statusLogs = await prisma.itemStatusLog.findMany({
      where: statusLogWhere,
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                salesOrderNumber: true,
                customerId: true,
                customer: {
                  select: {
                    name: true
                  }
                }
              }
            },
            item: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    auditData.statusChanges = statusLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      orderItemId: log.orderItemId,
      orderId: log.orderItem.orderId,
      orderNumber: log.orderItem.order.salesOrderNumber,
      customer: log.orderItem.order.customer?.name,
      itemId: log.orderItem.itemId,
      itemName: log.orderItem.item.name,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      changeReason: log.changeReason,
      triggeredBy: log.triggeredBy,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email
      } : null,
      notes: log.notes
    }));

    // Get AuditLog entries related to OrderItems
    const auditLogWhere: any = {
      timestamp: { gte: cutoffTime },
      entityName: 'OrderItem'
    };

    if (orderItemId) {
      auditLogWhere.entityId = orderItemId;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: auditLogWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    auditData.auditTrail = auditLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      entityId: log.entityId,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email
      } : null,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress
    }));

    // Include relationship analysis if requested
    if (includeRelationships) {
      let relationshipAnalysis: any = {};

      if (orderId) {
        // Analyze relationships for all items in the order
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId },
          include: {
            item: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        relationshipAnalysis.orderItems = orderItems.length;
        relationshipAnalysis.itemAnalysis = [];

        for (const orderItem of orderItems) {
          // Find other orders with the same item
          const crossOrderItems = await prisma.orderItem.findMany({
            where: {
              itemId: orderItem.itemId,
              orderId: { not: orderId }
            },
            include: {
              order: {
                select: {
                  id: true,
                  salesOrderNumber: true
                }
              }
            }
          });

          relationshipAnalysis.itemAnalysis.push({
            orderItemId: orderItem.id,
            itemId: orderItem.itemId,
            itemName: orderItem.item.name,
            currentStatus: orderItem.itemStatus,
            crossOrderOccurrences: crossOrderItems.length,
            crossOrderDetails: crossOrderItems.map(coi => ({
              orderId: coi.orderId,
              orderNumber: coi.order.salesOrderNumber,
              status: coi.itemStatus
            }))
          });
        }
      } else if (orderItemId) {
        // Analyze relationships for specific OrderItem
        const orderItem = await prisma.orderItem.findUnique({
          where: { id: orderItemId },
          include: {
            order: {
              select: {
                id: true,
                salesOrderNumber: true
              }
            },
            item: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (orderItem) {
          const crossOrderItems = await prisma.orderItem.findMany({
            where: {
              itemId: orderItem.itemId,
              orderId: { not: orderItem.orderId }
            },
            include: {
              order: {
                select: {
                  id: true,
                  salesOrderNumber: true
                }
              }
            }
          });

          relationshipAnalysis = {
            orderItemId: orderItem.id,
            orderId: orderItem.orderId,
            orderNumber: orderItem.order.salesOrderNumber,
            itemId: orderItem.itemId,
            itemName: orderItem.item.name,
            currentStatus: orderItem.itemStatus,
            crossOrderOccurrences: crossOrderItems.length,
            crossOrderDetails: crossOrderItems.map(coi => ({
              orderItemId: coi.id,
              orderId: coi.orderId,
              orderNumber: coi.order.salesOrderNumber,
              status: coi.itemStatus
            }))
          };
        }
      }

      auditData.relationships = relationshipAnalysis;
    }

    // Add summary statistics
    auditData.summary = {
      totalStatusChanges: auditData.statusChanges.length,
      totalAuditEntries: auditData.auditTrail.length,
      uniqueOrderItems: [...new Set(auditData.statusChanges.map((sc: any) => sc.orderItemId))].length,
      uniqueOrders: [...new Set(auditData.statusChanges.map((sc: any) => sc.orderId))].length,
      statusDistribution: auditData.statusChanges.reduce((acc: any, sc: any) => {
        acc[sc.toStatus] = (acc[sc.toStatus] || 0) + 1;
        return acc;
      }, {}),
      userActivity: auditData.statusChanges.reduce((acc: any, sc: any) => {
        const userId = sc.user?.id || 'System';
        acc[userId] = (acc[userId] || 0) + 1;
        return acc;
      }, {})
    };

    return auditData;

  } catch (error: any) {
    console.error('Error retrieving OrderItem audit data:', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve OrderItem audit data',
      data: { error: error.message }
    });
  }
});