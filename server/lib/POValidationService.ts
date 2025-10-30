import { POValidationRepository, POValidationRepositoryImpl } from './POValidationRepository';
import { CacheService } from '../../utils/cacheService';
import { 
  getPOValidationErrorDetails, 
  createPOValidationContext, 
  logPOValidationError,
  handlePOValidationDatabaseError,
  validatePOValidationInput,
  retryPOValidation,
  type POValidationError,
  type POValidationErrorContext
} from '../../utils/poValidationErrorHandling';

export interface POValidationResult {
  isDuplicate: boolean;
  existingOrders?: any[];
  existingItems?: any[];
  warningMessage?: string;
}

export interface POValidationService {
  checkOrderLevelDuplicate(poNumber: string, customerId: string, excludeOrderId?: string): Promise<POValidationResult>;
  checkItemLevelDuplicate(poNumber: string, customerId: string, excludeOrderItemId?: string): Promise<POValidationResult>;
}

export class POValidationServiceImpl implements POValidationService {
  private repository: POValidationRepository;
  
  // Cache TTL for PO validation results (5 minutes)
  private static readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(repository: POValidationRepository = new POValidationRepositoryImpl()) {
    this.repository = repository;
  }

  /**
   * Check for duplicate PO numbers at the order level with comprehensive error handling
   * @param poNumber - The PO number to validate
   * @param customerId - The customer ID to scope the validation to
   * @param excludeOrderId - Optional order ID to exclude from the check (for updates)
   * @returns POValidationResult with duplicate status and existing orders
   */
  async checkOrderLevelDuplicate(
    poNumber: string, 
    customerId: string, 
    excludeOrderId?: string
  ): Promise<POValidationResult> {
    const context = createPOValidationContext(
      'checkOrderLevelDuplicate',
      poNumber,
      customerId,
      'order',
      excludeOrderId
    );

    try {
      // Enhanced input validation
      const inputError = validatePOValidationInput(poNumber, customerId, 'order');
      if (inputError) {
        logPOValidationError(inputError, context);
        return {
          isDuplicate: false,
          warningMessage: inputError.userMessage
        };
      }

      // Generate cache key for this validation
      const cacheKey = this.getOrderValidationCacheKey(poNumber, customerId, excludeOrderId);
      
      // Check cache first with error handling
      let cachedResult: POValidationResult | null = null;
      try {
        cachedResult = CacheService.get<POValidationResult>(cacheKey);
        if (cachedResult) {
          context.cacheStatus = 'hit';
          return cachedResult;
        }
        context.cacheStatus = 'miss';
      } catch (cacheError) {
        context.cacheStatus = 'error';
        console.warn('Cache error during PO validation:', cacheError);
        // Continue without cache
      }

      // Perform validation with retry mechanism
      const validationResult = await retryPOValidation(async () => {
        // Query for existing orders with the same PO number
        const existingOrders = await this.repository.findOrdersByPO(poNumber, customerId);

        // Filter out the excluded order if provided
        const filteredOrders = excludeOrderId 
          ? existingOrders.filter(order => order.id !== excludeOrderId)
          : existingOrders;

        const isDuplicate = filteredOrders.length > 0;
        
        return {
          isDuplicate,
          existingOrders: isDuplicate ? filteredOrders : undefined,
          warningMessage: isDuplicate 
            ? this.generateOrderDuplicateWarning(poNumber, filteredOrders)
            : undefined
        };
      }, context);

      // Cache the result with error handling
      try {
        CacheService.set(cacheKey, validationResult, POValidationServiceImpl.CACHE_TTL);
      } catch (cacheError) {
        console.warn('Failed to cache PO validation result:', cacheError);
        // Continue without caching
      }

      return validationResult;

    } catch (error) {
      // Enhanced error handling and logging
      const poError = this.handleValidationError(error, context);
      logPOValidationError(poError, context);
      
      // Return safe fallback result with enhanced error message
      return {
        isDuplicate: false,
        warningMessage: poError.userMessage || 'Unable to validate PO number. Please verify manually that this PO is not already in use.'
      };
    }
  }

  /**
   * Check for duplicate PO numbers at the item level (ProductAttributes) with comprehensive error handling
   * @param poNumber - The PO number to validate
   * @param customerId - The customer ID to scope the validation to
   * @param excludeOrderItemId - Optional order item ID to exclude from the check (for updates)
   * @returns POValidationResult with duplicate status and existing items
   */
  async checkItemLevelDuplicate(
    poNumber: string, 
    customerId: string, 
    excludeOrderItemId?: string
  ): Promise<POValidationResult> {
    const context = createPOValidationContext(
      'checkItemLevelDuplicate',
      poNumber,
      customerId,
      'item',
      excludeOrderItemId
    );

    try {
      // Enhanced input validation
      const inputError = validatePOValidationInput(poNumber, customerId, 'item');
      if (inputError) {
        logPOValidationError(inputError, context);
        return {
          isDuplicate: false,
          warningMessage: inputError.userMessage
        };
      }

      // Generate cache key for this validation
      const cacheKey = this.getItemValidationCacheKey(poNumber, customerId, excludeOrderItemId);
      
      // Check cache first with error handling
      let cachedResult: POValidationResult | null = null;
      try {
        cachedResult = CacheService.get<POValidationResult>(cacheKey);
        if (cachedResult) {
          context.cacheStatus = 'hit';
          return cachedResult;
        }
        context.cacheStatus = 'miss';
      } catch (cacheError) {
        context.cacheStatus = 'error';
        console.warn('Cache error during PO validation:', cacheError);
        // Continue without cache
      }

      // Perform validation with retry mechanism
      const validationResult = await retryPOValidation(async () => {
        // Query for existing items with the same PO number in ProductAttributes
        const existingItems = await this.repository.findItemsByPO(poNumber, customerId);

        // Filter out the excluded order item if provided
        const filteredItems = excludeOrderItemId 
          ? existingItems.filter(item => item.id !== excludeOrderItemId)
          : existingItems;

        const isDuplicate = filteredItems.length > 0;
        
        return {
          isDuplicate,
          existingItems: isDuplicate ? filteredItems : undefined,
          warningMessage: isDuplicate 
            ? this.generateItemDuplicateWarning(poNumber, filteredItems)
            : undefined
        };
      }, context);

      // Cache the result with error handling
      try {
        CacheService.set(cacheKey, validationResult, POValidationServiceImpl.CACHE_TTL);
      } catch (cacheError) {
        console.warn('Failed to cache PO validation result:', cacheError);
        // Continue without caching
      }

      return validationResult;

    } catch (error) {
      // Enhanced error handling and logging
      const poError = this.handleValidationError(error, context);
      logPOValidationError(poError, context);
      
      // Return safe fallback result with enhanced error message
      return {
        isDuplicate: false,
        warningMessage: poError.userMessage || 'Unable to validate PO number. Please verify manually that this PO is not already in use.'
      };
    }
  }

  /**
   * Generate cache key for order-level validation
   * @param poNumber - PO number
   * @param customerId - Customer ID
   * @param excludeOrderId - Optional order ID to exclude
   * @returns Cache key string
   */
  private getOrderValidationCacheKey(poNumber: string, customerId: string, excludeOrderId?: string): string {
    const baseKey = `po_validation:order:${customerId}:${poNumber}`;
    return excludeOrderId ? `${baseKey}:exclude:${excludeOrderId}` : baseKey;
  }

  /**
   * Generate cache key for item-level validation
   * @param poNumber - PO number
   * @param customerId - Customer ID
   * @param excludeOrderItemId - Optional order item ID to exclude
   * @returns Cache key string
   */
  private getItemValidationCacheKey(poNumber: string, customerId: string, excludeOrderItemId?: string): string {
    const baseKey = `po_validation:item:${customerId}:${poNumber}`;
    return excludeOrderItemId ? `${baseKey}:exclude:${excludeOrderItemId}` : baseKey;
  }

  /**
   * Generate warning message for order-level duplicates
   * @param poNumber - PO number
   * @param existingOrders - Array of existing orders with the same PO
   * @returns Warning message string
   */
  private generateOrderDuplicateWarning(poNumber: string, existingOrders: any[]): string {
    if (existingOrders.length === 1) {
      const order = existingOrders[0];
      const orderNumber = order.salesOrderNumber || order.id.slice(-8);
      return `Warning: PO # "${poNumber}" is already used in Order #${orderNumber}. Do you want to proceed?`;
    } else {
      const orderNumbers = existingOrders
        .map(order => order.salesOrderNumber || order.id.slice(-8))
        .join(', ');
      return `Warning: PO # "${poNumber}" is already used in ${existingOrders.length} orders (${orderNumbers}). Do you want to proceed?`;
    }
  }

  /**
   * Generate warning message for item-level duplicates
   * @param poNumber - PO number
   * @param existingItems - Array of existing items with the same PO
   * @returns Warning message string
   */
  private generateItemDuplicateWarning(poNumber: string, existingItems: any[]): string {
    if (existingItems.length === 1) {
      const item = existingItems[0];
      const productName = item.product?.displayName || item.item?.name || 'Unknown Product';
      const orderNumber = item.order?.salesOrderNumber || item.order?.id.slice(-8);
      return `Warning: PO # "${poNumber}" is already used for "${productName}" in Order #${orderNumber}. Do you want to proceed?`;
    } else {
      const productNames = existingItems
        .map(item => item.product?.displayName || item.item?.name || 'Unknown Product')
        .slice(0, 3) // Show first 3 products
        .join(', ');
      const moreText = existingItems.length > 3 ? ` and ${existingItems.length - 3} more` : '';
      return `Warning: PO # "${poNumber}" is already used for ${existingItems.length} products (${productNames}${moreText}). Do you want to proceed?`;
    }
  }

  /**
   * Invalidate cached validation results for a specific customer
   * Should be called when orders or product attributes are modified
   * @param customerId - Customer ID to invalidate cache for
   */
  static invalidateCustomerCache(customerId: string): void {
    CacheService.invalidatePattern(`po_validation:order:${customerId}`);
    CacheService.invalidatePattern(`po_validation:item:${customerId}`);
  }

  /**
   * Invalidate cached validation results for a specific PO number and customer
   * @param poNumber - PO number to invalidate cache for
   * @param customerId - Customer ID to invalidate cache for
   */
  static invalidatePOCache(poNumber: string, customerId: string): void {
    CacheService.invalidatePattern(`po_validation:order:${customerId}:${poNumber}`);
    CacheService.invalidatePattern(`po_validation:item:${customerId}:${poNumber}`);
  }

  /**
   * Clear all PO validation cache entries
   */
  static clearAllCache(): void {
    CacheService.invalidatePattern('po_validation');
  }

  /**
   * Handle validation errors and convert to standardized error format
   * @param error - The original error
   * @param context - Validation context
   * @returns Standardized POValidationError
   */
  private handleValidationError(error: any, context: POValidationErrorContext): POValidationError {
    // Handle database-specific errors
    if (error.code && error.code.startsWith('P')) {
      return handlePOValidationDatabaseError(error, context);
    }

    // Handle network/fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        ...getPOValidationErrorDetails('NETWORK_CONNECTION_ERROR'),
        context,
        details: error.message
      };
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        ...getPOValidationErrorDetails('DATABASE_TIMEOUT'),
        context,
        details: error.message
      };
    }

    // Handle permission errors
    if (error.statusCode === 401 || error.statusCode === 403) {
      const errorCode = error.statusCode === 401 ? 'SESSION_EXPIRED' : 'INSUFFICIENT_PERMISSIONS';
      return {
        ...getPOValidationErrorDetails(errorCode),
        context,
        details: error.message
      };
    }

    // Handle cache errors
    if (error.message && error.message.includes('cache')) {
      return {
        ...getPOValidationErrorDetails('CACHE_ERROR'),
        context,
        details: error.message
      };
    }

    // Generic validation service error
    return {
      ...getPOValidationErrorDetails('VALIDATION_SERVICE_ERROR'),
      context,
      details: error.message || 'Unknown error occurred'
    };
  }
}

// Export a default instance for convenience
export const poValidationService = new POValidationServiceImpl();