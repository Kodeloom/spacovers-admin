import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { TimezoneService } from '~/utils/timezoneService';
import { validateReportRequest, validateProcessingLogs, safeDivide } from '~/utils/reportValidation';
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

    // Validate request parameters
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
            'Ensure date range is valid and not too large',
            'Verify all IDs are in correct UUID format'
          ]
        }
      });
    }

    const { startDate, endDate, stationId, userId } = validation.validatedParams;

    // Build where clause for filtering
    const whereClause: any = {
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

    if (userId) {
      whereClause.userId = userId;
    }

    // Fetch processing logs with related data
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
              order: true
            }
          }
        }
      });
    } catch (dbError) {
      logError(dbError, 'productivity_report_database_query', sessionData.user.id);
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while fetching productivity data',
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
          totalEmployees: 0,
          totalItemsProcessed: 0,
          totalLaborCost: 0,
          totalProductionTime: 0
        },
        warnings: ['No valid processing logs found for the specified criteria'],
        message: 'No productivity data available for the selected date range and filters'
      };
    }

    // Log warnings if any data issues were found
    if (logValidation.warnings.length > 0) {
      console.warn('Productivity report data warnings:', logValidation.warnings);
    }

    // Group by user and station to calculate aggregated data
    const aggregatedData = new Map<string, {
      userId: string;
      userName: string;
      stationId: string;
      stationName: string;
      uniqueItemIds: Set<string>;
      totalDuration: number;
      totalCost: number;
      durations: number[];
    }>();

    for (const log of logValidation.validLogs) {
      const key = `${log.userId}-${log.stationId}`;
      
      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, {
          userId: log.userId,
          userName: log.user?.name || 'Unknown User',
          stationId: log.stationId,
          stationName: log.station?.name || 'Unknown Station',
          uniqueItemIds: new Set<string>(),
          totalDuration: 0,
          totalCost: 0,
          durations: []
        });
      }

      const data = aggregatedData.get(key)!;
      
      // Count unique items only - add orderItemId to Set
      if (log.orderItemId) {
        data.uniqueItemIds.add(log.orderItemId);
      }
      
      if (log.durationInSeconds && log.durationInSeconds > 0) {
        data.totalDuration += log.durationInSeconds;
        data.durations.push(log.durationInSeconds);
        
        // Calculate cost (duration in hours * hourly rate) with safe division
        if (log.user?.hourlyRate) {
          const hours = safeDivide(log.durationInSeconds, 3600, 0);
          const hourlyRate = parseFloat(log.user.hourlyRate.toString());
          if (!isNaN(hourlyRate) && hourlyRate > 0) {
            data.totalCost += hours * hourlyRate;
          }
        }
      }
    }

    // Convert map to array and calculate averages with safe division
    const result = Array.from(aggregatedData.values()).map(data => {
      const itemsProcessed = data.uniqueItemIds.size;
      const avgDuration = data.durations.length > 0 
        ? Math.round(safeDivide(data.totalDuration, data.durations.length, 0))
        : 0;
      
      // Calculate efficiency as items per hour with safe division
      const efficiency = itemsProcessed > 0 && data.totalDuration > 0
        ? Math.round(safeDivide(itemsProcessed * 3600, data.totalDuration, 0) * 100) / 100
        : 0;

      return {
        userId: data.userId,
        userName: data.userName,
        stationId: data.stationId,
        stationName: data.stationName,
        itemsProcessed,
        totalDuration: data.totalDuration,
        totalCost: Math.round(data.totalCost * 100) / 100, // Round to 2 decimal places
        avgDuration,
        efficiency
      };
    });

    // Sort by total cost descending
    result.sort((a, b) => b.totalCost - a.totalCost);

    return {
      success: true,
      data: result,
      summary: {
        totalEmployees: new Set(result.map(r => r.userId)).size,
        totalItemsProcessed: result.reduce((sum, r) => sum + r.itemsProcessed, 0),
        totalLaborCost: Math.round(result.reduce((sum, r) => sum + r.totalCost, 0) * 100) / 100,
        totalProductionTime: result.reduce((sum, r) => sum + r.totalDuration, 0)
      },
      warnings: logValidation.warnings.length > 0 ? logValidation.warnings : undefined,
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'productivity_report_generation', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'Report generation timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Add more specific filters (station, user)',
            'Try again during off-peak hours'
          ]
        }
      });
    }

    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while generating productivity report',
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
      statusMessage: 'Unexpected error occurred while generating productivity report',
      data: {
        retryable: true,
        fallbackData: {
          success: false,
          data: [],
          summary: {
            totalEmployees: 0,
            totalItemsProcessed: 0,
            totalLaborCost: 0,
            totalProductionTime: 0
          },
          error: 'Report generation failed'
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