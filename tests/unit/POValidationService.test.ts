import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POValidationServiceImpl } from '../../server/lib/POValidationService';
import type { POValidationResult } from '../../server/lib/POValidationService';
import type { POValidationRepository } from '../../server/lib/POValidationRepository';
import { CacheService } from '../../utils/cacheService';

// Mock the cache service
vi.mock('../../utils/cacheService', () => ({
  CacheService: {
    get: vi.fn(),
    set: vi.fn(),
    invalidatePattern: vi.fn(),
  }
}));

describe('POValidationService', () => {
  let service: POValidationServiceImpl;
  let mockRepository: POValidationRepository;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Create mock repository
    mockRepository = {
      findOrdersByPO: vi.fn(),
      findItemsByPO: vi.fn(),
    };

    // Create service with mock repository
    service = new POValidationServiceImpl(mockRepository);
  });

  describe('checkOrderLevelDuplicate', () => {
    it('should return no duplicate when no existing orders found', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      
      vi.mocked(mockRepository.findOrdersByPO).mockResolvedValue([]);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkOrderLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result).toEqual({
        isDuplicate: false,
        existingOrders: undefined,
        warningMessage: undefined,
      });
      expect(mockRepository.findOrdersByPO).toHaveBeenCalledWith(poNumber, customerId);
      expect(CacheService.set).toHaveBeenCalled();
    });

    it('should return duplicate when existing orders found', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const existingOrders = [
        {
          id: 'order-1',
          salesOrderNumber: 'SO-001',
          poNumber: 'PO-12345',
          customerId: 'customer-1',
        }
      ];
      
      vi.mocked(mockRepository.findOrdersByPO).mockResolvedValue(existingOrders);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkOrderLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result.isDuplicate).toBe(true);
      expect(result.existingOrders).toEqual(existingOrders);
      expect(result.warningMessage).toContain('PO-12345');
      expect(result.warningMessage).toContain('SO-001');
    });

    it('should exclude specified order from duplicate check', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const excludeOrderId = 'order-1';
      const existingOrders = [
        {
          id: 'order-1',
          salesOrderNumber: 'SO-001',
          poNumber: 'PO-12345',
          customerId: 'customer-1',
        }
      ];
      
      vi.mocked(mockRepository.findOrdersByPO).mockResolvedValue(existingOrders);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkOrderLevelDuplicate(poNumber, customerId, excludeOrderId);

      // Assert
      expect(result.isDuplicate).toBe(false);
      expect(result.existingOrders).toBeUndefined();
    });

    it('should return cached result when available', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const cachedResult: POValidationResult = {
        isDuplicate: true,
        existingOrders: [],
        warningMessage: 'Cached warning',
      };
      
      vi.mocked(CacheService.get).mockReturnValue(cachedResult);

      // Act
      const result = await service.checkOrderLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result).toEqual(cachedResult);
      expect(mockRepository.findOrdersByPO).not.toHaveBeenCalled();
    });

    it('should handle empty inputs gracefully', async () => {
      // Act
      const result1 = await service.checkOrderLevelDuplicate('', 'customer-1');
      const result2 = await service.checkOrderLevelDuplicate('PO-123', '');

      // Assert
      expect(result1.isDuplicate).toBe(false);
      expect(result2.isDuplicate).toBe(false);
      expect(mockRepository.findOrdersByPO).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      
      vi.mocked(mockRepository.findOrdersByPO).mockRejectedValue(new Error('Database error'));
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkOrderLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result.isDuplicate).toBe(false);
      expect(result.warningMessage).toContain('Unable to validate');
    });
  });

  describe('checkItemLevelDuplicate', () => {
    it('should return no duplicate when no existing items found', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      
      vi.mocked(mockRepository.findItemsByPO).mockResolvedValue([]);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkItemLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result).toEqual({
        isDuplicate: false,
        existingItems: undefined,
        warningMessage: undefined,
      });
      expect(mockRepository.findItemsByPO).toHaveBeenCalledWith(poNumber, customerId);
    });

    it('should return duplicate when existing items found', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const existingItems = [
        {
          id: 'item-1',
          product: { displayName: 'Spa Cover' },
          item: { name: 'Cover Item' },
          order: { salesOrderNumber: 'SO-001' },
        }
      ];
      
      vi.mocked(mockRepository.findItemsByPO).mockResolvedValue(existingItems);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkItemLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result.isDuplicate).toBe(true);
      expect(result.existingItems).toEqual(existingItems);
      expect(result.warningMessage).toContain('PO-12345');
      expect(result.warningMessage).toContain('Spa Cover');
    });

    it('should exclude specified order item from duplicate check', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const excludeOrderItemId = 'item-1';
      const existingItems = [
        {
          id: 'item-1',
          product: { displayName: 'Spa Cover' },
          item: { name: 'Cover Item' },
          order: { salesOrderNumber: 'SO-001' },
        }
      ];
      
      vi.mocked(mockRepository.findItemsByPO).mockResolvedValue(existingItems);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkItemLevelDuplicate(poNumber, customerId, excludeOrderItemId);

      // Assert
      expect(result.isDuplicate).toBe(false);
      expect(result.existingItems).toBeUndefined();
    });

    it('should handle multiple existing items', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      const existingItems = [
        {
          id: 'item-1',
          product: { displayName: 'Spa Cover 1' },
          item: { name: 'Cover Item 1' },
          order: { salesOrderNumber: 'SO-001' },
        },
        {
          id: 'item-2',
          product: { displayName: 'Spa Cover 2' },
          item: { name: 'Cover Item 2' },
          order: { salesOrderNumber: 'SO-002' },
        }
      ];
      
      vi.mocked(mockRepository.findItemsByPO).mockResolvedValue(existingItems);
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkItemLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result.isDuplicate).toBe(true);
      expect(result.warningMessage).toContain('2 products');
      expect(result.warningMessage).toContain('Spa Cover 1, Spa Cover 2');
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const poNumber = 'PO-12345';
      const customerId = 'customer-1';
      
      vi.mocked(mockRepository.findItemsByPO).mockRejectedValue(new Error('Database error'));
      vi.mocked(CacheService.get).mockReturnValue(null);

      // Act
      const result = await service.checkItemLevelDuplicate(poNumber, customerId);

      // Assert
      expect(result.isDuplicate).toBe(false);
      expect(result.warningMessage).toContain('Unable to validate');
    });
  });

  describe('static cache methods', () => {
    it('should invalidate customer cache', () => {
      // Act
      POValidationServiceImpl.invalidateCustomerCache('customer-1');

      // Assert
      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('po_validation:order:customer-1');
      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('po_validation:item:customer-1');
    });

    it('should invalidate PO cache', () => {
      // Act
      POValidationServiceImpl.invalidatePOCache('PO-123', 'customer-1');

      // Assert
      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('po_validation:order:customer-1:PO-123');
      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('po_validation:item:customer-1:PO-123');
    });

    it('should clear all cache', () => {
      // Act
      POValidationServiceImpl.clearAllCache();

      // Assert
      expect(CacheService.invalidatePattern).toHaveBeenCalledWith('po_validation');
    });
  });
});