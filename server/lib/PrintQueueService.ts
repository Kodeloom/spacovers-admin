import { PrintQueueRepository, PrintQueueRepositoryImpl, PrintQueueItem } from './PrintQueueRepository';
import { CacheService } from '../../utils/cacheService';
import { logError, retryWithBackoff, handlePrismaError, type ErrorDetails } from '../../utils/errorHandling';

export interface PrintBatch {
  items: PrintQueueItem[];
  canPrintWithoutWarning: boolean;
  warningMessage?: string;
}

export interface QueueStatus {
  totalItems: number;
  readyToPrint: number;
  requiresWarning: boolean;
}

export interface PrintQueueService {
  addToQueue(orderItemIds: string[], addedBy?: string): Promise<PrintQueueItem[]>;
  getNextBatch(): Promise<PrintBatch>;
  markBatchPrinted(queueItemIds: string[], printedBy?: string): Promise<void>;
  canPrintBatch(): Promise<boolean>;
  getQueueStatus(): Promise<QueueStatus>;
  removeFromQueue(queueItemIds: string[]): Promise<void>;
  getQueue(): Promise<PrintQueueItem[]>;
}

export class PrintQueueServiceImpl implements PrintQueueService {
  private repository: PrintQueueRepository;
  
  // Cache TTL for print queue data (30 seconds for real-time updates)
  private static readonly CACHE_TTL = 30 * 1000;
  
  // Standard batch size for printing
  private static readonly BATCH_SIZE = 4;

  constructor(repository: PrintQueueRepository = new PrintQueueRepositoryImpl()) {
    this.repository = repository;
  }

  /**
   * Add order items to the print queue (typically called during order approval) with comprehensive error handling
   * @param orderItemIds - Array of order item IDs to add to queue
   * @param addedBy - Optional user ID who added the items
   * @returns Array of created/existing print queue items
   */
  async addToQueue(orderItemIds: string[], addedBy?: string): Promise<PrintQueueItem[]> {
    const context = 'addToQueue';
    
    try {
      // Enhanced input validation
      if (!orderItemIds || !Array.isArray(orderItemIds)) {
        const error = new Error('Invalid input: orderItemIds must be an array');
        logError(error, context, addedBy, { orderItemIds });
        throw error;
      }

      if (orderItemIds.length === 0) {
        return [];
      }

      // Validate all IDs are strings and not empty
      const invalidIds = orderItemIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0);
      if (invalidIds.length > 0) {
        const error = new Error(`Invalid order item IDs provided: ${invalidIds.length} invalid IDs`);
        logError(error, context, addedBy, { invalidIds, totalIds: orderItemIds.length });
        throw error;
      }

      // Add items to queue via repository with retry mechanism
      const queueItems = await retryWithBackoff(async () => {
        return await this.repository.addItems(orderItemIds, addedBy);
      }, 3, 1000);

      // Invalidate cache since queue has changed
      try {
        this.invalidateQueueCache();
      } catch (cacheError) {
        console.warn('Failed to invalidate print queue cache:', cacheError);
        // Continue without cache invalidation
      }

      console.log(`Successfully added ${queueItems.length} items to print queue`, {
        requestedItems: orderItemIds.length,
        addedItems: queueItems.length,
        addedBy,
        queueItemIds: queueItems.map(item => item.id)
      });

      return queueItems;

    } catch (error) {
      // Enhanced error handling and logging
      const errorDetails = this.handlePrintQueueError(error, context);
      logError(error, context, addedBy, { 
        orderItemIds: orderItemIds?.length || 0,
        errorDetails 
      });
      
      throw new Error(errorDetails.userMessage || 'Failed to add items to print queue');
    }
  }

  /**
   * Get the next batch of items for printing with enhanced batch size validation
   * @returns PrintBatch with items and warning information
   */
  async getNextBatch(): Promise<PrintBatch> {
    try {
      // Check cache first
      const cacheKey = this.getBatchCacheKey();
      const cachedBatch = CacheService.get<PrintBatch>(cacheKey);
      if (cachedBatch) {
        return cachedBatch;
      }

      // Get oldest items from repository with enhanced validation and full details for printing
      const items = await this.repository.getOldestBatch(PrintQueueServiceImpl.BATCH_SIZE, true);

      // Enhanced batch size validation
      const validation = PrintQueueServiceImpl.validateBatchSize(items.length);
      
      let warningMessage: string | undefined;
      if (!validation.isValid) {
        warningMessage = validation.warningMessage;
      } else if (validation.requiresWarning) {
        warningMessage = validation.warningMessage;
      }

      // Additional validation for batch quality
      const validItems = items.filter(item => 
        item.id && 
        item.orderItemId && 
        item.orderItem && 
        item.orderItem.order &&
        item.orderItem.item
      );

      if (validItems.length !== items.length) {
        console.warn(`Found ${items.length - validItems.length} invalid items in batch, filtering them out`);
      }

      const batch: PrintBatch = {
        items: validItems,
        canPrintWithoutWarning: validation.isValid && !validation.requiresWarning,
        warningMessage
      };

      // Cache the result for short period
      CacheService.set(cacheKey, batch, PrintQueueServiceImpl.CACHE_TTL);

      return batch;

    } catch (error) {
      console.error('Error getting next batch from print queue:', error);
      throw new Error('Failed to retrieve next batch from print queue');
    }
  }

  /**
   * Mark a batch of items as printed and remove them from the queue with comprehensive error handling
   * This implements the enhanced confirmation workflow where items are only marked as printed
   * after user confirms successful printing with comprehensive validation
   * @param queueItemIds - Array of print queue item IDs to mark as printed
   * @param printedBy - Optional user ID who confirmed the printing
   */
  async markBatchPrinted(queueItemIds: string[], printedBy?: string): Promise<void> {
    const context = 'markBatchPrinted';
    
    try {
      // Enhanced input validation
      if (!queueItemIds || !Array.isArray(queueItemIds)) {
        const error = new Error('Invalid input: queueItemIds must be an array');
        logError(error, context, printedBy, { queueItemIds });
        throw error;
      }

      if (queueItemIds.length === 0) {
        const error = new Error('No queue item IDs provided for marking as printed');
        logError(error, context, printedBy);
        throw error;
      }

      // Validate that all IDs are valid strings
      const validIds = queueItemIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
      if (validIds.length !== queueItemIds.length) {
        const error = new Error(`Invalid queue item IDs provided: ${queueItemIds.length - validIds.length} invalid IDs`);
        logError(error, context, printedBy, { 
          totalIds: queueItemIds.length, 
          validIds: validIds.length 
        });
        throw error;
      }

      // Verify items exist before marking as printed with retry mechanism
      const existingItems = await retryWithBackoff(async () => {
        return await this.repository.getUnprintedItems();
      }, 2, 1000);

      const existingIds = new Set(existingItems.map(item => item.id));
      const itemsToMark = validIds.filter(id => existingIds.has(id));

      if (itemsToMark.length === 0) {
        const error = new Error('None of the specified items are currently in the print queue');
        logError(error, context, printedBy, { 
          requestedIds: validIds.length,
          existingIds: existingItems.length 
        });
        throw error;
      }

      if (itemsToMark.length !== validIds.length) {
        console.warn(`Only ${itemsToMark.length} of ${validIds.length} items found in queue for marking as printed`, {
          requestedIds: validIds,
          foundIds: itemsToMark,
          missingIds: validIds.filter(id => !existingIds.has(id))
        });
      }

      // Mark items as printed via repository with retry mechanism
      await retryWithBackoff(async () => {
        await this.repository.markAsPrinted(itemsToMark, printedBy);
      }, 3, 1000);

      // Invalidate cache since queue has changed
      try {
        this.invalidateQueueCache();
      } catch (cacheError) {
        console.warn('Failed to invalidate print queue cache after marking printed:', cacheError);
        // Continue without cache invalidation
      }

      console.log(`Successfully marked ${itemsToMark.length} items as printed and removed from queue`, {
        requestedItems: queueItemIds.length,
        markedItems: itemsToMark.length,
        printedBy,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Enhanced error handling and logging
      const errorDetails = this.handlePrintQueueError(error, context);
      logError(error, context, printedBy, { 
        queueItemIds: queueItemIds?.length || 0,
        errorDetails 
      });
      
      throw new Error(errorDetails.userMessage || `Failed to mark batch as printed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a batch can be printed without warnings
   * @returns True if there are enough items for a full batch
   */
  async canPrintBatch(): Promise<boolean> {
    try {
      const status = await this.getQueueStatus();
      return status.readyToPrint >= PrintQueueServiceImpl.BATCH_SIZE;
    } catch (error) {
      console.error('Error checking if batch can be printed:', error);
      return false;
    }
  }

  /**
   * Get current queue status with item counts and warning information
   * @returns QueueStatus with current queue metrics
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      // Check cache first
      const cacheKey = this.getStatusCacheKey();
      const cachedStatus = CacheService.get<QueueStatus>(cacheKey);
      if (cachedStatus) {
        return cachedStatus;
      }

      // Get all unprinted items
      const unprintedItems = await this.repository.getUnprintedItems();
      
      const totalItems = unprintedItems.length;
      const readyToPrint = Math.min(totalItems, PrintQueueServiceImpl.BATCH_SIZE);
      const requiresWarning = totalItems < PrintQueueServiceImpl.BATCH_SIZE && totalItems > 0;

      const status: QueueStatus = {
        totalItems,
        readyToPrint,
        requiresWarning
      };

      // Cache the result
      CacheService.set(cacheKey, status, PrintQueueServiceImpl.CACHE_TTL);

      return status;

    } catch (error) {
      console.error('Error getting queue status:', error);
      
      // Return safe fallback status
      return {
        totalItems: 0,
        readyToPrint: 0,
        requiresWarning: false
      };
    }
  }

  /**
   * Remove specific items from the print queue
   * @param queueItemIds - Array of print queue item IDs to remove
   */
  async removeFromQueue(queueItemIds: string[]): Promise<void> {
    try {
      // Input validation
      if (!queueItemIds || queueItemIds.length === 0) {
        return;
      }

      // Remove items via repository
      await this.repository.removeItems(queueItemIds);

      // Invalidate cache since queue has changed
      this.invalidateQueueCache();

      console.log(`Removed ${queueItemIds.length} items from print queue`, {
        queueItemIds
      });

    } catch (error) {
      console.error('Error removing items from print queue:', error);
      throw new Error('Failed to remove items from print queue');
    }
  }

  /**
   * Get all items currently in the print queue
   * @returns Array of all unprinted print queue items
   */
  async getQueue(limit?: number, offset?: number, includeFullDetails: boolean = true): Promise<PrintQueueItem[]> {
    try {
      // For paginated requests, don't use cache to ensure fresh data
      if (limit !== undefined || offset !== undefined) {
        return await retryWithBackoff(async () => {
          return await this.repository.getUnprintedItems(limit, offset, includeFullDetails);
        }, 3, 1000);
      }

      // Check cache first for full queue requests
      const cacheKey = this.getQueueCacheKey();
      const cachedQueue = CacheService.get<PrintQueueItem[]>(cacheKey);
      if (cachedQueue) {
        return cachedQueue;
      }

      // For large datasets, limit to reasonable size and use minimal details by default
      const maxItems = 1000;
      const items = await retryWithBackoff(async () => {
        return await this.repository.getUnprintedItems(maxItems, 0, includeFullDetails);
      }, 3, 1000);

      // Cache the result
      CacheService.set(cacheKey, items, PrintQueueServiceImpl.CACHE_TTL);

      return items;

    } catch (error) {
      console.error('Error getting print queue:', error);
      throw new Error('Failed to retrieve print queue');
    }
  }

  /**
   * Get total count of unprinted items for pagination
   * @returns Number of unprinted items in queue
   */
  async getQueueCount(): Promise<number> {
    try {
      // Check cache first
      const cacheKey = 'print-queue-count';
      const cachedCount = CacheService.get<number>(cacheKey);
      if (cachedCount !== null) {
        return cachedCount;
      }

      const count = await retryWithBackoff(async () => {
        return await this.repository.getUnprintedItemsCount();
      }, 3, 1000);

      // Cache count for shorter period since it changes frequently
      CacheService.set(cacheKey, count, 30 * 1000); // 30 seconds

      return count;

    } catch (error) {
      console.error('Error getting print queue count:', error);
      throw new Error('Failed to get print queue count');
    }
  }

  /**
   * Generate cache key for batch data
   * @returns Cache key string
   */
  private getBatchCacheKey(): string {
    return 'print_queue:batch:next';
  }

  /**
   * Generate cache key for queue status
   * @returns Cache key string
   */
  private getStatusCacheKey(): string {
    return 'print_queue:status';
  }

  /**
   * Generate cache key for full queue data
   * @returns Cache key string
   */
  private getQueueCacheKey(): string {
    return 'print_queue:items:all';
  }

  /**
   * Invalidate all print queue related cache entries
   */
  private invalidateQueueCache(): void {
    CacheService.invalidatePattern('print_queue');
  }

  /**
   * Get the standard batch size for printing
   * @returns Batch size number
   */
  static getBatchSize(): number {
    return PrintQueueServiceImpl.BATCH_SIZE;
  }

  /**
   * Validate batch size for printing operations
   * @param itemCount - Number of items to validate
   * @returns Validation result with warning message if needed
   */
  static validateBatchSize(itemCount: number): {
    isValid: boolean;
    requiresWarning: boolean;
    warningMessage?: string;
  } {
    const batchSize = PrintQueueServiceImpl.BATCH_SIZE;
    
    if (itemCount === 0) {
      return {
        isValid: false,
        requiresWarning: true,
        warningMessage: 'No items available for printing. Please approve orders to add items to the queue.'
      };
    }

    if (itemCount < batchSize) {
      return {
        isValid: true,
        requiresWarning: true,
        warningMessage: `Only ${itemCount} item${itemCount === 1 ? '' : 's'} available. Standard batch size is ${batchSize} items. Do you want to proceed with a smaller batch?`
      };
    }

    return {
      isValid: true,
      requiresWarning: false
    };
  }

  /**
   * Clear all print queue cache entries
   * Should be called when queue data is modified outside of this service
   */
  static clearCache(): void {
    CacheService.invalidatePattern('print_queue');
  }

  /**
   * Get cache statistics for print queue operations
   * @returns Cache statistics specific to print queue
   */
  static getCacheStats(): {
    queueCacheHits: number;
    batchCacheHits: number;
    statusCacheHits: number;
  } {
    // This would require extending CacheService to track specific patterns
    // For now, return basic info
    return {
      queueCacheHits: 0, // Would need pattern-specific tracking
      batchCacheHits: 0,
      statusCacheHits: 0
    };
  }

  /**
   * Handle print queue errors and convert to standardized error format
   * @param error - The original error
   * @param context - Operation context
   * @returns Standardized ErrorDetails
   */
  private handlePrintQueueError(error: any, context: string): ErrorDetails {
    // Handle database-specific errors
    if (error.code && error.code.startsWith('P')) {
      return handlePrismaError(error);
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        code: 'PRINT_QUEUE_TIMEOUT',
        message: 'Print queue operation timed out',
        userMessage: 'The print queue operation is taking longer than expected. Please try again.',
        suggestions: ['Try the operation again', 'Contact support if timeouts continue'],
        retryable: true
      };
    }

    // Handle network/connectivity errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: 'PRINT_QUEUE_NETWORK_ERROR',
        message: 'Network error during print queue operation',
        userMessage: 'Unable to connect to the print queue service.',
        suggestions: ['Check your internet connection', 'Try again in a few moments'],
        retryable: true
      };
    }

    // Handle validation errors
    if (error.message.includes('Invalid') || error.message.includes('invalid')) {
      return {
        code: 'PRINT_QUEUE_VALIDATION_ERROR',
        message: error.message,
        userMessage: 'Invalid data provided for print queue operation.',
        suggestions: ['Check the data and try again', 'Refresh the page if the problem persists'],
        retryable: false
      };
    }

    // Handle queue state errors
    if (error.message.includes('not in the print queue') || error.message.includes('not found')) {
      return {
        code: 'PRINT_QUEUE_ITEM_NOT_FOUND',
        message: error.message,
        userMessage: 'The requested items are no longer in the print queue.',
        suggestions: ['Refresh the print queue view', 'Check if the items were already processed'],
        retryable: false
      };
    }

    // Handle cache errors
    if (error.message && error.message.includes('cache')) {
      return {
        code: 'PRINT_QUEUE_CACHE_ERROR',
        message: error.message,
        userMessage: 'Print queue cache error occurred. The operation may be slower than usual.',
        suggestions: ['The operation should still work', 'Contact support if performance issues persist'],
        retryable: true
      };
    }

    // Generic print queue error
    return {
      code: 'PRINT_QUEUE_ERROR',
      message: error.message || 'Unknown print queue error',
      userMessage: 'An error occurred with the print queue operation.',
      suggestions: ['Try the operation again', 'Contact support if the problem persists'],
      retryable: true
    };
  }
}

// Export a default instance for convenience
export const printQueueService = new PrintQueueServiceImpl();