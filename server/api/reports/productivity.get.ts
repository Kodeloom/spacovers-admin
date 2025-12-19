import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

import { validateReportRequest, validateProcessingLogs, validateDataQuality, logPerformanceMetrics, validateQueryPerformance, safeDivide } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

// Cache removed to prevent stale data issues
// If performance becomes an issue, consider implementing proper cache invalidation

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

    // Cache removed - always fetch fresh data to prevent stale data issues

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

    // Skip validation - count ALL records regardless of duration or other issues
    if (!processingLogs || processingLogs.length === 0) {
      return {
        success: true,
        data: [],
        summary: {
          totalEmployees: 0,
          totalItemsProcessed: 0,
          totalProductionTime: 0
        },
        message: 'No productivity data available for the selected date range and filters'
      };
    }

    console.log(`Processing ${processingLogs.length} processing logs (no validation filtering)`);

    // No validation warnings - use all data
    const allWarnings: string[] = [];

    // CORRECTED LOGIC: Count scans per user per station + proper time attribution
    // Group by user and station to calculate aggregated data
    const aggregatedData = new Map<string, {
      userId: string;
      userName: string;
      stationId: string;
      stationName: string;
      scanCount: number;
      totalDuration: number;
      scans: any[]; // Store actual scans for the modal
    }>();

    console.log(`Processing ${processingLogs.length} processing logs (all records)`);

    // First pass: Count scans per user per station (simple counting)
    for (const log of processingLogs) {
      const userId = log.userId;
      const userName = log.user?.name || 'Unknown User';
      const stationId = log.stationId;
      const stationName = log.station?.name || 'Unknown Station';
      
      // Skip Office station scans for counting
      if (stationName === 'Office') {
        console.log(`⏭️ Skipping Office scan for user ${userName}`);
        continue;
      }
      
      const key = `${userId}-${stationId}`;
      
      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, {
          userId,
          userName,
          stationId,
          stationName,
          scanCount: 0,
          totalDuration: 0,
          scans: []
        });
      }
      
      const data = aggregatedData.get(key)!;
      data.scanCount++; // Just count the scan
      data.scans.push(log); // Store the scan for the modal
      
      console.log(`✅ Counted scan for ${userName} at ${stationName} (total: ${data.scanCount})`);
    }

    // Second pass: Calculate time attribution (time gets credited to the person who scanned NEXT)
    // Group logs by order item to calculate time between scans
    const logsByOrderItem = new Map<string, any[]>();
    
    for (const log of processingLogs) {
      const orderItemId = log.orderItemId;
      if (!logsByOrderItem.has(orderItemId)) {
        logsByOrderItem.set(orderItemId, []);
      }
      logsByOrderItem.get(orderItemId)!.push(log);
    }

    // Define the logical workflow sequence
    const workflowSequence = [
      'Cutting',
      'Sewing', 
      'Foam Cutting',
      'Stuffing',
      'Packaging'
    ];

    // Helper function to check if next station is logical in workflow
    function isLogicalNextStation(currentStation: string, nextStation: string): boolean {
      const currentIndex = workflowSequence.indexOf(currentStation);
      const nextIndex = workflowSequence.indexOf(nextStation);
      
      // If either station is not in our workflow, don't attribute time
      if (currentIndex === -1 || nextIndex === -1) {
        return false;
      }
      
      // Next station should be after current station in the workflow
      return nextIndex > currentIndex;
    }

    // Process each order item's logs to calculate time attribution
    for (const [orderItemId, logs] of logsByOrderItem) {
      // Sort logs by start time (chronological order)
      const sortedLogs = logs
        .filter(log => log.startTime) // Only logs with valid start times
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Calculate time between consecutive scans
      for (let i = 0; i < sortedLogs.length - 1; i++) {
        const currentLog = sortedLogs[i];
        const nextLog = sortedLogs[i + 1];
        
        // Skip Office station logs for time attribution
        if (currentLog.station?.name === 'Office' || nextLog.station?.name === 'Office') {
          continue;
        }

        const currentStation = currentLog.station?.name || '';
        const nextStation = nextLog.station?.name || '';

        // Only attribute time if the next station is logical in the workflow
        if (!isLogicalNextStation(currentStation, nextStation)) {
          console.log(`⏭️ Skipping time attribution: ${currentStation} → ${nextStation} (not logical workflow sequence)`);
          continue;
        }

        // Calculate time between current scan and next scan
        const currentTime = new Date(currentLog.startTime).getTime();
        const nextTime = new Date(nextLog.startTime).getTime();
        const timeDiff = Math.floor((nextTime - currentTime) / 1000); // in seconds

        // Only attribute positive time differences
        if (timeDiff > 0) {
          // Time gets credited to the person who scanned NEXT (completed their work)
          const nextUserId = nextLog.userId;
          const nextStationId = nextLog.stationId;
          const nextKey = `${nextUserId}-${nextStationId}`;
          
          if (aggregatedData.has(nextKey)) {
            aggregatedData.get(nextKey)!.totalDuration += timeDiff;
            console.log(`⏱️ Attributed ${timeDiff}s to ${nextLog.user?.name} at ${nextLog.station?.name} (completed work between ${currentStation} and ${nextStation})`);
          }
        }
      }
    }

    // Convert map to array and calculate metrics with safe division
    const result = Array.from(aggregatedData.values()).map(data => {
      const scansCount = data.scanCount;
      
      // Calculate average time per scan (total time / scans)
      const avgDuration = scansCount > 0 
        ? Math.round(safeDivide(data.totalDuration, scansCount, 0))
        : 0;
      
      // Calculate efficiency as scans per hour with safe division
      const efficiency = scansCount > 0 && data.totalDuration > 0
        ? Math.round(safeDivide(scansCount * 3600, data.totalDuration, 0) * 100) / 100
        : 0;

      return {
        userId: data.userId,
        userName: data.userName,
        stationId: data.stationId,
        stationName: data.stationName,
        itemsProcessed: scansCount, // This is now just scan count
        totalDuration: data.totalDuration,
        avgDuration,
        efficiency,
        scans: data.scans // Include scans for the modal
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
        totalItemsProcessed: filteredResult.reduce((sum, r) => sum + r.itemsProcessed, 0), // This is now total scans
        totalProductionTime: filteredResult.reduce((sum, r) => sum + r.totalDuration, 0)
      },
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      // No data quality validation - using all records
      performance: {
        queryDuration: Date.now() - queryStartTime,
        recordsProcessed: processingLogs.length,
        validRecords: processingLogs.length, // All records are considered valid
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

    // Cache removed - no caching to prevent stale data issues

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