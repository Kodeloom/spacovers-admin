/**
 * Tests for OrderItem synchronization isolation fixes
 * Validates that sync operations maintain proper order isolation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { validateOrderItemSync, validateOrderItemIsolation, logOrderItemSyncValidation, fixOrderItemRelationships } from '~/server/utils/orderItemSyncValidation';

describe('OrderItem Sync Isolation Fixes', () => {
    let testCustomer: any;
    let testItem: any;
    let order1: any;
    let order2: any;

    beforeEach(async () => {
        // Clean up any existing test data
        await prisma.orderItem.deleteMany({
            where: {
                OR: [
                    { quickbooksOrderLineId: { startsWith: 'TEST-LINE-' } },
                    { order: { salesOrderNumber: { startsWith: 'TEST-ORDER-' } } }
                ]
            }
        });
        
        await prisma.order.deleteMany({
            where: { salesOrderNumber: { startsWith: 'TEST-ORDER-' } }
        });
        
        await prisma.customer.deleteMany({
            where: { name: { startsWith: 'Test Customer' } }
        });
        
        await prisma.item.deleteMany({
            where: { name: { startsWith: 'Test Item' } }
        });

        // Create test data
        testCustomer = await prisma.customer.create({
            data: {
                name: 'Test Customer Sync',
                email: 'test-sync@example.com',
                quickbooksCustomerId: 'QBO-CUSTOMER-SYNC-123'
            }
        });

        testItem = await prisma.item.create({
            data: {
                name: 'Test Item Sync',
                quickbooksItemId: 'QBO-ITEM-SYNC-123',
                status: 'ACTIVE',
                category: 'Test'
            }
        });

        order1 = await prisma.order.create({
            data: {
                customerId: testCustomer.id,
                salesOrderNumber: 'TEST-ORDER-SYNC-001',
                quickbooksOrderId: 'QBO-ORDER-SYNC-001',
                contactEmail: 'test@example.com',
                orderStatus: 'PENDING'
            }
        });

        order2 = await prisma.order.create({
            data: {
                customerId: testCustomer.id,
                salesOrderNumber: 'TEST-ORDER-SYNC-002',
                quickbooksOrderId: 'QBO-ORDER-SYNC-002',
                contactEmail: 'test@example.com',
                orderStatus: 'PENDING'
            }
        });
    });

    afterEach(async () => {
        // Clean up test data
        await prisma.orderItem.deleteMany({
            where: {
                OR: [
                    { quickbooksOrderLineId: { startsWith: 'TEST-LINE-' } },
                    { order: { salesOrderNumber: { startsWith: 'TEST-ORDER-' } } }
                ]
            }
        });
        
        await prisma.order.deleteMany({
            where: { salesOrderNumber: { startsWith: 'TEST-ORDER-' } }
        });
        
        await prisma.customer.deleteMany({
            where: { name: { startsWith: 'Test Customer' } }
        });
        
        await prisma.item.deleteMany({
            where: { name: { startsWith: 'Test Item' } }
        });
    });

    describe('validateOrderItemSync', () => {
        it('should allow creating OrderItem with unique QuickBooks line ID', async () => {
            const result = await validateOrderItemSync(order1.id, 'TEST-LINE-UNIQUE-001', 'create');
            
            expect(result.isValid).toBe(true);
            expect(result.message).toBeUndefined();
        });

        it('should prevent creating OrderItem with duplicate QuickBooks line ID across orders', async () => {
            // Create an OrderItem in order1
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-DUPLICATE-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // Try to validate creating the same line ID in order2
            const result = await validateOrderItemSync(order2.id, 'TEST-LINE-DUPLICATE-001', 'create');
            
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('already exists in other orders');
            expect(result.message).toContain('TEST-ORDER-SYNC-001');
        });

        it('should allow updating existing OrderItem in same order', async () => {
            // Create an OrderItem in order1
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-UPDATE-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // Validate updating the same line ID in the same order
            const result = await validateOrderItemSync(order1.id, 'TEST-LINE-UPDATE-001', 'update');
            
            expect(result.isValid).toBe(true);
        });
    });

    describe('validateOrderItemIsolation', () => {
        it('should validate properly isolated order items', async () => {
            // Create OrderItems with unique line IDs
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-ISOLATED-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            await prisma.orderItem.create({
                data: {
                    orderId: order2.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-ISOLATED-002',
                    quantity: 2,
                    pricePerItem: 150
                }
            });

            const result1 = await validateOrderItemIsolation(order1.id);
            const result2 = await validateOrderItemIsolation(order2.id);
            
            expect(result1.isValid).toBe(true);
            expect(result1.issues).toHaveLength(0);
            expect(result1.itemCount).toBe(1);
            
            expect(result2.isValid).toBe(true);
            expect(result2.issues).toHaveLength(0);
            expect(result2.itemCount).toBe(1);
        });

        it('should detect cross-order contamination', async () => {
            // Create OrderItems with the same line ID (simulating the bug)
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-CONTAMINATED-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // This should not be possible with proper constraints, but let's test detection
            // We'll create this manually to simulate the bug condition
            await prisma.$executeRaw`
                INSERT INTO "OrderItem" (id, "orderId", "itemId", "quickbooksOrderLineId", quantity, "pricePerItem", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${order2.id}, ${testItem.id}, 'TEST-LINE-CONTAMINATED-001', 2, 150, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `;

            const result1 = await validateOrderItemIsolation(order1.id);
            const result2 = await validateOrderItemIsolation(order2.id);
            
            // Both orders should show contamination issues
            expect(result1.isValid).toBe(false);
            expect(result1.issues.length).toBeGreaterThan(0);
            expect(result1.issues[0]).toContain('shares QuickBooks line ID');
            
            expect(result2.isValid).toBe(false);
            expect(result2.issues.length).toBeGreaterThan(0);
            expect(result2.issues[0]).toContain('shares QuickBooks line ID');
        });

        it('should detect duplicate line IDs within same order', async () => {
            // Create two OrderItems with the same line ID in the same order
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-DUPLICATE-SAME-ORDER',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // This should be prevented by unique constraint, but let's test detection
            await prisma.$executeRaw`
                INSERT INTO "OrderItem" (id, "orderId", "itemId", "quickbooksOrderLineId", quantity, "pricePerItem", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${order1.id}, ${testItem.id}, 'TEST-LINE-DUPLICATE-SAME-ORDER', 2, 150, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `;

            const result = await validateOrderItemIsolation(order1.id);
            
            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
            expect(result.issues[0]).toContain('Duplicate QuickBooks line IDs within order');
        });
    });

    describe('logOrderItemSyncValidation', () => {
        it('should log sync operations without throwing errors', async () => {
            // This should not throw
            await expect(logOrderItemSyncValidation({
                orderId: order1.id,
                quickbooksOrderLineId: 'TEST-LINE-LOG-001',
                itemId: testItem.id,
                operation: 'create',
                source: 'webhook',
                success: true
            })).resolves.toBeUndefined();

            await expect(logOrderItemSyncValidation({
                orderId: order1.id,
                quickbooksOrderLineId: 'TEST-LINE-LOG-002',
                itemId: testItem.id,
                operation: 'update',
                source: 'manual_sync',
                success: false,
                error: 'Test error message'
            })).resolves.toBeUndefined();
        });
    });

    describe('fixOrderItemRelationships', () => {
        it('should report success for orders with proper relationships', async () => {
            // Create a properly isolated OrderItem
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-FIX-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            const result = await fixOrderItemRelationships(order1.id);
            
            expect(result.success).toBe(true);
            expect(result.message).toContain('relationships are already correct');
            expect(result.itemsProcessed).toBe(1);
        });

        it('should detect orders with no items', async () => {
            const result = await fixOrderItemRelationships(order1.id);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('has no items');
            expect(result.itemsProcessed).toBe(0);
        });

        it('should detect relationship issues', async () => {
            // Create contaminated OrderItems (same line ID across orders)
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-CONTAMINATED-FIX',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // Manually create contamination
            await prisma.$executeRaw`
                INSERT INTO "OrderItem" (id, "orderId", "itemId", "quickbooksOrderLineId", quantity, "pricePerItem", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${order2.id}, ${testItem.id}, 'TEST-LINE-CONTAMINATED-FIX', 2, 150, NOW(), NOW())
                ON CONFLICT DO NOTHING
            `;

            const result = await fixOrderItemRelationships(order1.id);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('relationship issues');
            expect(result.itemsProcessed).toBeGreaterThan(0);
        });

        it('should handle non-existent orders', async () => {
            const result = await fixOrderItemRelationships('non-existent-order-id');
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
            expect(result.itemsProcessed).toBe(0);
        });
    });

    describe('Compound Unique Constraint Validation', () => {
        it('should allow same QuickBooks line ID across different orders', async () => {
            // This should work with proper compound constraint
            const orderItem1 = await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-COMPOUND-001',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            const orderItem2 = await prisma.orderItem.create({
                data: {
                    orderId: order2.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-COMPOUND-001',
                    quantity: 2,
                    pricePerItem: 150
                }
            });

            expect(orderItem1.id).toBeDefined();
            expect(orderItem2.id).toBeDefined();
            expect(orderItem1.orderId).toBe(order1.id);
            expect(orderItem2.orderId).toBe(order2.id);
            expect(orderItem1.quickbooksOrderLineId).toBe(orderItem2.quickbooksOrderLineId);
        });

        it('should prevent duplicate QuickBooks line ID within same order', async () => {
            // Create first OrderItem
            await prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-DUPLICATE-SAME',
                    quantity: 1,
                    pricePerItem: 100
                }
            });

            // Try to create duplicate in same order - should fail
            await expect(prisma.orderItem.create({
                data: {
                    orderId: order1.id,
                    itemId: testItem.id,
                    quickbooksOrderLineId: 'TEST-LINE-DUPLICATE-SAME',
                    quantity: 2,
                    pricePerItem: 150
                }
            })).rejects.toThrow();
        });
    });
});