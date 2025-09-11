import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from '~/utils/metricsService';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

// Mock the database
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: {
    itemProcessingLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn()
    }
  }
}));

describe('MetricsService - Unique Item Counting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReportsMetrics', () => {
    it('should count unique items in productivity calculations', async () => {
      const dateRange = {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-01T23:59:59Z')
      };

      // Mock processing logs with duplicate orderItemId
      const mockProcessingLogs = [
        {
          userId: 'emp1',
          orderItemId: 'item1',
          durationInSeconds: 3600,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        },
        {
          userId: 'emp1',
          orderItemId: 'item1', // Same item, different scan
          durationInSeconds: 1800,
          startTime: new Date('2025-01-01T11:00:00Z'),
          endTime: new Date('2025-01-01T11:30:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        },
        {
          userId: 'emp1',
          orderItemId: 'item2', // Different item
          durationInSeconds: 2400,
          startTime: new Date('2025-01-01T12:00:00Z'),
          endTime: new Date('2025-01-01T12:40:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        }
      ];

      // Mock the various database calls that getReportsMetrics makes
      vi.mocked(prisma.itemProcessingLog.findMany).mockImplementation((args: any) => {
        if (args?.select?.orderItemId && args?.distinct) {
          // This is the getTotalItemsProcessed call
          return Promise.resolve([
            { orderItemId: 'item1' },
            { orderItemId: 'item2' }
          ]);
        }
        // This is the getProductivityByEmployee call
        return Promise.resolve(mockProcessingLogs);
      });

      // Mock other required calls
      vi.mocked(prisma.itemProcessingLog.aggregate).mockResolvedValue({
        _sum: { durationInSeconds: 7800 }
      });

      // Mock order queries for lead time (empty results)
      const mockOrderFindMany = vi.fn().mockResolvedValue([]);
      (prisma as any).order = { findMany: mockOrderFindMany };

      const result = await MetricsService.getReportsMetrics(dateRange);

      expect(result.productivityByEmployee).toHaveLength(1);
      
      const employeeData = result.productivityByEmployee[0];
      expect(employeeData.userId).toBe('emp1');
      expect(employeeData.itemsProcessed).toBe(2); // Should be 2 unique items, not 3 scans
      expect(employeeData.totalHours).toBeCloseTo(2.17, 1); // 7800 seconds / 3600
      
      // Station breakdown should also count unique items
      expect(employeeData.stationBreakdown).toHaveLength(1);
      expect(employeeData.stationBreakdown[0].itemsProcessed).toBe(2);
      
      // Total items processed should be unique count
      expect(result.totalItemsProcessed).toBe(2);
    });

    it('should handle unique items across different employees and stations', async () => {
      const dateRange = {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-01T23:59:59Z')
      };

      const mockProcessingLogs = [
        {
          userId: 'emp1',
          orderItemId: 'item1',
          durationInSeconds: 3600,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        },
        {
          userId: 'emp2',
          orderItemId: 'item1', // Same item, different employee
          durationInSeconds: 1800,
          startTime: new Date('2025-01-01T11:00:00Z'),
          endTime: new Date('2025-01-01T11:30:00Z'),
          user: { id: 'emp2', name: 'Employee 2' },
          station: { id: 'station2', name: 'Sewing Station' }
        },
        {
          userId: 'emp1',
          orderItemId: 'item2',
          durationInSeconds: 2400,
          startTime: new Date('2025-01-01T12:00:00Z'),
          endTime: new Date('2025-01-01T12:40:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        }
      ];

      vi.mocked(prisma.itemProcessingLog.findMany).mockImplementation((args: any) => {
        if (args?.select?.orderItemId && args?.distinct) {
          return Promise.resolve([
            { orderItemId: 'item1' },
            { orderItemId: 'item2' }
          ]);
        }
        return Promise.resolve(mockProcessingLogs);
      });

      vi.mocked(prisma.itemProcessingLog.aggregate).mockResolvedValue({
        _sum: { durationInSeconds: 7800 }
      });

      const mockOrderFindMany = vi.fn().mockResolvedValue([]);
      (prisma as any).order = { findMany: mockOrderFindMany };

      const result = await MetricsService.getReportsMetrics(dateRange);

      expect(result.productivityByEmployee).toHaveLength(2);
      
      // Employee 1 should have 2 unique items (item1 and item2)
      const emp1Data = result.productivityByEmployee.find(emp => emp.userId === 'emp1');
      expect(emp1Data?.itemsProcessed).toBe(2);
      
      // Employee 2 should have 1 unique item (item1)
      const emp2Data = result.productivityByEmployee.find(emp => emp.userId === 'emp2');
      expect(emp2Data?.itemsProcessed).toBe(1);
      
      // Total unique items should be 2 (item1 and item2)
      expect(result.totalItemsProcessed).toBe(2);
    });

    it('should handle missing orderItemId gracefully', async () => {
      const dateRange = {
        startDate: new Date('2025-01-01T00:00:00Z'),
        endDate: new Date('2025-01-01T23:59:59Z')
      };

      const mockProcessingLogs = [
        {
          userId: 'emp1',
          orderItemId: null, // Missing orderItemId
          durationInSeconds: 3600,
          startTime: new Date('2025-01-01T10:00:00Z'),
          endTime: new Date('2025-01-01T11:00:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        },
        {
          userId: 'emp1',
          orderItemId: 'item1',
          durationInSeconds: 1800,
          startTime: new Date('2025-01-01T11:00:00Z'),
          endTime: new Date('2025-01-01T11:30:00Z'),
          user: { id: 'emp1', name: 'Employee 1' },
          station: { id: 'station1', name: 'Cutting Station' }
        }
      ];

      vi.mocked(prisma.itemProcessingLog.findMany).mockImplementation((args: any) => {
        if (args?.select?.orderItemId && args?.distinct) {
          return Promise.resolve([{ orderItemId: 'item1' }]);
        }
        return Promise.resolve(mockProcessingLogs);
      });

      vi.mocked(prisma.itemProcessingLog.aggregate).mockResolvedValue({
        _sum: { durationInSeconds: 5400 }
      });

      const mockOrderFindMany = vi.fn().mockResolvedValue([]);
      (prisma as any).order = { findMany: mockOrderFindMany };

      const result = await MetricsService.getReportsMetrics(dateRange);

      expect(result.productivityByEmployee).toHaveLength(1);
      
      const employeeData = result.productivityByEmployee[0];
      expect(employeeData.itemsProcessed).toBe(1); // Should only count the valid orderItemId
      expect(result.totalItemsProcessed).toBe(1);
    });
  });
});