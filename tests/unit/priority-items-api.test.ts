/**
 * Unit tests for Priority Items API endpoint
 * Tests the warehouse priority items endpoint functionality
 * Requirements: 2.1, 2.2, 2.4, 5.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { OrderItemProcessingStatus, OrderPriority } from '@prisma-app/client';

// Mock the database
const mockPrisma = {
  orderItem: {
    findMany: vi.fn()
  }
};

// Mock the database import
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: mockPrisma
}));

// Mock auth
vi.mock('~/server/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'test-user-id', role: 'WAREHOUSE' }
      })
    }
  }
}));

// Mock createError
vi.mock('h3', () => ({
  createError: vi.fn((error) => {
    const err = new Error(error.statusMessage);
    (err as any).statusCode = error.statusCode;
    throw err;
  })
}))
}));

describe('Priority Items API - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/warehouse/priority-items', () => {
    it('should return priority items with correct filtering and sorting', async () => {
      const mockPriorityItems = [
        {
          id: 'orderitem-1',
          itemStatus: 'NOT_STARTED_PRODUCTION' as OrderItemProcessingStatus,
          createdAt: new Date('2024-01-01'),
          order: {
            id: 'order-1',
            salesOrderNumber: 'SO-001',
            priority: 'HIGH' as OrderPriority,
            createdAt: new Date('2024-01-01'),
            dueDate: new Date('2024-01-15'),
            customer: {
              name: 'Urgent Customer'
            }
          },
          item: {
            name: 'Urgent Spa Cover'
          }
        },
        {
          id: 'orderitem-2',
          itemStatus: 'CUTTING' as OrderItemProcessingStatus,
          createdAt: new Date('2024-01-02'),
          order: {
            id: 'order-2',
            salesOrderNumber: 'SO-002',
            priority: 'MEDIUM' as OrderPriority,
            createdAt: new Date('2024-01-02'),
            dueDate: null,
            customer: {
              name: 'Regular Customer'
            }
          },
          item: {
            name: 'Standard Cover'
          }
        }
      ];

      mockPrisma.orderItem.findMany.mockResolvedValue(mockPriorityItems);

      // Import and test the priority items endpoint
      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {} as any;

      const result = await priorityItemsHandler(mockEvent);

      // Verify the query was made with correct filters
      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: {
          itemStatus: {
            in: ['NOT_STARTED_PRODUCTION', 'CUTTING']
          },
          order: {
            orderStatus: {
              notIn: ['CANCELLED', 'ARCHIVED']
            }
          }
        },
        include: {
          order: {
            select: {
              id: true,
              salesOrderNumber: true,
              priority: true,
              createdAt: true,
              dueDate: true,
              customer: {
                select: {
                  name: true
                }
              }
            }
          },
          item: {
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { order: { priority: 'desc' } },
          { order: { createdAt: 'asc' } },
          { createdAt: 'asc' }
        ],
        take: 50
      });

      // Verify response structure
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta.totalCount).toBe(2);

      // Verify first item (urgent)
      const firstItem = result.data[0];
      expect(firstItem.orderNumber).toBe('SO-001');
      expect(firstItem.itemName).toBe('Urgent Spa Cover');
      expect(firstItem.customerName).toBe('Urgent Customer');
      expect(firstItem.status).toBe('PENDING'); // NOT_STARTED_PRODUCTION mapped to PENDING
      expect(firstItem.isUrgent).toBe(true);
      expect(firstItem.estimatedDueDate).toBe('2024-01-15T00:00:00.000Z');

      // Verify second item (regular)
      const secondItem = result.data[1];
      expect(secondItem.orderNumber).toBe('SO-002');
      expect(secondItem.itemName).toBe('Standard Cover');
      expect(secondItem.customerName).toBe('Regular Customer');
      expect(secondItem.status).toBe('CUTTING');
      expect(secondItem.isUrgent).toBe(false);
      expect(secondItem.estimatedDueDate).toBe(null);
    });

    it('should handle empty results gracefully', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {} as any;

      const result = await priorityItemsHandler(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalCount).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.orderItem.findMany.mockRejectedValue(new Error('Database connection failed'));

      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {} as any;

      const result = await priorityItemsHandler(mockEvent);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch priority items');
      expect(result.data).toHaveLength(0);
      expect(result.meta.totalCount).toBe(0);
    });

    it('should handle missing order number gracefully', async () => {
      const mockItemWithoutOrderNumber = {
        id: 'orderitem-1',
        itemStatus: 'NOT_STARTED_PRODUCTION' as OrderItemProcessingStatus,
        createdAt: new Date('2024-01-01'),
        order: {
          id: 'order-without-number',
          salesOrderNumber: null,
          priority: 'HIGH' as OrderPriority,
          createdAt: new Date('2024-01-01'),
          dueDate: null,
          customer: {
            name: 'Test Customer'
          }
        },
        item: {
          name: 'Test Item'
        }
      };

      mockPrisma.orderItem.findMany.mockResolvedValue([mockItemWithoutOrderNumber]);

      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {} as any;

      const result = await priorityItemsHandler(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data[0].orderNumber).toBe('r-number'); // Last 8 chars of order ID
    });

    it('should handle missing item or customer names gracefully', async () => {
      const mockItemWithMissingData = {
        id: 'orderitem-1',
        itemStatus: 'CUTTING' as OrderItemProcessingStatus,
        createdAt: new Date('2024-01-01'),
        order: {
          id: 'order-1',
          salesOrderNumber: 'SO-001',
          priority: 'MEDIUM' as OrderPriority,
          createdAt: new Date('2024-01-01'),
          dueDate: null,
          customer: null
        },
        item: null
      };

      mockPrisma.orderItem.findMany.mockResolvedValue([mockItemWithMissingData]);

      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {} as any;

      const result = await priorityItemsHandler(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data[0].itemName).toBe('Unknown Item');
      expect(result.data[0].customerName).toBe('Unknown Customer');
    });

    it('should return 401 for unauthorized requests', async () => {
      // Mock auth to return no session
      const { auth } = await import('~/server/lib/auth');
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

      const { default: priorityItemsHandler } = await import('~/server/api/warehouse/priority-items.get');
      
      const mockEvent = {
        headers: {}
      } as any;

      await expect(priorityItemsHandler(mockEvent)).rejects.toThrow('Unauthorized');
    });
  });
});