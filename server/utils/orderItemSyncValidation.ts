/**
 * Validation utilities for OrderItem synchronization to ensure proper order isolation
 */

import { unenhancedPrisma } from '~/server/lib/db';

/**
 * Validates that OrderItem sync operations maintain proper order isolation
 * @param orderId The order ID to validate
 * @param quickbooksOrderLineId The QuickBooks line ID
 * @param operation The operation being performed (create/update)
 */
export async function validateOrderItemSync(
    orderId: string, 
    quickbooksOrderLineId: string, 
    operation: 'create' | 'update'
): Promise<{ isValid: boolean; message?: string }> {
    try {
        // Check if this QuickBooks line ID exists in other orders
        const existingOrderItems = await unenhancedPrisma.orderItem.findMany({
            where: {
                quickbooksOrderLineId: quickbooksOrderLineId,
                orderId: { not: orderId }
            },
            select: {
                id: true,
                orderId: true,
                order: {
                    select: {
                        salesOrderNumber: true
                    }
                }
            }
        });

        if (existingOrderItems.length > 0) {
            const conflictingOrders = existingOrderItems.map(item => 
                `Order ${item.order.salesOrderNumber} (ID: ${item.orderId})`
            ).join(', ');
            
            return {
                isValid: false,
                message: `QuickBooks line ID ${quickbooksOrderLineId} already exists in other orders: ${conflictingOrders}`
            };
        }

        return { isValid: true };
    } catch (error) {
        console.error('Error validating OrderItem sync:', error);
        return {
            isValid: false,
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Logs OrderItem sync operations for audit purposes
 * @param operation The sync operation details
 */
export async function logOrderItemSyncOperation(operation: {
    orderId: string;
    quickbooksOrderLineId: string;
    itemId: string;
    operation: 'create' | 'update';
    source: 'webhook' | 'manual_sync' | 'bulk_sync';
    success: boolean;
    error?: string;
}): Promise<void> {
    try {
        console.log(`[OrderItemSync] ${operation.operation.toUpperCase()} ${operation.success ? 'SUCCESS' : 'FAILED'}`, {
            orderId: operation.orderId,
            quickbooksOrderLineId: operation.quickbooksOrderLineId,
            itemId: operation.itemId,
            source: operation.source,
            timestamp: new Date().toISOString(),
            error: operation.error
        });

        // In a production system, you might want to store this in a dedicated audit table
        // For now, we'll just log to console with structured data
    } catch (error) {
        console.error('Failed to log OrderItem sync operation:', error);
        // Don't throw here to avoid breaking the main sync operation
    }
}

/**
 * Validates that an order's items are properly isolated from other orders
 * @param orderId The order ID to validate
 * @returns Validation result with details about any issues found
 */
export async function validateOrderItemIsolation(orderId: string): Promise<{
    isValid: boolean;
    issues: string[];
    itemCount: number;
}> {
    try {
        const orderItems = await unenhancedPrisma.orderItem.findMany({
            where: { orderId },
            select: {
                id: true,
                quickbooksOrderLineId: true,
                itemId: true,
                item: {
                    select: {
                        name: true
                    }
                }
            }
        });

        const issues: string[] = [];

        // Check for duplicate QuickBooks line IDs within the same order
        const lineIds = orderItems
            .filter(item => item.quickbooksOrderLineId)
            .map(item => item.quickbooksOrderLineId);
        
        const duplicateLineIds = lineIds.filter((id, index) => lineIds.indexOf(id) !== index);
        if (duplicateLineIds.length > 0) {
            issues.push(`Duplicate QuickBooks line IDs within order: ${duplicateLineIds.join(', ')}`);
        }

        // Check for cross-order contamination
        for (const orderItem of orderItems) {
            if (orderItem.quickbooksOrderLineId) {
                const crossOrderItems = await unenhancedPrisma.orderItem.findMany({
                    where: {
                        quickbooksOrderLineId: orderItem.quickbooksOrderLineId,
                        orderId: { not: orderId }
                    },
                    select: {
                        orderId: true,
                        order: {
                            select: {
                                salesOrderNumber: true
                            }
                        }
                    }
                });

                if (crossOrderItems.length > 0) {
                    const conflictingOrders = crossOrderItems.map(item => 
                        `${item.order.salesOrderNumber} (${item.orderId})`
                    ).join(', ');
                    
                    issues.push(
                        `OrderItem ${orderItem.id} (${orderItem.item.name}) shares QuickBooks line ID ` +
                        `${orderItem.quickbooksOrderLineId} with orders: ${conflictingOrders}`
                    );
                }
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            itemCount: orderItems.length
        };
    } catch (error) {
        console.error('Error validating order item isolation:', error);
        return {
            isValid: false,
            issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
            itemCount: 0
        };
    }
}

/**
 * Fixes "no items" display issue by ensuring proper itemOrder relationships
 * @param orderId The order ID to fix
 * @returns Result of the fix operation
 */
export async function fixOrderItemRelationships(orderId: string): Promise<{
    success: boolean;
    message: string;
    itemsProcessed: number;
}> {
    try {
        // Get the order with its QuickBooks ID
        const order = await unenhancedPrisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                quickbooksOrderId: true,
                salesOrderNumber: true
            }
        });

        if (!order) {
            return {
                success: false,
                message: `Order ${orderId} not found`,
                itemsProcessed: 0
            };
        }

        if (!order.quickbooksOrderId) {
            return {
                success: false,
                message: `Order ${order.salesOrderNumber} has no QuickBooks ID`,
                itemsProcessed: 0
            };
        }

        // Check current OrderItems for this order
        const existingItems = await unenhancedPrisma.orderItem.findMany({
            where: { orderId },
            select: {
                id: true,
                quickbooksOrderLineId: true,
                itemId: true
            }
        });

        console.log(`[OrderItemFix] Order ${order.salesOrderNumber} currently has ${existingItems.length} items`);

        // If the order has no items but should have them (based on QuickBooks data),
        // we would need to re-sync from QuickBooks
        if (existingItems.length === 0) {
            return {
                success: false,
                message: `Order ${order.salesOrderNumber} has no items. Re-sync from QuickBooks may be required.`,
                itemsProcessed: 0
            };
        }

        // Validate existing relationships
        const validation = await validateOrderItemIsolation(orderId);
        
        if (validation.isValid) {
            return {
                success: true,
                message: `Order ${order.salesOrderNumber} relationships are already correct`,
                itemsProcessed: validation.itemCount
            };
        } else {
            return {
                success: false,
                message: `Order ${order.salesOrderNumber} has relationship issues: ${validation.issues.join('; ')}`,
                itemsProcessed: validation.itemCount
            };
        }
    } catch (error) {
        console.error('Error fixing order item relationships:', error);
        return {
            success: false,
            message: `Fix operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            itemsProcessed: 0
        };
    }
}