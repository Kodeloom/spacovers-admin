import { describe, it, expect, beforeEach, vi } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

// Mock the auth module
vi.mock('~/server/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}));

// Mock the database
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: {
    itemProcessingLog: {
      findMany: vi.fn()
    }
  }
}));

// Import the handler after mocking
import productivityHandler from '~/server/api/reports/productivity.get';
import { auth } from '~/server/lib/auth';

describe('Productivity API - Unique Item Counting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful authentication
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'user1', name: 'Test User' }
    });
  });

  it('should count unique items per employee, not total scans', async () => {
    // Mock processing logs with duplicate orderItemId for same employee
    const mockProcessingLogs = [
      {
        id: '1',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item1',
        durationInSeconds: 3600,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      },
      {
        id: '2',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item1', // Same item, different scan
        durationInSeconds: 1800,
        startTime: new Date('2025-01-01T11:00:00Z'),
        endTime: new Date('2025-01-01T11:30:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      },
      {
        id: '3',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item2', // Different item
        durationInSeconds: 2400,
        startTime: new Date('2025-01-01T12:00:00Z'),
        endTime: new Date('2025-01-01T12:40:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item2',
          item: { name: 'Test Item 2' },
          order: { orderNumber: 'ORD-002' }
        }
      }
    ];

    vi.mocked(prisma.itemProcessingLog.findMany).mockResolvedValue(mockProcessingLogs);

    // Create mock event
    const mockEvent = {
      headers: {},
      node: { req: {}, res: {} }
    };

    // Mock getQuery to return empty query
    global.getQuery = vi.fn().mockReturnValue({});
    global.createError = vi.fn().mockImplementation((error) => error);

    const result = await productivityHandler(mockEvent as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    
    const employeeData = result.data[0];
    expect(employeeData.userId).toBe('emp1');
    expect(employeeData.itemsProcessed).toBe(2); // Should be 2 unique items, not 3 scans
    expect(employeeData.totalDuration).toBe(7800); // Sum of all durations
    
    // Summary should also reflect unique item count
    expect(result.summary.totalItemsProcessed).toBe(2);
  });

  it('should count unique items across different employees correctly', async () => {
    const mockProcessingLogs = [
      {
        id: '1',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item1',
        durationInSeconds: 3600,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      },
      {
        id: '2',
        userId: 'emp2',
        stationId: 'station1',
        orderItemId: 'item1', // Same item, different employee
        durationInSeconds: 1800,
        startTime: new Date('2025-01-01T11:00:00Z'),
        endTime: new Date('2025-01-01T11:30:00Z'),
        user: { id: 'emp2', name: 'Employee 2', hourlyRate: 30 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      }
    ];

    vi.mocked(prisma.itemProcessingLog.findMany).mockResolvedValue(mockProcessingLogs);

    const mockEvent = {
      headers: {},
      node: { req: {}, res: {} }
    };

    global.getQuery = vi.fn().mockReturnValue({});

    const result = await productivityHandler(mockEvent as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    
    // Each employee should have 1 unique item
    result.data.forEach(employeeData => {
      expect(employeeData.itemsProcessed).toBe(1);
    });
    
    // Total should be 2 (1 item per employee, even though it's the same item)
    expect(result.summary.totalItemsProcessed).toBe(2);
  });

  it('should handle missing orderItemId gracefully', async () => {
    const mockProcessingLogs = [
      {
        id: '1',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: null, // Missing orderItemId
        durationInSeconds: 3600,
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: null
      },
      {
        id: '2',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item1',
        durationInSeconds: 1800,
        startTime: new Date('2025-01-01T11:00:00Z'),
        endTime: new Date('2025-01-01T11:30:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      }
    ];

    vi.mocked(prisma.itemProcessingLog.findMany).mockResolvedValue(mockProcessingLogs);

    const mockEvent = {
      headers: {},
      node: { req: {}, res: {} }
    };

    global.getQuery = vi.fn().mockReturnValue({});

    const result = await productivityHandler(mockEvent as any);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    
    const employeeData = result.data[0];
    expect(employeeData.itemsProcessed).toBe(1); // Should only count the valid orderItemId
  });

  it('should calculate efficiency based on unique items processed', async () => {
    const mockProcessingLogs = [
      {
        id: '1',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item1',
        durationInSeconds: 3600, // 1 hour
        startTime: new Date('2025-01-01T10:00:00Z'),
        endTime: new Date('2025-01-01T11:00:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item1',
          item: { name: 'Test Item' },
          order: { orderNumber: 'ORD-001' }
        }
      },
      {
        id: '2',
        userId: 'emp1',
        stationId: 'station1',
        orderItemId: 'item2',
        durationInSeconds: 3600, // 1 hour
        startTime: new Date('2025-01-01T11:00:00Z'),
        endTime: new Date('2025-01-01T12:00:00Z'),
        user: { id: 'emp1', name: 'Employee 1', hourlyRate: 25 },
        station: { id: 'station1', name: 'Cutting Station' },
        orderItem: {
          id: 'item2',
          item: { name: 'Test Item 2' },
          order: { orderNumber: 'ORD-002' }
        }
      }
    ];

    vi.mocked(prisma.itemProcessingLog.findMany).mockResolvedValue(mockProcessingLogs);

    const mockEvent = {
      headers: {},
      node: { req: {}, res: {} }
    };

    global.getQuery = vi.fn().mockReturnValue({});

    const result = await productivityHandler(mockEvent as any);

    expect(result.success).toBe(true);
    
    const employeeData = result.data[0];
    expect(employeeData.itemsProcessed).toBe(2); // 2 unique items
    expect(employeeData.totalDuration).toBe(7200); // 2 hours total
    expect(employeeData.efficiency).toBe(1); // 2 items / 2 hours = 1 item per hour
  });
});