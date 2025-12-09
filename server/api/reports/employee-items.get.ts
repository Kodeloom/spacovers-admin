import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { validateReportRequest, validateUserId, validateProcessingLogs } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

export default defineEventHandler(async (event) => {
  let sessionData: any = null;
  let query: any = null;
  
  try {
    query = getQuery(event);

    // Get the current user session
    sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Validate userId parameter (required for this endpoint)
    const userIdValidation = validateUserId(query.userId);
    if (!userIdValidation.isValid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid userId parameter: ${userIdValidation.error}`,
        data: {
          suggestions: [
            'Provide a valid userId parameter',
            'Ensure userId is in UUID format',
            'Check that the user exists in the system'
          ]
        }
      });
    }

    // Validate other request parameters
    const validation = validateReportRequest(query);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request parameters: ${errorMessages}`,
        data: {
          errors: validation.errors,
          suggestions: [
            'Check parameter formats and try again',
            'Ensure date range is valid',
            'Verify all IDs are in correct format'
          ]
        }
      });
    }

    const { startDate, endDate, stationId } = validation.validatedParams;
    const userId = userIdValidation.normalizedValue;

    // Parse pagination parameters
    const page = parseInt(query.page as string) || 1;
    const limit = Math.min(parseInt(query.limit as string) || 50, 100); // Max 100 items per page
    const offset = (page - 1) * limit;

    // Build where clause for filtering
    // NOTE: We need to find items where this user COMPLETED work, not just where their userId appears
    // This means finding logs where this user was the NEXT scanner (who closed the previous log)
    // For now, we'll use a simpler approach: get all logs for items this user touched
    const whereClause: any = {
      userId: userId,
      // Include both completed and in-progress items
      startTime: { not: null }
    };

    // Apply validated date filters
    if (startDate && endDate) {
      whereClause.startTime = { gte: startDate };
      // Use OR condition: either endTime is within range OR endTime is null (in-progress)
      whereClause.OR = [
        { endTime: { lte: endDate } },
        { endTime: null }
      ];
    } else if (startDate) {
      whereClause.startTime = { gte: startDate };
    } else if (endDate) {
      // Use OR condition: either endTime is within range OR endTime is null (in-progress)
      whereClause.OR = [
        { endTime: { lte: endDate } },
        { endTime: null }
      ];
    }

    if (stationId) {
      whereClause.stationId = stationId;
    }

    // Fetch processing logs with related data for the specific employee
    let processingLogs;
    let totalCount;
    try {
      // Get total count for pagination
      totalCount = await prisma.itemProcessingLog.count({
        where: whereClause
      });

      // Fetch paginated processing logs
      processingLogs = await prisma.itemProcessingLog.findMany({
        where: whereClause,
        include: {
          user: true,
          station: true,
          orderItem: {
            include: {
              item: true,
              productAttributes: {
                select: {
                  productType: true,
                  shape: true,
                  size: true,
                  color: true
                }
              },
              order: {
                select: {
                  id: true,
                  salesOrderNumber: true,
                  purchaseOrderNumber: true,
                  customer: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          endTime: 'desc' // Most recent first
        },
        skip: offset,
        take: limit
      });
    } catch (dbError) {
      logError(dbError, 'employee_items_database_query', sessionData.user.id, { userId });
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while fetching employee item details',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Reduce the date range if the query is too large',
            'Contact support if the problem persists'
          ]
        }
      });
    }

    // Validate and clean processing logs data
    const logValidation = validateProcessingLogs(processingLogs);
    if (!logValidation.isValid && logValidation.validLogs.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        },
        summary: {
          totalProcessingLogs: 0,
          totalProcessingTime: 0,
          totalProcessingTimeFormatted: '0s'
        },
        message: 'No processing logs found for this employee in the specified date range',
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      };
    }

    // Log warnings if any data issues were found
    if (logValidation.warnings.length > 0) {
      console.warn('Employee items report data warnings:', logValidation.warnings);
    }

    // Convert processing logs to detailed entries with start/end times for each station
    const result = logValidation.validLogs.map(log => {
      // Safely access nested properties with fallbacks
      const orderItem = log.orderItem;
      const order = orderItem?.order;
      const item = orderItem?.item;
      const customer = order?.customer;
      
      if (!orderItem || !order || !item) {
        console.warn(`Incomplete data for orderItemId ${log.orderItemId}, skipping`);
        return null;
      }

      // Determine order number - prefer sales order number, fallback to purchase order number
      const orderNumber = order.salesOrderNumber || 
                         order.purchaseOrderNumber || 
                         `Order-${order.id.slice(-8)}`;

      // Get product attributes
      const productAttrs = orderItem.productAttributes;
      
      return {
        processingLogId: log.id,
        orderItemId: log.orderItemId,
        itemName: item.name || 'Unknown Item',
        orderNumber,
        orderId: order.id,
        customerName: customer?.name || 'Unknown Customer',
        status: orderItem.itemStatus || 'UNKNOWN',
        stationName: log.station?.name || 'Unknown Station',
        stationId: log.stationId,
        startTime: log.startTime,
        endTime: log.endTime,
        // Product attributes
        productType: productAttrs?.productType || null,
        shape: productAttrs?.shape || null,
        size: productAttrs?.size || null,
        color: productAttrs?.color || null,
        processingTime: log.durationInSeconds || 0, // in seconds
        processingTimeFormatted: formatDuration(log.durationInSeconds || 0)
      };
    }).filter(item => item !== null); // Remove null entries

    const totalPages = Math.ceil(totalCount / limit);

    return {
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        totalProcessingLogs: result.length,
        totalProcessingTime: result.reduce((sum, item) => sum + item.processingTime, 0),
        totalProcessingTimeFormatted: formatDuration(
          result.reduce((sum, item) => sum + item.processingTime, 0)
        )
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'employee_items_report_generation', sessionData?.user?.id, { 
      requestedUserId: query?.userId 
    });
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'Employee items report generation timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Try again during off-peak hours'
          ]
        }
      });
    }

    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while fetching employee item details',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Contact support if the problem persists'
          ]
        }
      });
    }
    
    // Generic server error with fallback data
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while fetching employee item details',
      data: {
        retryable: true,
        fallbackData: {
          success: false,
          data: [],
          pagination: {
            page: 1,
            limit: 50,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          summary: {
            totalProcessingLogs: 0,
            totalProcessingTime: 0,
            totalProcessingTimeFormatted: '0s'
          },
          error: 'Employee items report generation failed'
        },
        suggestions: [
          'Try again with a smaller date range',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
      }
    });
  }
});

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return remainingSeconds > 0
      ? `${hours}h ${remainingMinutes}m ${remainingSeconds}s`
      : `${hours}h ${remainingMinutes}m`;
  }
  
  return `${hours}h`;
}