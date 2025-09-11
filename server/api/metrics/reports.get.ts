import { auth } from '~/server/lib/auth';
import { MetricsService, type DateRange } from '~/utils/metricsService';
import { PerformanceMonitor } from '~/utils/performanceMonitor';
import { logError } from '~/utils/errorHandling';

/**
 * Reports Metrics API Endpoint
 * Returns comprehensive reports metrics including productivity, lead times, and revenue trends
 * 
 * Query Parameters:
 * - startDate: Start date for filtering (ISO string, required)
 * - endDate: End date for filtering (ISO string, required)
 * 
 * Requirements: 13.4, 13.5, 15.5
 */
export default defineEventHandler(async (event) => {
  let sessionData: any = null;
  
  try {
    // Get the current user session for authentication
    sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Parse and validate query parameters
    const query = getQuery(event);
    const dateRange = parseDateRange(query);

    // Calculate reports metrics using the MetricsService with performance tracking
    const trackedGetMetrics = PerformanceMonitor.trackPerformance(
      'reports_metrics',
      () => MetricsService.getReportsMetrics(dateRange)
    );
    const metrics = await trackedGetMetrics();

    // Return successful response with metrics data
    return {
      success: true,
      data: metrics,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      },
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'reports_metrics_calculation', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'Reports metrics calculation timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Try again during off-peak hours',
            'Contact support if timeouts persist'
          ]
        }
      });
    }

    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while calculating reports metrics',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Contact support if the problem persists'
          ]
        }
      });
    }
    
    // For any other errors, return a generic 500 error with fallback metrics
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while calculating reports metrics',
      data: {
        success: false,
        error: 'Failed to calculate reports metrics',
        retryable: true,
        fallbackData: {
          productivityByEmployee: [],
          averageLeadTime: 0,
          revenueByPeriod: [],
          totalProductionHours: 0,
          totalItemsProcessed: 0,
          overallProductivity: 0
        },
        suggestions: [
          'Try again with a smaller date range',
          'Check your internet connection',
          'Contact support if the problem persists'
        ],
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Parse and validate date range parameters using enhanced validation with timezone handling
 * @param query - Raw query parameters from the request
 * @returns DateRange - Validated date range object
 */
function parseDateRange(query: Record<string, any>): DateRange {
  // Validate startDate parameter
  if (!query.startDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: startDate - must be a valid ISO date string (e.g., "2024-01-01T00:00:00.000Z")',
      data: {
        suggestions: [
          'Provide both startDate and endDate parameters',
          'Use ISO date format (e.g., "2024-01-01T00:00:00.000Z")',
          'Ensure dates are in UTC format'
        ]
      }
    });
  }

  // Validate endDate parameter
  if (!query.endDate) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required parameter: endDate - must be a valid ISO date string (e.g., "2024-12-31T23:59:59.999Z")',
      data: {
        suggestions: [
          'Provide both startDate and endDate parameters',
          'Use ISO date format (e.g., "2024-12-31T23:59:59.999Z")',
          'Ensure dates are in UTC format'
        ]
      }
    });
  }

  try {
    // Dates are already in UTC format from frontend TimezoneService conversion
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    // Validate the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format - dates must be valid ISO strings');
    }

    // Additional validation for reasonable date ranges
    if (startDate > endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Start date cannot be after end date',
        data: {
          suggestions: [
            'Ensure startDate is before endDate',
            'Check the date values and try again'
          ]
        }
      });
    }

    // Check for maximum date range (1 year)
    const maxRangeDays = 365;
    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (rangeDays > maxRangeDays) {
      throw createError({
        statusCode: 400,
        statusMessage: `Date range cannot exceed ${maxRangeDays} days. Current range is ${rangeDays} days.`,
        data: {
          suggestions: [
            `Reduce the date range to ${maxRangeDays} days or less`,
            'Use smaller date ranges for better performance',
            'Consider using pagination for large datasets'
          ]
        }
      });
    }

    const dateRange: DateRange = { startDate, endDate };

    // Use the enhanced validation from MetricsService if available
    try {
      const validation = MetricsService.validateDateRange(dateRange);
      
      if (!validation.isValid) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid date range: ${validation.error}`,
          data: {
            suggestions: [
              'Check the date range and try again',
              'Ensure dates are within reasonable limits',
              'Contact support if the problem persists'
            ]
          }
        });
      }

      // Return the normalized date range
      return validation.normalizedRange!;
    } catch (validationError) {
      // If MetricsService validation fails, continue with basic validation
      console.warn('MetricsService validation failed, using basic validation:', validationError);
      return dateRange;
    }
  } catch (error) {
    if (error.statusCode) {
      throw error; // Re-throw structured errors
    }
    
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid date format: ${error instanceof Error ? error.message : 'Dates must be valid ISO strings'}`,
      data: {
        suggestions: [
          'Use ISO date format (e.g., "2024-01-01T00:00:00.000Z")',
          'Ensure dates are valid and properly formatted',
          'Check for typos in date strings'
        ]
      }
    });
  }
}