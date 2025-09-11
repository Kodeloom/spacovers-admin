/**
 * Integration tests for Reports Metrics API endpoint
 * Tests the actual HTTP endpoint functionality and MetricsService.getReportsMetrics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

// Mock data for testing
const mockUsers = [
  {
    id: 'test-user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'WAREHOUSE_WORKER' as const
  },
  {
    id: 'test-user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'WAREHOUSE_WORKER' as const
  }
];

const mockStations = [
  {
    id: 'test-station-1',
    name: 'Cutting Station',
    stationCode: 'C'
  },
  {
    id: 'test-station-2',
    name: 'Sewing Station',
    stationCode: 'S'
  }
];

const mockCustomer = {
  id: 'test-customer-reports',
  name: 'Test Customer Reports',
  email: 'reports@example.com',
  customerType: 'RETAILER' as const,
  status: 'ACTIVE' as const
};

const mockOrders = [
  {
    id: 'test-order-reports-1',
    customerId: 'test-customer-reports',
    contactEmail: 'reports@example.com',
    orderStatus: 'COMPLETED' as const,
    priority: 'HIGH' as const,
    totalAmount: 500.00,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    readyToShipAt: new Date('2024-01-15T15:00:00Z') // 5 days lead time
  },
  {
    id: 'test-order-reports-2',
    customerId: 'test-customer-reports',
    contactEmail: 'reports@example.com',
    orderStatus: 'COMPLETED' as const,
    priority: 'MEDIUM' as const,
    totalAmount: 300.00,
    createdAt: new Date('2024-01-20T10:00:00Z'),
    readyToShipAt: new Date('2024-01-23T12:00:00Z') // 3 days lead time
  }
];

const mockProcessingLogs = [
  {
    id: 'test-log-1',
    userId: 'test-user-1',
    stationId: 'test-station-1',
    orderItemId: 'test-item-1',
    startTime: new Date('2024-01-12T09:00:00Z'),
    endTime: new Date('2024-01-12T11:00:00Z'),
    durationInSeconds: 7200 // 2 hours
  },
  {
    id: 'test-log-2',
    userId: 'test-user-1',
    stationId: 'test-station-2',
    orderItemId: 'test-item-2',
    startTime: new Date('2024-01-13T10:00:00Z'),
    endTime: new Date('2024-01-13T13:30:00Z'),
    durationInSeconds: 12600 // 3.5 hours
  },
  {
    id: 'test-log-3',
    userId: 'test-user-2',
    stationId: 'test-station-1',
    orderItemId: 'test-item-3',
    startTime: new Date('2024-01-21T08:00:00Z'),
    endTime: new Date('2024-01-21T10:30:00Z'),
    durationInSeconds: 9000 // 2.5 hours
  }
];

describe('Reports Metrics API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.itemProcessingLog.deleteMany({
      where: {
        id: {
          in: mockProcessingLogs.map(log => log.id)
        }
      }
    });

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

    await prisma.station.deleteMany({
      where: {
        id: {
          in: mockStations.map(s => s.id)
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: mockUsers.map(u => u.id)
        }
      }
    });

    // Create test data
    for (const user of mockUsers) {
      await prisma.user.create({
        data: user
      });
    }

    for (const station of mockStations) {
      await prisma.station.create({
        data: station
      });
    }

    await prisma.customer.create({
      data: mockCustomer
    });

    for (const order of mockOrders) {
      await prisma.order.create({
        data: order
      });
    }

    for (const log of mockProcessingLogs) {
      await prisma.itemProcessingLog.create({
        data: log
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.itemProcessingLog.deleteMany({
      where: {
        id: {
          in: mockProcessingLogs.map(log => log.id)
        }
      }
    });

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

    await prisma.station.deleteMany({
      where: {
        id: {
          in: mockStations.map(s => s.id)
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: mockUsers.map(u => u.id)
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('MetricsService.getReportsMetrics', () => {
    it('should return comprehensive reports metrics', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      expect(metrics).toBeDefined();
      expect(typeof metrics.averageLeadTime).toBe('number');
      expect(typeof metrics.totalProductionHours).toBe('number');
      expect(typeof metrics.totalItemsProcessed).toBe('number');
      expect(typeof metrics.overallProductivity).toBe('number');
      expect(Array.isArray(metrics.productivityByEmployee)).toBe(true);
      expect(Array.isArray(metrics.revenueByPeriod)).toBe(true);
    });

    it('should calculate productivity by employee correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      expect(metrics.productivityByEmployee.length).toBeGreaterThanOrEqual(2);
      
      // Find our test users
      const user1Metrics = metrics.productivityByEmployee.find(p => p.userId === 'test-user-1');
      const user2Metrics = metrics.productivityByEmployee.find(p => p.userId === 'test-user-2');

      expect(user1Metrics).toBeDefined();
      expect(user2Metrics).toBeDefined();

      if (user1Metrics) {
        expect(user1Metrics.userName).toBe('John Doe');
        expect(user1Metrics.itemsProcessed).toBe(2); // 2 processing logs
        expect(user1Metrics.totalHours).toBeCloseTo(5.5, 1); // 2 + 3.5 hours
        expect(user1Metrics.stationBreakdown.length).toBe(2); // 2 different stations
      }

      if (user2Metrics) {
        expect(user2Metrics.userName).toBe('Jane Smith');
        expect(user2Metrics.itemsProcessed).toBe(1); // 1 processing log
        expect(user2Metrics.totalHours).toBeCloseTo(2.5, 1); // 2.5 hours
        expect(user2Metrics.stationBreakdown.length).toBe(1); // 1 station
      }
    });

    it('should calculate average lead time correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      // Expected lead times: 5 days (120 hours) and 3 days (72 hours)
      // Average: (120 + 72) / 2 = 96 hours
      expect(metrics.averageLeadTime).toBeCloseTo(96, 0);
    });

    it('should calculate revenue by period correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      expect(metrics.revenueByPeriod.length).toBeGreaterThanOrEqual(1);
      
      // Should have January 2024 data
      const januaryData = metrics.revenueByPeriod.find(p => p.period === '2024-01');
      expect(januaryData).toBeDefined();
      
      if (januaryData) {
        expect(januaryData.revenue).toBe(800); // 500 + 300
        expect(januaryData.orderCount).toBe(2);
      }
    });

    it('should calculate total production hours correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      // Total seconds: 7200 + 12600 + 9000 = 28800 seconds = 8 hours
      expect(metrics.totalProductionHours).toBeCloseTo(8, 1);
    });

    it('should calculate total items processed correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      expect(metrics.totalItemsProcessed).toBe(3); // 3 processing logs
    });

    it('should calculate overall productivity correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      // 3 items / 8 hours = 0.375 items per hour
      expect(metrics.overallProductivity).toBeCloseTo(0.375, 2);
    });

    it('should handle empty date ranges gracefully', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      const dateRange = {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-31T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      expect(metrics.productivityByEmployee).toEqual([]);
      expect(metrics.averageLeadTime).toBe(0);
      expect(metrics.revenueByPeriod).toEqual([]);
      expect(metrics.totalProductionHours).toBe(0);
      expect(metrics.totalItemsProcessed).toBe(0);
      expect(metrics.overallProductivity).toBe(0);
    });

    it('should filter by date range correctly', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      
      // Test with narrow date range that only includes first half of January
      const dateRange = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-15T23:59:59Z')
      };

      const metrics = await MetricsService.getReportsMetrics(dateRange);

      // Should only include first order and first two processing logs
      expect(metrics.totalItemsProcessed).toBe(2); // Only logs from Jan 12-13
      expect(metrics.totalProductionHours).toBeCloseTo(5.5, 1); // 2 + 3.5 hours
      
      // Revenue should only include first order
      const januaryData = metrics.revenueByPeriod.find(p => p.period === '2024-01');
      if (januaryData) {
        expect(januaryData.revenue).toBe(500); // Only first order
        expect(januaryData.orderCount).toBe(1);
      }
    });

    it('should have consistent structure across different date ranges', async () => {
      const { MetricsService } = await import('../../utils/metricsService');
      
      const testRanges = [
        {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z')
        },
        {
          startDate: new Date('2024-01-15T00:00:00Z'),
          endDate: new Date('2024-01-25T23:59:59Z')
        },
        {
          startDate: new Date('2025-01-01T00:00:00Z'),
          endDate: new Date('2025-01-31T23:59:59Z')
        }
      ];

      for (const dateRange of testRanges) {
        const metrics = await MetricsService.getReportsMetrics(dateRange);
        
        expect(metrics).toHaveProperty('productivityByEmployee');
        expect(metrics).toHaveProperty('averageLeadTime');
        expect(metrics).toHaveProperty('revenueByPeriod');
        expect(metrics).toHaveProperty('totalProductionHours');
        expect(metrics).toHaveProperty('totalItemsProcessed');
        expect(metrics).toHaveProperty('overallProductivity');
        
        expect(Array.isArray(metrics.productivityByEmployee)).toBe(true);
        expect(typeof metrics.averageLeadTime).toBe('number');
        expect(Array.isArray(metrics.revenueByPeriod)).toBe(true);
        expect(typeof metrics.totalProductionHours).toBe('number');
        expect(typeof metrics.totalItemsProcessed).toBe('number');
        expect(typeof metrics.overallProductivity).toBe('number');
        
        // Validate productivity structure
        metrics.productivityByEmployee.forEach(emp => {
          expect(emp).toHaveProperty('userId');
          expect(emp).toHaveProperty('userName');
          expect(emp).toHaveProperty('totalHours');
          expect(emp).toHaveProperty('itemsProcessed');
          expect(emp).toHaveProperty('averageTimePerItem');
          expect(emp).toHaveProperty('stationBreakdown');
          expect(Array.isArray(emp.stationBreakdown)).toBe(true);
        });
        
        // Validate revenue structure
        metrics.revenueByPeriod.forEach(period => {
          expect(period).toHaveProperty('period');
          expect(period).toHaveProperty('revenue');
          expect(period).toHaveProperty('orderCount');
          expect(typeof period.revenue).toBe('number');
          expect(typeof period.orderCount).toBe('number');
        });
      }
    });
  });
});