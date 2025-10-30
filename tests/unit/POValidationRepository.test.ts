import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POValidationRepositoryImpl } from '~/server/lib/POValidationRepository';

// Mock the database
const mockPrisma = {
  order: {
    findMany: vi.fn(),
  },
  orderItem: {
    findMany: vi.fn(),
  },
};

describe('POValidationRepository', () => {
  let repository: POValidationRepositoryImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new POValidationRepositoryImpl(mockPrisma as any);
  });

  describe('findOrdersByPO', () => {
    it('should return orders with matching PO number for the customer', async () => {
      const mockOrders = [
        {
          id: 'order1',
          poNumber: 'PO123',
          customerId: 'customer1',
          customer: { id: 'customer1', name: 'Test Customer' },
          createdAt: new Date(),
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await repository.findOrdersByPO('PO123', 'customer1');

      expect(result).toEqual(mockOrders);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          poNumber: 'PO123',
          customerId: 'customer1',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when poNumber is empty', async () => {
      const result = await repository.findOrdersByPO('', 'customer1');
      expect(result).toEqual([]);
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when customerId is empty', async () => {
      const result = await repository.findOrdersByPO('PO123', '');
      expect(result).toEqual([]);
      expect(mockPrisma.order.findMany).not.toHaveBeenCalled();
    });

    it('should throw error when database query fails', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(repository.findOrdersByPO('PO123', 'customer1')).rejects.toThrow(
        'Failed to search orders by PO number'
      );
    });
  });

  describe('findItemsByPO', () => {
    it('should return order items with matching PO number in ProductAttributes for the customer', async () => {
      const mockOrderItems = [
        {
          id: 'item1',
          order: {
            id: 'order1',
            salesOrderNumber: 'SO123',
            customerId: 'customer1',
            customer: { id: 'customer1', name: 'Test Customer' },
          },
          item: { id: 'item1', name: 'Test Item' },
          product: { id: 'product1', displayName: 'Test Product', fullDescription: 'Full desc' },
          productAttributes: { id: 'attr1', poNumber: 'PO123', color: 'Blue', size: '10x10', shape: 'Square' },
          createdAt: new Date(),
        },
      ];

      mockPrisma.orderItem.findMany.mockResolvedValue(mockOrderItems);

      const result = await repository.findItemsByPO('PO123', 'customer1');

      expect(result).toEqual(mockOrderItems);
      expect(mockPrisma.orderItem.findMany).toHaveBeenCalledWith({
        where: {
          order: {
            customerId: 'customer1',
          },
          productAttributes: {
            poNumber: 'PO123',
          },
        },
        include: {
          order: {
            select: {
              id: true,
              salesOrderNumber: true,
              customerId: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          item: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              displayName: true,
              fullDescription: true,
            },
          },
          productAttributes: {
            select: {
              id: true,
              poNumber: true,
              color: true,
              size: true,
              shape: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when poNumber is empty', async () => {
      const result = await repository.findItemsByPO('', 'customer1');
      expect(result).toEqual([]);
      expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array when customerId is empty', async () => {
      const result = await repository.findItemsByPO('PO123', '');
      expect(result).toEqual([]);
      expect(mockPrisma.orderItem.findMany).not.toHaveBeenCalled();
    });

    it('should throw error when database query fails', async () => {
      mockPrisma.orderItem.findMany.mockRejectedValue(new Error('Database error'));

      await expect(repository.findItemsByPO('PO123', 'customer1')).rejects.toThrow(
        'Failed to search items by PO number'
      );
    });
  });
});