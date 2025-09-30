/**
 * Comprehensive integration tests for OrderItem isolation
 * Validates that OrderItem queries, updates, and sync operations maintain proper order isolation
 * Requirements: 2.1, 2.2, 2.3, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import type { OrderItemProcessingStatus } from '@prisma-app/client';

describe('OrderItem Isolation - Comprehensive Integration Tests', () => {
  let testCustomer: any;
  let testItem1: any;
  let testItem2: any;
  let order1: any;
  let order2: any;
  let order3: any;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { customer: { name: 'Test Customer Comprehensive' } } },
          { item: { name: { startsWith: 'Test Item Comprehensive' } } }
        ]
      }
    });
    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Comprehensive' } }
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Comprehensive' }
    });
    await prisma.item.deleteMany({
      where: { name: { startsWith: 'Test Item Comprehensive' } }
    });

    // Create test data
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer Comprehensive',
        email: 'test-comprehensive@example.com',
        customerType: 'RETAILER',
        status: 'ACTIVE'
      }
    });

    testItem1 = await prisma.item.create({
      data: {
        name: 'Test Item Comprehensive 1',
        status: 'ACTIVE',
        category: 'Test'
      }
    });

    testItem2 = await prisma.item.create({
      data: {
        name: 'Test Item Comprehensive 2',
        status: 'ACTIVE',
        category: 'Test'
      }
    });

    // Create three orders for comprehensive testing
    order1 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-COMP-ORDER-1'
      }
    });

    order2 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-COMP-ORDER-2'
      }
    });

    order3 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-COMP-ORDER-3'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { customer: { name: 'Test Customer Comprehensive' } } },
          { item: { name: { startsWith: 'Test Item Comprehensive' } } }
        ]
      }
    });
    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Comprehensive' } }
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Comprehensive' }
    });
    await prisma.item.deleteMany({
      where: { name: { startsWith: 'Test Item Comprehensive' } }
    });
  });

  describe('OrderItem Query Scoping', () => {
    it('should properly scope OrderItem queries by orderId', async () => {
      // Create OrderItems for multiple orders with same item types
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'CUTTING'
        }
      });

      const orderItem3 = await prisma.orderItem.create({
        data: {
          orderId: order3.id,
          itemId: testItem2.id,
          quantity: 3,
          pricePerItem: 200.00,
          itemStatus: 'SEWING'
        }
      });

      // Test query scoping for each order
      const order1Items = await prisma.orderItem.findMany({
        where: { orderId: order1.id },
        include: { item: true, order: true }
      });

      const order2Items = await prisma.orderItem.findMany({
        where: { orderId: order2.id },
        include: { item: true, order: true }
      });

      const order3Items = await prisma.orderItem.findMany({
        where: { orderId: order3.id },
        include: { item: true, order: true }
      });

      // Verify proper scoping
      expect(order1Items).toHaveLength(1);
      expect(order1Items[0].id).toBe(orderItem1.id);
      expect(order1Items[0].orderId).toBe(order1.id);
      expect(order1Items[0].itemStatus).toBe('NOT_STARTED_PRODUCTION');

      expect(order2Items).toHaveLength(1);
      expect(order2Items[0].id).toBe(orderItem2.id);
      expect(order2Items[0].orderId).toBe(order2.id);
      expect(order2Items[0].itemStatus).toBe('CUTTING');

      expect(order3Items).toHaveLength(1);
      expect(order3Items[0].id).toBe(orderItem3.id);
      expect(order3Items[0].orderId).toBe(order3.id);
      expect(order3Items[0].itemStatus).toBe('SEWING');
    });

    it('should return empty results when querying non-existent order', async () => {
      const nonExistentOrderItems = await prisma.orderItem.findMany({
        where: { orderId: 'non-existent-order-id' }
      });

      expect(nonExistentOrderItems).toHaveLength(0);
    });

    it('should properly filter OrderItems by status within specific orders', async () => {
      // Create multiple OrderItems with different statuses in each order
      await prisma.orderItem.createMany({
        data: [
          {
            orderId: order1.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'NOT_STARTED_PRODUCTION'
          },
          {
            orderId: order1.id,
            itemId: testItem2.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'CUTTING'
          },
          {
            orderId: order2.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'CUTTING'
          },
          {
            orderId: order2.id,
            itemId: testItem2.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'SEWING'
          }
        ]
      });

      // Query for CUTTING status items in order1 only
      const order1CuttingItems = await prisma.orderItem.findMany({
        where: {
          orderId: order1.id,
          itemStatus: 'CUTTING'
        }
      });

      // Query for CUTTING status items in order2 only
      const order2CuttingItems = await prisma.orderItem.findMany({
        where: {
          orderId: order2.id,
          itemStatus: 'CUTTING'
        }
      });

      expect(order1CuttingItems).toHaveLength(1);
      expect(order1CuttingItems[0].orderId).toBe(order1.id);

      expect(order2CuttingItems).toHaveLength(1);
      expect(order2CuttingItems[0].orderId).toBe(order2.id);
    });
  });

  describe('OrderItem Status Update Isolation', () => {
    it('should update status only for intended OrderItem records', async () => {
      // Create OrderItems with same item type in different orders
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Update status of OrderItem in order1 only
      await prisma.orderItem.update({
        where: { id: orderItem1.id },
        data: { itemStatus: 'CUTTING' }
      });

      // Verify that only the intended OrderItem was updated
      const updatedOrderItem1 = await prisma.orderItem.findUnique({
        where: { id: orderItem1.id }
      });
      const unchangedOrderItem2 = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id }
      });

      expect(updatedOrderItem1?.itemStatus).toBe('CUTTING');
      expect(unchangedOrderItem2?.itemStatus).toBe('NOT_STARTED_PRODUCTION');
    });

    it('should handle bulk status updates with proper order scoping', async () => {
      // Create multiple OrderItems in different orders
      await prisma.orderItem.createMany({
        data: [
          {
            orderId: order1.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'NOT_STARTED_PRODUCTION'
          },
          {
            orderId: order1.id,
            itemId: testItem2.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'NOT_STARTED_PRODUCTION'
          },
          {
            orderId: order2.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'NOT_STARTED_PRODUCTION'
          },
          {
            orderId: order2.id,
            itemId: testItem2.id,
            quantity: 1,
            pricePerItem: 100.00,
            itemStatus: 'NOT_STARTED_PRODUCTION'
          }
        ]
      });

      // Bulk update all items in order1 to CUTTING status
      const updateResult = await prisma.orderItem.updateMany({
        where: {
          orderId: order1.id,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        },
        data: { itemStatus: 'CUTTING' }
      });

      expect(updateResult.count).toBe(2); // Only order1 items should be updated

      // Verify order1 items were updated
      const order1Items = await prisma.orderItem.findMany({
        where: { orderId: order1.id }
      });
      expect(order1Items.every(item => item.itemStatus === 'CUTTING')).toBe(true);

      // Verify order2 items were not affected
      const order2Items = await prisma.orderItem.findMany({
        where: { orderId: order2.id }
      });
      expect(order2Items.every(item => item.itemStatus === 'NOT_STARTED_PRODUCTION')).toBe(true);
    });

    it('should prevent accidental cross-order updates', async () => {
      // Create OrderItems with same item type
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Attempt to update by itemId (incorrect approach) - should not affect both orders
      const incorrectUpdateResult = await prisma.orderItem.updateMany({
        where: {
          itemId: testItem1.id,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        },
        data: { itemStatus: 'CUTTING' }
      });

      // This would update both items, which demonstrates the problem
      expect(incorrectUpdateResult.count).toBe(2);

      // Verify both were updated (showing the cross-contamination issue)
      const allUpdatedItems = await prisma.orderItem.findMany({
        where: { itemId: testItem1.id }
      });
      expect(allUpdatedItems.every(item => item.itemStatus === 'CUTTING')).toBe(true);

      // Reset for correct approach test
      await prisma.orderItem.updateMany({
        where: { itemId: testItem1.id },
        data: { itemStatus: 'NOT_STARTED_PRODUCTION' }
      });

      // Correct approach: Update by specific OrderItem ID
      await prisma.orderItem.update({
        where: { id: orderItem1.id },
        data: { itemStatus: 'CUTTING' }
      });

      // Verify only the intended item was updated
      const correctlyUpdatedItem1 = await prisma.orderItem.findUnique({
        where: { id: orderItem1.id }
      });
      const unchangedItem2 = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id }
      });

      expect(correctlyUpdatedItem1?.itemStatus).toBe('CUTTING');
      expect(unchangedItem2?.itemStatus).toBe('NOT_STARTED_PRODUCTION');
    });
  });

  describe('Sync Operations and Order-Specific Relationships', () => {
    it('should maintain proper order-specific relationships during sync operations', async () => {
      // Simulate sync operation creating OrderItems with QuickBooks line IDs
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: 'QBO-LINE-001',
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Same QuickBooks line ID can exist in different orders (compound unique constraint)
      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: 'QBO-LINE-001', // Same line ID, different order
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Verify both OrderItems exist with proper relationships
      expect(orderItem1.orderId).toBe(order1.id);
      expect(orderItem2.orderId).toBe(order2.id);
      expect(orderItem1.quickbooksOrderLineId).toBe(orderItem2.quickbooksOrderLineId);

      // Verify they are treated as separate entities
      expect(orderItem1.id).not.toBe(orderItem2.id);
    });

    it('should handle upsert operations with proper order isolation', async () => {
      const qboLineId = 'QBO-LINE-UPSERT-001';

      // First upsert - should create new OrderItem
      const firstUpsert = await prisma.orderItem.upsert({
        where: {
          orderId_quickbooksOrderLineId: {
            orderId: order1.id,
            quickbooksOrderLineId: qboLineId
          }
        },
        update: {
          quantity: 5,
          pricePerItem: 500.00
        },
        create: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: qboLineId,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      expect(firstUpsert.quantity).toBe(1); // Created with initial values

      // Second upsert on same order - should update existing
      const secondUpsert = await prisma.orderItem.upsert({
        where: {
          orderId_quickbooksOrderLineId: {
            orderId: order1.id,
            quickbooksOrderLineId: qboLineId
          }
        },
        update: {
          quantity: 5,
          pricePerItem: 500.00
        },
        create: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: qboLineId,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      expect(secondUpsert.id).toBe(firstUpsert.id); // Same record
      expect(secondUpsert.quantity).toBe(5); // Updated values

      // Third upsert on different order with same line ID - should create new
      const thirdUpsert = await prisma.orderItem.upsert({
        where: {
          orderId_quickbooksOrderLineId: {
            orderId: order2.id,
            quickbooksOrderLineId: qboLineId
          }
        },
        update: {
          quantity: 10,
          pricePerItem: 1000.00
        },
        create: {
          orderId: order2.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: qboLineId,
          quantity: 3,
          pricePerItem: 300.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      expect(thirdUpsert.id).not.toBe(firstUpsert.id); // Different record
      expect(thirdUpsert.orderId).toBe(order2.id);
      expect(thirdUpsert.quantity).toBe(3); // Created with initial values
    });

    it('should prevent duplicate QuickBooks line IDs within same order', async () => {
      const qboLineId = 'QBO-LINE-DUPLICATE-001';

      // Create first OrderItem
      await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: qboLineId,
          quantity: 1,
          pricePerItem: 100.00
        }
      });

      // Attempt to create duplicate in same order - should fail
      await expect(prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem2.id, // Different item
          quickbooksOrderLineId: qboLineId, // Same line ID
          quantity: 2,
          pricePerItem: 200.00
        }
      })).rejects.toThrow();
    });

    it('should handle sync operations that restore missing OrderItem relationships', async () => {
      // Create an order with OrderItems
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: 'QBO-LINE-RESTORE-001',
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'CUTTING'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem2.id,
          quickbooksOrderLineId: 'QBO-LINE-RESTORE-002',
          quantity: 2,
          pricePerItem: 200.00,
          itemStatus: 'SEWING'
        }
      });

      // Verify initial state
      const initialItems = await prisma.orderItem.findMany({
        where: { orderId: order1.id }
      });
      expect(initialItems).toHaveLength(2);

      // Simulate a sync operation that might recreate relationships
      // (e.g., after a "no items" issue was resolved)
      const resyncedItems = await prisma.orderItem.findMany({
        where: { orderId: order1.id },
        include: { item: true, order: true }
      });

      // Verify relationships are maintained
      expect(resyncedItems).toHaveLength(2);
      expect(resyncedItems.every(item => item.orderId === order1.id)).toBe(true);
      expect(resyncedItems.every(item => item.item !== null)).toBe(true);
      expect(resyncedItems.every(item => item.order !== null)).toBe(true);

      // Verify status preservation
      const cuttingItem = resyncedItems.find(item => item.itemStatus === 'CUTTING');
      const sewingItem = resyncedItems.find(item => item.itemStatus === 'SEWING');
      
      expect(cuttingItem).toBeDefined();
      expect(sewingItem).toBeDefined();
      expect(cuttingItem?.quickbooksOrderLineId).toBe('QBO-LINE-RESTORE-001');
      expect(sewingItem?.quickbooksOrderLineId).toBe('QBO-LINE-RESTORE-002');
    });
  });

  describe('Complex Scenarios and Edge Cases', () => {
    it('should handle multiple items with same attributes across different orders', async () => {
      // Create OrderItems with same item type and similar attributes in different orders
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quickbooksOrderLineId: 'QBO-LINE-ATTR-001',
          quantity: 1,
          pricePerItem: 100.00,
          size: 'Large',
          shape: 'Rectangle',
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quickbooksOrderLineId: 'QBO-LINE-ATTR-002',
          quantity: 1,
          pricePerItem: 100.00,
          size: 'Large', // Same attributes
          shape: 'Rectangle',
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Update status of one item
      await prisma.orderItem.update({
        where: { id: orderItem1.id },
        data: { itemStatus: 'CUTTING' }
      });

      // Verify the other item with same attributes is not affected
      const unchangedItem = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id }
      });

      expect(unchangedItem?.itemStatus).toBe('NOT_STARTED_PRODUCTION');
      expect(unchangedItem?.size).toBe('Large');
      expect(unchangedItem?.shape).toBe('Rectangle');
    });

    it('should maintain isolation during concurrent operations', async () => {
      // Create initial OrderItems
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Simulate concurrent updates using Promise.all
      const [result1, result2] = await Promise.all([
        prisma.orderItem.update({
          where: { id: orderItem1.id },
          data: { itemStatus: 'CUTTING' }
        }),
        prisma.orderItem.update({
          where: { id: orderItem2.id },
          data: { itemStatus: 'SEWING' }
        })
      ]);

      // Verify both updates succeeded with correct isolation
      expect(result1.itemStatus).toBe('CUTTING');
      expect(result1.orderId).toBe(order1.id);
      
      expect(result2.itemStatus).toBe('SEWING');
      expect(result2.orderId).toBe(order2.id);
    });

    it('should handle order deletion with proper OrderItem cleanup', async () => {
      // Create OrderItems in multiple orders
      await prisma.orderItem.createMany({
        data: [
          {
            orderId: order1.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00
          },
          {
            orderId: order2.id,
            itemId: testItem1.id,
            quantity: 1,
            pricePerItem: 100.00
          },
          {
            orderId: order3.id,
            itemId: testItem2.id,
            quantity: 1,
            pricePerItem: 100.00
          }
        ]
      });

      // Verify initial state
      const allItems = await prisma.orderItem.findMany({
        where: {
          orderId: { in: [order1.id, order2.id, order3.id] }
        }
      });
      expect(allItems).toHaveLength(3);

      // Delete one order (should cascade delete its OrderItems)
      await prisma.order.delete({
        where: { id: order1.id }
      });

      // Verify only order1's OrderItems were deleted
      const remainingItems = await prisma.orderItem.findMany({
        where: {
          orderId: { in: [order2.id, order3.id] }
        }
      });
      expect(remainingItems).toHaveLength(2);
      expect(remainingItems.every(item => item.orderId !== order1.id)).toBe(true);
    });
  });
});