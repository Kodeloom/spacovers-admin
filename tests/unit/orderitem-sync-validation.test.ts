/**
 * Unit tests for OrderItem sync validation utilities
 * Tests the validation functions that ensure proper order isolation during sync operations
 * Requirements: 2.1, 2.2, 2.3, 3.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database
const mockPrisma = {
  orderItem: {
    findMany: vi.fn(),
    findUnique: vi.fn()
  },
  order: {
    findUnique: vi.fn()
  }
};

// Mock the database import
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: mockPrisma
}));

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};
vi.stubGlobal('console', mockConsole);

describe('OrderItem Sync Validation - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateOrderItemSync', () => {
    it('should validate successful sync operation when no conflicts exist', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const { validateOrderItemSync } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'create');

      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
      
      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: {
          quickbooksOrderLineId: 'QBO-LINE-001',
          orderId: { not: 'order-123' }
        },
        select: {
          id: true,
          orderId: true,
          order: {
            select: {
              salesOrderNumber: true
            }
          }
        }
      });
    });

    it('should detect conflicts when QuickBooks line ID exists in other orders', async () => {
      const conflictingOrderItems = [
        {
          id: 'orderitem-456',
          orderId: 'order-456',
          order: { salesOrderNumber: 'SO-002' }
        },
        {
          id: 'orderitem-789',
          orderId: 'order-789',
          order: { salesOrderNumber: 'SO-003' }
        }
      ];

      mockPrisma.orderItem.findMany.mockResolvedValue(conflictingOrderItems);

      const { validateOrderItemSync } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'create');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('QBO-LINE-001 already exists in other orders');
      expect(result.message).toContain('Order SO-002 (ID: order-456)');
      expect(result.message).toContain('Order SO-003 (ID: order-789)');
    });

    it('should allow updates to existing OrderItem in same order', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const { validateOrderItemSync } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'update');

      expect(result.isValid).toBe(true);
      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: {
          quickbooksOrderLineId: 'QBO-LINE-001',
          orderId: { not: 'order-123' }
        },
        select: expect.any(Object)
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.orderItem.findMany.mockRejectedValue(dbError);

      const { validateOrderItemSync } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'create');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validation error: Database connection failed');
      expect(mockConsole.error).toHaveBeenCalledWith('Error validating OrderItem sync:', dbError);
    });
  });

  describe('validateOrderItemIsolation', () => {
    it('should validate properly isolated order items', async () => {
      const orderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-001',
          itemId: 'item-1',
          item: { name: 'Test Item 1' }
        },
        {
          id: 'orderitem-2',
          quickbooksOrderLineId: 'QBO-LINE-002',
          itemId: 'item-2',
          item: { name: 'Test Item 2' }
        }
      ];

      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(orderItems) // Initial query for order items
        .mockResolvedValueOnce([]) // Cross-order check for first item
        .mockResolvedValueOnce([]); // Cross-order check for second item

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.itemCount).toBe(2);
    });

    it('should detect duplicate QuickBooks line IDs within same order', async () => {
      const orderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-DUPLICATE',
          itemId: 'item-1',
          item: { name: 'Test Item 1' }
        },
        {
          id: 'orderitem-2',
          quickbooksOrderLineId: 'QBO-LINE-DUPLICATE',
          itemId: 'item-2',
          item: { name: 'Test Item 2' }
        }
      ];

      mockPrisma.orderItem.findMany.mockResolvedValue(orderItems);

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Duplicate QuickBooks line IDs within order: QBO-LINE-DUPLICATE');
      expect(result.itemCount).toBe(2);
    });

    it('should detect cross-order contamination', async () => {
      const orderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-CONTAMINATED',
          itemId: 'item-1',
          item: { name: 'Test Item 1' }
        }
      ];

      const crossOrderItems = [
        {
          orderId: 'order-456',
          order: { salesOrderNumber: 'SO-002' }
        }
      ];

      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(orderItems) // Initial query
        .mockResolvedValueOnce(crossOrderItems); // Cross-order contamination check

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('OrderItem orderitem-1 (Test Item 1) shares QuickBooks line ID');
      expect(result.issues[0]).toContain('QBO-LINE-CONTAMINATED with orders: SO-002 (order-456)');
    });

    it('should handle orders with no QuickBooks line IDs', async () => {
      const orderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: null,
          itemId: 'item-1',
          item: { name: 'Test Item 1' }
        },
        {
          id: 'orderitem-2',
          quickbooksOrderLineId: 'QBO-LINE-002',
          itemId: 'item-2',
          item: { name: 'Test Item 2' }
        }
      ];

      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(orderItems)
        .mockResolvedValueOnce([]); // Only check items with QuickBooks line IDs

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.itemCount).toBe(2);
    });

    it('should handle validation errors gracefully', async () => {
      const dbError = new Error('Database query failed');
      mockPrisma.orderItem.findMany.mockRejectedValue(dbError);

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain('Validation error: Database query failed');
      expect(result.itemCount).toBe(0);
      expect(mockConsole.error).toHaveBeenCalledWith('Error validating order item isolation:', dbError);
    });
  });

  describe('logOrderItemSyncValidation', () => {
    it('should log successful sync operations', async () => {
      const { logOrderItemSyncValidation } = await import('~/server/utils/orderItemSyncValidation');
      
      const operation = {
        orderId: 'order-123',
        quickbooksOrderLineId: 'QBO-LINE-001',
        itemId: 'item-123',
        operation: 'create' as const,
        source: 'webhook' as const,
        success: true
      };

      await logOrderItemSyncValidation(operation);

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[OrderItemSync] CREATE SUCCESS',
        expect.objectContaining({
          orderId: 'order-123',
          quickbooksOrderLineId: 'QBO-LINE-001',
          itemId: 'item-123',
          source: 'webhook',
          timestamp: expect.any(String)
        })
      );
    });

    it('should log failed sync operations with error details', async () => {
      const { logOrderItemSyncValidation } = await import('~/server/utils/orderItemSyncValidation');
      
      const operation = {
        orderId: 'order-123',
        quickbooksOrderLineId: 'QBO-LINE-001',
        itemId: 'item-123',
        operation: 'update' as const,
        source: 'manual_sync' as const,
        success: false,
        error: 'Validation failed: duplicate line ID'
      };

      await logOrderItemSyncValidation(operation);

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[OrderItemSync] UPDATE FAILED',
        expect.objectContaining({
          orderId: 'order-123',
          quickbooksOrderLineId: 'QBO-LINE-001',
          itemId: 'item-123',
          source: 'manual_sync',
          error: 'Validation failed: duplicate line ID',
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle logging errors gracefully', async () => {
      // Mock console.log to throw an error
      mockConsole.log.mockImplementation(() => {
        throw new Error('Logging system failure');
      });

      const { logOrderItemSyncValidation } = await import('~/server/utils/orderItemSyncValidation');
      
      const operation = {
        orderId: 'order-123',
        quickbooksOrderLineId: 'QBO-LINE-001',
        itemId: 'item-123',
        operation: 'create' as const,
        source: 'webhook' as const,
        success: true
      };

      // Should not throw even if logging fails
      await expect(logOrderItemSyncValidation(operation)).resolves.toBeUndefined();

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Failed to log OrderItem sync operation:',
        expect.any(Error)
      );
    });
  });

  describe('fixOrderItemRelationships', () => {
    it('should report success for orders with proper relationships', async () => {
      const mockOrder = {
        id: 'order-123',
        quickbooksOrderId: 'QBO-ORDER-123',
        salesOrderNumber: 'SO-001'
      };

      const mockOrderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-001',
          itemId: 'item-1'
        }
      ];

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(mockOrderItems) // Initial query
        .mockResolvedValueOnce(mockOrderItems) // Validation query
        .mockResolvedValueOnce([]); // Cross-order check

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('order-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('relationships are already correct');
      expect(result.itemsProcessed).toBe(1);
    });

    it('should handle orders with no QuickBooks ID', async () => {
      const mockOrder = {
        id: 'order-123',
        quickbooksOrderId: null,
        salesOrderNumber: 'SO-001'
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('order-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('has no QuickBooks ID');
      expect(result.itemsProcessed).toBe(0);
    });

    it('should handle non-existent orders', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('nonexistent-order');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(result.itemsProcessed).toBe(0);
    });

    it('should detect orders with no items', async () => {
      const mockOrder = {
        id: 'order-123',
        quickbooksOrderId: 'QBO-ORDER-123',
        salesOrderNumber: 'SO-001'
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('order-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('has no items');
      expect(result.itemsProcessed).toBe(0);
    });

    it('should detect relationship issues', async () => {
      const mockOrder = {
        id: 'order-123',
        quickbooksOrderId: 'QBO-ORDER-123',
        salesOrderNumber: 'SO-001'
      };

      const mockOrderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-CONTAMINATED',
          itemId: 'item-1'
        }
      ];

      const mockContaminatedItems = [
        {
          orderId: 'order-456',
          order: { salesOrderNumber: 'SO-002' }
        }
      ];

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(mockOrderItems) // Initial query
        .mockResolvedValueOnce(mockOrderItems) // Validation query
        .mockResolvedValueOnce(mockContaminatedItems); // Cross-order contamination

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('order-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('relationship issues');
      expect(result.itemsProcessed).toBe(1);
    });

    it('should handle database errors during fix operation', async () => {
      const dbError = new Error('Database connection lost');
      mockPrisma.order.findUnique.mockRejectedValue(dbError);

      const { fixOrderItemRelationships } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await fixOrderItemRelationships('order-123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Fix operation failed: Database connection lost');
      expect(result.itemsProcessed).toBe(0);
      expect(mockConsole.error).toHaveBeenCalledWith('Error fixing order item relationships:', dbError);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined QuickBooks line IDs', async () => {
      const orderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: null,
          itemId: 'item-1',
          item: { name: 'Test Item 1' }
        },
        {
          id: 'orderitem-2',
          quickbooksOrderLineId: undefined,
          itemId: 'item-2',
          item: { name: 'Test Item 2' }
        }
      ];

      mockPrisma.orderItem.findMany.mockResolvedValue(orderItems);

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.itemCount).toBe(2);
    });

    it('should handle empty order validation', async () => {
      mockPrisma.orderItem.findMany.mockResolvedValue([]);

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      const result = await validateOrderItemIsolation('empty-order');

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.itemCount).toBe(0);
    });

    it('should handle malformed order data gracefully', async () => {
      const malformedOrderItems = [
        {
          id: 'orderitem-1',
          quickbooksOrderLineId: 'QBO-LINE-001',
          itemId: 'item-1',
          item: null // Malformed item relationship
        }
      ];

      mockPrisma.orderItem.findMany
        .mockResolvedValueOnce(malformedOrderItems)
        .mockResolvedValueOnce([]);

      const { validateOrderItemIsolation } = await import('~/server/utils/orderItemSyncValidation');
      
      // Should not throw even with malformed data
      const result = await validateOrderItemIsolation('order-123');

      expect(result.isValid).toBe(true);
      expect(result.itemCount).toBe(1);
    });
  });
});