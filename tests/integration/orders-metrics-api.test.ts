/**
 * Integration tests for Orders Metrics API endpoint
 * Tests the actual HTTP endpoint functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

// Mock data for testing
const mockCustomer = {
  id: 'test-customer-id',
  name: 'Test Customer',
  email: 'test@example.com',
  customerType: 'RETAILER' as const,
  status: 'ACTIVE' as const
};

const mockOrders = [
  {
    id: 'test-order-1',
    customerId: 'test-customer-id',
    contactEmail: 'test@example.com',
    orderStatus: 'PENDING' as const,
    priority: 'HIGH' as const,
    totalAmount: 100.00,
    createdAt: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'test-order-2',
    customerId: 'test-customer-id',
    contactEmail: 'test@example.com',
    orderStatus: 'ORDER_PROCESSING' as const,
    priority: 'MEDIUM' as const,
    totalAmount: 200.00,
    createdAt: new Date('2024-01-20T10:00:00Z')
  },
  {
    id: 'test-order-3',
    customerId: 'test-customer-id',
    contactEmail: 'test@example.com',
    orderStatus: 'READY_TO_SHIP' as const,
    priority: 'LOW' as const,
    totalAmount: 150.00,
    createdAt: new Date('2024-01-25T10:00:00Z')
  }
];

describe('Orders Metrics API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.order.deleteMany({
      where: {
        id: {
          in: mockOrders.map(o => o.id)
        }
      }
    });
    
    await prisma.customer.deleteMany({
      where: {
        id: mockCustomer.id
      }
    });

    // Create test data
    await prisma.customer.create({
      data: mockCustomer
    });

    for (const order of mockOrders) {
      await prisma.order.create({
        data: order
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.order.deleteMany({
      where: {
        id: {
          in: mockOrders.map(o => o.id)
        }
      }
    });
    
    await prisma.customer.deleteMany({
      where: {
        id: mockCustomer.id
      }
    });
    
    await prisma.$disconnect();
  });

  describe('MetricsService.getOrdersPageMetrics', () => {
    it('should return metrics without filters', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.totalOrders).toBe('number');
      expect(typeof metrics.totalValue).toBe('number');
      expect(typeof metrics.averageOrderValue).toBe('number');
      expect(typeof metrics.statusCounts).toBe('object');
      expect(typeof metrics.productionMetrics).toBe('object');

      // Should include our test orders
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(3);
      expect(metrics.totalValue).toBeGreaterThanOrEqual(450); // Sum of our test orders
    });

    it('should filter by status correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        status: ['PENDING']
      });

      expect(metrics).toBeDefined();
      expect(metrics.statusCounts['PENDING']).toBeGreaterThanOrEqual(1);
      
      // Should only include PENDING orders in total
      const pendingCount = metrics.statusCounts['PENDING'] || 0;
      const otherStatusCounts = Object.entries(metrics.statusCounts)
        .filter(([status]) => status !== 'PENDING')
        .reduce((sum, [, count]) => sum + count, 0);
      
      expect(otherStatusCounts).toBe(0);
    });

    it('should filter by priority correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        priority: ['HIGH', 'MEDIUM']
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(2); // HIGH and MEDIUM orders
      expect(metrics.totalValue).toBeGreaterThanOrEqual(300); // 100 + 200 from HIGH and MEDIUM orders
    });

    it('should filter by date range correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        dateFrom: new Date('2024-01-01T00:00:00Z'),
        dateTo: new Date('2024-01-18T23:59:59Z')
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBeGreaterThanOrEqual(1); // Should include test-order-1
      expect(metrics.totalValue).toBeGreaterThanOrEqual(100);
    });

    it('should filter by customer ID correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        customerId: mockCustomer.id
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(3); // All our test orders
      expect(metrics.totalValue).toBe(450); // Sum of all test orders
    });

    it('should handle combined filters correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        status: ['PENDING', 'ORDER_PROCESSING'],
        priority: ['HIGH', 'MEDIUM'],
        customerId: mockCustomer.id
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(2); // PENDING HIGH and ORDER_PROCESSING MEDIUM
      expect(metrics.totalValue).toBe(300); // 100 + 200
    });

    it('should return empty results for non-existent customer', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        customerId: 'non-existent-customer'
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalValue).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
    });

    it('should return empty results for future date range', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const metrics = await MetricsService.getOrdersPageMetrics({
        dateFrom: futureDate,
        dateTo: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.totalValue).toBe(0);
    });

    it('should calculate average order value correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const metrics = await MetricsService.getOrdersPageMetrics({
        customerId: mockCustomer.id
      });

      expect(metrics).toBeDefined();
      expect(metrics.totalOrders).toBe(3);
      expect(metrics.totalValue).toBe(450);
      expect(metrics.averageOrderValue).toBe(150); // 450 / 3
    });

    it('should handle empty filters (same as no filters)', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const [metricsWithEmpty, metricsWithoutFilters] = await Promise.all([
        MetricsService.getOrdersPageMetrics({}),
        MetricsService.getOrdersPageMetrics()
      ]);

      expect(metricsWithEmpty.totalOrders).toBe(metricsWithoutFilters.totalOrders);
      expect(metricsWithEmpty.totalValue).toBe(metricsWithoutFilters.totalValue);
    });

    it('should have consistent structure across different filters', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      
      const testCases = [
        undefined,
        {},
        { status: ['PENDING'] },
        { priority: ['HIGH'] },
        { customerId: mockCustomer.id }
      ];

      for (const filters of testCases) {
        const metrics = await MetricsService.getOrdersPageMetrics(filters);
        
        expect(metrics).toHaveProperty('totalOrders');
        expect(metrics).toHaveProperty('totalValue');
        expect(metrics).toHaveProperty('averageOrderValue');
        expect(metrics).toHaveProperty('statusCounts');
        expect(metrics).toHaveProperty('productionMetrics');
        
        expect(typeof metrics.totalOrders).toBe('number');
        expect(typeof metrics.totalValue).toBe('number');
        expect(typeof metrics.averageOrderValue).toBe('number');
        expect(typeof metrics.statusCounts).toBe('object');
        expect(typeof metrics.productionMetrics).toBe('object');
        
        // Validate production metrics structure
        expect(metrics.productionMetrics).toHaveProperty('notStarted');
        expect(metrics.productionMetrics).toHaveProperty('cutting');
        expect(metrics.productionMetrics).toHaveProperty('sewing');
        expect(metrics.productionMetrics).toHaveProperty('foamCutting');
        expect(metrics.productionMetrics).toHaveProperty('packaging');
        expect(metrics.productionMetrics).toHaveProperty('finished');
        expect(metrics.productionMetrics).toHaveProperty('ready');
      }
    });
  });
});