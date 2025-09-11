import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from '~/utils/metricsService';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the database
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: {
    order: {
      count: vi.fn(),
      aggregate: vi.fn()
    }
  }
}));

describe('MetricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTotalOrders', () => {
    it('should return correct total orders count', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockResolvedValue(5);
      
      const result = await MetricsService.getTotalOrders();
      expect(result).toBe(5);
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getTotalOrders();
      expect(result).toBe(0);
    });
  });

  describe('getRevenueThisMonth', () => {
    it('should return correct revenue for current month', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.aggregate).mockResolvedValue({
        _sum: { totalAmount: new Decimal(1500.50) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {}
      } as any);
      
      const result = await MetricsService.getRevenueThisMonth();
      expect(result).toBe(1500.50);
    });

    it('should return 0 when no revenue data exists', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.aggregate).mockResolvedValue({
        _sum: { totalAmount: null },
        _count: {},
        _avg: {},
        _min: {},
        _max: {}
      } as any);
      
      const result = await MetricsService.getRevenueThisMonth();
      expect(result).toBe(0);
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.aggregate).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getRevenueThisMonth();
      expect(result).toBe(0);
    });
  });

  describe('getOrdersThisWeek', () => {
    it('should return correct orders count for current week', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockResolvedValue(3);
      
      const result = await MetricsService.getOrdersThisWeek();
      expect(result).toBe(3);
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getOrdersThisWeek();
      expect(result).toBe(0);
    });
  });

  describe('getPendingOrders', () => {
    it('should return correct pending orders count', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockResolvedValue(3);
      
      const result = await MetricsService.getPendingOrders();
      expect(result).toBe(3);
      expect(unenhancedPrisma.order.count).toHaveBeenCalledWith({
        where: { orderStatus: 'PENDING' }
      });
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getPendingOrders();
      expect(result).toBe(0);
    });
  });

  describe('getInProduction', () => {
    it('should return correct in production orders count', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockResolvedValue(5);
      
      const result = await MetricsService.getInProduction();
      expect(result).toBe(5);
      expect(unenhancedPrisma.order.count).toHaveBeenCalledWith({
        where: { orderStatus: 'ORDER_PROCESSING' }
      });
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getInProduction();
      expect(result).toBe(0);
    });
  });

  describe('getReadyToShip', () => {
    it('should return correct ready to ship orders count', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockResolvedValue(2);
      
      const result = await MetricsService.getReadyToShip();
      expect(result).toBe(2);
      expect(unenhancedPrisma.order.count).toHaveBeenCalledWith({
        where: { orderStatus: 'READY_TO_SHIP' }
      });
    });

    it('should return 0 on database error', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('Database error'));
      
      const result = await MetricsService.getReadyToShip();
      expect(result).toBe(0);
    });
  });

  describe('getDashboardMetrics', () => {
    it('should return complete dashboard metrics', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock all the individual method calls
      vi.mocked(unenhancedPrisma.order.count)
        .mockResolvedValueOnce(10) // getTotalOrders
        .mockResolvedValueOnce(3)  // getOrdersThisWeek
        .mockResolvedValueOnce(2)  // getPendingOrders
        .mockResolvedValueOnce(5)  // getInProduction
        .mockResolvedValueOnce(1); // getReadyToShip
      
      vi.mocked(unenhancedPrisma.order.aggregate).mockResolvedValue({
        _sum: { totalAmount: new Decimal(2500.75) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {}
      } as any);
      
      const result = await MetricsService.getDashboardMetrics();
      
      expect(result).toEqual({
        totalOrders: 10,
        revenueThisMonth: 2500.75,
        ordersThisWeek: 3,
        pendingOrders: 2,
        inProduction: 5,
        readyToShip: 1
      });
    });

    it('should handle partial failures gracefully', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock some successes and some failures
      vi.mocked(unenhancedPrisma.order.count)
        .mockResolvedValueOnce(10) // getTotalOrders - success
        .mockRejectedValueOnce(new Error('DB error')) // getOrdersThisWeek - failure
        .mockResolvedValueOnce(2)  // getPendingOrders - success
        .mockResolvedValueOnce(5)  // getInProduction - success
        .mockResolvedValueOnce(1); // getReadyToShip - success
      
      vi.mocked(unenhancedPrisma.order.aggregate).mockResolvedValue({
        _sum: { totalAmount: new Decimal(2500.75) },
        _count: {},
        _avg: {},
        _min: {},
        _max: {}
      } as any);
      
      const result = await MetricsService.getDashboardMetrics();
      
      expect(result).toEqual({
        totalOrders: 10,
        revenueThisMonth: 2500.75,
        ordersThisWeek: 0, // Failed, should fallback to 0
        pendingOrders: 2,
        inProduction: 5,
        readyToShip: 1
      });
    });

    it('should return default metrics on complete failure', async () => {
      const { unenhancedPrisma } = await import('~/server/lib/db');
      
      // Mock all calls to fail
      vi.mocked(unenhancedPrisma.order.count).mockRejectedValue(new Error('DB error'));
      vi.mocked(unenhancedPrisma.order.aggregate).mockRejectedValue(new Error('DB error'));
      
      const result = await MetricsService.getDashboardMetrics();
      
      expect(result).toEqual({
        totalOrders: 0,
        revenueThisMonth: 0,
        ordersThisWeek: 0,
        pendingOrders: 0,
        inProduction: 0,
        readyToShip: 0
      });
    });
  });
});