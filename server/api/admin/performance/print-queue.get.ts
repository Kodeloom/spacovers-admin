/**
 * Print Queue Performance Monitoring API Endpoint
 * Provides performance metrics and optimization recommendations
 * 
 * Requirements: 8.4, 8.5 - Performance optimization and monitoring
 */

import { auth } from '~/server/lib/auth';
import { PrintQueueCleanupService } from '~/server/utils/printQueueCleanup';
import { PerformanceMonitor } from '~/utils/performanceMonitor';
import { CacheService } from '~/utils/cacheService';

export default defineEventHandler(async (event) => {
  try {
    // Authentication check
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Authorization check - only admins and super admins can view performance metrics
    const userRoles = sessionData.user.roles || [];
    const hasAdminAccess = userRoles.some((role: any) => 
      role.name === 'Super Admin' || role.name === 'Admin'
    );

    if (!hasAdminAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required for performance monitoring'
      });
    }

    // Get query parameters
    const query = getQuery(event);
    const timeRangeMinutes = parseInt(query.timeRange as string) || 60;

    // Gather performance data
    const [
      healthCheck,
      cleanupStats,
      performanceMetrics,
      cacheStats,
      cacheMemoryUsage
    ] = await Promise.all([
      PrintQueueCleanupService.healthCheck(),
      PrintQueueCleanupService.getCleanupStatistics(),
      PerformanceMonitor.getPerformanceMetrics(timeRangeMinutes),
      CacheService.getStats(),
      CacheService.getMemoryUsage()
    ]);

    // Get print queue specific performance data
    const printQueueAnalysis = PerformanceMonitor.getQueryAnalysis('print-queue-operations', timeRangeMinutes);
    const dashboardData = PerformanceMonitor.getDashboardData();

    // Generate optimization recommendations
    const recommendations: string[] = [];

    // Health-based recommendations
    if (healthCheck.status === 'critical') {
      recommendations.push('CRITICAL: Print queue requires immediate attention');
      recommendations.push(...healthCheck.recommendations);
    } else if (healthCheck.status === 'warning') {
      recommendations.push('WARNING: Print queue performance issues detected');
      recommendations.push(...healthCheck.recommendations);
    }

    // Performance-based recommendations
    if (performanceMetrics.averageExecutionTime > 1000) {
      recommendations.push('High query execution times detected - consider database optimization');
    }

    if (performanceMetrics.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    // Cache-based recommendations
    if (cacheStats.hitRate < 60) {
      recommendations.push('Cache performance is below optimal - consider tuning TTL values');
    }

    if (cacheMemoryUsage.estimatedSizeKB > 100 * 1024) { // 100MB
      recommendations.push('High cache memory usage - consider cleanup or optimization');
    }

    // Queue size recommendations
    if (cleanupStats.totalQueueItems > 10000) {
      recommendations.push('Large queue size detected - schedule regular cleanup');
    }

    if (cleanupStats.oldPrintedItems > 1000) {
      recommendations.push(`${cleanupStats.oldPrintedItems} old printed items can be cleaned up`);
    }

    if (cleanupStats.orphanedItems > 0) {
      recommendations.push(`${cleanupStats.orphanedItems} orphaned items should be removed`);
    }

    // If no issues found
    if (recommendations.length === 0) {
      recommendations.push('Print queue performance is optimal');
    }

    const response = {
      timestamp: new Date().toISOString(),
      timeRangeMinutes,
      
      // Overall health
      health: {
        status: healthCheck.status,
        issues: healthCheck.issues,
        recommendations: healthCheck.recommendations
      },

      // Queue statistics
      queue: {
        totalItems: cleanupStats.totalQueueItems,
        unprintedItems: cleanupStats.unprintedItems,
        oldPrintedItems: cleanupStats.oldPrintedItems,
        orphanedItems: cleanupStats.orphanedItems,
        averageQueueAge: cleanupStats.averageQueueAge,
        oldestUnprintedItem: cleanupStats.oldestUnprintedItem
      },

      // Performance metrics
      performance: {
        averageExecutionTime: performanceMetrics.averageExecutionTime,
        totalQueries: performanceMetrics.totalQueries,
        cacheHitRate: performanceMetrics.cacheHitRate,
        slowestQuery: performanceMetrics.slowestQuery,
        fastestQuery: performanceMetrics.fastestQuery,
        recommendations: performanceMetrics.recommendations
      },

      // Cache performance
      cache: {
        stats: cacheStats,
        memoryUsage: cacheMemoryUsage,
        printQueueSpecific: {
          analysis: printQueueAnalysis,
          topSlowQueries: dashboardData.topSlowQueries.filter(q => 
            q.queryName.includes('print') || q.queryName.includes('queue')
          )
        }
      },

      // Overall recommendations
      recommendations,

      // Actions available
      availableActions: [
        {
          action: 'cleanup',
          description: 'Remove old printed items and orphaned entries',
          recommended: cleanupStats.oldPrintedItems > 100 || cleanupStats.orphanedItems > 0
        },
        {
          action: 'optimize',
          description: 'Optimize cache and database performance',
          recommended: performanceMetrics.averageExecutionTime > 500 || cacheStats.hitRate < 70
        },
        {
          action: 'emergency',
          description: 'Emergency cleanup for critical issues',
          recommended: healthCheck.status === 'critical'
        }
      ]
    };

    return response;

  } catch (error: any) {
    console.error('Error in print queue performance monitoring API:', error);

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Error retrieving print queue performance metrics',
      data: { message: error.message }
    });
  }
});