import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { startDate, endDate, customerId, orderStatus } = query;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Build where clause for filtering
    const whereClause: any = {
      orderStatus: { not: 'PENDING' } // Exclude pending orders
    };

    if (startDate) {
      whereClause.createdAt = { 
        ...whereClause.createdAt,
        gte: new Date(startDate as string) 
      };
    }

    if (endDate) {
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      whereClause.createdAt = { 
        ...whereClause.createdAt,
        lte: endDateTime
      };
    }

    if (customerId) {
      whereClause.customerId = customerId as string;
    }

    if (orderStatus) {
      whereClause.orderStatus = orderStatus as string;
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
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

    // Calculate lead time metrics for each order
    const result = orders.map(order => {
      const approvedAt = order.approvedAt;
      const readyToShipAt = order.readyToShipAt;
      const createdAt = order.createdAt;
      
      // Calculate various time metrics
      let daysFromCreationToApproval = 0;
      let daysInProduction = 0;
      let totalLeadTimeDays = 0;
      
      if (approvedAt) {
        daysFromCreationToApproval = Math.ceil(
          (approvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
      
      if (approvedAt && readyToShipAt) {
        daysInProduction = Math.ceil(
          (readyToShipAt.getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalLeadTimeDays = Math.ceil(
          (readyToShipAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
      } else if (approvedAt) {
        // Order is in production but not complete
        daysInProduction = Math.ceil(
          (new Date().getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Calculate station breakdown
      const stationBreakdown = new Map<string, {
        stationName: string;
        totalTime: number;
        itemCount: number;
      }>();

      let totalProductionTime = 0;
      let itemsCompleted = 0;
      let itemsInProduction = 0;

      for (const orderItem of order.items) {
        if (orderItem.itemProcessingLogs.length > 0) {
          itemsInProduction++;
          
          if (orderItem.itemStatus === 'READY') {
            itemsCompleted++;
          }

          for (const log of orderItem.itemProcessingLogs) {
            if (log.durationInSeconds) {
              totalProductionTime += log.durationInSeconds;
              
              const stationName = log.station.name;
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

      // Find bottlenecks (stations with longest average processing time)
      const stationTimes = Array.from(stationBreakdown.values()).map(station => ({
        ...station,
        avgTimePerItem: station.itemCount > 0 ? station.totalTime / station.itemCount : 0
      }));
      
      const bottlenecks = stationTimes
        .filter(station => station.avgTimePerItem > 0)
        .sort((a, b) => b.avgTimePerItem - a.avgTimePerItem)
        .slice(0, 2)
        .map(station => station.stationName);

      return {
        id: order.id,
        orderNumber: order.salesOrderNumber || order.id.slice(-8),
        customerName: order.customer?.name || 'Unknown',
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
        completionPercentage: order.items.length > 0 
          ? Math.round((itemsCompleted / order.items.length) * 100) 
          : 0,
        totalProductionTimeHours: Math.round(totalProductionTime / 3600 * 100) / 100,
        stationBreakdown: stationTimes,
        bottlenecks
      };
    });

    // Calculate summary statistics
    const completedOrders = result.filter(order => order.orderStatus === 'READY_TO_SHIP' || order.orderStatus === 'SHIPPED');
    const ordersInProduction = result.filter(order => order.orderStatus === 'ORDER_PROCESSING');
    
    const avgLeadTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, order) => sum + order.totalLeadTimeDays, 0) / completedOrders.length)
      : 0;
      
    const avgProductionTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, order) => sum + order.daysInProduction, 0) / completedOrders.length)
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
        totalItemsProduced: result.reduce((sum, order) => sum + order.itemsCompleted, 0),
        totalProductionHours: result.reduce((sum, order) => sum + order.totalProductionTimeHours, 0)
      }
    };

  } catch (error) {
    console.error('Error generating lead time report:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Error generating lead time report'
    });
  }
});