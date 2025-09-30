/**
 * Enhanced audit logging for OrderItem operations
 * Provides comprehensive logging for debugging relationship issues between orders and items
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import type { OrderItemProcessingStatus } from '@prisma-app/client';

export interface OrderItemAuditContext {
  orderId: string;
  orderNumber?: string;
  itemId: string;
  itemName?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  operation: 'status_change' | 'sync' | 'create' | 'update' | 'delete';
  source: 'warehouse_scan' | 'admin_panel' | 'api' | 'system' | 'webhook';
}

export interface OrderItemStatusChangeDetails {
  orderItemId: string;
  fromStatus: OrderItemProcessingStatus | null;
  toStatus: OrderItemProcessingStatus;
  changeReason: string;
  triggeredBy: 'manual' | 'system' | 'automation';
  stationId?: string;
  stationName?: string;
  workStartTime?: Date;
  workEndTime?: Date;
  durationSeconds?: number;
  notes?: string;
}

/**
 * Enhanced logging for OrderItem status changes with comprehensive order context
 */
export async function logOrderItemStatusChangeWithContext(
  details: OrderItemStatusChangeDetails,
  context: OrderItemAuditContext
): Promise<void> {
  try {
    // Fetch comprehensive order item context
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: details.orderItemId },
      include: {
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            customerId: true,
            customer: {
              select: {
                displayName: true,
                email: true
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
    });

    if (!orderItem) {
      console.error(`[OrderItemAudit] OrderItem ${details.orderItemId} not found for status change logging`);
      return;
    }

    // Validate order context matches
    if (orderItem.orderId !== context.orderId) {
      console.error(`[OrderItemAudit] Order context mismatch: OrderItem belongs to ${orderItem.orderId}, context expects ${context.orderId}`);
      // Still log but flag the mismatch
    }

    // Create comprehensive audit log entry
    const auditData = {
      orderItemId: details.orderItemId,
      userId: context.userId || null,
      fromStatus: details.fromStatus,
      toStatus: details.toStatus,
      changeReason: details.changeReason,
      triggeredBy: details.triggeredBy,
      timestamp: new Date(),
      notes: details.notes || null
    };

    // Create ItemStatusLog entry
    await prisma.itemStatusLog.create({
      data: auditData
    });

    // Create detailed console log with full context
    const logMessage = [
      `📝 OrderItem Status Change:`,
      `Item: ${orderItem.item.name} (${orderItem.item.id})`,
      `Order: ${orderItem.order.salesOrderNumber || orderItem.order.id}`,
      `Customer: ${orderItem.order.customer?.displayName || 'Unknown'}`,
      `Status: ${details.fromStatus || 'NEW'} → ${details.toStatus}`,
      `Reason: ${details.changeReason}`,
      `Source: ${context.source}`,
      `User: ${context.userId || 'System'}`,
      details.stationName ? `Station: ${details.stationName}` : null,
      details.durationSeconds ? `Duration: ${details.durationSeconds}s` : null
    ].filter(Boolean).join(' | ');

    console.log(`[OrderItemAudit] ${logMessage}`);

    // Log relationship validation
    await logOrderItemRelationshipValidation(details.orderItemId, context);

  } catch (error) {
    console.error('[OrderItemAudit] Error logging OrderItem status change:', error);
    
    // Fallback to basic logging
    try {
      console.log(`[OrderItemAudit] FALLBACK: OrderItem ${details.orderItemId} status changed from ${details.fromStatus} to ${details.toStatus} by ${context.userId || 'System'}`);
    } catch (fallbackError) {
      console.error('[OrderItemAudit] Even fallback logging failed:', fallbackError);
    }
  }
}

/**
 * Validates and logs OrderItem relationship integrity
 */
export async function logOrderItemRelationshipValidation(
  orderItemId: string,
  context: OrderItemAuditContext
): Promise<void> {
  try {
    // Check for potential cross-order contamination
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        item: true
      }
    });

    if (!orderItem) {
      console.warn(`[OrderItemRelationship] OrderItem ${orderItemId} not found during validation`);
      return;
    }

    // Check if there are other OrderItems with the same itemId in different orders
    const relatedOrderItems = await prisma.orderItem.findMany({
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

    if (relatedOrderItems.length > 0) {
      const relatedOrders = relatedOrderItems.map(oi => 
        oi.order.salesOrderNumber || oi.order.id
      ).join(', ');

      console.log(`[OrderItemRelationship] Item ${orderItem.item.name} exists in multiple orders: Current=${orderItem.order.salesOrderNumber || orderItem.order.id}, Others=[${relatedOrders}]`);
    }

    // Log the validation result
    console.log(`[OrderItemRelationship] Validation complete for OrderItem ${orderItemId}: Order=${orderItem.orderId}, Item=${orderItem.itemId}, Status=${orderItem.itemStatus}`);

  } catch (error) {
    console.error('[OrderItemRelationship] Error during relationship validation:', error);
  }
}

/**
 * Logs OrderItem sync operations with detailed context
 */
export async function logOrderItemSyncOperation(
  orderId: string,
  operation: 'sync_started' | 'sync_completed' | 'sync_failed',
  details: {
    itemsProcessed?: number;
    itemsCreated?: number;
    itemsUpdated?: number;
    itemsSkipped?: number;
    duration?: number;
    error?: any;
    source?: string;
  },
  context: Partial<OrderItemAuditContext>
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        salesOrderNumber: true,
        customerId: true,
        customer: {
          select: {
            displayName: true
          }
        },
        _count: {
          select: {
            orderItems: true
          }
        }
      }
    });

    if (!order) {
      console.error(`[OrderItemSync] Order ${orderId} not found for sync logging`);
      return;
    }

    const logMessage = [
      `🔄 OrderItem Sync ${operation.replace('_', ' ').toUpperCase()}:`,
      `Order: ${order.salesOrderNumber || order.id}`,
      `Customer: ${order.customer?.displayName || 'Unknown'}`,
      details.itemsProcessed ? `Processed: ${details.itemsProcessed}` : null,
      details.itemsCreated ? `Created: ${details.itemsCreated}` : null,
      details.itemsUpdated ? `Updated: ${details.itemsUpdated}` : null,
      details.itemsSkipped ? `Skipped: ${details.itemsSkipped}` : null,
      details.duration ? `Duration: ${details.duration}ms` : null,
      `Total Items: ${order._count.orderItems}`,
      `Source: ${details.source || context.source || 'Unknown'}`
    ].filter(Boolean).join(' | ');

    if (operation === 'sync_failed') {
      console.error(`[OrderItemSync] ${logMessage}`, details.error);
    } else {
      console.log(`[OrderItemSync] ${logMessage}`);
    }

    // Log potential isolation issues after sync
    if (operation === 'sync_completed') {
      await validateOrderItemIsolationAfterSync(orderId);
    }

  } catch (error) {
    console.error('[OrderItemSync] Error logging sync operation:', error);
  }
}

/**
 * Validates OrderItem isolation after sync operations
 */
async function validateOrderItemIsolationAfterSync(orderId: string): Promise<void> {
  try {
    // Get all items in this order
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

    // Check for each item if it exists in other orders
    for (const orderItem of orderItems) {
      const crossOrderItems = await prisma.orderItem.findMany({
        where: {
          itemId: orderItem.itemId,
          orderId: { not: orderId }
        },
        select: {
          id: true,
          orderId: true,
          itemStatus: true,
          order: {
            select: {
              salesOrderNumber: true
            }
          }
        }
      });

      if (crossOrderItems.length > 0) {
        console.log(`[OrderItemIsolation] Item ${orderItem.item.name} appears in ${crossOrderItems.length + 1} orders after sync`);
        
        // Check if statuses are properly isolated
        const statusMap = crossOrderItems.map(coi => ({
          order: coi.order.salesOrderNumber || coi.orderId,
          status: coi.itemStatus
        }));
        
        console.log(`[OrderItemIsolation] Status distribution for ${orderItem.item.name}:`, {
          currentOrder: { order: orderId, status: orderItem.itemStatus },
          otherOrders: statusMap
        });
      }
    }

  } catch (error) {
    console.error('[OrderItemIsolation] Error validating isolation after sync:', error);
  }
}

/**
 * Creates audit trail for debugging relationship issues
 */
export async function createOrderItemDebugAuditTrail(
  orderItemId: string,
  issue: 'cross_order_contamination' | 'missing_relationship' | 'duplicate_relationship' | 'status_mismatch',
  details: {
    description: string;
    expectedBehavior: string;
    actualBehavior: string;
    affectedOrders?: string[];
    affectedItems?: string[];
    suggestedFix?: string;
  },
  context: Partial<OrderItemAuditContext>
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    const auditEntry = {
      timestamp,
      orderItemId,
      issue,
      context: context,
      details,
      severity: issue === 'cross_order_contamination' ? 'HIGH' : 'MEDIUM'
    };

    // Log to console with structured format
    console.error(`[OrderItemDebugAudit] ${issue.toUpperCase()} detected:`, auditEntry);

    // In a production system, this could be stored in a dedicated debugging table
    // For now, we'll use the existing AuditLog table
    await prisma.auditLog.create({
      data: {
        action: `ORDERITEM_${issue.toUpperCase()}`,
        entityName: 'OrderItem',
        entityId: orderItemId,
        userId: context.userId || null,
        oldValue: details,
        newValue: null,
        ipAddress: context.ipAddress || null
      }
    });

  } catch (error) {
    console.error('[OrderItemDebugAudit] Error creating debug audit trail:', error);
  }
}