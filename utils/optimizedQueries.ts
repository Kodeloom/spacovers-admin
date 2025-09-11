/**
 * Optimized Database Queries for Metrics Performance
 * Provides efficient database queries using proper aggregation functions and indexes
 * 
 * Requirements: 15.5 - Performance optimization using proper aggregation functions
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import type { OrderFilters, DateRange } from './metricsService';
import { LeadTimeCalculator } from './leadTimeCalculator';
import { PerformanceMonitor } from './performanceMonitor';

/**
 * Optimized query results interfaces
 */
export interface OptimizedDashboardData {
  totalOrders: number;
  revenueThisMonth: number;
  ordersThisWeek: number;
  statusCounts: Record<string, number>;
}

export interface OptimizedOrdersData {
  statusCounts: Record<string, number>;
  totalValue: number;
  totalOrders: number;
  productionCounts: Record<string, number>;
}

export interface OptimizedProductivityData {
  userId: string;
  userName: string;
  totalSeconds: number;
  itemsProcessed: number;
  stationBreakdown: {
    stationId: string;
    stationName: string;
    seconds: number;
    items: number;
  }[];
}

/**
 * Optimized Database Queries Service
 * Uses efficient aggregation queries with proper indexing
 */
export class OptimizedQueries {
  
  /**
   * Get dashboard metrics using optimized aggregation queries
   * Uses single queries with aggregations instead of multiple separate queries
   */
  static async getDashboardMetrics(): Promise<OptimizedDashboardData> {
    const startTime = Date.now();
    
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Calculate start of week (Monday)
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(now.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Single aggregation query for all dashboard metrics
      const [
        totalOrdersResult,
        revenueThisMonthResult,
        ordersThisWeekResult,
        statusCountsResult
      ] = await Promise.all([
        // Total orders count
        prisma.order.count(),
        
        // Revenue this month with aggregation
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            totalAmount: { not: null }
          }
        }),
        
        // Orders this week count
        prisma.order.count({
          where: {
            createdAt: { gte: startOfWeek, lte: endOfWeek }
          }
        }),
        
        // Status counts using groupBy for efficiency
        prisma.order.groupBy({
          by: ['orderStatus'],
          _count: { id: true },
          where: {
            orderStatus: { in: ['PENDING', 'ORDER_PROCESSING', 'READY_TO_SHIP'] }
          }
        })
      ]);

      // Process status counts into object
      const statusCounts: Record<string, number> = {};
      statusCountsResult.forEach(item => {
        statusCounts[item.orderStatus] = item._count.id;
      });

      const result = {
        totalOrders: totalOrdersResult,
        revenueThisMonth: Number(revenueThisMonthResult._sum.totalAmount) || 0,
        ordersThisWeek: ordersThisWeekResult,
        statusCounts
      };

      PerformanceMonitor.recordQuery('OptimizedQueries.getDashboardMetrics', Date.now() - startTime, false);
      return result;
    } catch (error) {
      PerformanceMonitor.recordQuery('OptimizedQueries.getDashboardMetrics', Date.now() - startTime, false);
      throw error;
    }
  }

  /**
   * Get orders page metrics using optimized queries with filters
   * Uses efficient aggregation and groupBy operations
   */
  static async getOrdersMetrics(filters?: OrderFilters): Promise<OptimizedOrdersData> {
    // Build optimized where clause
    const whereClause: any = {};
    
    if (filters?.status && filters.status.length > 0) {
      whereClause.orderStatus = { in: filters.status };
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) whereClause.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) whereClause.createdAt.lte = filters.dateTo;
    }
    
    if (filters?.customerId) {
      whereClause.customerId = filters.customerId;
    }
    
    if (filters?.priority && filters.priority.length > 0) {
      whereClause.priority = { in: filters.priority };
    }

    // Execute optimized parallel queries
    const [statusCountsResult, aggregateResult, productionCountsResult] = await Promise.all([
      // Order status counts
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { id: true },
        where: whereClause
      }),
      
      // Total value and count in single query
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          ...whereClause,
          totalAmount: { not: null }
        }
      }),
      
      // Production metrics using join with order filter - only count production items
      // Requirements 6.1, 6.2, 6.5: Only count production items with valid statuses
      prisma.orderItem.groupBy({
        by: ['itemStatus'],
        _count: { id: true },
        where: {
          order: whereClause,
          isProduct: true,  // Requirement 6.1, 6.5: Only count production items
          // Additional validation: ensure we only count valid production statuses
          itemStatus: {
            in: [
              'NOT_STARTED_PRODUCTION',
              'CUTTING', 
              'SEWING', 
              'FOAM_CUTTING', 
              'PACKAGING', 
              'PRODUCT_FINISHED', 
              'READY'
            ]
          }
        }
      })
    ]);

    // Process results
    const statusCounts: Record<string, number> = {};
    statusCountsResult.forEach(item => {
      statusCounts[item.orderStatus] = item._count.id;
    });

    const productionCounts: Record<string, number> = {};
    productionCountsResult.forEach(item => {
      productionCounts[item.itemStatus] = item._count.id;
    });

    return {
      statusCounts,
      totalValue: Number(aggregateResult._sum.totalAmount) || 0,
      totalOrders: aggregateResult._count.id,
      productionCounts
    };
  }

  /**
   * Get productivity data using optimized queries with proper joins
   * Uses efficient aggregation with user and station data
   */
  static async getProductivityData(dateRange: DateRange): Promise<OptimizedProductivityData[]> {
    // Get all processing logs to calculate unique items per user/station
    const processingLogs = await prisma.itemProcessingLog.findMany({
      where: {
        startTime: { gte: dateRange.startDate, lte: dateRange.endDate },
        endTime: { not: null },
        durationInSeconds: { not: null, gt: 0 },
        orderItemId: { not: null }
      },
      select: {
        userId: true,
        stationId: true,
        orderItemId: true,
        durationInSeconds: true
      }
    });

    // Get user and station data in batch queries
    const userIds = [...new Set(processingLogs.map(item => item.userId))];
    const stationIds = [...new Set(processingLogs.map(item => item.stationId))];

    const [users, stations] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true }
      }),
      prisma.station.findMany({
        where: { id: { in: stationIds } },
        select: { id: true, name: true }
      })
    ]);

    // Create lookup maps for efficiency
    const userMap = new Map(users.map(u => [u.id, u.name]));
    const stationMap = new Map(stations.map(s => [s.id, s.name]));

    // Group by user and aggregate station data with unique item counting
    const userProductivity = new Map<string, {
      userId: string;
      userName: string;
      totalSeconds: number;
      uniqueItemIds: Set<string>;
      stationBreakdown: Map<string, { stationId: string; stationName: string; seconds: number; uniqueItemIds: Set<string> }>;
    }>();

    processingLogs.forEach(log => {
      const userId = log.userId;
      const userName = userMap.get(userId) || 'Unknown User';
      const stationId = log.stationId;
      const stationName = stationMap.get(stationId) || 'Unknown Station';
      const seconds = Number(log.durationInSeconds) || 0;

      if (!userProductivity.has(userId)) {
        userProductivity.set(userId, {
          userId,
          userName,
          totalSeconds: 0,
          uniqueItemIds: new Set<string>(),
          stationBreakdown: new Map()
        });
      }

      const userData = userProductivity.get(userId)!;
      userData.totalSeconds += seconds;
      
      // Count unique items
      if (log.orderItemId) {
        userData.uniqueItemIds.add(log.orderItemId);
      }

      if (!userData.stationBreakdown.has(stationId)) {
        userData.stationBreakdown.set(stationId, {
          stationId,
          stationName,
          seconds: 0,
          uniqueItemIds: new Set<string>()
        });
      }

      const stationData = userData.stationBreakdown.get(stationId)!;
      stationData.seconds += seconds;
      
      // Count unique items per station
      if (log.orderItemId) {
        stationData.uniqueItemIds.add(log.orderItemId);
      }
    });

    // Convert to final format
    return Array.from(userProductivity.values()).map(userData => ({
      userId: userData.userId,
      userName: userData.userName,
      totalSeconds: userData.totalSeconds,
      itemsProcessed: userData.uniqueItemIds.size,
      stationBreakdown: Array.from(userData.stationBreakdown.values()).map(station => ({
        stationId: station.stationId,
        stationName: station.stationName,
        seconds: station.seconds,
        items: station.uniqueItemIds.size
      }))
    }));
  }

  /**
   * Get revenue data by period using optimized date aggregation
   * Uses efficient date truncation and grouping
   */
  static async getRevenueByPeriod(dateRange: DateRange): Promise<{ period: string; revenue: number; orderCount: number }[]> {
    // Use raw SQL for efficient date truncation and grouping
    const result = await prisma.$queryRaw<{
      period: string;
      revenue: number;
      order_count: bigint;
    }[]>`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as period,
        COALESCE(SUM(total_amount), 0)::DECIMAL as revenue,
        COUNT(*)::BIGINT as order_count
      FROM orders 
      WHERE created_at >= ${dateRange.startDate}
        AND created_at <= ${dateRange.endDate}
        AND total_amount IS NOT NULL
        AND total_amount > 0
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY period ASC
    `;

    return result.map(row => ({
      period: row.period,
      revenue: Number(row.revenue),
      orderCount: Number(row.order_count)
    }));
  }

  /**
   * Get average lead time using optimized calculation with business day conversion
   * Uses efficient aggregation with date arithmetic and converts to business days
   * Business days use 8-hour days with minimum 1 day and proper rounding
   */
  static async getAverageLeadTime(dateRange: DateRange): Promise<number> {
    const result = await prisma.$queryRaw<{
      created_at: Date;
      ready_to_ship_at: Date;
    }[]>`
      SELECT created_at, ready_to_ship_at
      FROM orders 
      WHERE created_at >= ${dateRange.startDate}
        AND created_at <= ${dateRange.endDate}
        AND ready_to_ship_at IS NOT NULL
        AND ready_to_ship_at > created_at
        AND EXTRACT(EPOCH FROM (ready_to_ship_at - created_at)) / 3600 <= 8760 -- Max 1 year
    `;

    if (result.length === 0) {
      return 0;
    }

    // Calculate business days for each order using LeadTimeCalculator
    const totalLeadTimeDays = result.reduce((sum, order) => {
      const leadTimeDays = LeadTimeCalculator.safeCalculateBusinessDays(
        order.created_at,
        order.ready_to_ship_at
      );
      return sum + leadTimeDays;
    }, 0);

    return totalLeadTimeDays / result.length;
  }

  /**
   * Get total production hours and items using single aggregation
   * Uses efficient sum aggregation with filtering
   */
  static async getProductionTotals(dateRange: DateRange): Promise<{ totalHours: number; totalItems: number }> {
    const [durationResult, uniqueItemsResult] = await Promise.all([
      // Get total duration
      prisma.itemProcessingLog.aggregate({
        _sum: { durationInSeconds: true },
        where: {
          startTime: { gte: dateRange.startDate, lte: dateRange.endDate },
          endTime: { not: null },
          durationInSeconds: { not: null, gt: 0 }
        }
      }),
      // Get unique items count
      prisma.itemProcessingLog.findMany({
        where: {
          startTime: { gte: dateRange.startDate, lte: dateRange.endDate },
          endTime: { not: null },
          durationInSeconds: { not: null, gt: 0 },
          orderItemId: { not: null }
        },
        select: { orderItemId: true },
        distinct: ['orderItemId']
      })
    ]);

    const totalSeconds = Number(durationResult._sum.durationInSeconds) || 0;
    const totalHours = totalSeconds / 3600;
    const totalItems = uniqueItemsResult.length;

    return { totalHours, totalItems };
  }

  /**
   * Batch invalidate related cache entries when data changes
   * Helper method for cache invalidation patterns
   */
  static getInvalidationPatterns(entityType: 'order' | 'orderItem' | 'processing'): string[] {
    switch (entityType) {
      case 'order':
        return ['dashboard', 'orders', 'reports', 'revenue'];
      case 'orderItem':
        return ['orders', 'reports', 'productivity'];
      case 'processing':
        return ['reports', 'productivity', 'leadtime'];
      default:
        return ['dashboard', 'orders', 'reports'];
    }
  }
}