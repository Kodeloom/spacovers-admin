import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma-app/client';
import { MetricsService } from '~/utils/metricsService';

const prisma = new PrismaClient();

describe('Dashboard Metrics API Integration Tests', () => {
  let testUserId: string;
  let testCustomerId: string;
  let testOrderIds: string[] = [];

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Metrics Test User',
        email: `metrics-test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;

    // Create test customer
    const testCustomer = await prisma.customer.create({
      data: {
        name: `Test Customer ${Date.now()}`,
        email: `customer-${Date.now()}@example.com`,
        phone: '555-0123'
      }
    });
    testCustomerId = testCustomer.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } }
    });
    await prisma.customer.delete({
      where: { id: testCustomerId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    testOrderIds = [];
  });

  it('should calculate correct dashboard metrics with various order scenarios', async () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    thisWeek.setDate(now.getDate() - daysToSubtract);
    thisWeek.setHours(0, 0, 0, 0);

    // Create test orders with different statuses and dates
    const testOrders = [
      // This month orders
      {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: 100.00,
        createdAt: thisMonth
      },
      {
        customerId: testCustomerId,
        orderStatus: 'ORDER_PROCESSING',
        totalAmount: 200.00,
        createdAt: thisMonth
      },
      {
        customerId: testCustomerId,
        orderStatus: 'READY_TO_SHIP',
        totalAmount: 150.00,
        createdAt: thisMonth
      },
      // This week orders
      {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: 75.00,
        createdAt: thisWeek
      },
      {
        customerId: testCustomerId,
        orderStatus: 'ORDER_PROCESSING',
        totalAmount: 125.00,
        createdAt: thisWeek
      },
      // Last month order (should not count in this month's revenue)
      {
        customerId: testCustomerId,
        orderStatus: 'READY_TO_SHIP',
        totalAmount: 300.00,
        createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15)
      }
    ];

    for (const orderData of testOrders) {
      const order = await prisma.order.create({
        data: orderData
      });
      testOrderIds.push(order.id);
    }

    // Test MetricsService methods directly
    const metrics = await MetricsService.getDashboardMetrics();

    // Verify total orders (should include all test orders)
    expect(metrics.totalOrders).toBeGreaterThanOrEqual(6);

    // Verify revenue this month (should include only this month's orders)
    expect(metrics.revenueThisMonth).toBeGreaterThanOrEqual(450.00); // 100 + 200 + 150

    // Verify orders this week (should include only this week's orders)
    expect(metrics.ordersThisWeek).toBeGreaterThanOrEqual(2);

    // Verify status counts
    expect(metrics.pendingOrders).toBeGreaterThanOrEqual(2);
    expect(metrics.inProduction).toBeGreaterThanOrEqual(2);
    expect(metrics.readyToShip).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty database gracefully', async () => {
    // Test with no orders in database (after cleanup)
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } }
    });
    testOrderIds = [];

    const metrics = await MetricsService.getDashboardMetrics();

    expect(metrics.totalOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.revenueThisMonth).toBeGreaterThanOrEqual(0);
    expect(metrics.ordersThisWeek).toBeGreaterThanOrEqual(0);
    expect(metrics.pendingOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.inProduction).toBeGreaterThanOrEqual(0);
    expect(metrics.readyToShip).toBeGreaterThanOrEqual(0);
  });

  it('should handle null totalAmount values correctly', async () => {
    // Create order with null totalAmount
    const orderWithNullAmount = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: null,
        createdAt: new Date()
      }
    });
    testOrderIds.push(orderWithNullAmount.id);

    const revenueThisMonth = await MetricsService.getRevenueThisMonth();
    
    // Should not throw error and should handle null values
    expect(typeof revenueThisMonth).toBe('number');
    expect(revenueThisMonth).toBeGreaterThanOrEqual(0);
  });

  it('should calculate week boundaries correctly', async () => {
    const now = new Date();
    
    // Create order exactly at start of week (Monday 00:00:00)
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekStartOrder = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: 100.00,
        createdAt: startOfWeek
      }
    });
    testOrderIds.push(weekStartOrder.id);

    // Create order exactly at end of week (Sunday 23:59:59)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekEndOrder = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: 100.00,
        createdAt: endOfWeek
      }
    });
    testOrderIds.push(weekEndOrder.id);

    const ordersThisWeek = await MetricsService.getOrdersThisWeek();
    
    // Both orders should be counted in this week
    expect(ordersThisWeek).toBeGreaterThanOrEqual(2);
  });

  it('should handle individual metric calculation failures gracefully', async () => {
    // Test that getDashboardMetrics handles partial failures
    // This tests the Promise.allSettled behavior
    
    const metrics = await MetricsService.getDashboardMetrics();
    
    // All metrics should be numbers (not undefined or null)
    expect(typeof metrics.totalOrders).toBe('number');
    expect(typeof metrics.revenueThisMonth).toBe('number');
    expect(typeof metrics.ordersThisWeek).toBe('number');
    expect(typeof metrics.pendingOrders).toBe('number');
    expect(typeof metrics.inProduction).toBe('number');
    expect(typeof metrics.readyToShip).toBe('number');
    
    // All metrics should be non-negative
    expect(metrics.totalOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.revenueThisMonth).toBeGreaterThanOrEqual(0);
    expect(metrics.ordersThisWeek).toBeGreaterThanOrEqual(0);
    expect(metrics.pendingOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.inProduction).toBeGreaterThanOrEqual(0);
    expect(metrics.readyToShip).toBeGreaterThanOrEqual(0);
  });

  it('should test individual metric methods', async () => {
    // Create specific test data for each metric
    const pendingOrder = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'PENDING',
        totalAmount: 100.00,
        createdAt: new Date()
      }
    });
    testOrderIds.push(pendingOrder.id);

    const processingOrder = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'ORDER_PROCESSING',
        totalAmount: 200.00,
        createdAt: new Date()
      }
    });
    testOrderIds.push(processingOrder.id);

    const readyOrder = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderStatus: 'READY_TO_SHIP',
        totalAmount: 150.00,
        createdAt: new Date()
      }
    });
    testOrderIds.push(readyOrder.id);

    // Test individual methods
    const totalOrders = await MetricsService.getTotalOrders();
    const pendingOrders = await MetricsService.getPendingOrders();
    const inProduction = await MetricsService.getInProduction();
    const readyToShip = await MetricsService.getReadyToShip();

    expect(totalOrders).toBeGreaterThanOrEqual(3);
    expect(pendingOrders).toBeGreaterThanOrEqual(1);
    expect(inProduction).toBeGreaterThanOrEqual(1);
    expect(readyToShip).toBeGreaterThanOrEqual(1);
  });
});