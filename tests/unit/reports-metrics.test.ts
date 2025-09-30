import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService, type MetricsDateRange } from '~/utils/metricsService';

// Mock the database
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: {
    itemProcessingLog: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn()
    },
    order: {
      findMany: vi.fn()
    }
  }
}));

describe('MetricsService - Reports Metrics', () => {
  const mockDateRange: MetricsDateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReportsMetrics', () => {
    it('should return default metrics when no data exists', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock empty responses
      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockResolvedValue([]);
      vi.mocked(unenhancedPrisma.itemProcessingLog.aggregate).mockResolvedValue({ _sum: { durationInSeconds: null } });
      vi.mocked(unenhancedPrisma.itemProcessingLog.count).mockResolvedValue(0);
      vi.mocked(unenhancedPrisma.order.findMany).mockResolvedValue([]);

      const result = await MetricsService.getReportsMetrics(mockDateRange);

      expect(result).toEqual({
        productivityByEmployee: [],
        averageLeadTime: 0,
        revenueByPeriod: [],
        totalProductionHours: 0,
        totalItemsProcessed: 0,
        overallProductivity: 0
      });
    });

    it('should calculate productivity metrics correctly', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock processing logs data
      const mockProcessingLogs = [
        {
          id: '1',
          durationInSeconds: 3600, // 1 hour
          user: { id: 'user1', name: 'John Doe' },
          station: { id: 'station1', name: 'Cutting' }
        },
        {
          id: '2',
          durationInSeconds: 7200, // 2 hours
          user: { id: 'user1', name: 'John Doe' },
          station: { id: 'station2', name: 'Sewing' }
        }
      ];

      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockResolvedValue(mockProcessingLogs);
      vi.mocked(unenhancedPrisma.itemProcessingLog.aggregate).mockResolvedValue({ _sum: { durationInSeconds: 10800 } });
      vi.mocked(unenhancedPrisma.itemProcessingLog.count).mockResolvedValue(2);
      vi.mocked(unenhancedPrisma.order.findMany).mockResolvedValue([]);

      const result = await MetricsService.getReportsMetrics(mockDateRange);

      expect(result.productivityByEmployee).toHaveLength(1);
      expect(result.productivityByEmployee[0]).toEqual({
        userId: 'user1',
        userName: 'John Doe',
        totalHours: 3, // 3600 + 7200 seconds = 3 hours
        itemsProcessed: 2,
        averageTimePerItem: 5400, // (3600 + 7200) / 2 = 5400 seconds
        stationBreakdown: expect.arrayContaining([
          {
            stationId: 'station1',
            stationName: 'Cutting',
            hoursWorked: 1,
            itemsProcessed: 1,
            averageTimePerItem: 3600
          },
          {
            stationId: 'station2',
            stationName: 'Sewing',
            hoursWorked: 2,
            itemsProcessed: 1,
            averageTimePerItem: 7200
          }
        ])
      });
      expect(result.totalProductionHours).toBe(3);
      expect(result.totalItemsProcessed).toBe(2);
      expect(result.overallProductivity).toBe(2/3); // 2 items / 3 hours
    });

    it('should calculate lead time correctly', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock orders with lead time data
      const mockOrders = [
        {
          createdAt: new Date('2024-01-01T10:00:00Z'),
          readyToShipAt: new Date('2024-01-02T10:00:00Z') // 24 hours later
        },
        {
          createdAt: new Date('2024-01-03T10:00:00Z'),
          readyToShipAt: new Date('2024-01-05T10:00:00Z') // 48 hours later
        }
      ];

      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockResolvedValue([]);
      vi.mocked(unenhancedPrisma.itemProcessingLog.aggregate).mockResolvedValue({ _sum: { durationInSeconds: null } });
      vi.mocked(unenhancedPrisma.itemProcessingLog.count).mockResolvedValue(0);
      vi.mocked(unenhancedPrisma.order.findMany).mockImplementation((args: any) => {
        if (args?.select?.createdAt) {
          return Promise.resolve(mockOrders);
        }
        return Promise.resolve([]);
      });

      const result = await MetricsService.getReportsMetrics(mockDateRange);

      expect(result.averageLeadTime).toBe(36); // (24 + 48) / 2 = 36 hours
    });

    it('should calculate revenue by period correctly', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock orders with revenue data
      const mockRevenueOrders = [
        {
          createdAt: new Date('2024-01-15T10:00:00Z'),
          totalAmount: 100
        },
        {
          createdAt: new Date('2024-01-20T10:00:00Z'),
          totalAmount: 200
        },
        {
          createdAt: new Date('2024-02-05T10:00:00Z'),
          totalAmount: 150
        }
      ];

      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockResolvedValue([]);
      vi.mocked(unenhancedPrisma.itemProcessingLog.aggregate).mockResolvedValue({ _sum: { durationInSeconds: null } });
      vi.mocked(unenhancedPrisma.itemProcessingLog.count).mockResolvedValue(0);
      vi.mocked(unenhancedPrisma.order.findMany).mockImplementation((args: any) => {
        if (args?.select?.totalAmount) {
          return Promise.resolve(mockRevenueOrders);
        }
        return Promise.resolve([]);
      });

      const result = await MetricsService.getReportsMetrics(mockDateRange);

      expect(result.revenueByPeriod).toEqual([
        {
          period: '2024-01',
          revenue: 300, // 100 + 200
          orderCount: 2
        },
        {
          period: '2024-02',
          revenue: 150,
          orderCount: 1
        }
      ]);
    });
  });
});