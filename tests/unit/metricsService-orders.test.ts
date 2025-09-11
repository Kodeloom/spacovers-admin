import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsService, type OrderFilters } from '~/utils/metricsService';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

describe('MetricsService - Orders Page Metrics', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
  });

  describe('getOrdersPageMetrics', () => {
    it('should return correct metrics for empty database', async () => {
      const metrics = await MetricsService.getOrdersPageMetrics();
      
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
      expect(metrics.statusCounts).toEqual({});
      expect(metrics.productionMetrics).toEqual({
        notStarted: 0,
        cutting: 0,
        sewing: 0,
        foamCutting: 0,
        packaging: 0,
        finished: 0,
        ready: 0
      });
    });

    it('should calculate correct metrics with test orders', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          type: 'RETAILER',
          status: 'ACTIVE'
        }
      });

      // Create test orders with different statuses
      const orders = await Promise.all([
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 100.00
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'ORDER_PROCESSING',
            totalAmount: 200.00
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'READY_TO_SHIP',
            totalAmount: 300.00
          }
        })
      ]);

      const metrics = await MetricsService.getOrdersPageMetrics();
      
      expect(metrics.totalOrders).toBe(3);
      expect(metrics.totalValue).toBe(600);
      expect(metrics.averageOrderValue).toBe(200);
      expect(metrics.statusCounts).toEqual({
        'PENDING': 1,
        'ORDER_PROCESSING': 1,
        'READY_TO_SHIP': 1
      });
    });

    it('should filter orders by status correctly', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          type: 'RETAILER',
          status: 'ACTIVE'
        }
      });

      // Create test orders
      await Promise.all([
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 100.00
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'ORDER_PROCESSING',
            totalAmount: 200.00
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'READY_TO_SHIP',
            totalAmount: 300.00
          }
        })
      ]);

      const filters: OrderFilters = {
        status: ['PENDING', 'ORDER_PROCESSING']
      };

      const metrics = await MetricsService.getOrdersPageMetrics(filters);
      
      expect(metrics.totalOrders).toBe(2);
      expect(metrics.totalValue).toBe(300);
      expect(metrics.averageOrderValue).toBe(150);
      expect(metrics.statusCounts).toEqual({
        'PENDING': 1,
        'ORDER_PROCESSING': 1
      });
    });

    it('should filter orders by date range correctly', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          type: 'RETAILER',
          status: 'ACTIVE'
        }
      });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Create orders with different dates
      await Promise.all([
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 100.00,
            createdAt: yesterday
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 200.00,
            createdAt: now
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 300.00,
            createdAt: tomorrow
          }
        })
      ]);

      const filters: OrderFilters = {
        dateFrom: now,
        dateTo: tomorrow
      };

      const metrics = await MetricsService.getOrdersPageMetrics(filters);
      
      expect(metrics.totalOrders).toBe(2);
      expect(metrics.totalValue).toBe(500);
    });

    it('should handle null totalAmount values gracefully', async () => {
      // Create test customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          type: 'RETAILER',
          status: 'ACTIVE'
        }
      });

      // Create orders with null totalAmount
      await Promise.all([
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: null
          }
        }),
        prisma.order.create({
          data: {
            customerId: customer.id,
            contactEmail: 'test@example.com',
            orderStatus: 'PENDING',
            totalAmount: 100.00
          }
        })
      ]);

      const metrics = await MetricsService.getOrdersPageMetrics();
      
      expect(metrics.totalOrders).toBe(2);
      expect(metrics.totalValue).toBe(100);
      expect(metrics.averageOrderValue).toBe(50);
    });
  });
});