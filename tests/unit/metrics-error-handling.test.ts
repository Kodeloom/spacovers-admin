import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService, type DateRange } from '~/utils/metricsService';

// Mock the Prisma client
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: {
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn()
    },
    orderItem: {
      groupBy: vi.fn()
    },
    itemProcessingLog: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn()
    }
  }
}));

describe('MetricsService Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date Range Validation', () => {
    it('should reject null date range', () => {
      const result = MetricsService.validateDateRange(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Date range is required');
    });

    it('should reject undefined date range', () => {
      const result = MetricsService.validateDateRange(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Date range is required');
    });

    it('should reject date range with null startDate', () => {
      const dateRange = { startDate: null as any, endDate: new Date() };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Both startDate and endDate are required');
    });

    it('should reject date range with undefined endDate', () => {
      const dateRange = { startDate: new Date(), endDate: undefined as any };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Both startDate and endDate are required');
    });

    it('should reject invalid Date objects', () => {
      const dateRange = { startDate: new Date('invalid'), endDate: new Date() };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be valid dates');
    });

    it('should reject startDate after endDate', () => {
      const dateRange = {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('startDate must be before or equal to endDate');
    });

    it('should reject dates too far in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10); // 10 days in future
      
      const dateRange = {
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000)
      };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be more than 1 day in the future');
    });

    it('should reject excessively large date ranges', () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01'); // 5 years
      
      const dateRange = { startDate, endDate };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Date range is too large');
    });

    it('should reject dates before minimum date', () => {
      const dateRange = {
        startDate: new Date('2019-01-01'), // Before 2020
        endDate: new Date('2019-12-31')
      };
      const result = MetricsService.validateDateRange(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be before 2020-01-01');
    });

    it('should accept valid date range and normalize it', () => {
      const dateRange = {
        startDate: new Date('2024-01-15T10:30:00'),
        endDate: new Date('2024-01-20T14:45:00')
      };
      const result = MetricsService.validateDateRange(dateRange);
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedRange).toBeDefined();
      expect(result.normalizedRange!.startDate.getHours()).toBe(0);
      expect(result.normalizedRange!.endDate.getHours()).toBe(23);
    });
  });

  describe('Safe Number Conversion', () => {
    it('should return fallback for null values', () => {
      expect(MetricsService.safeNumber(null, 10)).toBe(10);
    });

    it('should return fallback for undefined values', () => {
      expect(MetricsService.safeNumber(undefined, 5)).toBe(5);
    });

    it('should return fallback for NaN values', () => {
      expect(MetricsService.safeNumber('invalid', 0)).toBe(0);
    });

    it('should convert valid numbers correctly', () => {
      expect(MetricsService.safeNumber('123', 0)).toBe(123);
      expect(MetricsService.safeNumber(456.78, 0)).toBe(456.78);
    });

    it('should use default fallback of 0', () => {
      expect(MetricsService.safeNumber(null)).toBe(0);
    });
  });

  describe('Safe Division', () => {
    it('should return fallback for division by zero', () => {
      expect(MetricsService.safeDivision(10, 0, -1)).toBe(-1);
    });

    it('should return fallback for null denominator', () => {
      expect(MetricsService.safeDivision(10, null, 5)).toBe(5);
    });

    it('should return fallback for undefined numerator', () => {
      expect(MetricsService.safeDivision(undefined, 5, 2)).toBe(2);
    });

    it('should perform valid division correctly', () => {
      expect(MetricsService.safeDivision(10, 2, 0)).toBe(5);
      expect(MetricsService.safeDivision(7, 3, 0)).toBeCloseTo(2.333, 3);
    });

    it('should return fallback for invalid results', () => {
      expect(MetricsService.safeDivision(Infinity, 1, 0)).toBe(0);
    });

    it('should use default fallback of 0', () => {
      expect(MetricsService.safeDivision(10, 0)).toBe(0);
    });
  });

  describe('Dashboard Metrics Error Handling', () => {
    it('should return default metrics when all calculations fail', async () => {
      // Mock all database calls to throw errors
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      vi.mocked(unenhancedPrisma.order.aggregate).mockRejectedValue(new Error('Database error'));

      const metrics = await MetricsService.getDashboardMetrics();
      
      expect(metrics).toEqual({
        totalOrders: 0,
        revenueThisMonth: 0,
        ordersThisWeek: 0,
        pendingOrders: 0,
        inProduction: 0,
        readyToShip: 0
      });
    });

    it('should handle partial failures gracefully', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock some calls to succeed, others to fail
      vi.mocked(unenhancedPrisma.order.count)
        .mockResolvedValueOnce(5) // totalOrders succeeds
        .mockRejectedValueOnce(new Error('Database error')) // pendingOrders fails
        .mockResolvedValueOnce(3) // inProduction succeeds
        .mockResolvedValueOnce(2); // readyToShip succeeds

      vi.mocked(unenhancedPrisma.order.aggregate)
        .mockResolvedValueOnce({ _sum: { totalAmount: 1000 } }) // revenue succeeds
        .mockResolvedValueOnce({ _count: { id: 8 } } as any); // orders this week succeeds

      const metrics = await MetricsService.getDashboardMetrics();
      
      expect(metrics.totalOrders).toBe(5);
      expect(metrics.revenueThisMonth).toBe(1000);
      expect(metrics.pendingOrders).toBe(0); // Failed, should be fallback
      expect(metrics.inProduction).toBe(3);
      expect(metrics.readyToShip).toBe(2);
    });
  });

  describe('Reports Metrics Error Handling', () => {
    it('should reject invalid date range', async () => {
      const invalidRange = {
        startDate: new Date('invalid'),
        endDate: new Date()
      };

      const metrics = await MetricsService.getReportsMetrics(invalidRange);
      
      // Should return default metrics due to validation failure
      expect(metrics).toEqual({
        productivityByEmployee: [],
        averageLeadTime: 0,
        revenueByPeriod: [],
        totalProductionHours: 0,
        totalItemsProcessed: 0,
        overallProductivity: 0
      });
    });

    it('should handle database errors gracefully', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock all database calls to fail
      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockRejectedValue(new Error('DB Error'));
      vi.mocked(unenhancedPrisma.order.findMany).mockRejectedValue(new Error('DB Error'));
      vi.mocked(unenhancedPrisma.itemProcessingLog.aggregate).mockRejectedValue(new Error('DB Error'));
      vi.mocked(unenhancedPrisma.itemProcessingLog.count).mockRejectedValue(new Error('DB Error'));

      const validRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const metrics = await MetricsService.getReportsMetrics(validRange);
      
      expect(metrics).toEqual({
        productivityByEmployee: [],
        averageLeadTime: 0,
        revenueByPeriod: [],
        totalProductionHours: 0,
        totalItemsProcessed: 0,
        overallProductivity: 0
      });
    });
  });

  describe('Null/Undefined Data Handling', () => {
    it('should handle null revenue values correctly', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock aggregate to return null sum
      vi.mocked(unenhancedPrisma.order.aggregate).mockResolvedValue({
        _sum: { totalAmount: null }
      });

      const revenue = await MetricsService.getRevenueThisMonth();
      expect(revenue).toBe(0);
    });

    it('should handle missing user/station data in productivity calculation', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock processing logs with missing data
      vi.mocked(unenhancedPrisma.itemProcessingLog.findMany).mockResolvedValue([
        {
          id: '1',
          user: null, // Missing user
          station: { id: 'station1', name: 'Station 1' },
          durationInSeconds: 3600,
          startTime: new Date(),
          endTime: new Date()
        },
        {
          id: '2',
          user: { id: 'user1', name: 'User 1' },
          station: null, // Missing station
          durationInSeconds: 1800,
          startTime: new Date(),
          endTime: new Date()
        },
        {
          id: '3',
          user: { id: 'user2', name: 'User 2' },
          station: { id: 'station2', name: 'Station 2' },
          durationInSeconds: null, // Missing duration
          startTime: new Date(),
          endTime: new Date()
        }
      ] as any);

      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const productivity = await (MetricsService as any).getProductivityByEmployee(dateRange);
      
      // Should return empty array since all logs have missing critical data
      expect(productivity).toEqual([]);
    });
  });
});