import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { LeadTimeCalculator } from '~/utils/leadTimeCalculator';
import { TimezoneService } from '~/utils/timezoneService';
import { validateReportRequest, safeDivide } from '~/utils/reportValidation';
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
            'Verify all IDs are in correct format'
          ]
        }
      });
    }

    const { startDate, endDate, customerId, orderStatus } = validation.validatedParams;

    // Build where clause for filtering
    const whereClause: any = {
      orderStatus: { not: 'PENDING' } // Exclude pending orders
    };

    // Apply validated date filters
    if (startDate && endDate) {
      whereClause.createdAt = { 
        gte: startDate,
        lte: endDate
      };
    } else if (startDate) {
      whereClause.createdAt = { gte: startDate };
    } else if (endDate) {
      whereClause.createdAt = { lte: endDate };
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (orderStatus) {
      whereClause.orderStatus = orderStatus;
    }

    // Fetch orders with related data
    let orders;
    try {
      orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          customer: true,
          items: {
            where: {
              isProduct: true // Only production items
            },
            include: {
              item: true,
              itemProcessingLogs: {
                include: {
                  station: true,
                  user: true
                },
                orderBy: {
                  startTime: 'asc'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbError) {
      logError(dbError, 'lead_time_report_database_query', sessionData.user.id);
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while fetching lead time data',
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

    // Handle case where no orders are found
    if (!orders || orders.length === 0) {
      return {
        success: true,
        data: [],
        summary: {
          totalOrders: 0,
          completedOrders: 0,
          ordersInProduction: 0,
          avgLeadTimeDays: 0,
          avgProductionTimeDays: 0,
          avgProductionTimeBusinessDays: 0,
          totalItemsProduced: 0,
          totalProductionHours: 0
        },
        message: 'No orders found for the specified criteria',
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        }
      };
    }

    // Calculate lead time metrics for each order with enhanced error handling
    const result = orders.map(order => {
      const approvedAt = order.approvedAt;
      const readyToShipAt = order.readyToShipAt;
      const createdAt = order.createdAt;
      
      // Calculate various time metrics using business day calculation with safe handling
      let daysFromCreationToApproval = 0;
      let daysInProduction = 0;
      let totalLeadTimeDays = 0;
      
      try {
        if (approvedAt && createdAt) {
          daysFromCreationToApproval = LeadTimeCalculator.safeCalculateBusinessDays(
            createdAt, 
            approvedAt
          );
        }
        
        if (approvedAt && readyToShipAt) {
          daysInProduction = LeadTimeCalculator.safeCalculateBusinessDays(
            approvedAt, 
            readyToShipAt
          );
          totalLeadTimeDays = LeadTimeCalculator.safeCalculateBusinessDays(createdAt, readyToShipAt);
        } else if (approvedAt) {
          // Order is in production but not complete - calculate current production time
          daysInProduction = LeadTimeCalculator.safeCalculateBusinessDays(
            approvedAt, 
            new Date()
          );
        }
      } catch (dateError) {
        console.warn(`Date calculation error for order ${order.id}:`, dateError);
        // Continue with default values (0)
      }

      // Calculate station breakdown with error handling
      const stationBreakdown = new Map<string, {
        stationName: string;
        totalTime: number;
        itemCount: number;
      }>();

      let totalProductionTime = 0;
      let itemsCompleted = 0;
      let itemsInProduction = 0;

      for (const orderItem of order.items) {
        if (!orderItem || !Array.isArray(orderItem.itemProcessingLogs)) {
          continue; // Skip invalid order items
        }

        if (orderItem.itemProcessingLogs.length > 0) {
          itemsInProduction++;
          
          if (orderItem.itemStatus === 'READY' || orderItem.itemStatus === 'PRODUCT_FINISHED') {
            itemsCompleted++;
          }

          for (const log of orderItem.itemProcessingLogs) {
            if (!log || !log.station) {
              continue; // Skip invalid logs
            }

            if (log.durationInSeconds && log.durationInSeconds > 0) {
              totalProductionTime += log.durationInSeconds;
              
              const stationName = log.station.name || 'Unknown Station';
              const existing = stationBreakdown.get(stationName) || {
                stationName,
                totalTime: 0,
                itemCount: 0
              };
              existing.totalTime += log.durationInSeconds;
              existing.itemCount += 1;
              stationBreakdown.set(stationName, existing);
            }
          }
        }
      }

      // Find bottlenecks (stations with longest average processing time) with safe division
      const stationTimes = Array.from(stationBreakdown.values()).map(station => ({
        ...station,
        avgTimePerItem: safeDivide(station.totalTime, station.itemCount, 0)
      }));
      
      const bottlenecks = stationTimes
        .filter(station => station.avgTimePerItem > 0)
        .sort((a, b) => b.avgTimePerItem - a.avgTimePerItem)
        .slice(0, 2)
        .map(station => station.stationName);

      // Calculate completion percentage with safe division
      const completionPercentage = order.items.length > 0 
        ? Math.round(safeDivide(itemsCompleted, order.items.length, 0) * 100) 
        : 0;

      // Calculate production time metrics with safe division
      const totalProductionTimeHours = safeDivide(totalProductionTime, 3600, 0);
      const totalProductionTimeBusinessDays = totalProductionTime > 0 
        ? LeadTimeCalculator.convertHoursToBusinessDays(totalProductionTimeHours)
        : 0;

      return {
        id: order.id,
        orderNumber: order.salesOrderNumber || order.purchaseOrderNumber || `Order-${order.id.slice(-8)}`,
        customerName: order.customer?.name || 'Unknown Customer',
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt,
        readyToShipAt: order.readyToShipAt,
        daysFromCreationToApproval,
        daysInProduction,
        totalLeadTimeDays,
        totalItems: order.items.length,
        itemsInProduction,
        itemsCompleted,
        completionPercentage,
        totalProductionTimeHours: Math.round(totalProductionTimeHours * 100) / 100,
        totalProductionTimeBusinessDays,
        stationBreakdown: stationTimes,
        bottlenecks
      };
    });

    // Calculate summary statistics with safe division
    const completedOrders = result.filter(order => 
      order.orderStatus === 'READY_TO_SHIP' || order.orderStatus === 'SHIPPED'
    );
    const ordersInProduction = result.filter(order => 
      order.orderStatus === 'ORDER_PROCESSING'
    );
    
    const avgLeadTime = completedOrders.length > 0
      ? Math.round(safeDivide(
          completedOrders.reduce((sum, order) => sum + order.totalLeadTimeDays, 0),
          completedOrders.length,
          0
        ))
      : 0;
      
    const avgProductionTime = completedOrders.length > 0
      ? Math.round(safeDivide(
          completedOrders.reduce((sum, order) => sum + order.daysInProduction, 0),
          completedOrders.length,
          0
        ))
      : 0;

    // Calculate average production time in business days from actual processing logs
    const avgProductionTimeBusinessDays = completedOrders.length > 0
      ? Math.round(safeDivide(
          completedOrders.reduce((sum, order) => sum + (order.totalProductionTimeBusinessDays || 0), 0),
          completedOrders.length,
          0
        ))
      : 0;

    return {
      success: true,
      data: result,
      summary: {
        totalOrders: result.length,
        completedOrders: completedOrders.length,
        ordersInProduction: ordersInProduction.length,
        avgLeadTimeDays: avgLeadTime,
        avgProductionTimeDays: avgProductionTime,
        avgProductionTimeBusinessDays: avgProductionTimeBusinessDays,
        totalItemsProduced: result.reduce((sum, order) => sum + order.itemsCompleted, 0),
        totalProductionHours: Math.round(result.reduce((sum, order) => sum + order.totalProductionTimeHours, 0) * 100) / 100
      },
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'lead_time_report_generation', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'Lead time report generation timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Add more specific filters (customer, order status)',
            'Try again during off-peak hours'
          ]
        }
      });
    }

    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while generating lead time report',
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
      statusMessage: 'Unexpected error occurred while generating lead time report',
      data: {
        retryable: true,
        fallbackData: {
          success: false,
          data: [],
          summary: {
            totalOrders: 0,
            completedOrders: 0,
            ordersInProduction: 0,
            avgLeadTimeDays: 0,
            avgProductionTimeDays: 0,
            avgProductionTimeBusinessDays: 0,
            totalItemsProduced: 0,
            totalProductionHours: 0
          },
          error: 'Lead time report generation failed'
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