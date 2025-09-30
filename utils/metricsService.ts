import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { CacheService } from './cacheService';
import { OptimizedQueries } from './optimizedQueries';
import { LeadTimeCalculator } from './leadTimeCalculator';
import { PerformanceMonitor } from './performanceMonitor';
import { PerformanceSafeguards } from './performanceSafeguards';

/**
 * Interface for dashboard metrics data
 */
export interface DashboardMetrics {
  totalOrders: number;
  revenueThisMonth: number;
  ordersThisWeek: number;
  pendingOrders: number;
  inProduction: number;
  readyToShip: number;
}

/**
 * Interface for order filtering parameters
 */
export interface OrderFilters {
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  priority?: string[];
}

/**
 * Interface for orders page metrics data
 */
export interface OrdersPageMetrics {
  statusCounts: Record<string, number>;
  totalValue: number;
  averageOrderValue: number;
  totalOrders: number;
  totalItemsReady: number;  // Total items with READY or PRODUCT_FINISHED status (production items only)
  productionMetrics: {
    notStarted: number;
    cutting: number;
    sewing: number;
    foamCutting: number;
    packaging: number;
    finished: number;
    ready: number;
  };
}

/**
 * Interface for date range filtering in metrics
 */
export interface MetricsDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Interface for employee productivity metrics
 */
export interface EmployeeProductivity {
  userId: string;
  userName: string;
  totalHours: number;
  itemsProcessed: number;
  averageTimePerItem: number;
  stationBreakdown: StationProductivity[];
}

/**
 * Interface for station-specific productivity metrics
 */
export interface StationProductivity {
  stationId: string;
  stationName: string;
  hoursWorked: number;
  itemsProcessed: number;
  averageTimePerItem: number;
}

/**
 * Interface for revenue period data
 */
export interface RevenuePeriod {
  period: string; // 'YYYY-MM' or 'YYYY-WW'
  revenue: number;
  orderCount: number;
}

/**
 * Interface for reports page metrics data
 */
export interface ReportsMetrics {
  productivityByEmployee: EmployeeProductivity[];
  averageLeadTime: number;
  revenueByPeriod: RevenuePeriod[];
  totalProductionHours: number;
  totalItemsProcessed: number;
  overallProductivity: number; // items per hour
}

/**
 * Interface for date range validation result
 */
export interface DateRangeValidationResult {
  isValid: boolean;
  error?: string;
  normalizedRange?: MetricsDateRange;
}

/**
 * MetricsService - Centralized service for calculating dashboard and report metrics
 * Provides robust error handling with fallback values for failed calculations
 */
export class MetricsService {
  /**
   * Validate and normalize a date range for metrics calculations
   * Uses PerformanceSafeguards for enhanced validation and warnings
   * @param dateRange - Date range to validate
   * @returns DateRangeValidationResult - Validation result with normalized dates or error message
   */
  static validateDateRange(dateRange: MetricsDateRange | null | undefined): DateRangeValidationResult {
    // Check for null/undefined date range
    if (!dateRange) {
      return {
        isValid: false,
        error: 'Date range is required but was not provided'
      };
    }

    // Use PerformanceSafeguards for comprehensive validation
    const validation = PerformanceSafeguards.validateDateRange(dateRange);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error
      };
    }

    // Log performance warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        console.warn(`Date range validation warning: ${warning.message}`, {
          severity: warning.severity,
          recommendation: warning.recommendation
        });
      });
    }

    // Additional business logic validation
    const minDate = new Date('2020-01-01'); // Assume no data before 2020
    if (validation.normalizedRange!.startDate < minDate) {
      return {
        isValid: false,
        error: `startDate cannot be before ${minDate.toISOString().split('T')[0]} (no data available)`
      };
    }

    return {
      isValid: true,
      normalizedRange: validation.normalizedRange
    };
  }

  /**
   * Safely convert a value to a number with fallback
   * @param value - Value to convert to number
   * @param fallback - Fallback value if conversion fails
   * @returns number - Converted number or fallback
   */
  static safeNumber(value: any, fallback: number = 0): number {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    const numericValue = Number(value);
    return isNaN(numericValue) ? fallback : numericValue;
  }

  /**
   * Safely perform division with fallback for division by zero
   * @param numerator - Numerator value
   * @param denominator - Denominator value
   * @param fallback - Fallback value if division by zero or invalid
   * @returns number - Division result or fallback
   */
  static safeDivision(numerator: any, denominator: any, fallback: number = 0): number {
    const num = this.safeNumber(numerator, 0);
    const den = this.safeNumber(denominator, 0);
    
    if (den === 0) {
      return fallback;
    }
    
    const result = num / den;
    return isNaN(result) || !isFinite(result) ? fallback : result;
  }
  /**
   * Get total count of all orders in the system
   * @returns Promise<number> - Total order count, 0 on error
   */
  static async getTotalOrders(): Promise<number> {
    try {
      const count = await prisma.order.count();
      return count;
    } catch (error) {
      console.error('Error calculating total orders:', error);
      return 0;
    }
  }

  /**
   * Calculate total revenue for the current month
   * @returns Promise<number> - Revenue sum for current month, 0 on error
   */
  static async getRevenueThisMonth(): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const result = await prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          totalAmount: {
            not: null
          }
        }
      });

      // Enhanced null/undefined handling with explicit checks
      const sumValue = result?._sum?.totalAmount;
      if (sumValue === null || sumValue === undefined) {
        return 0;
      }
      
      const numericValue = Number(sumValue);
      return isNaN(numericValue) ? 0 : numericValue;
    } catch (error) {
      console.error('Error calculating revenue this month:', error);
      return 0;
    }
  }

  /**
   * Get count of orders created in the current week
   * @returns Promise<number> - Order count for current week, 0 on error
   */
  static async getOrdersThisWeek(): Promise<number> {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Make Monday the start of week
      startOfWeek.setDate(now.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const count = await prisma.order.count({
        where: {
          createdAt: {
            gte: startOfWeek,
            lte: endOfWeek
          }
        }
      });

      return count;
    } catch (error) {
      console.error('Error calculating orders this week:', error);
      return 0;
    }
  }

  /**
   * Get count of orders with PENDING status
   * @returns Promise<number> - Pending order count, 0 on error
   */
  static async getPendingOrders(): Promise<number> {
    try {
      const count = await prisma.order.count({
        where: {
          orderStatus: 'PENDING'
        }
      });
      return count;
    } catch (error) {
      console.error('Error calculating pending orders:', error);
      return 0;
    }
  }

  /**
   * Get count of orders with ORDER_PROCESSING status
   * @returns Promise<number> - In production order count, 0 on error
   */
  static async getInProduction(): Promise<number> {
    try {
      const count = await prisma.order.count({
        where: {
          orderStatus: 'ORDER_PROCESSING'
        }
      });
      return count;
    } catch (error) {
      console.error('Error calculating in production orders:', error);
      return 0;
    }
  }

  /**
   * Get count of orders with READY_TO_SHIP status
   * @returns Promise<number> - Ready to ship order count, 0 on error
   */
  static async getReadyToShip(): Promise<number> {
    try {
      const count = await prisma.order.count({
        where: {
          orderStatus: 'READY_TO_SHIP'
        }
      });
      return count;
    } catch (error) {
      console.error('Error calculating ready to ship orders:', error);
      return 0;
    }
  }

  /**
   * Get count of items that are ready to ship (READY or PRODUCT_FINISHED status)
   * Only counts production items (isProduct: true) as per requirements 4.1, 4.2, 4.3
   * @returns Promise<number> - Total items ready count, 0 on error
   */
  static async getTotalItemsReady(): Promise<number> {
    try {
      const count = await prisma.orderItem.count({
        where: {
          itemStatus: {
            in: ['READY', 'PRODUCT_FINISHED']  // Count both READY and PRODUCT_FINISHED as per requirement 4.1
          },
          isProduct: true  // Only count production items as per requirements 4.2, 4.3
        }
      });
      return count;
    } catch (error) {
      console.error('Error calculating total items ready:', error);
      return 0;
    }
  }

  /**
   * Get count of items that have not started production
   * Only counts production items (isProduct: true) with NOT_STARTED_PRODUCTION status
   * As per requirements 6.1, 6.2, 6.3, 6.4, 6.5
   * @param filters - Optional filters to apply to the calculation
   * @returns Promise<number> - Items not started count, 0 on error
   */
  static async getItemsNotStarted(filters?: OrderFilters): Promise<number> {
    try {
      // Build where clause for orders if filters are provided
      const orderWhereClause: any = {};
      
      if (filters?.status && filters.status.length > 0) {
        orderWhereClause.orderStatus = { in: filters.status };
      }
      
      if (filters?.dateFrom || filters?.dateTo) {
        orderWhereClause.createdAt = {};
        if (filters.dateFrom) orderWhereClause.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) orderWhereClause.createdAt.lte = filters.dateTo;
      }
      
      if (filters?.customerId) {
        orderWhereClause.customerId = filters.customerId;
      }
      
      if (filters?.priority && filters.priority.length > 0) {
        orderWhereClause.priority = { in: filters.priority };
      }

      // Count items not started with proper filtering
      const count = await prisma.orderItem.count({
        where: {
          // Requirement 6.2: Only items with NOT_STARTED_PRODUCTION status
          itemStatus: 'NOT_STARTED_PRODUCTION',
          // Requirement 6.1, 6.5: Only count production items
          isProduct: true,
          // Apply order filters if provided
          ...(Object.keys(orderWhereClause).length > 0 && {
            order: orderWhereClause
          })
        }
      });

      return count;
    } catch (error) {
      console.error('Error calculating items not started:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive dashboard metrics with caching and optimized queries
   * Uses Promise.allSettled to ensure partial failures don't break the entire response
   * @returns Promise<DashboardMetrics> - Complete dashboard metrics with fallback values
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      // Check cache first
      const cacheKey = CacheService.getDashboardCacheKey();
      const cachedData = CacheService.get<DashboardMetrics>(cacheKey);
      
      if (cachedData) {
        cacheHit = true;
        PerformanceMonitor.recordQuery('getDashboardMetrics', Date.now() - startTime, true);
        return cachedData;
      }

      // Use optimized queries for better performance
      const optimizedData = await OptimizedQueries.getDashboardMetrics();
      
      const result: DashboardMetrics = {
        totalOrders: optimizedData.totalOrders,
        revenueThisMonth: optimizedData.revenueThisMonth,
        ordersThisWeek: optimizedData.ordersThisWeek,
        pendingOrders: optimizedData.statusCounts['PENDING'] || 0,
        inProduction: optimizedData.statusCounts['ORDER_PROCESSING'] || 0,
        readyToShip: optimizedData.statusCounts['READY_TO_SHIP'] || 0
      };

      // Cache the result
      CacheService.set(cacheKey, result);
      
      PerformanceMonitor.recordQuery('getDashboardMetrics', Date.now() - startTime, false);
      return result;
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      PerformanceMonitor.recordQuery('getDashboardMetrics', Date.now() - startTime, cacheHit);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Extract value from Promise.allSettled result with fallback
   * @param result - PromiseSettledResult from Promise.allSettled
   * @param fallback - Fallback value if promise was rejected
   * @returns T - The resolved value or fallback
   */
  private static extractValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === 'fulfilled' ? result.value : fallback;
  }

  /**
   * Get orders page metrics with caching and optimized queries
   * Calculates status counts, total value, and production metrics
   * @param filters - Optional filters to apply to the metrics calculation
   * @returns Promise<OrdersPageMetrics> - Orders page metrics with fallback values
   */
  static async getOrdersPageMetrics(filters?: OrderFilters): Promise<OrdersPageMetrics> {
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      // Check cache first
      const cacheKey = CacheService.getOrdersCacheKey(filters);
      const cachedData = CacheService.get<OrdersPageMetrics>(cacheKey);
      
      if (cachedData) {
        cacheHit = true;
        PerformanceMonitor.recordQuery('getOrdersPageMetrics', Date.now() - startTime, true, undefined, filters);
        return cachedData;
      }

      // Use optimized queries for better performance and calculate total items ready
      const [optimizedData, totalItemsReady] = await Promise.all([
        OptimizedQueries.getOrdersMetrics(filters),
        this.getTotalItemsReady()  // Calculate total items ready (READY + PRODUCT_FINISHED, production items only)
      ]);
      
      // Map production counts to expected format
      const productionMetrics = {
        notStarted: optimizedData.productionCounts['NOT_STARTED_PRODUCTION'] || 0,
        cutting: optimizedData.productionCounts['CUTTING'] || 0,
        sewing: optimizedData.productionCounts['SEWING'] || 0,
        foamCutting: optimizedData.productionCounts['FOAM_CUTTING'] || 0,
        packaging: optimizedData.productionCounts['PACKAGING'] || 0,
        finished: optimizedData.productionCounts['PRODUCT_FINISHED'] || 0,
        ready: optimizedData.productionCounts['READY'] || 0
      };

      const result: OrdersPageMetrics = {
        statusCounts: optimizedData.statusCounts,
        totalValue: optimizedData.totalValue,
        averageOrderValue: this.safeDivision(optimizedData.totalValue, optimizedData.totalOrders, 0),
        totalOrders: optimizedData.totalOrders,
        totalItemsReady,  // Include total items ready count
        productionMetrics
      };

      // Cache the result
      CacheService.set(cacheKey, result);
      
      PerformanceMonitor.recordQuery('getOrdersPageMetrics', Date.now() - startTime, false, undefined, filters);
      return result;
    } catch (error) {
      console.error('Error calculating orders page metrics:', error);
      PerformanceMonitor.recordQuery('getOrdersPageMetrics', Date.now() - startTime, cacheHit, undefined, filters);
      return this.getDefaultOrdersPageMetrics();
    }
  }

  /**
   * Get order status counts with optional filtering
   * @param whereClause - Prisma where clause for filtering
   * @returns Promise<Record<string, number>> - Status counts object
   */
  private static async getOrderStatusCounts(whereClause: any): Promise<Record<string, number>> {
    try {
      const statusCounts = await prisma.order.groupBy({
        by: ['orderStatus'],
        where: whereClause,
        _count: {
          id: true
        }
      });

      const result: Record<string, number> = {};
      statusCounts.forEach(item => {
        result[item.orderStatus] = item._count.id;
      });

      return result;
    } catch (error) {
      console.error('Error calculating order status counts:', error);
      return {};
    }
  }

  /**
   * Get total value of orders with optional filtering
   * @param whereClause - Prisma where clause for filtering
   * @returns Promise<number> - Total order value
   */
  private static async getOrdersTotalValue(whereClause: any): Promise<number> {
    try {
      const result = await prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          ...whereClause,
          totalAmount: {
            not: null
          }
        }
      });

      // Enhanced null/undefined handling with explicit checks
      const sumValue = result?._sum?.totalAmount;
      if (sumValue === null || sumValue === undefined) {
        return 0;
      }
      
      const numericValue = Number(sumValue);
      return isNaN(numericValue) ? 0 : numericValue;
    } catch (error) {
      console.error('Error calculating orders total value:', error);
      return 0;
    }
  }

  /**
   * Get count of orders with optional filtering
   * @param whereClause - Prisma where clause for filtering
   * @returns Promise<number> - Total order count
   */
  private static async getOrdersCount(whereClause: any): Promise<number> {
    try {
      const count = await prisma.order.count({
        where: whereClause
      });

      return count;
    } catch (error) {
      console.error('Error calculating orders count:', error);
      return 0;
    }
  }

  /**
   * Get production metrics (item status counts) with optional order filtering
   * Only counts production items (isProduct: true) as per requirements 4.2, 4.3, 6.2, 6.5
   * Requirement 6.1: Only count items marked as production items
   * Requirement 6.2: Count items with NOT_STARTED_PRODUCTION status only for production items
   * Requirement 6.5: Exclude non-production items from production metrics entirely
   * @param whereClause - Prisma where clause for filtering orders
   * @returns Promise<object> - Production metrics object
   */
  private static async getProductionMetrics(whereClause: any): Promise<{
    notStarted: number;
    cutting: number;
    sewing: number;
    foamCutting: number;
    packaging: number;
    finished: number;
    ready: number;
  }> {
    try {
      // Enhanced query with explicit production item filtering as per requirements 6.1, 6.2, 6.5
      const productionCounts = await prisma.orderItem.groupBy({
        by: ['itemStatus'],
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
        },
        _count: {
          id: true
        }
      });

      const result = {
        notStarted: 0,
        cutting: 0,
        sewing: 0,
        foamCutting: 0,
        packaging: 0,
        finished: 0,
        ready: 0
      };

      productionCounts.forEach(item => {
        switch (item.itemStatus) {
          case 'NOT_STARTED_PRODUCTION':
            // Requirement 6.2: Count items with NOT_STARTED_PRODUCTION status (production items only)
            result.notStarted = item._count.id;
            break;
          case 'CUTTING':
            result.cutting = item._count.id;
            break;
          case 'SEWING':
            result.sewing = item._count.id;
            break;
          case 'FOAM_CUTTING':
            result.foamCutting = item._count.id;
            break;
          case 'PACKAGING':
            result.packaging = item._count.id;
            break;
          case 'PRODUCT_FINISHED':
            result.finished = item._count.id;
            break;
          case 'READY':
            result.ready = item._count.id;
            break;
        }
      });

      // Additional validation logging for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Production metrics calculation:', {
          whereClause,
          productionCounts: productionCounts.map(item => ({
            status: item.itemStatus,
            count: item._count.id
          })),
          result
        });
      }

      return result;
    } catch (error) {
      console.error('Error calculating production metrics:', error);
      return {
        notStarted: 0,
        cutting: 0,
        sewing: 0,
        foamCutting: 0,
        packaging: 0,
        finished: 0,
        ready: 0
      };
    }
  }

  /**
   * Get default metrics with all values set to 0
   * Used as fallback when all metric calculations fail
   * @returns DashboardMetrics - Default metrics object
   */
  private static getDefaultMetrics(): DashboardMetrics {
    return {
      totalOrders: 0,
      revenueThisMonth: 0,
      ordersThisWeek: 0,
      pendingOrders: 0,
      inProduction: 0,
      readyToShip: 0
    };
  }

  /**
   * Get default orders page metrics with all values set to 0
   * Used as fallback when orders page metric calculations fail
   * @returns OrdersPageMetrics - Default orders page metrics object
   */
  private static getDefaultOrdersPageMetrics(): OrdersPageMetrics {
    return {
      statusCounts: {},
      totalValue: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      totalItemsReady: 0,  // Default value for total items ready
      productionMetrics: {
        notStarted: 0,
        cutting: 0,
        sewing: 0,
        foamCutting: 0,
        packaging: 0,
        finished: 0,
        ready: 0
      }
    };
  }

  /**
   * Get comprehensive reports metrics with caching and optimized queries
   * Calculates employee productivity, lead times, and revenue trends
   * Uses performance safeguards for timeout protection and large date range handling
   * @param dateRange - Date range for filtering the metrics
   * @returns Promise<ReportsMetrics> - Complete reports metrics with fallback values
   */
  static async getReportsMetrics(dateRange: MetricsDateRange): Promise<ReportsMetrics> {
    try {
      // Validate date range first with performance safeguards
      const validation = this.validateDateRange(dateRange);
      if (!validation.isValid) {
        console.error('Invalid date range for reports metrics:', validation.error);
        throw new Error(`Invalid date range: ${validation.error}`);
      }

      // Use normalized date range for calculations
      const normalizedRange = validation.normalizedRange!;

      // Check if progressive loading is needed for large date ranges
      const progressiveCheck = PerformanceSafeguards.shouldUseProgressiveLoading(normalizedRange);
      
      if (progressiveCheck.useProgressive) {
        console.log('Using progressive loading for large date range:', progressiveCheck);
        return await this.getReportsMetricsProgressive(normalizedRange, progressiveCheck.chunkSizeDays);
      }

      // Execute with timeout protection
      const result = await PerformanceSafeguards.executeWithTimeout(
        'reports',
        async () => {
          // Check cache first
          const cacheKey = CacheService.getReportsCacheKey(normalizedRange.startDate, normalizedRange.endDate);
          const cachedData = CacheService.get<ReportsMetrics>(cacheKey);
          
          if (cachedData) {
            return cachedData;
          }

          // Check memory usage before expensive operations
          const memoryWarnings = PerformanceSafeguards.checkMemoryUsage('getReportsMetrics');
          if (memoryWarnings.length > 0) {
            memoryWarnings.forEach(warning => {
              console.warn('Memory usage warning:', warning.message);
            });
          }

          // Use optimized queries for better performance
          const [
            productivityData,
            averageLeadTime,
            revenueByPeriod,
            productionTotals
          ] = await Promise.allSettled([
            OptimizedQueries.getProductivityData(normalizedRange),
            OptimizedQueries.getAverageLeadTime(normalizedRange),
            OptimizedQueries.getRevenueByPeriod(normalizedRange),
            OptimizedQueries.getProductionTotals(normalizedRange)
          ]);

          const extractedProductivityData = this.extractValue(productivityData, []);
          const extractedLeadTime = this.extractValue(averageLeadTime, 0);
          const extractedRevenue = this.extractValue(revenueByPeriod, []);
          const extractedTotals = this.extractValue(productionTotals, { totalHours: 0, totalItems: 0 });

          // Convert productivity data to expected format
          const productivityByEmployee: EmployeeProductivity[] = extractedProductivityData.map(data => ({
            userId: data.userId,
            userName: data.userName,
            totalHours: data.totalSeconds / 3600,
            itemsProcessed: data.itemsProcessed,
            averageTimePerItem: this.safeDivision(data.totalSeconds, data.itemsProcessed, 0),
            stationBreakdown: data.stationBreakdown.map(station => ({
              stationId: station.stationId,
              stationName: station.stationName,
              hoursWorked: station.seconds / 3600,
              itemsProcessed: station.items,
              averageTimePerItem: this.safeDivision(station.seconds, station.items, 0)
            }))
          }));

          const metricsResult: ReportsMetrics = {
            productivityByEmployee,
            averageLeadTime: extractedLeadTime,
            revenueByPeriod: extractedRevenue,
            totalProductionHours: extractedTotals.totalHours,
            totalItemsProcessed: extractedTotals.totalItems,
            overallProductivity: this.safeDivision(extractedTotals.totalItems, extractedTotals.totalHours, 0)
          };

          // Cache the result
          CacheService.set(cacheKey, metricsResult);
          
          return metricsResult;
        }
      );

      // Log performance warnings
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          console.warn(`Reports metrics warning: ${warning.message}`, {
            severity: warning.severity,
            recommendation: warning.recommendation
          });
        });
      }

      PerformanceMonitor.recordQuery('getReportsMetrics', result.executionTime, false, result.data.productivityByEmployee.length, normalizedRange);
      return result.data;
    } catch (error) {
      console.error('Error calculating reports metrics:', error);
      PerformanceMonitor.recordQuery('getReportsMetrics', 0, false, undefined, dateRange);
      return this.getDefaultReportsMetrics();
    }
  }

  /**
   * Get reports metrics using progressive loading for large date ranges
   * Breaks large date ranges into smaller chunks and aggregates results
   * @param dateRange - Large date range to process
   * @param chunkSizeDays - Size of each chunk in days
   * @returns Promise<ReportsMetrics> - Aggregated metrics from all chunks
   */
  private static async getReportsMetricsProgressive(dateRange: MetricsDateRange, chunkSizeDays: number): Promise<ReportsMetrics> {
    const chunks = PerformanceSafeguards.generateDateRangeChunks(dateRange, chunkSizeDays);
    console.log(`Processing reports metrics in ${chunks.length} chunks of ${chunkSizeDays} days each`);

    const allProductivityData: EmployeeProductivity[] = [];
    const allRevenueData: RevenuePeriod[] = [];
    let totalLeadTimeSum = 0;
    let totalLeadTimeCount = 0;
    let totalProductionHours = 0;
    let totalItemsProcessed = 0;

    // Process each chunk with timeout protection
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.startDate.toISOString().split('T')[0]} to ${chunk.endDate.toISOString().split('T')[0]}`);

      try {
        const chunkResult = await PerformanceSafeguards.executeWithTimeout(
          'reports',
          async () => {
            // Check cache for this chunk
            const cacheKey = CacheService.getReportsCacheKey(chunk.startDate, chunk.endDate);
            const cachedChunk = CacheService.get<ReportsMetrics>(cacheKey);
            
            if (cachedChunk) {
              return cachedChunk;
            }

            // Process chunk data
            const [
              productivityData,
              averageLeadTime,
              revenueByPeriod,
              productionTotals
            ] = await Promise.allSettled([
              OptimizedQueries.getProductivityData(chunk),
              OptimizedQueries.getAverageLeadTime(chunk),
              OptimizedQueries.getRevenueByPeriod(chunk),
              OptimizedQueries.getProductionTotals(chunk)
            ]);

            const extractedProductivityData = this.extractValue(productivityData, []);
            const extractedLeadTime = this.extractValue(averageLeadTime, 0);
            const extractedRevenue = this.extractValue(revenueByPeriod, []);
            const extractedTotals = this.extractValue(productionTotals, { totalHours: 0, totalItems: 0 });

            const chunkMetrics: ReportsMetrics = {
              productivityByEmployee: extractedProductivityData.map(data => ({
                userId: data.userId,
                userName: data.userName,
                totalHours: data.totalSeconds / 3600,
                itemsProcessed: data.itemsProcessed,
                averageTimePerItem: this.safeDivision(data.totalSeconds, data.itemsProcessed, 0),
                stationBreakdown: data.stationBreakdown.map(station => ({
                  stationId: station.stationId,
                  stationName: station.stationName,
                  hoursWorked: station.seconds / 3600,
                  itemsProcessed: station.items,
                  averageTimePerItem: this.safeDivision(station.seconds, station.items, 0)
                }))
              })),
              averageLeadTime: extractedLeadTime,
              revenueByPeriod: extractedRevenue,
              totalProductionHours: extractedTotals.totalHours,
              totalItemsProcessed: extractedTotals.totalItems,
              overallProductivity: this.safeDivision(extractedTotals.totalItems, extractedTotals.totalHours, 0)
            };

            // Cache the chunk result
            CacheService.set(cacheKey, chunkMetrics);
            
            return chunkMetrics;
          },
          45000 // 45 second timeout for chunks
        );

        // Aggregate chunk data
        this.aggregateProductivityData(allProductivityData, chunkResult.data.productivityByEmployee);
        allRevenueData.push(...chunkResult.data.revenueByPeriod);
        
        if (chunkResult.data.averageLeadTime > 0) {
          totalLeadTimeSum += chunkResult.data.averageLeadTime;
          totalLeadTimeCount++;
        }
        
        totalProductionHours += chunkResult.data.totalProductionHours;
        totalItemsProcessed += chunkResult.data.totalItemsProcessed;

        // Log chunk completion
        console.log(`Chunk ${i + 1} completed in ${chunkResult.executionTime}ms`);

        // Small delay between chunks to prevent overwhelming the database
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    // Calculate final aggregated metrics
    const finalMetrics: ReportsMetrics = {
      productivityByEmployee: allProductivityData,
      averageLeadTime: totalLeadTimeCount > 0 ? totalLeadTimeSum / totalLeadTimeCount : 0,
      revenueByPeriod: allRevenueData.sort((a, b) => a.period.localeCompare(b.period)),
      totalProductionHours,
      totalItemsProcessed,
      overallProductivity: this.safeDivision(totalItemsProcessed, totalProductionHours, 0)
    };

    // Cache the final aggregated result
    const finalCacheKey = CacheService.getReportsCacheKey(dateRange.startDate, dateRange.endDate);
    CacheService.set(finalCacheKey, finalMetrics);

    console.log(`Progressive loading completed: processed ${chunks.length} chunks`);
    return finalMetrics;
  }

  /**
   * Aggregate productivity data from multiple chunks
   * Combines employee data across date ranges
   * @param aggregated - Existing aggregated data
   * @param newData - New data to merge
   */
  private static aggregateProductivityData(aggregated: EmployeeProductivity[], newData: EmployeeProductivity[]): void {
    const userMap = new Map<string, EmployeeProductivity>();
    
    // Add existing data to map
    aggregated.forEach(emp => {
      userMap.set(emp.userId, { ...emp });
    });

    // Merge new data
    newData.forEach(emp => {
      const existing = userMap.get(emp.userId);
      if (existing) {
        // Merge employee data
        existing.totalHours += emp.totalHours;
        existing.itemsProcessed += emp.itemsProcessed;
        existing.averageTimePerItem = this.safeDivision(
          existing.totalHours * 3600, 
          existing.itemsProcessed, 
          0
        );

        // Merge station breakdown
        const stationMap = new Map<string, StationProductivity>();
        existing.stationBreakdown.forEach(station => {
          stationMap.set(station.stationId, { ...station });
        });

        emp.stationBreakdown.forEach(station => {
          const existingStation = stationMap.get(station.stationId);
          if (existingStation) {
            existingStation.hoursWorked += station.hoursWorked;
            existingStation.itemsProcessed += station.itemsProcessed;
            existingStation.averageTimePerItem = this.safeDivision(
              existingStation.hoursWorked * 3600,
              existingStation.itemsProcessed,
              0
            );
          } else {
            stationMap.set(station.stationId, { ...station });
          }
        });

        existing.stationBreakdown = Array.from(stationMap.values());
      } else {
        userMap.set(emp.userId, { ...emp });
      }
    });

    // Update aggregated array
    aggregated.length = 0;
    aggregated.push(...Array.from(userMap.values()));
  }

  /**
   * Calculate productivity metrics by employee using ItemProcessingLog data
   * Aggregates time worked and items processed per employee with station breakdown
   * @param dateRange - Date range for filtering the data
   * @returns Promise<EmployeeProductivity[]> - Array of employee productivity metrics
   */
  private static async getProductivityByEmployee(dateRange: MetricsDateRange): Promise<EmployeeProductivity[]> {
    try {
      // Get processing logs with user and station information
      const processingLogs = await prisma.itemProcessingLog.findMany({
        where: {
          startTime: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          },
          endTime: {
            not: null
          },
          durationInSeconds: {
            not: null
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          },
          station: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Group by user and calculate metrics
      const userMetrics = new Map<string, {
        userId: string;
        userName: string;
        totalSeconds: number;
        uniqueItemIds: Set<string>;
        stationData: Map<string, { stationId: string; stationName: string; seconds: number; uniqueItemIds: Set<string> }>;
      }>();

      processingLogs.forEach(log => {
        // Enhanced null/undefined handling for log data
        const userId = log?.user?.id;
        const userName = log?.user?.name || 'Unknown User';
        const stationId = log?.station?.id;
        const stationName = log?.station?.name || 'Unknown Station';
        const duration = this.safeNumber(log?.durationInSeconds, 0);

        // Skip logs with missing critical data
        if (!userId || !stationId || duration <= 0) {
          return;
        }

        if (!userMetrics.has(userId)) {
          userMetrics.set(userId, {
            userId,
            userName,
            totalSeconds: 0,
            uniqueItemIds: new Set<string>(),
            stationData: new Map()
          });
        }

        const userMetric = userMetrics.get(userId)!;
        userMetric.totalSeconds += duration;
        
        // Count unique items only - add orderItemId to Set
        if (log.orderItemId) {
          userMetric.uniqueItemIds.add(log.orderItemId);
        }

        if (!userMetric.stationData.has(stationId)) {
          userMetric.stationData.set(stationId, {
            stationId,
            stationName,
            seconds: 0,
            uniqueItemIds: new Set<string>()
          });
        }

        const stationMetric = userMetric.stationData.get(stationId)!;
        stationMetric.seconds += duration;
        
        // Count unique items per station
        if (log.orderItemId) {
          stationMetric.uniqueItemIds.add(log.orderItemId);
        }
      });

      // Convert to final format
      const result: EmployeeProductivity[] = Array.from(userMetrics.values()).map(userMetric => {
        const totalHours = userMetric.totalSeconds / 3600;
        const itemsProcessed = userMetric.uniqueItemIds.size;
        
        const stationBreakdown: StationProductivity[] = Array.from(userMetric.stationData.values()).map(station => {
          const stationItemsProcessed = station.uniqueItemIds.size;
          return {
            stationId: station.stationId,
            stationName: station.stationName,
            hoursWorked: this.safeDivision(station.seconds, 3600, 0),
            itemsProcessed: stationItemsProcessed,
            averageTimePerItem: this.safeDivision(station.seconds, stationItemsProcessed, 0)
          };
        });

        return {
          userId: userMetric.userId,
          userName: userMetric.userName,
          totalHours,
          itemsProcessed,
          averageTimePerItem: this.safeDivision(userMetric.totalSeconds, itemsProcessed, 0),
          stationBreakdown
        };
      });

      return result.sort((a, b) => b.totalHours - a.totalHours); // Sort by total hours descending
    } catch (error) {
      console.error('Error calculating productivity by employee:', error);
      return [];
    }
  }

  /**
   * Calculate average lead time using order timestamps with business day calculation
   * Lead time is calculated from order creation to ready-to-ship status
   * Uses 8-hour business days with proper rounding (minimum 1 day)
   * @param dateRange - Date range for filtering orders
   * @returns Promise<number> - Average lead time in business days
   */
  private static async getAverageLeadTime(dateRange: MetricsDateRange): Promise<number> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          },
          readyToShipAt: {
            not: null
          }
        },
        select: {
          createdAt: true,
          readyToShipAt: true
        }
      });

      if (orders.length === 0) {
        return 0;
      }

      const totalLeadTimeDays = orders.reduce((sum, order) => {
        // Enhanced null/undefined handling for order dates
        if (!order?.readyToShipAt || !order?.createdAt) {
          return sum;
        }

        // Use LeadTimeCalculator for consistent business day calculation
        const leadTimeDays = LeadTimeCalculator.safeCalculateBusinessDays(
          order.createdAt, 
          order.readyToShipAt
        );
        
        // Sanity check - lead time shouldn't be more than 1 year in business days
        if (leadTimeDays > 365) {
          console.warn(`Unusually long lead time detected: ${leadTimeDays} days for order created ${order.createdAt}`);
          return sum;
        }

        return sum + leadTimeDays;
      }, 0);

      return this.safeDivision(totalLeadTimeDays, orders.length, 0);
    } catch (error) {
      console.error('Error calculating average lead time:', error);
      return 0;
    }
  }

  /**
   * Calculate revenue by period (monthly breakdown)
   * @param dateRange - Date range for filtering orders
   * @returns Promise<RevenuePeriod[]> - Array of revenue data by month
   */
  private static async getRevenueByPeriod(dateRange: MetricsDateRange): Promise<RevenuePeriod[]> {
    try {
      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          },
          totalAmount: {
            not: null
          }
        },
        select: {
          createdAt: true,
          totalAmount: true
        }
      });

      // Group by month
      const monthlyData = new Map<string, { revenue: number; count: number }>();

      orders.forEach(order => {
        // Enhanced null/undefined handling for order data
        if (!order?.createdAt || !order?.totalAmount) {
          return;
        }

        try {
          const monthKey = order.createdAt.toISOString().substring(0, 7); // YYYY-MM format
          const revenue = this.safeNumber(order.totalAmount, 0);

          // Skip orders with invalid revenue
          if (revenue < 0) {
            return;
          }

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, { revenue: 0, count: 0 });
          }

          const monthData = monthlyData.get(monthKey)!;
          monthData.revenue += revenue;
          monthData.count += 1;
        } catch (error) {
          console.warn('Error processing order for revenue calculation:', error);
          // Continue processing other orders
        }
      });

      // Convert to array and sort by period
      const result: RevenuePeriod[] = Array.from(monthlyData.entries())
        .map(([period, data]) => ({
          period,
          revenue: data.revenue,
          orderCount: data.count
        }))
        .sort((a, b) => a.period.localeCompare(b.period));

      return result;
    } catch (error) {
      console.error('Error calculating revenue by period:', error);
      return [];
    }
  }

  /**
   * Calculate total production hours from ItemProcessingLog data
   * @param dateRange - Date range for filtering the data
   * @returns Promise<number> - Total production hours
   */
  private static async getTotalProductionHours(dateRange: MetricsDateRange): Promise<number> {
    try {
      // Validate date range before processing
      if (!dateRange?.startDate || !dateRange?.endDate) {
        console.warn('Invalid date range provided to getTotalProductionHours');
        return 0;
      }

      const result = await prisma.itemProcessingLog.aggregate({
        _sum: {
          durationInSeconds: true
        },
        where: {
          startTime: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          },
          endTime: {
            not: null
          },
          durationInSeconds: {
            not: null
          }
        }
      });

      // Enhanced null/undefined handling with explicit checks
      const sumValue = result?._sum?.durationInSeconds;
      if (sumValue === null || sumValue === undefined) {
        return 0;
      }
      
      const numericValue = Number(sumValue);
      if (isNaN(numericValue) || numericValue < 0) {
        return 0;
      }
      
      return numericValue / 3600; // Convert to hours
    } catch (error) {
      console.error('Error calculating total production hours:', error);
      return 0;
    }
  }

  /**
   * Calculate total items processed from ItemProcessingLog data
   * @param dateRange - Date range for filtering the data
   * @returns Promise<number> - Total items processed
   */
  private static async getTotalItemsProcessed(dateRange: MetricsDateRange): Promise<number> {
    try {
      // Get unique orderItemIds instead of counting all processing logs
      const uniqueItems = await prisma.itemProcessingLog.findMany({
        where: {
          startTime: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          },
          endTime: {
            not: null
          },
          durationInSeconds: {
            not: null
          },
          orderItemId: {
            not: null
          }
        },
        select: {
          orderItemId: true
        },
        distinct: ['orderItemId']
      });

      return uniqueItems.length;
    } catch (error) {
      console.error('Error calculating total items processed:', error);
      return 0;
    }
  }

  /**
   * Get default reports metrics with all values set to 0
   * Used as fallback when reports metric calculations fail
   * @returns ReportsMetrics - Default reports metrics object
   */
  private static getDefaultReportsMetrics(): ReportsMetrics {
    return {
      productivityByEmployee: [],
      averageLeadTime: 0,
      revenueByPeriod: [],
      totalProductionHours: 0,
      totalItemsProcessed: 0,
      overallProductivity: 0
    };
  }
}