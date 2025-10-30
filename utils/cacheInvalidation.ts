/**
 * Cache Invalidation Service
 * Provides automatic cache invalidation when data changes
 * 
 * Requirements: 15.5 - Performance optimization and caching
 */

import { CacheService } from './cacheService';
import { OptimizedQueries } from './optimizedQueries';

/**
 * Cache Invalidation Service
 * Handles automatic cache invalidation based on data changes
 */
export class CacheInvalidationService {
  
  /**
   * Invalidate caches when order data changes
   * @param operation - Type of operation (create, update, delete)
   * @param orderId - Optional order ID for targeted invalidation
   * @param customerId - Optional customer ID for PO validation cache invalidation
   * @param poNumber - Optional PO number for targeted PO validation cache invalidation
   */
  static invalidateOrderCaches(
    operation: 'create' | 'update' | 'delete', 
    orderId?: string,
    customerId?: string,
    poNumber?: string
  ): void {
    console.log(`Invalidating order caches for operation: ${operation}${orderId ? ` (ID: ${orderId})` : ''}`);
    
    // Get invalidation patterns for orders
    const patterns = OptimizedQueries.getInvalidationPatterns('order');
    
    // Invalidate all related cache patterns
    patterns.forEach(pattern => {
      CacheService.invalidatePattern(pattern);
    });

    // Invalidate PO validation cache if PO number or customer info is available
    if (customerId) {
      if (poNumber) {
        // Invalidate specific PO validation cache
        CacheService.invalidatePattern(`po-validation:${customerId}:${poNumber}`);
      } else {
        // Invalidate all PO validation cache for customer
        CacheService.invalidatePattern(`po-validation:${customerId}:`);
      }
    }

    // Invalidate print queue cache since orders affect queue
    CacheService.invalidatePattern('print-queue');
    CacheService.invalidatePattern('queue-status');
    
    // Log cache invalidation
    console.log(`Cache invalidation complete for patterns: ${patterns.join(', ')}`);
  }

  /**
   * Invalidate caches when order item data changes
   * @param operation - Type of operation (create, update, delete)
   * @param orderItemId - Optional order item ID for targeted invalidation
   * @param customerId - Optional customer ID for PO validation cache invalidation
   * @param poNumber - Optional PO number for targeted PO validation cache invalidation
   */
  static invalidateOrderItemCaches(
    operation: 'create' | 'update' | 'delete', 
    orderItemId?: string,
    customerId?: string,
    poNumber?: string
  ): void {
    console.log(`Invalidating order item caches for operation: ${operation}${orderItemId ? ` (ID: ${orderItemId})` : ''}`);
    
    // Get invalidation patterns for order items
    const patterns = OptimizedQueries.getInvalidationPatterns('orderItem');
    
    // Invalidate all related cache patterns
    patterns.forEach(pattern => {
      CacheService.invalidatePattern(pattern);
    });

    // Invalidate PO validation cache if PO number or customer info is available
    if (customerId) {
      if (poNumber) {
        // Invalidate specific PO validation cache
        CacheService.invalidatePattern(`po-validation:${customerId}:${poNumber}`);
      } else {
        // Invalidate all PO validation cache for customer
        CacheService.invalidatePattern(`po-validation:${customerId}:`);
      }
    }

    // Invalidate print queue cache since order items affect queue
    CacheService.invalidatePattern('print-queue');
    CacheService.invalidatePattern('queue-status');
    
    // Log cache invalidation
    console.log(`Cache invalidation complete for patterns: ${patterns.join(', ')}`);
  }

  /**
   * Invalidate caches when processing log data changes
   * @param operation - Type of operation (create, update, delete)
   * @param logId - Optional processing log ID for targeted invalidation
   */
  static invalidateProcessingCaches(operation: 'create' | 'update' | 'delete', logId?: string): void {
    console.log(`Invalidating processing caches for operation: ${operation}${logId ? ` (ID: ${logId})` : ''}`);
    
    // Get invalidation patterns for processing logs
    const patterns = OptimizedQueries.getInvalidationPatterns('processing');
    
    // Invalidate all related cache patterns
    patterns.forEach(pattern => {
      CacheService.invalidatePattern(pattern);
    });
    
    // Log cache invalidation
    console.log(`Cache invalidation complete for patterns: ${patterns.join(', ')}`);
  }

  /**
   * Invalidate caches when print queue data changes
   * @param operation - Type of operation (create, update, delete)
   * @param queueItemId - Optional queue item ID for targeted invalidation
   */
  static invalidatePrintQueueCaches(operation: 'create' | 'update' | 'delete', queueItemId?: string): void {
    console.log(`Invalidating print queue caches for operation: ${operation}${queueItemId ? ` (ID: ${queueItemId})` : ''}`);
    
    // Invalidate all print queue related cache patterns
    const patterns = [
      'print-queue',
      'queue-status',
      'queue-batch',
      'print-queue-count'
    ];
    
    patterns.forEach(pattern => {
      CacheService.invalidatePattern(pattern);
    });
    
    console.log(`Print queue cache invalidation complete for patterns: ${patterns.join(', ')}`);
  }

  /**
   * Invalidate PO validation caches
   * @param customerId - Customer ID for targeted invalidation
   * @param poNumber - Optional PO number for specific invalidation
   */
  static invalidatePOValidationCaches(customerId: string, poNumber?: string): void {
    console.log(`Invalidating PO validation caches for customer: ${customerId}${poNumber ? ` PO: ${poNumber}` : ''}`);
    
    if (poNumber) {
      // Invalidate specific PO number cache entries
      CacheService.invalidatePattern(`po-validation:${customerId}:${poNumber.trim()}`);
    } else {
      // Invalidate all PO validation cache entries for customer
      CacheService.invalidatePattern(`po-validation:${customerId}:`);
    }
    
    console.log('PO validation cache invalidation complete');
  }

  /**
   * Invalidate all metrics caches (nuclear option)
   * Use when unsure about specific invalidation patterns
   */
  static invalidateAllMetricsCaches(): void {
    console.log('Performing full metrics cache invalidation');
    
    CacheService.invalidateDashboard();
    CacheService.invalidateOrders();
    CacheService.invalidateReports();
    
    console.log('Full metrics cache invalidation complete');
  }

  /**
   * Scheduled cache cleanup and statistics logging
   * Should be called periodically to maintain cache health
   */
  static performScheduledMaintenance(): void {
    // Get cache statistics before cleanup
    const statsBefore = CacheService.getStats();
    
    // Perform cleanup
    CacheService.cleanup();
    
    // Get statistics after cleanup
    const statsAfter = CacheService.getStats();
    
    // Log maintenance results
    console.log('Cache maintenance completed:', {
      before: statsBefore,
      after: statsAfter,
      entriesRemoved: statsBefore.entries - statsAfter.entries
    });
  }

  /**
   * Get cache performance metrics for monitoring
   * @returns Cache performance data
   */
  static getCachePerformanceMetrics(): {
    stats: ReturnType<typeof CacheService.getStats>;
    recommendations: string[];
  } {
    const stats = CacheService.getStats();
    const recommendations: string[] = [];
    
    // Analyze cache performance and provide recommendations
    if (stats.hitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing TTL values or reviewing cache keys');
    }
    
    if (stats.entries > 1000) {
      recommendations.push('High number of cache entries - consider more aggressive cleanup or shorter TTL');
    }
    
    if (stats.hitRate > 90) {
      recommendations.push('Excellent cache performance - current configuration is optimal');
    }
    
    return {
      stats,
      recommendations
    };
  }

  /**
   * Warm up caches with commonly requested data
   * Should be called during application startup or low-traffic periods
   */
  static async warmUpCaches(): Promise<void> {
    console.log('Starting cache warm-up process');
    
    try {
      // Import MetricsService dynamically to avoid circular dependencies
      const { MetricsService } = await import('./metricsService');
      
      // Warm up dashboard metrics (most frequently accessed)
      await MetricsService.getDashboardMetrics();
      console.log('Dashboard metrics cache warmed up');
      
      // Warm up orders metrics without filters (common case)
      await MetricsService.getOrdersPageMetrics();
      console.log('Orders metrics cache warmed up');
      
      // Warm up recent reports (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      
      await MetricsService.getReportsMetrics({ startDate, endDate });
      console.log('Reports metrics cache warmed up');
      
      console.log('Cache warm-up process completed successfully');
    } catch (error) {
      console.error('Error during cache warm-up:', error);
    }
  }

  /**
   * Create middleware function for automatic cache invalidation
   * Can be used in API routes to automatically invalidate caches
   */
  static createInvalidationMiddleware() {
    return {
      /**
       * Middleware for order-related operations
       */
      orders: (operation: 'create' | 'update' | 'delete') => {
        return () => {
          this.invalidateOrderCaches(operation);
        };
      },
      
      /**
       * Middleware for order item operations
       */
      orderItems: (operation: 'create' | 'update' | 'delete') => {
        return () => {
          this.invalidateOrderItemCaches(operation);
        };
      },
      
      /**
       * Middleware for processing log operations
       */
      processing: (operation: 'create' | 'update' | 'delete') => {
        return () => {
          this.invalidateProcessingCaches(operation);
        };
      }
    };
  }
}

// Export middleware factory for easy use in API routes
export const cacheInvalidation = CacheInvalidationService.createInvalidationMiddleware();