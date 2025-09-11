import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { TimezoneService } from '~/utils/timezoneService';
import { validateReportRequest, validateUserId, validateProcessingLogs } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

export default defineEventHandler(async (event) => {
  let sessionData: any = null;
  
  try {
    const query = getQuery(event);

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

    // Build where clause for filtering
    const whereClause: any = {
      userId: userId,
      endTime: { not: null }, // Only completed tasks
    };

    // Apply validated date filters
    if (startDate && endDate) {
      whereClause.startTime = { gte: startDate };
      whereClause.endTime = { lte: endDate };
    } else if (startDate) {
      whereClause.startTime = { gte: startDate };
    } else if (endDate) {
      whereClause.endTime = { lte: endDate };
    }

    if (stationId) {
      whereClause.stationId = stationId;
    }

    // Fetch processing logs with related data for the specific employee
    let processingLogs;
    try {
      processingLogs = await prisma.itemProcessingLog.findMany({
        where: whereClause,
        include: {
          user: true,
          station: true,
          orderItem: {
            include: {
              item: true,
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
        }
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
        summary: {
          totalItems: 0,
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

    // Group by orderItemId to get unique items and calculate total processing time per item
    const itemsMap = new Map<string, {
      orderItemId: string;
      itemName: string;
      orderNumber: string;
      orderId: string;
      customerName: string;
      processingTime: number;
      processedAt: Date;
      stationName: string;
      stationNames: Set<string>;
      completedAt: Date | null;
    }>();

    for (const log of logValidation.validLogs) {
      const orderItemId = log.orderItemId;
      
      if (!orderItemId) {
        continue; // Skip logs without orderItemId (should be filtered by validation)
      }
      
      if (!itemsMap.has(orderItemId)) {
        // Safely access nested properties with fallbacks
        const orderItem = log.orderItem;
        const order = orderItem?.order;
        const item = orderItem?.item;
        const customer = order?.customer;
        
        if (!orderItem || !order || !item) {
          console.warn(`Incomplete data for orderItemId ${orderItemId}, skipping`);
          continue;
        }

        // Determine order number - prefer sales order number, fallback to purchase order number
        const orderNumber = order.salesOrderNumber || 
                           order.purchaseOrderNumber || 
                           `Order-${order.id.slice(-8)}`;

        itemsMap.set(orderItemId, {
          orderItemId,
          itemName: item.name || 'Unknown Item',
          orderNumber,
          orderId: order.id,
          customerName: customer?.name || 'Unknown Customer',
          processingTime: 0,
          processedAt: log.startTime || new Date(),
          stationName: log.station?.name || 'Unknown Station',
          stationNames: new Set<string>(),
          completedAt: null
        });
      }

      const itemData = itemsMap.get(orderItemId)!;
      
      // Add processing time (duration in seconds) with validation
      if (log.durationInSeconds && log.durationInSeconds > 0) {
        itemData.processingTime += log.durationInSeconds;
      }
      
      // Track all stations this item was processed at
      if (log.station?.name) {
        itemData.stationNames.add(log.station.name);
      }
      
      // Update completion time to the latest end time
      if (log.endTime && (!itemData.completedAt || log.endTime > itemData.completedAt)) {
        itemData.completedAt = log.endTime;
      }
      
      // Update processed at to the earliest start time
      if (log.startTime && log.startTime < itemData.processedAt) {
        itemData.processedAt = log.startTime;
      }
    }

    // Convert map to array and format the response
    const result = Array.from(itemsMap.values()).map(item => ({
      orderItemId: item.orderItemId,
      itemName: item.itemName,
      orderNumber: item.orderNumber,
      orderId: item.orderId,
      customerName: item.customerName,
      processingTime: item.processingTime, // in seconds
      processingTimeFormatted: formatDuration(item.processingTime),
      processedAt: item.processedAt,
      completedAt: item.completedAt,
      stationName: item.stationNames.size === 1 
        ? item.stationName 
        : Array.from(item.stationNames).join(', '), // Show all stations if multiple
      stationNames: Array.from(item.stationNames)
    }));

    return {
      success: true,
      data: result,
      summary: {
        totalItems: result.length,
        totalProcessingTime: result.reduce((sum, item) => sum + item.processingTime, 0),
        totalProcessingTimeFormatted: formatDuration(
          result.reduce((sum, item) => sum + item.processingTime, 0)
        )
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'employee_items_report_generation', sessionData?.user?.id, { 
      requestedUserId: query.userId 
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
          summary: {
            totalItems: 0,
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