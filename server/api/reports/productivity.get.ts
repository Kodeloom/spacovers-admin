import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { TimezoneService } from '~/utils/timezoneService';
import { validateReportRequest, validateProcessingLogs, validateDataQuality, logPerformanceMetrics, validateQueryPerformance, safeDivide } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

// Simple in-memory cache for productivity data (5 minute TTL)
const productivityCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params: any): string {
  return JSON.stringify({
    startDate: params.startDate?.toISOString(),
    endDate: params.endDate?.toISOString(),
    stationId: params.stationId,
    userId: params.userId
  });
}

function getCachedData(cacheKey: string): any | null {
  const cached = productivityCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    productivityCache.delete(cacheKey); // Remove expired cache
  }
  return null;
}

function setCachedData(cacheKey: string, data: any): void {
  // Limit cache size to prevent memory issues
  if (productivityCache.size > 100) {
    const oldestKey = productivityCache.keys().next().value;
    if (oldestKey) {
      productivityCache.delete(oldestKey);
    }
  }
  productivityCache.set(cacheKey, { data, timestamp: Date.now() });
}

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

    // Validate request parameters with enhanced date range validation
    const validation = validateReportRequest(query);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request parameters: ${errorMessages}`,
        data: {
          errors: validation.errors,
          suggestions: validation.errors.flatMap(e => e.suggestions || [
            'Check parameter formats and try again',
            'Ensure date range is valid and not too large',
            'Verify all IDs are in correct UUID format'
          ])
        }
      });
    }

    const { startDate, endDate, stationId, userId } = validation.validatedParams;

    // Additional date range warnings for large ranges
    if (startDate && endDate) {
      const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (rangeDays > 90) {
        console.warn(`Large date range requested: ${rangeDays} days. This may impact performance.`);
      }
      if (rangeDays > 180) {
        console.warn(`Very large date range: ${rangeDays} days. Consider adding more specific filters.`);
      }
    }

    // Validate query performance implications
    const performanceValidation = validateQueryPerformance(validation.validatedParams);
    if (!performanceValidation.isOptimal) {
      console.warn('Performance warnings for productivity query:', performanceValidation.warnings);
    }

    // Check cache first for performance
    const cacheKey = getCacheKey(validation.validatedParams);
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      console.log('Returning cached productivity data');
      return {
        ...cachedResult,
        cached: true,
        cacheTimestamp: new Date().toISOString()
      };
    }

    // Build where clause for filtering with enhanced logic
    const whereClause: any = {
      endTime: { not: null }, // Only completed tasks
      startTime: { not: null }, // Ensure we have valid start times
      durationInSeconds: { gt: 0 }, // Only valid durations
      // Exclude "Office" station from productivity reports using relation filter
      station: {
        isNot: {
          name: 'Office'
        }
      }
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

    // Enhanced station filtering - ensure station exists
    if (stationId) {
      whereClause.stationId = stationId;
      // Also ensure it's not the Office station
      whereClause.station = {
        id: stationId,
        NOT: {
          name: 'Office'
        }
      };
    }

    // Enhanced user filtering - ensure user exists and is active
    if (userId) {
      whereClause.userId = userId;
      whereClause.user = {
        id: userId,
        // Only include active users
        status: 'ACTIVE'
      };
    }

    // Fetch processing logs with related data
    // Only include completed processing logs (with both startTime and endTime)
    // and ensure we only count production items (isProduct: true)
    let processingLogs;
    const queryStartTime = Date.now();
    
    try {
      // Add timeout handling for large queries
      // NOTE: For optimal performance, ensure these database indexes exist:
      // - ItemProcessingLog(startTime, endTime, durationInSeconds)
      // - ItemProcessingLog(userId, stationId, endTime)
      // - OrderItem(isProduct, id)
      // - ItemProcessingLog(orderItemId) - should already exist as FK
      const queryPromise = prisma.itemProcessingLog.findMany({
        where: {
          ...whereClause,
          // Ensure we only get completed processing logs
          startTime: whereClause.startTime || { not: null },
          endTime: { not: null },
          durationInSeconds: { gt: 0 },
          // Only include production items
          orderItem: {
            isProduct: true
          }
        },
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

      // Set a timeout for the query (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 30000);
      });

      processingLogs = await Promise.race([queryPromise, timeoutPromise]) as any[];
      
      // Log query performance for monitoring
      const queryDuration = Date.now() - queryStartTime;
      logPerformanceMetrics('productivity_database_query', queryDuration, processingLogs.length, sessionData?.user?.id);
      
    } catch (dbError: any) {
      logError(dbError, 'productivity_report_database_query', sessionData.user.id);
      
      // Handle specific database error types
      if (dbError.message === 'Query timeout') {
        throw createError({
          statusCode: 408,
          statusMessage: 'Database query timed out. Please try with a smaller date range.',
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

      if (dbError.code === 'P2024' || dbError.message?.includes('timeout')) {
        throw createError({
          statusCode: 408,
          statusMessage: 'Database query timed out. Please try with a smaller date range.',
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

      if (dbError.code?.startsWith('P20')) {
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

      // Generic database error
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

    // Log invalid logs count for monitoring
    if (logValidation.invalidLogs.length > 0) {
      console.warn(`Excluded ${logValidation.invalidLogs.length} invalid processing logs from productivity calculation`);
    }

    // Validate data quality and add recommendations
    const dataQuality = validateDataQuality(logValidation.validLogs);
    if (dataQuality.warnings.length > 0) {
      console.warn('Data quality warnings:', dataQuality.warnings);
    }

    // Combine validation warnings with data quality warnings
    const allWarnings = [
      ...logValidation.warnings,
      ...dataQuality.warnings
    ];

    // Group by user and station to calculate aggregated data
    const aggregatedData = new Map<string, {
      userId: string;
      userName: string;
      stationId: string;
      stationName: string;
      uniqueItemIds: Set<string>;
      totalDuration: number;
      completedSessions: number;
    }>();

    // Group processing logs by orderItemId to process each item's history
    const itemLogsMap = new Map<string, any[]>();
    
    for (const log of logValidation.validLogs) {
      if (!itemLogsMap.has(log.orderItemId)) {
        itemLogsMap.set(log.orderItemId, []);
      }
      itemLogsMap.get(log.orderItemId)!.push(log);
    }

    console.log(`Processing ${itemLogsMap.size} items with processing logs`);

    // Process each item's complete processing history
    // IMPORTANT: When someone scans an item, it means they FINISHED their work at that station
    // The time between scans represents the work done at the PREVIOUS station by the CURRENT scanner
    for (const [itemId, logs] of itemLogsMap) {
      // Sort logs by startTime to get chronological order
      const sortedLogs = logs
        .filter(log => log.endTime && log.startTime && log.durationInSeconds > 0)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      // Process each completed processing log
      // When a user scans an item, they are FINISHING their work at that station
      for (const currentLog of sortedLogs) {
        // The person who scanned gets credit for the work done at THEIR station
        const creditUserId = currentLog.userId;
        const creditUserName = currentLog.user?.name || 'Unknown User';
        const creditStationId = currentLog.stationId;
        const creditStationName = currentLog.station?.name || 'Unknown Station';

        // Skip Office station entries
        if (creditStationName === 'Office') {
          console.log(`Item ${itemId}: Skipping Office station entry for ${creditUserName}`);
          continue;
        }

        const key = `${creditUserId}-${creditStationId}`;
        
        if (!aggregatedData.has(key)) {
          aggregatedData.set(key, {
            userId: creditUserId,
            userName: creditUserName,
            stationId: creditStationId,
            stationName: creditStationName,
            uniqueItemIds: new Set<string>(),
            totalDuration: 0,
            completedSessions: 0
          });
        }

        const data = aggregatedData.get(key)!;
        
        // Count unique items and add processing time
        // The duration represents the time THIS user spent working on this item at THIS station
        data.uniqueItemIds.add(itemId);
        data.totalDuration += currentLog.durationInSeconds;
        data.completedSessions++;
        
        console.log(`Item ${itemId}: Credited ${currentLog.durationInSeconds}s (${(currentLog.durationInSeconds/3600).toFixed(2)}h) to ${creditUserName} for completing work at ${creditStationName}`);
      }
    }

    // Convert map to array and calculate metrics with safe division
    const result = Array.from(aggregatedData.values()).map(data => {
      const itemsProcessed = data.uniqueItemIds.size;
      
      // Calculate average time per item (total time / unique items processed)
      const avgDuration = itemsProcessed > 0 
        ? Math.round(safeDivide(data.totalDuration, itemsProcessed, 0))
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
        avgDuration,
        efficiency
      };
    });

    // Apply additional filtering if both station and user are specified
    let filteredResult = result;
    if (stationId && userId) {
      // When both filters are applied, ensure we only show data for that specific combination
      filteredResult = result.filter(row => row.stationId === stationId && row.userId === userId);
      
      if (filteredResult.length === 0) {
        // Provide helpful information about why no data was found
        const userExists = result.some(row => row.userId === userId);
        const stationExists = result.some(row => row.stationId === stationId);
        
        let message = 'No data found for the selected employee and station combination.';
        if (!userExists && !stationExists) {
          message = 'Neither the selected employee nor station had any activity during this period.';
        } else if (!userExists) {
          message = 'The selected employee had no activity during this period.';
        } else if (!stationExists) {
          message = 'The selected station had no activity during this period.';
        } else {
          message = 'The selected employee did not work at the selected station during this period.';
        }
        
        allWarnings.push(message);
      }
    }

    // Sort by items processed descending, then by efficiency descending
    filteredResult.sort((a, b) => {
      if (b.itemsProcessed !== a.itemsProcessed) {
        return b.itemsProcessed - a.itemsProcessed;
      }
      return b.efficiency - a.efficiency;
    });

    const responseData = {
      success: true,
      data: filteredResult,
      summary: {
        totalEmployees: new Set(filteredResult.map(r => r.userId)).size,
        totalItemsProcessed: filteredResult.reduce((sum, r) => sum + r.itemsProcessed, 0),
        totalProductionTime: filteredResult.reduce((sum, r) => sum + r.totalDuration, 0)
      },
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      dataQuality: {
        score: dataQuality.qualityScore,
        recommendations: dataQuality.recommendations.length > 0 ? dataQuality.recommendations : undefined
      },
      performance: {
        queryDuration: Date.now() - queryStartTime,
        recordsProcessed: processingLogs.length,
        validRecords: logValidation.validLogs.length,
        suggestions: performanceValidation.suggestions.length > 0 ? performanceValidation.suggestions : undefined
      },
      filters: {
        applied: {
          dateRange: startDate && endDate,
          station: !!stationId,
          user: !!userId
        },
        stationId,
        userId
      },
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
    };

    // Cache the result for future requests
    setCachedData(cacheKey, responseData);

    return responseData;

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