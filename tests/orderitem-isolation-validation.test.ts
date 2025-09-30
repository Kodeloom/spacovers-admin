/**
 * Test suite to validate OrderItem isolation between orders
 * Ensures that status changes in one order don't affect items in other orders
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

describe('OrderItem Isolation Validation', () => {
  let testCustomer: any;
  let testItem: any;
  let order1: any;
  let order2: any;
  let orderItem1: any;
  let orderItem2: any;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { order: { customer: { name: 'Test Customer Isolation' } } },
          { item: { name: 'Test Item Isolation' } }
        ]
      }
    });
    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Isolation' } }
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Isolation' }
    });
    await prisma.item.deleteMany({
      where: { name: 'Test Item Isolation' }
    });

    // Create test data
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer Isolation',
        email: 'test-isolation@example.com',
        customerType: 'RETAILER',
        status: 'ACTIVE'
      }
    });

    testItem = await prisma.item.create({
      data: {
        name: 'Test Item Isolation',
        status: 'ACTIVE',
        category: 'Test'
      }
    });

    // Create two orders with the same item type
    order1 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-ORDER-1'
      }
    });

    order2 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-ORDER-2'
      }
    });

    // Create OrderItems for both orders using the same item
    orderItem1 = await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        itemId: testItem.id,
        quantity: 1,
        pricePerItem: 100.00,
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    });

    orderItem2 = await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        itemId: testItem.id,
        quantity: 2,
        pricePerItem: 150.00,
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany({
      where: {
        OR: [
          { id: orderItem1?.id },
          { id: orderItem2?.id }
        ]
      }
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { id: order1?.id },
          { id: order2?.id }
        ]
      }
    });
    await prisma.customer.deleteMany({
      where: { id: testCustomer?.id }
    });
    await prisma.item.deleteMany({
      where: { id: testItem?.id }
    });
  });

  it('should maintain independent OrderItem records for same item across different orders', async () => {
    // Verify that we have two separate OrderItem records
    const orderItems = await prisma.orderItem.findMany({
      where: {
        itemId: testItem.id
      },
      include: {
        order: true
      }
    });

    expect(orderItems).toHaveLength(2);
    expect(orderItems[0].orderId).not.toBe(orderItems[1].orderId);
    expect(orderItems[0].id).not.toBe(orderItems[1].id);
  });

  it('should not affect other orders when updating OrderItem status in one order', async () => {
    // Update status of OrderItem in order1
    await prisma.orderItem.update({
      where: { id: orderItem1.id },
      data: { itemStatus: 'CUTTING' }
    });

    // Verify that order1's item status changed
    const updatedOrderItem1 = await prisma.orderItem.findUnique({
      where: { id: orderItem1.id }
    });
    expect(updatedOrderItem1?.itemStatus).toBe('CUTTING');

    // Verify that order2's item status remained unchanged
    const unchangedOrderItem2 = await prisma.orderItem.findUnique({
      where: { id: orderItem2.id }
    });
    expect(unchangedOrderItem2?.itemStatus).toBe('NOT_STARTED_PRODUCTION');
  });

  it('should properly scope OrderItem queries by orderId', async () => {
    // Query OrderItems for order1 only
    const order1Items = await prisma.orderItem.findMany({
      where: { orderId: order1.id }
    });

    expect(order1Items).toHaveLength(1);
    expect(order1Items[0].id).toBe(orderItem1.id);

    // Query OrderItems for order2 only
    const order2Items = await prisma.orderItem.findMany({
      where: { orderId: order2.id }
    });

    expect(order2Items).toHaveLength(1);
    expect(order2Items[0].id).toBe(orderItem2.id);
  });

  it('should allow same QuickBooks line ID across different orders', async () => {
    const qboLineId = 'QBO-LINE-123';

    // Update both OrderItems to have the same QuickBooks line ID
    await prisma.orderItem.update({
      where: { id: orderItem1.id },
      data: { quickbooksOrderLineId: qboLineId }
    });

    await prisma.orderItem.update({
      where: { id: orderItem2.id },
      data: { quickbooksOrderLineId: qboLineId }
    });

    // Verify both updates succeeded (no unique constraint violation)
    const updatedOrderItem1 = await prisma.orderItem.findUnique({
      where: { id: orderItem1.id }
    });
    const updatedOrderItem2 = await prisma.orderItem.findUnique({
      where: { id: orderItem2.id }
    });

    expect(updatedOrderItem1?.quickbooksOrderLineId).toBe(qboLineId);
    expect(updatedOrderItem2?.quickbooksOrderLineId).toBe(qboLineId);
  });

  it('should prevent duplicate QuickBooks line IDs within the same order', async () => {
    const qboLineId = 'QBO-LINE-456';

    // Create another OrderItem in the same order with the same QuickBooks line ID
    await prisma.orderItem.update({
      where: { id: orderItem1.id },
      data: { quickbooksOrderLineId: qboLineId }
    });

    // Try to create another OrderItem in the same order with the same QuickBooks line ID
    // This should fail due to the compound unique constraint
    await expect(
      prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem.id,
          quickbooksOrderLineId: qboLineId,
          quantity: 1,
          pricePerItem: 100.00
        }
      })
    ).rejects.toThrow();
  });

  it('should maintain correct item counts per order', async () => {
    // Add more items to each order
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        itemId: testItem.id,
        quantity: 3,
        pricePerItem: 200.00,
        itemStatus: 'SEWING'
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        itemId: testItem.id,
        quantity: 1,
        pricePerItem: 75.00,
        itemStatus: 'FOAM_CUTTING'
      }
    });

    // Count items per order
    const order1Count = await prisma.orderItem.count({
      where: { orderId: order1.id }
    });
    const order2Count = await prisma.orderItem.count({
      where: { orderId: order2.id }
    });

    expect(order1Count).toBe(2);
    expect(order2Count).toBe(2);

    // Verify status distribution per order
    const order1Items = await prisma.orderItem.findMany({
      where: { orderId: order1.id },
      select: { itemStatus: true }
    });
    const order2Items = await prisma.orderItem.findMany({
      where: { orderId: order2.id },
      select: { itemStatus: true }
    });

    const order1Statuses = order1Items.map(item => item.itemStatus).sort();
    const order2Statuses = order2Items.map(item => item.itemStatus).sort();

    expect(order1Statuses).toEqual(['NOT_STARTED_PRODUCTION', 'SEWING']);
    expect(order2Statuses).toEqual(['FOAM_CUTTING', 'NOT_STARTED_PRODUCTION']);
  });
});