import { auth } from '~/server/lib/auth';
import { PerformanceMonitor } from '~/utils/performanceMonitor';
import { CacheService } from '~/utils/cacheService';

/**
 * Performance Monitoring API Endpoint
 * Returns performance metrics and cache statistics for system monitoring
 * 
 * Requirements: 15.5 - Performance optimization monitoring
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

    // Check if user has admin privileges for performance monitoring
    // This is sensitive system information that should be restricted
    const userRoles = sessionData.user.roles || [];
    const hasAdminAccess = userRoles.some((role: any) => 
      ['Super Admin', 'Admin'].includes(role?.role?.name)
    );

    if (!hasAdminAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required for performance monitoring'
      });
    }

    // Parse query parameters
    const query = getQuery(event);
    const timeRangeMinutes = query.timeRange ? parseInt(query.timeRange as string) : 60;
    const includeDetails = query.details === 'true';

    // Validate time range
    if (isNaN(timeRangeMinutes) || timeRangeMinutes < 1 || timeRangeMinutes > 1440) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid timeRange parameter. Must be between 1 and 1440 minutes.'
      });
    }

    // Get performance metrics
    const performanceMetrics = PerformanceMonitor.getPerformanceMetrics(timeRangeMinutes);
    
    // Get cache statistics
    const cacheStats = CacheService.getStats();
    
    // Get dashboard data for detailed view
    const dashboardData = includeDetails ? PerformanceMonitor.getDashboardData() : null;

    // Prepare response
    const response: any = {
      success: true,
      data: {
        performance: performanceMetrics,
        cache: cacheStats,
        timeRangeMinutes,
        timestamp: new Date().toISOString()
      }
    };

    // Add detailed data if requested
    if (includeDetails && dashboardData) {
      response.data.details = {
        topSlowQueries: dashboardData.topSlowQueries,
        queryFrequency: dashboardData.queryFrequency,
        cacheEffectiveness: dashboardData.cacheEffectiveness
      };
    }

    return response;

  } catch (error: any) {
    console.error('Error fetching performance metrics:', error);
    
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error;
    }
    
    // For any other errors, return a generic 500 error
    throw createError({
      statusCode: 500,
      statusMessage: 'Error retrieving performance metrics',
      data: {
        success: false,
        error: 'Failed to retrieve performance data',
        timestamp: new Date().toISOString()
      }
    });
  }
});