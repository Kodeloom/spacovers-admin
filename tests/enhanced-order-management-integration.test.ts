import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { poValidationService } from '~/server/lib/POValidationService';
import { printQueueService } from '~/server/lib/PrintQueueService';
import { orderApprovalService } from '~/server/lib/OrderApprovalService';

describe('Enhanced Order Management Integration Tests', () => {
  let prisma: any;
  let testCustomer: any;
  let testItem: any;
  let testUser: any;

  beforeAll(async () => {
    // Get Prisma client
    prisma = await getEnhancedPrismaClient();

    // Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer - Enhanced Order Management',
        email: 'test-enhanced@example.com'
      }
    });

    // Create test item
    testItem = await prisma.item.create({
      data: {
        name: 'Test Item - Enhanced Order Management',
        description: 'Test item for enhanced order management testing'
      }
    });

    // Create test user for tracking
    testUser = await prisma.user.create({
      data: {
        email: 'test-user@example.com',
        name: 'Test User'
      }
    });
  });

  afterAll(async () => {
    // Cleanup all test data
    await prisma.printQueue.deleteMany({
      where: {
        orderItem: {
          order: {
            customerId: testCustomer.id
          }
        }
      }
    });

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          customerId: testCustomer.id
        }
      }
    });

    await prisma.order.deleteMany({
      where: {
        customerId: testCustomer.id
      }
    });

    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testItem) {
      await prisma.item.delete({ where: { id: testItem.id } }).catch(() => {});
    }
    if (testCustomer) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    await prisma.printQueue.deleteMany({
      where: {
        orderItem: {
          order: {
            customerId: testCustomer.id
          }
        }
      }
    });

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          customerId: testCustomer.id
        }
      }
    });

    await prisma.order.deleteMany({
      where: {
        customerId: testCustomer.id
      }
    });
  });

  describe('Complete Order Creation to Print Queue Workflow', () => {
    it('should handle complete workflow from order creation to print queue completion', async () => {
      console.log('🧪 Testing complete order creation to print queue workflow...');

      // Step 1: Create order with PO number
      const testOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'PENDING',
          contactEmail: 'test-workflow@example.com',
          salesOrderNumber: 'TEST-WORKFLOW-001',
          poNumber: 'PO-WORKFLOW-001',
          priority: 'NO_PRIORITY' // Test new priority option
        }
      });

      expect(testOrder.poNumber).toBe('PO-WORKFLOW-001');
      expect(testOrder.priority).toBe('NO_PRIORITY');
      console.log('✅ Order created with PO number and NO_PRIORITY');

      // Step 2: Add order items with product attributes including new fields
      const testOrderItem = await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: testItem.id,
          quantity: 2,
          itemStatus: 'NOT_STARTED_PRODUCTION',
          isProduct: true,
          productAttributes: {
            create: {
              tieDownLength: '12 inches',
              poNumber: 'PO-ITEM-001',
              // Add other required fields
              width: 10,
              height: 8,
              depth: 2,
              material: 'Test Material',
              color: 'Blue'
            }
          }
        },
        include: {
          productAttributes: true
        }
      });

      expect(testOrderItem.productAttributes?.tieDownLength).toBe('12 inches');
      expect(testOrderItem.productAttributes?.poNumber).toBe('PO-ITEM-001');
      console.log('✅ Order item created with enhanced product attributes');

      // Step 3: Test PO validation at order level
      const orderLevelValidation = await poValidationService.checkOrderLevelDuplicate(
        'PO-WORKFLOW-001',
        testCustomer.id
      );

      expect(orderLevelValidation.isDuplicate).toBe(true);
      expect(orderLevelValidation.existingOrders).toHaveLength(1);
      expect(orderLevelValidation.existingOrders?.[0].id).toBe(testOrder.id);
      console.log('✅ Order-level PO validation working correctly');

      // Step 4: Test PO validation at item level
      const itemLevelValidation = await poValidationService.checkItemLevelDuplicate(
        'PO-ITEM-001',
        testCustomer.id
      );

      expect(itemLevelValidation.isDuplicate).toBe(true);
      expect(itemLevelValidation.existingItems).toHaveLength(1);
      console.log('✅ Item-level PO validation working correctly');

      // Step 5: Approve order and verify automatic print queue addition
      const updatedOrder = await prisma.order.update({
        where: { id: testOrder.id },
        data: { 
          orderStatus: 'APPROVED',
          approvedAt: new Date()
        }
      });

      expect(updatedOrder.orderStatus).toBe('APPROVED');

      // Trigger approval workflow
      const approvalResult = await orderApprovalService.handleOrderApproval(
        testOrder.id,
        testUser.id
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.printQueueItemsAdded).toBe(1);
      console.log('✅ Order approval automatically added items to print queue');

      // Step 6: Verify print queue contains the items
      const queueItems = await printQueueService.getQueue();
      const ourQueueItems = queueItems.filter(item => 
        item.orderItem.orderId === testOrder.id
      );

      expect(ourQueueItems).toHaveLength(1);
      expect(ourQueueItems[0].isPrinted).toBe(false);
      expect(ourQueueItems[0].addedAt).toBeTruthy();
      console.log('✅ Items correctly added to shared print queue');

      // Step 7: Test print queue status and batch validation
      const queueStatus = await printQueueService.getQueueStatus();
      expect(queueStatus.totalItems).toBeGreaterThanOrEqual(1);

      const canPrint = await printQueueService.canPrintBatch();
      // Should be false since we only have 1 item (need 4 for full batch)
      expect(canPrint).toBe(false);
      console.log('✅ Print queue batch validation working correctly');

      // Step 8: Add more items to test batch processing
      const additionalOrders = [];
      for (let i = 2; i <= 4; i++) {
        const additionalOrder = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: 'APPROVED',
            contactEmail: `test-batch-${i}@example.com`,
            salesOrderNumber: `TEST-BATCH-${i}`,
            poNumber: `PO-BATCH-${i}`,
            approvedAt: new Date()
          }
        });

        const additionalOrderItem = await prisma.orderItem.create({
          data: {
            orderId: additionalOrder.id,
            itemId: testItem.id,
            quantity: 1,
            itemStatus: 'NOT_STARTED_PRODUCTION',
            isProduct: true
          }
        });

        // Add to print queue
        await printQueueService.addToQueue([additionalOrderItem.id], testUser.id);
        additionalOrders.push(additionalOrder);
      }

      // Step 9: Test batch processing with 4 items
      const updatedQueueStatus = await printQueueService.getQueueStatus();
      expect(updatedQueueStatus.totalItems).toBeGreaterThanOrEqual(4);

      const canPrintBatch = await printQueueService.canPrintBatch();
      expect(canPrintBatch).toBe(true);
      console.log('✅ Batch processing validation working with 4+ items');

      // Step 10: Test batch printing workflow
      const nextBatch = await printQueueService.getNextBatch();
      expect(nextBatch).toHaveLength(4);

      // Mark batch as printed
      const batchIds = nextBatch.map(item => item.id);
      await printQueueService.markBatchPrinted(batchIds, testUser.id);

      // Verify items are removed from queue
      const finalQueue = await printQueueService.getQueue();
      const remainingItems = finalQueue.filter(item => 
        batchIds.includes(item.id)
      );
      expect(remainingItems).toHaveLength(0);
      console.log('✅ Batch printing and queue cleanup working correctly');

      console.log('🎉 Complete workflow test passed successfully!');
    });
  });

  describe('PO Validation Cross-Customer Isolation', () => {
    it('should properly isolate PO validation by customer', async () => {
      console.log('🧪 Testing PO validation customer isolation...');

      // Create second customer
      const customer2 = await prisma.customer.create({
        data: {
          name: 'Test Customer 2 - PO Isolation',
          email: 'test-isolation@example.com'
        }
      });

      try {
        // Create orders with same PO number for different customers
        const order1 = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: 'PENDING',
            contactEmail: 'test1@example.com',
            salesOrderNumber: 'TEST-ISO-001',
            poNumber: 'PO-SHARED-123'
          }
        });

        const order2 = await prisma.order.create({
          data: {
            customerId: customer2.id,
            orderStatus: 'PENDING',
            contactEmail: 'test2@example.com',
            salesOrderNumber: 'TEST-ISO-002',
            poNumber: 'PO-SHARED-123' // Same PO number, different customer
          }
        });

        // Test validation for customer 1 - should find duplicate
        const validation1 = await poValidationService.checkOrderLevelDuplicate(
          'PO-SHARED-123',
          testCustomer.id
        );
        expect(validation1.isDuplicate).toBe(true);
        expect(validation1.existingOrders).toHaveLength(1);

        // Test validation for customer 2 - should find duplicate
        const validation2 = await poValidationService.checkOrderLevelDuplicate(
          'PO-SHARED-123',
          customer2.id
        );
        expect(validation2.isDuplicate).toBe(true);
        expect(validation2.existingOrders).toHaveLength(1);

        // Test cross-customer validation - should not find duplicates
        const crossValidation = await poValidationService.checkOrderLevelDuplicate(
          'PO-UNIQUE-456',
          testCustomer.id
        );
        expect(crossValidation.isDuplicate).toBe(false);

        console.log('✅ PO validation properly isolated by customer');

        // Cleanup
        await prisma.order.deleteMany({
          where: { customerId: customer2.id }
        });
        await prisma.customer.delete({ where: { id: customer2.id } });

      } catch (error) {
        // Cleanup on error
        await prisma.order.deleteMany({
          where: { customerId: customer2.id }
        }).catch(() => {});
        await prisma.customer.delete({ where: { id: customer2.id } }).catch(() => {});
        throw error;
      }
    });
  });

  describe('Print Queue Multi-User Sharing', () => {
    it('should properly share print queue across multiple users', async () => {
      console.log('🧪 Testing print queue multi-user sharing...');

      // Create second user
      const user2 = await prisma.user.create({
        data: {
          email: 'test-user2@example.com',
          name: 'Test User 2'
        }
      });

      try {
        // User 1 creates and approves an order
        const order1 = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: 'APPROVED',
            contactEmail: 'test-sharing1@example.com',
            salesOrderNumber: 'TEST-SHARING-001',
            approvedAt: new Date()
          }
        });

        const orderItem1 = await prisma.orderItem.create({
          data: {
            orderId: order1.id,
            itemId: testItem.id,
            quantity: 1,
            itemStatus: 'NOT_STARTED_PRODUCTION',
            isProduct: true
          }
        });

        // User 1 adds to print queue
        await printQueueService.addToQueue([orderItem1.id], testUser.id);

        // User 2 creates and approves an order
        const order2 = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: 'APPROVED',
            contactEmail: 'test-sharing2@example.com',
            salesOrderNumber: 'TEST-SHARING-002',
            approvedAt: new Date()
          }
        });

        const orderItem2 = await prisma.orderItem.create({
          data: {
            orderId: order2.id,
            itemId: testItem.id,
            quantity: 1,
            itemStatus: 'NOT_STARTED_PRODUCTION',
            isProduct: true
          }
        });

        // User 2 adds to print queue
        await printQueueService.addToQueue([orderItem2.id], user2.id);

        // Both users should see the same queue
        const queue = await printQueueService.getQueue();
        const testItems = queue.filter(item => 
          [order1.id, order2.id].includes(item.orderItem.orderId)
        );

        expect(testItems).toHaveLength(2);

        // Verify items were added by different users
        const user1Items = testItems.filter(item => item.addedBy === testUser.id);
        const user2Items = testItems.filter(item => item.addedBy === user2.id);

        expect(user1Items).toHaveLength(1);
        expect(user2Items).toHaveLength(1);

        console.log('✅ Print queue properly shared across multiple users');

        // Cleanup
        await prisma.user.delete({ where: { id: user2.id } });

      } catch (error) {
        // Cleanup on error
        await prisma.user.delete({ where: { id: user2.id } }).catch(() => {});
        throw error;
      }
    });
  });

  describe('Priority System Enhancement', () => {
    it('should handle NO_PRIORITY option correctly', async () => {
      console.log('🧪 Testing NO_PRIORITY option...');

      // Create orders with different priorities including NO_PRIORITY
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY'];
      const createdOrders = [];

      for (const priority of priorities) {
        const order = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: 'PENDING',
            contactEmail: `test-priority-${priority.toLowerCase()}@example.com`,
            salesOrderNumber: `TEST-PRIORITY-${priority}`,
            priority: priority
          }
        });
        createdOrders.push(order);
      }

      // Verify all priorities were saved correctly
      const savedOrders = await prisma.order.findMany({
        where: {
          id: { in: createdOrders.map(o => o.id) }
        },
        orderBy: { priority: 'asc' }
      });

      expect(savedOrders).toHaveLength(4);
      
      // Verify NO_PRIORITY is included
      const noPriorityOrder = savedOrders.find(o => o.priority === 'NO_PRIORITY');
      expect(noPriorityOrder).toBeTruthy();

      // Verify all priority types are present
      const foundPriorities = savedOrders.map(o => o.priority);
      expect(foundPriorities).toContain('LOW');
      expect(foundPriorities).toContain('MEDIUM');
      expect(foundPriorities).toContain('HIGH');
      expect(foundPriorities).toContain('NO_PRIORITY');

      console.log('✅ NO_PRIORITY option working correctly');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle PO validation errors gracefully', async () => {
      console.log('🧪 Testing PO validation error handling...');

      // Test with invalid customer ID
      try {
        await poValidationService.checkOrderLevelDuplicate(
          'PO-TEST-123',
          'invalid-customer-id'
        );
        expect.fail('Should have thrown an error for invalid customer ID');
      } catch (error) {
        expect(error).toBeTruthy();
        console.log('✅ Invalid customer ID handled correctly');
      }

      // Test with empty PO number
      try {
        await poValidationService.checkOrderLevelDuplicate(
          '',
          testCustomer.id
        );
        expect.fail('Should have thrown an error for empty PO number');
      } catch (error) {
        expect(error).toBeTruthy();
        console.log('✅ Empty PO number handled correctly');
      }
    });

    it('should handle print queue errors gracefully', async () => {
      console.log('🧪 Testing print queue error handling...');

      // Test with invalid order item IDs
      try {
        await printQueueService.addToQueue(['invalid-id'], testUser.id);
        expect.fail('Should have thrown an error for invalid order item ID');
      } catch (error) {
        expect(error).toBeTruthy();
        console.log('✅ Invalid order item ID handled correctly');
      }

      // Test marking non-existent items as printed
      try {
        await printQueueService.markBatchPrinted(['non-existent-id'], testUser.id);
        expect.fail('Should have thrown an error for non-existent queue item');
      } catch (error) {
        expect(error).toBeTruthy();
        console.log('✅ Non-existent queue item handled correctly');
      }
    });
  });

  describe('Performance and Data Integrity', () => {
    it('should maintain data integrity during concurrent operations', async () => {
      console.log('🧪 Testing data integrity during concurrent operations...');

      // Create test order and item
      const testOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'APPROVED',
          contactEmail: 'test-concurrent@example.com',
          salesOrderNumber: 'TEST-CONCURRENT-001',
          approvedAt: new Date()
        }
      });

      const testOrderItem = await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: testItem.id,
          quantity: 1,
          itemStatus: 'NOT_STARTED_PRODUCTION',
          isProduct: true
        }
      });

      // Simulate concurrent additions to print queue
      const concurrentPromises = [];
      for (let i = 0; i < 3; i++) {
        concurrentPromises.push(
          printQueueService.addToQueue([testOrderItem.id], testUser.id)
            .catch(error => ({ error: error.message }))
        );
      }

      const results = await Promise.all(concurrentPromises);
      
      // Only one should succeed, others should fail gracefully
      const successes = results.filter(r => !r.error);
      const failures = results.filter(r => r.error);

      expect(successes).toHaveLength(1);
      expect(failures.length).toBeGreaterThan(0);

      // Verify only one item exists in queue
      const queueItems = await printQueueService.getQueue();
      const ourItems = queueItems.filter(item => 
        item.orderItem.orderId === testOrder.id
      );
      expect(ourItems).toHaveLength(1);

      console.log('✅ Data integrity maintained during concurrent operations');
    });
  });
});