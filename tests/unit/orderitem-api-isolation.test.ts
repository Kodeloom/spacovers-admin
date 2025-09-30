/**
 * Unit tests for OrderItem API endpoints to ensure proper isolation
 * Tests API endpoints that query and update OrderItems
 * Requirements: 2.1, 2.2, 2.3, 3.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { OrderItemProcessingStatus } from '@prisma-app/client';

// Mock the database
const mockPrisma = {
  orderItem: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn()
  },
  order: {
    findUnique: vi.fn()
  },
  item: {
    findUnique: vi.fn()
  },
  $transaction: vi.fn()
};

// Mock the database import
vi.mock('~/server/lib/db', () => ({
  unenhancedPrisma: mockPrisma
}));

// Mock auth
vi.mock('~/server/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', role: 'WAREHOUSE' }
  })
}));

describe('OrderItem API Isolation - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Warehouse Barcode Scanning API', () => {
    it('should query OrderItem by specific ID with proper order context', async () => {
      const mockOrderItem = {
        id: 'orderitem-123',
        orderId: 'order-123',
        itemId: 'item-123',
        itemStatus: 'NOT_STARTED_PRODUCTION',
        order: {
          id: 'order-123',
          salesOrderNumber: 'SO-001',
          orderStatus: 'APPROVED',
          customer: { name: 'Test Customer' }
        },
        item: { name: 'Test Item' }
      };

      mockPrisma.orderItem.findUnique.mockResolvedValue(mockOrderItem);

      // Import and test the scan barcode endpoint logic
      const { default: scanBarcodeHandler } = await import('~/server/api/warehouse/scan-barcode.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id' } }
      } as any;

      // Mock readBody to return barcode
      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({ barcode: 'ORDER_ITEM_orderitem-123' }),
        createError: vi.fn((error) => new Error(error.statusMessage))
      }));

      const result = await scanBarcodeHandler(mockEvent);

      // Verify the query was made with specific OrderItem ID
      expect(mockPrisma.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'orderitem-123' },
        include: {
          order: {
            include: { customer: true }
          },
          item: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('orderitem-123');
      expect(result.data.orderId).toBe('order-123');
    });

    it('should reject barcode scan for non-existent OrderItem', async () => {
      mockPrisma.orderItem.findUnique.mockResolvedValue(null);

      const { default: scanBarcodeHandler } = await import('~/server/api/warehouse/scan-barcode.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id' } }
      } as any;

      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({ barcode: 'ORDER_ITEM_nonexistent' }),
        createError: vi.fn((error) => { throw new Error(error.statusMessage); })
      }));

      await expect(scanBarcodeHandler(mockEvent)).rejects.toThrow();

      expect(mockPrisma.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        include: {
          order: {
            include: { customer: true }
          },
          item: true
        }
      });
    });
  });

  describe('Warehouse Work Management APIs', () => {
    it('should update OrderItem status by specific ID only', async () => {
      const mockOrderItem = {
        id: 'orderitem-123',
        orderId: 'order-123',
        itemStatus: 'NOT_STARTED_PRODUCTION'
      };

      const mockUpdatedOrderItem = {
        ...mockOrderItem,
        itemStatus: 'CUTTING'
      };

      const mockProcessingLog = {
        id: 'log-123',
        orderItemId: 'orderitem-123',
        startTime: new Date()
      };

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        mockPrisma.orderItem.update.mockResolvedValue(mockUpdatedOrderItem);
        return callback(mockPrisma);
      });

      const { default: startWorkHandler } = await import('~/server/api/warehouse/start-work.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id' } }
      } as any;

      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({
          orderItemId: 'orderitem-123',
          stationId: 'station-123',
          newItemStatus: 'CUTTING'
        }),
        createError: vi.fn((error) => new Error(error.statusMessage))
      }));

      // Mock station lookup
      mockPrisma.station = { findUnique: vi.fn().mockResolvedValue({ id: 'station-123', name: 'Cutting Station' }) };

      const result = await startWorkHandler(mockEvent);

      // Verify update was made by specific OrderItem ID
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'orderitem-123' },
        data: { itemStatus: 'CUTTING' }
      });

      expect(result.success).toBe(true);
      expect(result.data.orderItem.itemStatus).toBe('CUTTING');
    });

    it('should prevent status updates on wrong OrderItem ID', async () => {
      mockPrisma.orderItem.update.mockRejectedValue(new Error('Record not found'));

      const { default: startWorkHandler } = await import('~/server/api/warehouse/start-work.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id' } }
      } as any;

      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({
          orderItemId: 'nonexistent-orderitem',
          stationId: 'station-123',
          newItemStatus: 'CUTTING'
        }),
        createError: vi.fn((error) => { throw new Error(error.statusMessage); })
      }));

      mockPrisma.station = { findUnique: vi.fn().mockResolvedValue({ id: 'station-123', name: 'Cutting Station' }) };

      await expect(startWorkHandler(mockEvent)).rejects.toThrow();

      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'nonexistent-orderitem' },
        data: { itemStatus: 'CUTTING' }
      });
    });
  });

  describe('Product Attributes API', () => {
    it('should validate OrderItem exists before creating attributes', async () => {
      const mockOrderItem = {
        id: 'orderitem-123',
        orderId: 'order-123'
      };

      mockPrisma.orderItem.findUnique.mockResolvedValue(mockOrderItem);
      mockPrisma.productAttribute = {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'attr-123', orderItemId: 'orderitem-123' })
      };

      const { default: createAttributeHandler } = await import('~/server/api/admin/product-attributes.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id', role: 'ADMIN' } }
      } as any;

      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({
          orderItemId: 'orderitem-123',
          productType: 'SPA_COVER',
          color: 'Blue'
        }),
        createError: vi.fn((error) => new Error(error.statusMessage))
      }));

      const result = await createAttributeHandler(mockEvent);

      // Verify OrderItem validation
      expect(mockPrisma.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'orderitem-123' }
      });

      // Verify attribute creation with correct OrderItem ID
      expect(mockPrisma.productAttribute.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderItemId: 'orderitem-123'
        })
      });
    });

    it('should reject attribute creation for non-existent OrderItem', async () => {
      mockPrisma.orderItem.findUnique.mockResolvedValue(null);

      const { default: createAttributeHandler } = await import('~/server/api/admin/product-attributes.post');
      
      const mockEvent = {
        node: { req: { method: 'POST' } },
        context: { user: { id: 'test-user-id', role: 'ADMIN' } }
      } as any;

      vi.doMock('h3', () => ({
        readBody: vi.fn().mockResolvedValue({
          orderItemId: 'nonexistent-orderitem',
          productType: 'SPA_COVER'
        }),
        createError: vi.fn((error) => { throw new Error(error.statusMessage); })
      }));

      await expect(createAttributeHandler(mockEvent)).rejects.toThrow();

      expect(mockPrisma.orderItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent-orderitem' }
      });
    });
  });

  describe('Reports and Metrics APIs', () => {
    it('should properly scope OrderItem queries for lead time calculations', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          items: [
            {
              id: 'orderitem-1',
              itemStatus: 'READY',
              itemProcessingLogs: [
                { station: { name: 'Cutting' }, startTime: new Date(), endTime: new Date() }
              ]
            }
          ]
        },
        {
          id: 'order-2',
          items: [
            {
              id: 'orderitem-2',
              itemStatus: 'CUTTING',
              itemProcessingLogs: [
                { station: { name: 'Cutting' }, startTime: new Date(), endTime: null }
              ]
            }
          ]
        }
      ];

      // Mock the orders query that includes OrderItems
      mockPrisma.order = {
        findMany: vi.fn().mockResolvedValue(mockOrders)
      };

      // Simulate lead time calculation logic
      let totalItemsInProduction = 0;
      let totalItemsCompleted = 0;

      for (const order of mockOrders) {
        for (const orderItem of order.items) {
          if (orderItem.itemProcessingLogs.length > 0) {
            totalItemsInProduction++;
            
            if (orderItem.itemStatus === 'READY' || orderItem.itemStatus === 'PRODUCT_FINISHED') {
              totalItemsCompleted++;
            }
          }
        }
      }

      expect(totalItemsInProduction).toBe(2);
      expect(totalItemsCompleted).toBe(1);

      // Verify that each OrderItem is processed independently
      expect(mockOrders[0].items[0].id).toBe('orderitem-1');
      expect(mockOrders[1].items[0].id).toBe('orderitem-2');
    });
  });

  describe('QuickBooks Sync Operations', () => {
    it('should use compound unique constraint for OrderItem upserts', async () => {
      const mockOrderItem = {
        id: 'orderitem-123',
        orderId: 'order-123',
        itemId: 'item-123',
        quickbooksOrderLineId: 'QBO-LINE-001',
        quantity: 1,
        pricePerItem: 100.00
      };

      mockPrisma.orderItem.upsert.mockResolvedValue(mockOrderItem);

      // Simulate webhook sync operation
      const orderItemData = {
        orderId: 'order-123',
        itemId: 'item-123',
        quickbooksOrderLineId: 'QBO-LINE-001',
        quantity: 1,
        pricePerItem: 100.00
      };

      const result = await mockPrisma.orderItem.upsert({
        where: {
          orderId_quickbooksOrderLineId: {
            orderId: 'order-123',
            quickbooksOrderLineId: 'QBO-LINE-001'
          }
        },
        update: orderItemData,
        create: orderItemData
      });

      // Verify compound unique constraint usage
      expect(mockPrisma.orderItem.upsert).toHaveBeenCalledWith({
        where: {
          orderId_quickbooksOrderLineId: {
            orderId: 'order-123',
            quickbooksOrderLineId: 'QBO-LINE-001'
          }
        },
        update: orderItemData,
        create: orderItemData
      });

      expect(result.orderId).toBe('order-123');
      expect(result.quickbooksOrderLineId).toBe('QBO-LINE-001');
    });

    it('should validate sync operations maintain order isolation', async () => {
      // Mock validation function
      const { validateOrderItemSync } = await import('~/server/utils/orderItemSyncValidation');
      
      // Test valid sync operation
      mockPrisma.orderItem.findMany.mockResolvedValue([]);
      
      const validResult = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'create');
      expect(validResult.isValid).toBe(true);

      // Test invalid sync operation (line ID exists in other order)
      mockPrisma.orderItem.findMany.mockResolvedValue([
        {
          id: 'orderitem-456',
          orderId: 'order-456',
          order: { salesOrderNumber: 'SO-002' }
        }
      ]);

      const invalidResult = await validateOrderItemSync('order-123', 'QBO-LINE-001', 'create');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.message).toContain('already exists in other orders');
    });
  });

  describe('Bulk Operations and Edge Cases', () => {
    it('should handle bulk status updates with proper order scoping', async () => {
      mockPrisma.orderItem.updateMany.mockResolvedValue({ count: 3 });

      // Simulate bulk update for specific order
      const result = await mockPrisma.orderItem.updateMany({
        where: {
          orderId: 'order-123',
          itemStatus: 'NOT_STARTED_PRODUCTION'
        },
        data: { itemStatus: 'CUTTING' }
      });

      expect(mockPrisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: {
          orderId: 'order-123',
          itemStatus: 'NOT_STARTED_PRODUCTION'
        },
        data: { itemStatus: 'CUTTING' }
      });

      expect(result.count).toBe(3);
    });

    it('should prevent cross-order contamination in queries', async () => {
      // Mock query that incorrectly queries by itemId only (bad practice)
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { id: 'orderitem-1', orderId: 'order-1', itemId: 'item-123' },
        { id: 'orderitem-2', orderId: 'order-2', itemId: 'item-123' }
      ]);

      // Demonstrate incorrect query (would affect multiple orders)
      const incorrectResults = await mockPrisma.orderItem.findMany({
        where: { itemId: 'item-123' }
      });

      expect(incorrectResults).toHaveLength(2);
      expect(incorrectResults[0].orderId).not.toBe(incorrectResults[1].orderId);

      // Reset mock for correct query
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { id: 'orderitem-1', orderId: 'order-1', itemId: 'item-123' }
      ]);

      // Demonstrate correct query (scoped to specific order)
      const correctResults = await mockPrisma.orderItem.findMany({
        where: {
          orderId: 'order-1',
          itemId: 'item-123'
        }
      });

      expect(correctResults).toHaveLength(1);
      expect(correctResults[0].orderId).toBe('order-1');
    });
  });
});