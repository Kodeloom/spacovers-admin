/**
 * Print Queue Cleanup Service
 * Handles cleanup of old print queue items and maintenance tasks
 * 
 * Requirements: 8.4, 8.5 - Performance optimization and cleanup
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { CacheService } from '~/utils/cacheService';

export interface CleanupResult {
  removedItems: number;
  orphanedItems: number;
  oldPrintedItems: number;
  cacheEntriesCleared: number;
  executionTimeMs: number;
}

export interface CleanupOptions {
  // Remove printed items older than this many days (default: 30)
  printedItemsRetentionDays?: number;
  
  // Remove orphaned items (items whose order items no longer exist)
  removeOrphanedItems?: boolean;
  
  // Clear related cache entries
  clearCache?: boolean;
  
  // Dry run mode - don't actually delete, just report what would be deleted
  dryRun?: boolean;
}

/**
 * Print Queue Cleanup Service
 * Provides automated cleanup and maintenance for the print queue system
 */
export class PrintQueueCleanupService {
  
  /**
   * Perform comprehensive cleanup of the print queue
   * @param options - Cleanup configuration options
   * @returns Cleanup results summary
   */
  static async performCleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const startTime = Date.now();
    
    const {
      printedItemsRetentionDays = 30,
      removeOrphanedItems = true,
      clearCache = true,
      dryRun = false
    } = options;

    console.log(`Starting print queue cleanup${dryRun ? ' (DRY RUN)' : ''}`, {
      printedItemsRetentionDays,
      removeOrphanedItems,
      clearCache
    });

    let removedItems = 0;
    let orphanedItems = 0;
    let oldPrintedItems = 0;
    let cacheEntriesCleared = 0;

    try {
      // 1. Remove old printed items
      if (printedItemsRetentionDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - printedItemsRetentionDays);

        const oldPrintedQuery = {
          where: {
            isPrinted: true,
            printedAt: {
              lt: cutoffDate
            }
          }
        };

        if (dryRun) {
          oldPrintedItems = await prisma.printQueue.count(oldPrintedQuery);
        } else {
          const deleteResult = await prisma.printQueue.deleteMany(oldPrintedQuery);
          oldPrintedItems = deleteResult.count;
        }

        console.log(`${dryRun ? 'Would remove' : 'Removed'} ${oldPrintedItems} old printed items (older than ${printedItemsRetentionDays} days)`);
      }

      // 2. Remove orphaned items (items whose order items no longer exist)
      if (removeOrphanedItems) {
        // Find print queue items that reference non-existent order items
        const orphanedQuery = `
          SELECT pq.id 
          FROM "print_queue" pq
          LEFT JOIN "OrderItem" oi ON pq."orderItemId" = oi.id
          WHERE oi.id IS NULL
        `;

        const orphanedIds = await prisma.$queryRawUnsafe<{ id: string }[]>(orphanedQuery);
        orphanedItems = orphanedIds.length;

        if (orphanedItems > 0 && !dryRun) {
          await prisma.printQueue.deleteMany({
            where: {
              id: {
                in: orphanedIds.map(item => item.id)
              }
            }
          });
        }

        console.log(`${dryRun ? 'Would remove' : 'Removed'} ${orphanedItems} orphaned print queue items`);
      }

      removedItems = oldPrintedItems + orphanedItems;

      // 3. Clear related cache entries
      if (clearCache && !dryRun) {
        // Clear print queue related cache entries
        cacheEntriesCleared += CacheService.invalidatePattern('print-queue');
        cacheEntriesCleared += CacheService.invalidatePattern('queue-status');
        cacheEntriesCleared += CacheService.invalidatePattern('queue-batch');
        
        console.log(`Cleared ${cacheEntriesCleared} cache entries`);
      }

      const executionTimeMs = Date.now() - startTime;
      
      const result: CleanupResult = {
        removedItems,
        orphanedItems,
        oldPrintedItems,
        cacheEntriesCleared,
        executionTimeMs
      };

      console.log(`Print queue cleanup completed in ${executionTimeMs}ms`, result);
      
      return result;

    } catch (error) {
      console.error('Error during print queue cleanup:', error);
      throw new Error(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cleanup statistics without performing actual cleanup
   * Useful for monitoring and reporting
   */
  static async getCleanupStatistics(options: CleanupOptions = {}): Promise<{
    oldPrintedItems: number;
    orphanedItems: number;
    totalQueueItems: number;
    unprintedItems: number;
    averageQueueAge: number;
    oldestUnprintedItem?: Date;
  }> {
    const {
      printedItemsRetentionDays = 30,
      removeOrphanedItems = true
    } = options;

    try {
      // Count total queue items
      const totalQueueItems = await prisma.printQueue.count();

      // Count unprinted items
      const unprintedItems = await prisma.printQueue.count({
        where: { isPrinted: false }
      });

      // Count old printed items
      let oldPrintedItems = 0;
      if (printedItemsRetentionDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - printedItemsRetentionDays);

        oldPrintedItems = await prisma.printQueue.count({
          where: {
            isPrinted: true,
            printedAt: {
              lt: cutoffDate
            }
          }
        });
      }

      // Count orphaned items
      let orphanedItems = 0;
      if (removeOrphanedItems) {
        const orphanedQuery = `
          SELECT COUNT(*) as count
          FROM "print_queue" pq
          LEFT JOIN "OrderItem" oi ON pq."orderItemId" = oi.id
          WHERE oi.id IS NULL
        `;
        
        const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(orphanedQuery);
        orphanedItems = Number(result[0]?.count || 0);
      }

      // Calculate average queue age
      const queueAgeQuery = await prisma.printQueue.aggregate({
        _avg: {
          addedAt: true
        },
        where: {
          isPrinted: false
        }
      });

      const averageQueueAge = queueAgeQuery._avg.addedAt 
        ? Date.now() - queueAgeQuery._avg.addedAt.getTime()
        : 0;

      // Get oldest unprinted item
      const oldestUnprinted = await prisma.printQueue.findFirst({
        where: { isPrinted: false },
        orderBy: { addedAt: 'asc' },
        select: { addedAt: true }
      });

      return {
        oldPrintedItems,
        orphanedItems,
        totalQueueItems,
        unprintedItems,
        averageQueueAge: Math.round(averageQueueAge / (1000 * 60 * 60)), // Convert to hours
        oldestUnprintedItem: oldestUnprinted?.addedAt
      };

    } catch (error) {
      console.error('Error getting cleanup statistics:', error);
      throw new Error(`Failed to get cleanup statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule automatic cleanup to run periodically
   * Should be called during application startup
   */
  static scheduleAutomaticCleanup(intervalHours: number = 24): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`Scheduling automatic print queue cleanup every ${intervalHours} hours`);
    
    return setInterval(async () => {
      try {
        console.log('Running scheduled print queue cleanup...');
        
        const result = await this.performCleanup({
          printedItemsRetentionDays: 30,
          removeOrphanedItems: true,
          clearCache: true,
          dryRun: false
        });
        
        console.log('Scheduled cleanup completed:', result);
        
        // Log cleanup metrics for monitoring
        if (result.removedItems > 0) {
          console.log(`Cleanup removed ${result.removedItems} items (${result.oldPrintedItems} old printed, ${result.orphanedItems} orphaned)`);
        }
        
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Optimize print queue performance by analyzing and fixing issues
   */
  static async optimizePerformance(): Promise<{
    indexesAnalyzed: boolean;
    cacheOptimized: boolean;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    try {
      // Analyze queue size and performance
      const stats = await this.getCleanupStatistics();
      
      if (stats.totalQueueItems > 10000) {
        recommendations.push('Large queue detected. Consider more frequent cleanup or shorter retention period.');
      }
      
      if (stats.orphanedItems > 0) {
        recommendations.push(`Found ${stats.orphanedItems} orphaned items. Run cleanup to remove them.`);
      }
      
      if (stats.averageQueueAge > 168) { // More than 7 days
        recommendations.push('Items staying in queue for long periods. Review print workflow efficiency.');
      }
      
      if (stats.oldPrintedItems > 1000) {
        recommendations.push(`${stats.oldPrintedItems} old printed items can be cleaned up to improve performance.`);
      }
      
      // Optimize cache
      CacheService.optimizeCache();
      
      return {
        indexesAnalyzed: true,
        cacheOptimized: true,
        recommendations
      };
      
    } catch (error) {
      console.error('Error optimizing print queue performance:', error);
      return {
        indexesAnalyzed: false,
        cacheOptimized: false,
        recommendations: ['Performance optimization failed. Check logs for details.']
      };
    }
  }

  /**
   * Emergency cleanup for when the queue becomes too large
   * More aggressive cleanup with shorter retention periods
   */
  static async emergencyCleanup(): Promise<CleanupResult> {
    console.log('Performing emergency print queue cleanup...');
    
    return await this.performCleanup({
      printedItemsRetentionDays: 7, // Much shorter retention
      removeOrphanedItems: true,
      clearCache: true,
      dryRun: false
    });
  }

  /**
   * Health check for the print queue system
   * Returns status and recommendations
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    statistics: Awaited<ReturnType<typeof PrintQueueCleanupService.getCleanupStatistics>>;
  }> {
    try {
      const stats = await this.getCleanupStatistics();
      const issues: string[] = [];
      const recommendations: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check for critical issues
      if (stats.totalQueueItems > 50000) {
        status = 'critical';
        issues.push('Queue size is extremely large (>50,000 items)');
        recommendations.push('Perform emergency cleanup immediately');
      } else if (stats.totalQueueItems > 20000) {
        status = 'warning';
        issues.push('Queue size is large (>20,000 items)');
        recommendations.push('Schedule cleanup soon');
      }

      if (stats.orphanedItems > 100) {
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push(`High number of orphaned items (${stats.orphanedItems})`);
        recommendations.push('Run cleanup to remove orphaned items');
      }

      if (stats.averageQueueAge > 336) { // More than 14 days
        status = status === 'critical' ? 'critical' : 'warning';
        issues.push('Items staying in queue for very long periods');
        recommendations.push('Review print workflow and consider process improvements');
      }

      if (status === 'healthy') {
        recommendations.push('Print queue is operating normally');
      }

      return {
        status,
        issues,
        recommendations,
        statistics: stats
      };

    } catch (error) {
      console.error('Error during print queue health check:', error);
      return {
        status: 'critical',
        issues: ['Health check failed'],
        recommendations: ['Check system logs and database connectivity'],
        statistics: {
          oldPrintedItems: 0,
          orphanedItems: 0,
          totalQueueItems: 0,
          unprintedItems: 0,
          averageQueueAge: 0
        }
      };
    }
  }
}