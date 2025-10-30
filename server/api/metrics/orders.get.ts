import { auth } from '~/server/lib/auth';
import { MetricsService, type OrderFilters } from '~/utils/metricsService';
import { PerformanceMonitor } from '~/utils/performanceMonitor';

/**
 * Orders Metrics API Endpoint
 * Returns orders page KPI metrics with optional filtering support
 * 
 * Query Parameters:
 * - status: Array of order statuses to filter by (e.g., ?status=PENDING&status=ORDER_PROCESSING)
 * - dateFrom: Start date for filtering (ISO string)
 * - dateTo: End date for filtering (ISO string)
 * - customerId: Customer ID to filter by
 * - priority: Array of priorities to filter by (e.g., ?priority=HIGH&priority=MEDIUM)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
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

    // Parse and validate query parameters
    const query = getQuery(event);
    const filters = parseOrderFilters(query);

    // Calculate orders page KPI metrics using the MetricsService with performance tracking
    const trackedGetMetrics = PerformanceMonitor.trackPerformance(
      'orders_kpi_metrics',
      () => MetricsService.getOrdersKPIMetrics(filters)
    );
    const metrics = await trackedGetMetrics();

    // Return successful response with metrics data
    return {
      success: true,
      data: metrics,
      filters: filters, // Include applied filters in response for debugging
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Error fetching orders metrics:', error);
    
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error;
    }
    
    // For any other errors, return a generic 500 error with fallback KPI metrics
    throw createError({
      statusCode: 500,
      statusMessage: 'Error calculating orders KPI metrics',
      data: {
        success: false,
        error: 'Failed to calculate orders KPI metrics',
        fallbackData: {
          // Order Status KPIs
          ordersPending: 0,
          ordersApproved: 0,
          ordersInProgress: 0,
          ordersReadyToShip: 0,
          ordersCompleted: 0,
          
          // Production Item KPIs
          itemsInProduction: 0,
          itemsNotStarted: 0,
          itemsCompleted: 0,
          
          // Performance KPIs
          avgLeadTimeHours: 0,
          
          // Legacy fields for backward compatibility
          statusCounts: {},
          totalValue: 0,
          averageOrderValue: 0
        },
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Parse and validate query parameters into OrderFilters object
 * @param query - Raw query parameters from the request
 * @returns OrderFilters - Validated filter object
 */
function parseOrderFilters(query: Record<string, any>): OrderFilters {
  const filters: OrderFilters = {};

  try {
    // Parse status filter - can be single value or array
    if (query.status) {
      const statusArray = Array.isArray(query.status) ? query.status : [query.status];
      const validStatuses = [
        'PENDING',
        'APPROVED', 
        'ORDER_PROCESSING',
        'READY_TO_SHIP',
        'SHIPPED',
        'COMPLETED',
        'CANCELLED',
        'ARCHIVED'
      ];
      
      // Validate that all provided statuses are strings
      const stringStatuses = statusArray.filter((status: any) => 
        typeof status === 'string' && status.trim().length > 0
      );
      
      const filteredStatuses = stringStatuses.filter((status: string) => 
        validStatuses.includes(status.toUpperCase())
      );
      
      if (filteredStatuses.length > 0) {
        filters.status = filteredStatuses.map(s => s.toUpperCase());
      } else if (statusArray.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid status values. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }
    }

    // Parse priority filter - can be single value or array
    if (query.priority) {
      const priorityArray = Array.isArray(query.priority) ? query.priority : [query.priority];
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
      
      // Validate that all provided priorities are strings
      const stringPriorities = priorityArray.filter((priority: any) => 
        typeof priority === 'string' && priority.trim().length > 0
      );
      
      const filteredPriorities = stringPriorities.filter((priority: string) => 
        validPriorities.includes(priority.toUpperCase())
      );
      
      if (filteredPriorities.length > 0) {
        filters.priority = filteredPriorities.map(p => p.toUpperCase());
      } else if (priorityArray.length > 0) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid priority values. Valid priorities are: ${validPriorities.join(', ')}`
        });
      }
    }

    // Parse date filters with enhanced validation
    if (query.dateFrom) {
      if (typeof query.dateFrom !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'dateFrom parameter must be a string in ISO date format (e.g., "2024-01-01")'
        });
      }

      const dateFrom = new Date(query.dateFrom);
      if (isNaN(dateFrom.getTime())) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid dateFrom parameter - must be a valid ISO date string (e.g., "2024-01-01")'
        });
      }

      // Validate date is not too far in the past or future
      const now = new Date();
      const minDate = new Date('2020-01-01');
      const maxDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day in future

      if (dateFrom < minDate) {
        throw createError({
          statusCode: 400,
          statusMessage: `dateFrom cannot be before ${minDate.toISOString().split('T')[0]} (no data available)`
        });
      }

      if (dateFrom > maxDate) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dateFrom cannot be more than 1 day in the future'
        });
      }

      filters.dateFrom = dateFrom;
    }

    if (query.dateTo) {
      if (typeof query.dateTo !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'dateTo parameter must be a string in ISO date format (e.g., "2024-12-31")'
        });
      }

      const dateTo = new Date(query.dateTo);
      if (isNaN(dateTo.getTime())) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid dateTo parameter - must be a valid ISO date string (e.g., "2024-12-31")'
        });
      }

      // Set to end of day for inclusive filtering
      dateTo.setHours(23, 59, 59, 999);
      
      // Cap to current time if in future
      const now = new Date();
      if (dateTo > now) {
        dateTo.setTime(now.getTime());
      }

      filters.dateTo = dateTo;
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      if (filters.dateFrom > filters.dateTo) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid date range - dateFrom must be before or equal to dateTo'
        });
      }

      // Check for excessively large date ranges
      const rangeDays = Math.ceil((filters.dateTo.getTime() - filters.dateFrom.getTime()) / (1000 * 60 * 60 * 24));
      const maxRangeDays = 365 * 2; // 2 years maximum

      if (rangeDays > maxRangeDays) {
        throw createError({
          statusCode: 400,
          statusMessage: `Date range is too large. Maximum allowed range is ${maxRangeDays} days, but ${rangeDays} days were requested`
        });
      }
    }

    // Parse customer ID filter with enhanced validation
    if (query.customerId) {
      if (typeof query.customerId !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'customerId parameter must be a string'
        });
      }

      const trimmedCustomerId = query.customerId.trim();
      if (trimmedCustomerId.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'customerId parameter cannot be empty'
        });
      }

      // Basic format validation (assuming CUID format)
      if (trimmedCustomerId.length < 10 || !/^[a-zA-Z0-9]+$/.test(trimmedCustomerId)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'customerId parameter has invalid format'
        });
      }

      filters.customerId = trimmedCustomerId;
    }

    return filters;

  } catch (error: any) {
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error;
    }

    // For any other parsing errors, provide a generic message
    throw createError({
      statusCode: 400,
      statusMessage: `Error parsing filter parameters: ${error?.message || 'Invalid filter format'}`
    });
  }
}