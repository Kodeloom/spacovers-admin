import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma-app/client';
import { PrintQueueRepositoryImpl } from '../../server/lib/PrintQueueRepository';

// Mock PrismaClient for testing
const mockPrisma = {
  printQueue: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe('PrintQueueRepository', () => {
  let repository: PrintQueueRepositoryImpl;

  beforeEach(() => {
    repository = new PrintQueueRepositoryImpl(mockPrisma);
    vi.clearAllMocks();
  });

  describe('addItems', () => {
    it('should return empty array when no order item IDs provided', async () => {
      const result = await repository.addItems([]);
      expect(result).toEqual([]);
    });

    it('should filter out existing items and create new ones', async () => {
      const orderItemIds = ['item1', 'item2', 'item3'];
      const existingItems = [{ orderItemId: 'item1' }];
      
      (mockPrisma.printQueue.findMany as any).mockResolvedValueOnce(existingItems);
      (mockPrisma.printQueue.createMany as any).mockResolvedValueOnce({});
      (mockPrisma.printQueue.findMany as any).mockResolvedValueOnce([
        { id: '1', orderItemId: 'item1', isPrinted: false, addedAt: new Date() },
        { id: '2', orderItemId: 'item2', isPrinted: false, addedAt: new Date() },
        { id: '3', orderItemId: 'item3', isPrinted: false, addedAt: new Date() },
      ]);

      await repository.addItems(orderItemIds, 'user123');

      expect(mockPrisma.printQueue.createMany).toHaveBeenCalledWith({
        data: [
          { orderItemId: 'item2', addedBy: 'user123', isPrinted: false, addedAt: expect.any(Date) },
          { orderItemId: 'item3', addedBy: 'user123', isPrinted: false, addedAt: expect.any(Date) },
        ],
      });
    });
  });

  describe('getUnprintedItems', () => {
    it('should return unprinted items ordered by addedAt ascending', async () => {
      const mockItems = [
        { id: '1', orderItemId: 'item1', isPrinted: false, addedAt: new Date('2024-01-01') },
        { id: '2', orderItemId: 'item2', isPrinted: false, addedAt: new Date('2024-01-02') },
      ];

      (mockPrisma.printQueue.findMany as any).mockResolvedValueOnce(mockItems);

      const result = await repository.getUnprintedItems();

      expect(mockPrisma.printQueue.findMany).toHaveBeenCalledWith({
        where: { isPrinted: false },
        include: expect.any(Object),
        orderBy: { addedAt: 'asc' },
      });
      expect(result).toEqual(mockItems);
    });
  });

  describe('markAsPrinted', () => {
    it('should update items to printed status', async () => {
      const queueItemIds = ['queue1', 'queue2'];
      
      (mockPrisma.printQueue.updateMany as any).mockResolvedValueOnce({});

      await repository.markAsPrinted(queueItemIds, 'user123');

      expect(mockPrisma.printQueue.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: queueItemIds },
          isPrinted: false,
        },
        data: {
          isPrinted: true,
          printedAt: expect.any(Date),
          printedBy: 'user123',
        },
      });
    });
  });

  describe('getOldestBatch', () => {
    it('should return oldest items up to batch size', async () => {
      const mockItems = [
        { id: '1', orderItemId: 'item1', isPrinted: false, addedAt: new Date('2024-01-01') },
        { id: '2', orderItemId: 'item2', isPrinted: false, addedAt: new Date('2024-01-02') },
      ];

      (mockPrisma.printQueue.findMany as any).mockResolvedValueOnce(mockItems);

      const result = await repository.getOldestBatch(4);

      expect(mockPrisma.printQueue.findMany).toHaveBeenCalledWith({
        where: { isPrinted: false },
        include: expect.any(Object),
        orderBy: { addedAt: 'asc' },
        take: 4,
      });
      expect(result).toEqual(mockItems);
    });

    it('should return empty array for invalid batch size', async () => {
      const result = await repository.getOldestBatch(0);
      expect(result).toEqual([]);
    });
  });

  describe('removeItems', () => {
    it('should delete items from queue', async () => {
      const queueItemIds = ['queue1', 'queue2'];
      
      (mockPrisma.printQueue.deleteMany as any).mockResolvedValueOnce({});

      await repository.removeItems(queueItemIds);

      expect(mockPrisma.printQueue.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: queueItemIds },
        },
      });
    });

    it('should handle empty array gracefully', async () => {
      await repository.removeItems([]);
      expect(mockPrisma.printQueue.deleteMany).not.toHaveBeenCalled();
    });
  });
});