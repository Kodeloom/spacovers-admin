/**
 * Test suite for Order Management API enhancements
 * Tests PO validation and print queue integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma-app/client';
import { orderApprovalService } from '../server/lib/OrderApprovalService';
import { poValidationService } from '../server/lib/POValidationService';
import { printQueueService } from '../server/lib/PrintQueueService';

const prisma = new PrismaClient();

describe('Order Management API Enhancements', () => {
  let testCustomer: any;
  let testItem: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { customer: { name: 'Test Customer Order API' } } },
          { item: { name: 'Test Item Order API' } }
        ]
      }
    });

    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Order API' } }
    });

    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Order API' }
    });

    await prisma.item.deleteMany({
      where: { name: 'Test Item Order API' }
    });

    // Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer Order API',
        email: 'test-order-api@example.com',
        customerType: 'RETAILER',
        customerStatus: 'ACTIVE'
      }
    });

    // Create test item
    testItem = await prisma.item.create({
      data: {
        name: 'Test Item Order API',
        itemStatus: 'ACTIVE'
      }
    });

    console.log('✅ Test setup completed');
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.orderItem.deleteMany({
        where: {
          OR: [
            { order: { customer: { name: 'Test Customer Order API' } } },
            { item: { name: 'Test Item Order API' } }
          ]
        }
      });

      await prisma.order.deleteMany({
        where: { customer: { name: 'Test Customer Order API' } }
      });

      await prisma.customer.deleteMany({
        where: { name: 'Test Customer Order API' }
      });

      await prisma.item.deleteMany({
        where: { name: 'Test Item Order API' }
      });

      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.warn('Warning during cleanup:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('PO Validation Service', () => {
    it('should validate order-level PO numbers correctly', async () => {
      // Create an order with a PO number
      const orderWithPO = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          poNumber: 'TEST-PO-001',
          orderStatus: 'PENDING',
          contactEmail: 'test@example.com'
        }
      });

      // Test duplicate detection
      const validationResult = await poValidationService.checkOrderLevelDuplicate(
        'TEST-PO-001',
        testCustomer.id
      );

      expect(validationResult.isDuplicate).toBe(true);
      expect(validationResult.existingOrders).toHaveLength(1);
      expect(validationResult.warningMessage).toContain('TEST-PO-001');

      // Test with different customer (should not find duplicate)
      const otherCustomer = await prisma.customer.create({
        data: {
          name: 'Other Customer',
          email: 'other@example.com',
          customerType: 'RETAILER',
          customerStatus: 'ACTIVE'
        }
      });

      const validationResult2 = await poValidationService.checkOrderLevelDuplicate(
        'TEST-PO-001',
        otherCustomer.id
      );

      expect(validationResult2.isDuplicate).toBe(false);

      // Cleanup
      await prisma.order.delete({ where: { id: orderWithPO.id } });
      await prisma.customer.delete({ where: { id: otherCustomer.id } });
    });

    it('should exclude current order from duplicate validation', async () => {
      // Create an order with a PO number
      const orderWithPO = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          poNumber: 'TEST-PO-002',
          orderStatus: 'PENDING',
          contactEmail: 'test@example.com'
        }
      });

      // Test validation excluding the current order
      const validationResult = await poValidationService.checkOrderLevelDuplicate(
        'TEST-PO-002',
        testCustomer.id,
        orderWithPO.id
      );

      expect(validationResult.isDuplicate).toBe(false);

      // Cleanup
      await prisma.order.delete({ where: { id: orderWithPO.id } });
    });
  });

  describe('Order Approval Service', () => {
    beforeAll(async () => {
      // Create test order and order item for approval tests
      testOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'PENDING',
          contactEmail: 'test@example.com',
          salesOrderNumber: 'TEST-ORDER-APPROVAL'
        }
      });

      testOrderItem = await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: testItem.id,
          quantity: 1,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });
    });

    afterAll(async () => {
      // Clean up test order and items
      if (testOrderItem) {
        await prisma.orderItem.delete({ where: { id: testOrderItem.id } });
      }
      if (testOrder) {
        await prisma.order.delete({ where: { id: testOrder.id } });
      }
    });

    it('should handle order approval workflow', async () => {
      // Update order to approved status
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { orderStatus: 'APPROVED', approvedAt: new Date() }
      });

      // Test approval workflow
      const approvalResult = await orderApprovalService.handleOrderApproval(
        testOrder.id,
        'test-user-id'
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.printQueueItemsAdded).toBeGreaterThan(0);

      console.log('✅ Order approval workflow completed successfully');
    });

    it('should validate PO numbers during order operations', async () => {
      const validationResult = await orderApprovalService.validateOrderPO(
        'TEST-PO-VALIDATION',
        testCustomer.id
      );

      expect(validationResult.isDuplicate).toBe(false);

      // Create another order with the same PO
      const orderWithSamePO = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          poNumber: 'TEST-PO-VALIDATION',
          orderStatus: 'PENDING',
          contactEmail: 'test@example.com'
        }
      });

      // Now validation should detect duplicate
      const validationResult2 = await orderApprovalService.validateOrderPO(
        'TEST-PO-VALIDATION',
        testCustomer.id
      );

      expect(validationResult2.isDuplicate).toBe(true);
      expect(validationResult2.warningMessage).toContain('TEST-PO-VALIDATION');

      // Cleanup
      await prisma.order.delete({ where: { id: orderWithSamePO.id } });
    });
  });

  describe('Print Queue Integration', () => {
    it('should add items to print queue when order is approved', async () => {
      // Create a test order with items
      const testOrderForQueue = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'PENDING',
          contactEmail: 'test@example.com',
          salesOrderNumber: 'TEST-QUEUE-ORDER'
        }
      });

      const testOrderItemForQueue = await prisma.orderItem.create({
        data: {
          orderId: testOrderForQueue.id,
          itemId: testItem.id,
          quantity: 2,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Approve the order and trigger print queue addition
      await prisma.order.update({
        where: { id: testOrderForQueue.id },
        data: { orderStatus: 'APPROVED', approvedAt: new Date() }
      });

      const approvalResult = await orderApprovalService.handleOrderApproval(
        testOrderForQueue.id,
        'test-user-id'
      );

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.printQueueItemsAdded).toBe(1);

      // Verify items are in print queue
      const queueItems = await printQueueService.getQueue();
      const addedItem = queueItems.find(item => item.orderItemId === testOrderItemForQueue.id);
      expect(addedItem).toBeDefined();

      console.log('✅ Print queue integration working correctly');

      // Cleanup
      if (addedItem) {
        await printQueueService.removeFromQueue([addedItem.id]);
      }
      await prisma.orderItem.delete({ where: { id: testOrderItemForQueue.id } });
      await prisma.order.delete({ where: { id: testOrderForQueue.id } });
    });
  });
});