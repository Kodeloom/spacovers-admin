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
      // Include both completed AND in-progress items
      // Completed items have endTime, in-progress items have startTime but no endTime
      startTime: { not: null }, // Ensure we have valid start times
      // NOTE: We include Office station logs in the query because we need them to calculate
      // the duration that other workers completed. We'll skip Office when crediting.
    };

    // Apply validated date filters
    // For in-progress items, we only filter by startTime since they don't have endTime yet
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
    
    // Debug: Log the where clause
    console.log('🔍 Query where clause:', JSON.stringify({
      ...whereClause,
      startTime: whereClause.startTime || { not: null },
      orderItem: { isProduct: true }
    }, null, 2));
    
    // Debug: Check total count without filters
    const totalLogsCount = await prisma.itemProcessingLog.count();
    console.log(`🔍 Total ItemProcessingLog records in database: ${totalLogsCount}`);
    
    // Debug: Check for manually attributed sewing logs specifically
    const manualSewerLogsCount = await prisma.itemProcessingLog.count({
      where: {
        station: { name: 'Sewing' },
        notes: { contains: 'Manually attributed' }
      }
    });
    console.log(`🔍 Manual sewing attribution logs in database: ${manualSewerLogsCount}`);
    
    // Debug: Check if any sewing logs fall within the date range
    if (startDate && endDate) {
      const sewingLogsInRange = await prisma.itemProcessingLog.count({
        where: {
          station: { name: 'Sewing' },
          startTime: { gte: startDate },
          OR: [
            { endTime: { lte: endDate } },
            { endTime: null }
          ]
        }
      });
      console.log(`🔍 Sewing logs within date range (${startDate.toISOString()} to ${endDate.toISOString()}): ${sewingLogsInRange}`);
    }
    
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
          // Include both completed and in-progress items
          startTime: whereClause.startTime || { not: null },
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
      
      // Debug: Log what we found
      console.log(`🔍 Found ${processingLogs.length} processing logs`);
      console.log('🔍 Sample of processing logs:', processingLogs.slice(0, 3).map(log => ({
        id: log.id,
        user: log.user?.name,
        station: log.station?.name,
        startTime: log.startTime,
        endTime: log.endTime,
        hasEndTime: !!log.endTime,
        orderItemId: log.orderItemId
      })));
      
      // Debug: Check specifically for sewing logs
      const sewingLogs = processingLogs.filter(log => log.station?.name === 'Sewing');
      console.log(`🧵 Found ${sewingLogs.length} sewing station logs`);
      if (sewingLogs.length > 0) {
        console.log('🧵 Sewing logs details:', sewingLogs.map(log => ({
          id: log.id,
          user: log.user?.name,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.durationInSeconds,
          notes: log.notes,
          isManualAttribution: log.notes?.includes('Manually attributed')
        })));
      }
      
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
    // CORRECTED LOGIC: When someone scans, they complete THEIR OWN work at their station
    // Time attribution: The time between scans gets credited to the person who scanned next
    // Item attribution: Each person gets credit for items they scanned (completed their work)
    for (const [itemId, logs] of itemLogsMap) {
      // Sort logs by startTime to get chronological order
      const sortedLogs = logs
        .filter(log => log.startTime)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      console.log(`\n📦 Processing item ${itemId} with ${sortedLogs.length} logs`);
      sortedLogs.forEach((log, idx) => {
        console.log(`  Log ${idx}: user=${log.user?.name}, station=${log.station?.name}, startTime=${log.startTime}, endTime=${log.endTime}, duration=${log.durationInSeconds}s`);
      });
      
      // Process each log - each scan means the person completed work at their station
      for (let i = 0; i < sortedLogs.length; i++) {
        const currentLog = sortedLogs[i];
        const nextLog = sortedLogs[i + 1];
        
        const currentUserId = currentLog.userId;
        const currentUserName = currentLog.user?.name || 'Unknown User';
        const currentStationId = currentLog.stationId;
        const currentStationName = currentLog.station?.name || 'Unknown Station';
        
        console.log(`  \n  Processing Log ${i}: user=${currentUserName}, station=${currentStationName}`);
        
        // Skip Office station for item counts (but still process for time attribution)
        if (currentStationName === 'Office') {
          console.log(`  ⏭️  Skipping item count - Office station`);
          
          // Handle time attribution for Office work
          if (nextLog && currentLog.endTime && currentLog.durationInSeconds > 0) {
            const nextUserId = nextLog.userId;
            const nextUserName = nextLog.user?.name || 'Unknown User';
            const nextStationId = nextLog.stationId;
            const nextStationName = nextLog.station?.name || 'Unknown Station';
            
            // Skip if next station is also Office
            if (nextStationName === 'Office') {
              continue;
            }
            
            const nextKey = `${nextUserId}-${nextStationId}`;
            
            if (!aggregatedData.has(nextKey)) {
              aggregatedData.set(nextKey, {
                userId: nextUserId,
                userName: nextUserName,
                stationId: nextStationId,
                stationName: nextStationName,
                uniqueItemIds: new Set<string>(),
                totalDuration: 0,
                completedSessions: 0
              });
            }
            
            const nextData = aggregatedData.get(nextKey)!;
            nextData.totalDuration += currentLog.durationInSeconds;
            
            console.log(`  ⏰ Credited ${currentLog.durationInSeconds}s time to ${nextUserName} at ${nextStationName}`);
          }
          continue;
        }
        
        // This person completed work at their station by scanning
        const key = `${currentUserId}-${currentStationId}`;
        
        if (!aggregatedData.has(key)) {
          aggregatedData.set(key, {
            userId: currentUserId,
            userName: currentUserName,
            stationId: currentStationId,
            stationName: currentStationName,
            uniqueItemIds: new Set<string>(),
            totalDuration: 0,
            completedSessions: 0
          });
        }
        
        const data = aggregatedData.get(key)!;
        data.uniqueItemIds.add(itemId); // Credit item for scanning (completing their work)
        data.completedSessions++;
        
        console.log(`  ✅ Credited item to ${currentUserName} at ${currentStationName} (completed their work by scanning)`);
        
        // Handle time attribution - time gets credited to the next person who scanned
        if (nextLog && currentLog.endTime && currentLog.durationInSeconds > 0) {
          const nextUserId = nextLog.userId;
          const nextUserName = nextLog.user?.name || 'Unknown User';
          const nextStationId = nextLog.stationId;
          const nextStationName = nextLog.station?.name || 'Unknown Station';
          
          // Skip if next station is Office
          if (nextStationName === 'Office') {
            console.log(`  ⏰ Skipping time credit - next station is Office`);
            continue;
          }
          
          const nextKey = `${nextUserId}-${nextStationId}`;
          
          if (!aggregatedData.has(nextKey)) {
            aggregatedData.set(nextKey, {
              userId: nextUserId,
              userName: nextUserName,
              stationId: nextStationId,
              stationName: nextStationName,
              uniqueItemIds: new Set<string>(),
              totalDuration: 0,
              completedSessions: 0
            });
          }
          
          const nextData = aggregatedData.get(nextKey)!;
          nextData.totalDuration += currentLog.durationInSeconds;
          
          console.log(`  ⏰ Credited ${currentLog.durationInSeconds}s time to ${nextUserName} at ${nextStationName}`);
        }
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