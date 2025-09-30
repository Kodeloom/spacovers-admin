/**
 * Utility functions for OrderItem validation and scoping
 * Ensures OrderItem operations maintain proper isolation between orders
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';

/**
 * Validates that an OrderItem belongs to the expected order
 * Prevents cross-order item status contamination
 */
export async function validateOrderItemBelongsToOrder(
  orderItemId: string, 
  expectedOrderId: string
): Promise<{ isValid: boolean; orderItem?: any; error?: string }> {
  try {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            id: true,
            salesOrderNumber: true
          }
        }
      }
    });

    if (!orderItem) {
      return {
        isValid: false,
        error: `OrderItem ${orderItemId} not found`
      };
    }

    if (orderItem.orderId !== expectedOrderId) {
      return {
        isValid: false,
        error: `OrderItem ${orderItemId} belongs to order ${orderItem.orderId}, not ${expectedOrderId}`
      };
    }

    return {
      isValid: true,
      orderItem
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Ensures OrderItem queries are properly scoped to a specific order
 * Returns a where clause that includes orderId
 */
export function createOrderScopedWhereClause(orderId: string, additionalWhere: any = {}) {
  return {
    orderId,
    ...additionalWhere
  };
}

/**
 * Logs OrderItem status changes with order context for audit trails
 * @deprecated Use logOrderItemStatusChangeWithContext from orderItemAuditLogger instead
 */
export async function logOrderItemStatusChange(
  orderItemId: string,
  fromStatus: string,
  toStatus: string,
  userId: string,
  changeReason: string
) {
  try {
    // Import the enhanced logging function
    const { logOrderItemStatusChangeWithContext } = await import('./orderItemAuditLogger');
    
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

    if (!orderItem) {
      console.error(`OrderItem ${orderItemId} not found for status change logging`);
      return;
    }

    // Use enhanced logging with full context
    await logOrderItemStatusChangeWithContext(
      {
        orderItemId,
        fromStatus: fromStatus as any,
        toStatus: toStatus as any,
        changeReason,
        triggeredBy: 'manual'
      },
      {
        orderId: orderItem.orderId,
        orderNumber: orderItem.order.salesOrderNumber,
        itemId: orderItem.itemId,
        itemName: orderItem.item.name,
        userId,
        operation: 'status_change',
        source: 'api'
      }
    );
    
  } catch (error) {
    console.error('Error logging OrderItem status change:', error);
    
    // Fallback to basic logging
    try {
      const orderItem = await prisma.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          order: { select: { salesOrderNumber: true } },
          item: { select: { name: true } }
        }
      });

      if (orderItem) {
        const orderNumber = orderItem.order.salesOrderNumber || orderItemId;
        console.log(`📝 OrderItem Status Change: ${orderItem.item.name} in order ${orderNumber} changed from ${fromStatus} to ${toStatus} by user ${userId}. Reason: ${changeReason}`);
      }
    } catch (fallbackError) {
      console.error('Even fallback logging failed:', fallbackError);
    }
  }
}

/**
 * Validates that OrderItem updates target the correct record
 * Prevents accidental cross-order updates
 */
export async function validateOrderItemUpdate(
  orderItemId: string,
  updateData: any,
  expectedOrderId?: string
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        orderId: true
      }
    });

    if (!orderItem) {
      return {
        isValid: false,
        error: `OrderItem ${orderItemId} not found`
      };
    }

    if (expectedOrderId && orderItem.orderId !== expectedOrderId) {
      return {
        isValid: false,
        error: `OrderItem ${orderItemId} belongs to order ${orderItem.orderId}, not expected order ${expectedOrderId}`
      };
    }

    // Validate that we're not trying to update orderId (which would break relationships)
    if (updateData.orderId && updateData.orderId !== orderItem.orderId) {
      return {
        isValid: false,
        error: `Cannot change OrderItem orderId from ${orderItem.orderId} to ${updateData.orderId}`
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}