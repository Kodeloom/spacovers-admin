import { auth } from '~/server/lib/auth';
import { CacheService } from '~/utils/cacheService';
import { CacheInvalidationService } from '~/utils/cacheInvalidation';

/**
 * Cache Management API Endpoint
 * Provides cache management operations (clear, invalidate, warm-up)
 * 
 * Requirements: 15.5 - Performance optimization and caching management
 */
export default defineEventHandler(async (event) => {
  try {
    // Get the current user session for authentication
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Check if user has admin privileges for cache management
    const userRoles = sessionData.user.roles || [];
    const hasAdminAccess = userRoles.some((role: any) => 
      ['Super Admin', 'Admin'].includes(role?.role?.name)
    );

    if (!hasAdminAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required for cache management'
      });
    }

    // Parse request body
    const body = await readBody(event);
    const { action, pattern } = body;

    // Validate action
    const validActions = ['clear', 'invalidate', 'warmup', 'cleanup', 'stats'];
    if (!action || !validActions.includes(action)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    let result: any = {};

    // Execute the requested action
    switch (action) {
      case 'clear':
        CacheService.clear();
        result = { message: 'All cache entries cleared successfully' };
        break;

      case 'invalidate':
        if (!pattern) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Pattern parameter required for invalidate action'
          });
        }
        
        const invalidatedCount = CacheService.invalidatePattern(pattern);
        result = { 
          message: `Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`,
          invalidatedCount 
        };
        break;

      case 'warmup':
        // Perform cache warm-up in background
        CacheInvalidationService.warmUpCaches().catch(error => {
          console.error('Cache warm-up failed:', error);
        });
        result = { message: 'Cache warm-up initiated in background' };
        break;

      case 'cleanup':
        CacheService.cleanup();
        result = { message: 'Cache cleanup completed' };
        break;

      case 'stats':
        const stats = CacheService.getStats();
        const performanceMetrics = CacheInvalidationService.getCachePerformanceMetrics();
        result = {
          stats,
          performance: performanceMetrics,
          message: 'Cache statistics retrieved successfully'
        };
        break;

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Unknown action'
        });
    }

    // Return successful response
    return {
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString(),
      performedBy: sessionData.user.id
    };

  } catch (error: any) {
    console.error('Error in cache management:', error);
    
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error;
    }
    
    // For any other errors, return a generic 500 error
    throw createError({
      statusCode: 500,
      statusMessage: 'Error performing cache management operation',
      data: {
        success: false,
        error: error?.message || 'Failed to perform cache operation',
        timestamp: new Date().toISOString()
      }
    });
  }
});