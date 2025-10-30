import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { orderApprovalService } from '~/server/lib/OrderApprovalService';
import { printQueueService } from '~/server/lib/PrintQueueService';

describe('Order Approval Integration Tests', () => {
  let prisma: any;
  let testCustomer: any;
  let testItem: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeAll(async () => {
    // Get Prisma client
    prisma = await getEnhancedPrismaClient();

    // Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer - Approval Integration',
        email: 'test-approval@example.com'
      }
    });

    // Create test item
    testItem = await prisma.item.create({
      data: {
        name: 'Test Item - Approval Integration',
        description: 'Test item for approval integration testing'
      }
    });
  });

  afterAll(async () => {
    // Cleanup in reverse order
    if (testOrderItem) {
      await prisma.orderItem.delete({ where: { id: testOrderItem.id } }).catch(() => {});
    }
    if (testOrder) {
      await prisma.order.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testItem) {
      await prisma.item.delete({ where: { id: testItem.id } }).catch(() => {});
    }
    if (testCustomer) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
  });

  it('should complete end-to-end order approval workflow', async () => {
    // Step 1: Create a pending order
    testOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'PENDING',
        contactEmail: 'test-approval@example.com',
        salesOrderNumber: 'TEST-APPROVAL-E2E'
      }
    });

    // Step 2: Add order items
    testOrderItem = await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        itemId: testItem.id,
        quantity: 2,
        itemStatus: 'NOT_STARTED_PRODUCTION',
        isProduct: true
      }
    });

    // Step 3: Verify initial state - no items in print queue
    const initialQueue = await printQueueService.getQueue();
    const initialQueueForOrder = initialQueue.filter(item => 
      item.orderItem.orderId === testOrder.id
    );
    expect(initialQueueForOrder).toHaveLength(0);

    // Step 4: Approve the order (simulating the API call)
    const updatedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: { 
        orderStatus: 'APPROVED',
        approvedAt: new Date()
      }
    });

    expect(updatedOrder.orderStatus).toBe('APPROVED');
    expect(updatedOrder.approvedAt).toBeTruthy();

    // Step 5: Trigger approval workflow (this is what happens in the API)
    const approvalResult = await orderApprovalService.handleOrderApproval(
      testOrder.id,
      'test-user-id'
    );

    // Step 6: Verify approval workflow results
    expect(approvalResult.success).toBe(true);
    expect(approvalResult.printQueueItemsAdded).toBe(1); // One order item should be added
    expect(approvalResult.error).toBeUndefined();

    // Step 7: Verify items were added to print queue
    const finalQueue = await printQueueService.getQueue();
    const queueItemsForOrder = finalQueue.filter(item => 
      item.orderItem.orderId === testOrder.id
    );
    
    expect(queueItemsForOrder).toHaveLength(1);
    expect(queueItemsForOrder[0].orderItem.id).toBe(testOrderItem.id);
    expect(queueItemsForOrder[0].isPrinted).toBe(false);
    expect(queueItemsForOrder[0].addedAt).toBeTruthy();

    // Step 8: Verify queue status
    const queueStatus = await printQueueService.getQueueStatus();
    expect(queueStatus.totalItems).toBeGreaterThanOrEqual(1);

    console.log('✅ End-to-end order approval workflow completed successfully');
    console.log(`   - Order ${testOrder.id} approved`);
    console.log(`   - ${approvalResult.printQueueItemsAdded} items added to print queue`);
    console.log(`   - Queue now has ${queueStatus.totalItems} total items`);
  });

  it('should handle approval workflow errors gracefully', async () => {
    // Test with non-existent order
    const approvalResult = await orderApprovalService.handleOrderApproval(
      'non-existent-order-id',
      'test-user-id'
    );

    expect(approvalResult.success).toBe(false);
    expect(approvalResult.error).toBeTruthy();
    expect(approvalResult.printQueueItemsAdded).toBeUndefined();

    console.log('✅ Error handling for approval workflow works correctly');
  });

  it('should not add items to queue for non-approved orders', async () => {
    // Create another test order that stays pending
    const pendingOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'PENDING',
        contactEmail: 'test-pending@example.com',
        salesOrderNumber: 'TEST-PENDING-ORDER'
      }
    });

    const pendingOrderItem = await prisma.orderItem.create({
      data: {
        orderId: pendingOrder.id,
        itemId: testItem.id,
        quantity: 1,
        itemStatus: 'NOT_STARTED_PRODUCTION',
        isProduct: true
      }
    });

    // Try to trigger approval workflow on pending order
    const approvalResult = await orderApprovalService.handleOrderApproval(
      pendingOrder.id,
      'test-user-id'
    );

    expect(approvalResult.success).toBe(false);
    expect(approvalResult.error).toContain('not in approved status');

    // Verify no items were added to queue
    const queue = await printQueueService.getQueue();
    const queueItemsForPendingOrder = queue.filter(item => 
      item.orderItem.orderId === pendingOrder.id
    );
    expect(queueItemsForPendingOrder).toHaveLength(0);

    // Cleanup
    await prisma.orderItem.delete({ where: { id: pendingOrderItem.id } });
    await prisma.order.delete({ where: { id: pendingOrder.id } });

    console.log('✅ Approval workflow correctly rejects non-approved orders');
  });
});