import { auth } from '~/server/lib/auth';
import { MetricsService } from '~/utils/metricsService';
import { PerformanceMonitor } from '~/utils/performanceMonitor';

/**
 * Dashboard Metrics API Endpoint
 * Returns comprehensive dashboard metrics including orders, revenue, and production status
 * 
 * Requirements: 11.7, 11.8, 15.3
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

    // Calculate dashboard metrics using the MetricsService with performance tracking
    const trackedGetMetrics = PerformanceMonitor.trackPerformance(
      'dashboard_metrics',
      () => MetricsService.getDashboardMetrics()
    );
    const metrics = await trackedGetMetrics();

    // Return successful response with metrics data
    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error;
    }
    
    // Determine error type and provide appropriate message
    let errorMessage = 'Error calculating dashboard metrics';
    let statusCode = 500;
    
    if (error?.message?.includes('database')) {
      errorMessage = 'Database connection error while calculating metrics';
      statusCode = 503; // Service Unavailable
    } else if (error?.message?.includes('timeout')) {
      errorMessage = 'Request timeout while calculating metrics';
      statusCode = 504; // Gateway Timeout
    } else if (error?.message?.includes('Invalid')) {
      errorMessage = 'Invalid data encountered during metrics calculation';
      statusCode = 422; // Unprocessable Entity
    }
    
    // For any other errors, return a generic 500 error with fallback metrics
    throw createError({
      statusCode,
      statusMessage: errorMessage,
      data: {
        success: false,
        error: error?.message || 'Failed to calculate metrics',
        fallbackData: {
          totalOrders: 0,
          revenueThisMonth: 0,
          ordersThisWeek: 0,
          pendingOrders: 0,
          inProduction: 0,
          readyToShip: 0
        },
        timestamp: new Date().toISOString()
      }
    });
  }
});