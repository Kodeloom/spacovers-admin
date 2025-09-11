/**
 * Performance Safeguards Utility
 * Implements query timeouts, pagination, and warnings for large operations
 * 
 * Requirements: 9.2 - Add performance safeguards for large date ranges
 */

import type { DateRange } from './metricsService';

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

/**
 * Interface for query timeout configuration
 */
export interface QueryTimeoutConfig {
  timeoutMs: number;
  warningMs: number;
  maxRetries: number;
}

/**
 * Interface for performance warning
 */
export interface PerformanceWarning {
  type: 'large_date_range' | 'large_result_set' | 'slow_query' | 'high_memory_usage';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  estimatedImpact: string;
}

/**
 * Interface for query execution result with performance metadata
 */
export interface QueryResult<T> {
  data: T;
  executionTime: number;
  warnings: PerformanceWarning[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasMore: boolean;
  };
}

/**
 * Performance Safeguards Service
 * Provides protection against expensive operations and resource exhaustion
 */
export class PerformanceSafeguards {
  
  // Configuration constants
  private static readonly MAX_DATE_RANGE_DAYS = 365 * 2; // 2 years maximum
  private static readonly LARGE_DATE_RANGE_DAYS = 90; // 3 months warning threshold
  private static readonly DEFAULT_PAGE_SIZE = 100;
  private static readonly MAX_PAGE_SIZE = 1000;
  private static readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly WARNING_TIMEOUT_MS = 10000; // 10 seconds
  private static readonly MAX_RESULT_SET_SIZE = 10000;
  
  // Query timeout configurations by operation type
  private static readonly TIMEOUT_CONFIGS: Record<string, QueryTimeoutConfig> = {
    dashboard: { timeoutMs: 5000, warningMs: 2000, maxRetries: 2 },
    orders: { timeoutMs: 10000, warningMs: 3000, maxRetries: 2 },
    reports: { timeoutMs: 30000, warningMs: 10000, maxRetries: 1 },
    productivity: { timeoutMs: 45000, warningMs: 15000, maxRetries: 1 },
    export: { timeoutMs: 120000, warningMs: 30000, maxRetries: 0 }
  };

  /**
   * Validate date range and generate warnings for large ranges
   * @param dateRange - Date range to validate
   * @returns Validation result with warnings
   */
  static validateDateRange(dateRange: DateRange): {
    isValid: boolean;
    warnings: PerformanceWarning[];
    normalizedRange?: DateRange;
    error?: string;
  } {
    const warnings: PerformanceWarning[] = [];
    
    // Basic validation
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return {
        isValid: false,
        warnings,
        error: 'Both startDate and endDate are required'
      };
    }

    if (!(dateRange.startDate instanceof Date) || !(dateRange.endDate instanceof Date)) {
      return {
        isValid: false,
        warnings,
        error: 'startDate and endDate must be valid Date objects'
      };
    }

    if (isNaN(dateRange.startDate.getTime()) || isNaN(dateRange.endDate.getTime())) {
      return {
        isValid: false,
        warnings,
        error: 'startDate and endDate must be valid dates'
      };
    }

    if (dateRange.startDate > dateRange.endDate) {
      return {
        isValid: false,
        warnings,
        error: 'startDate must be before or equal to endDate'
      };
    }

    // Calculate date range in days
    const rangeDays = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check for maximum allowed range
    if (rangeDays > this.MAX_DATE_RANGE_DAYS) {
      return {
        isValid: false,
        warnings,
        error: `Date range is too large. Maximum allowed range is ${this.MAX_DATE_RANGE_DAYS} days, but ${rangeDays} days were requested`
      };
    }

    // Generate warnings for large date ranges
    if (rangeDays > this.LARGE_DATE_RANGE_DAYS) {
      warnings.push({
        type: 'large_date_range',
        severity: rangeDays > 180 ? 'critical' : 'warning',
        message: `Large date range detected: ${rangeDays} days`,
        recommendation: rangeDays > 180 
          ? 'Consider breaking this into smaller date ranges (30-90 days) for better performance'
          : 'This query may take longer than usual. Consider using filters to reduce the dataset.',
        estimatedImpact: rangeDays > 180 
          ? 'Query may take 30+ seconds and use significant memory'
          : 'Query may take 10-30 seconds'
      });
    }

    // Normalize dates
    const normalizedStartDate = new Date(dateRange.startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    
    const normalizedEndDate = new Date(dateRange.endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);
    
    // Cap end date to current time if in future
    const now = new Date();
    if (normalizedEndDate > now) {
      normalizedEndDate.setTime(now.getTime());
    }

    return {
      isValid: true,
      warnings,
      normalizedRange: {
        startDate: normalizedStartDate,
        endDate: normalizedEndDate
      }
    };
  }

  /**
   * Create pagination parameters from request
   * @param page - Page number (1-based)
   * @param pageSize - Number of items per page
   * @returns Pagination parameters with validation
   */
  static createPagination(page?: number, pageSize?: number): {
    pagination: PaginationParams;
    warnings: PerformanceWarning[];
  } {
    const warnings: PerformanceWarning[] = [];
    
    // Validate and normalize page
    const normalizedPage = Math.max(1, Math.floor(page || 1));
    
    // Validate and normalize page size
    let normalizedPageSize = Math.max(1, Math.floor(pageSize || this.DEFAULT_PAGE_SIZE));
    
    if (normalizedPageSize > this.MAX_PAGE_SIZE) {
      normalizedPageSize = this.MAX_PAGE_SIZE;
      warnings.push({
        type: 'large_result_set',
        severity: 'warning',
        message: `Page size reduced from ${pageSize} to ${this.MAX_PAGE_SIZE}`,
        recommendation: 'Use smaller page sizes for better performance and user experience',
        estimatedImpact: 'Large page sizes can cause slow loading and high memory usage'
      });
    }

    const offset = (normalizedPage - 1) * normalizedPageSize;

    return {
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        offset,
        limit: normalizedPageSize
      },
      warnings
    };
  }

  /**
   * Execute a query with timeout protection
   * @param queryName - Name of the query for configuration lookup
   * @param queryFn - Async function to execute
   * @param customTimeout - Custom timeout in milliseconds (optional)
   * @returns Promise that resolves with result or rejects with timeout
   */
  static async executeWithTimeout<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    customTimeout?: number
  ): Promise<QueryResult<T>> {
    const config = this.TIMEOUT_CONFIGS[queryName] || this.TIMEOUT_CONFIGS.reports;
    const timeoutMs = customTimeout || config.timeoutMs;
    const warningMs = config.warningMs;
    
    const warnings: PerformanceWarning[] = [];
    const startTime = Date.now();
    let warningTimer: NodeJS.Timeout | null = null;
    let hasWarned = false;

    // Set up warning timer
    if (warningMs < timeoutMs) {
      warningTimer = setTimeout(() => {
        hasWarned = true;
        console.warn(`Query '${queryName}' is taking longer than expected (>${warningMs}ms)`);
      }, warningMs);
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query '${queryName}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Race between query and timeout
      const result = await Promise.race([queryFn(), timeoutPromise]);
      const executionTime = Date.now() - startTime;

      // Clear warning timer
      if (warningTimer) {
        clearTimeout(warningTimer);
      }

      // Add performance warnings based on execution time
      if (executionTime > warningMs) {
        warnings.push({
          type: 'slow_query',
          severity: executionTime > timeoutMs * 0.8 ? 'critical' : 'warning',
          message: `Query took ${executionTime}ms to execute`,
          recommendation: executionTime > timeoutMs * 0.8
            ? 'This query is very slow. Consider adding database indexes or optimizing the query.'
            : 'Query performance could be improved with better indexing or caching.',
          estimatedImpact: 'Slow queries affect user experience and system performance'
        });
      }

      return {
        data: result,
        executionTime,
        warnings
      };
    } catch (error) {
      // Clear warning timer
      if (warningTimer) {
        clearTimeout(warningTimer);
      }

      const executionTime = Date.now() - startTime;
      
      // Add timeout warning
      if (error instanceof Error && error.message.includes('timed out')) {
        warnings.push({
          type: 'slow_query',
          severity: 'critical',
          message: `Query timed out after ${timeoutMs}ms`,
          recommendation: 'This operation is too expensive. Try reducing the date range, adding filters, or using pagination.',
          estimatedImpact: 'Query timeout prevents data from loading'
        });
      }

      throw error;
    }
  }

  /**
   * Execute a paginated query with performance monitoring
   * @param queryName - Name of the query
   * @param queryFn - Function that executes the query with pagination
   * @param pagination - Pagination parameters
   * @param totalCountFn - Function to get total count (optional)
   * @returns Paginated result with performance metadata
   */
  static async executePaginatedQuery<T>(
    queryName: string,
    queryFn: (pagination: PaginationParams) => Promise<T[]>,
    pagination: PaginationParams,
    totalCountFn?: () => Promise<number>
  ): Promise<QueryResult<T[]>> {
    const startTime = Date.now();
    const warnings: PerformanceWarning[] = [];

    try {
      // Execute main query
      const data = await queryFn(pagination);
      const executionTime = Date.now() - startTime;

      // Get total count if function provided
      let totalRecords = 0;
      let totalPages = 0;
      let hasMore = false;

      if (totalCountFn) {
        totalRecords = await totalCountFn();
        totalPages = Math.ceil(totalRecords / pagination.pageSize);
        hasMore = pagination.page < totalPages;
      } else {
        // Estimate based on result size
        hasMore = data.length === pagination.pageSize;
        totalPages = hasMore ? pagination.page + 1 : pagination.page;
      }

      // Add warnings for large result sets
      if (data.length > 500) {
        warnings.push({
          type: 'large_result_set',
          severity: 'warning',
          message: `Large result set: ${data.length} records returned`,
          recommendation: 'Consider using smaller page sizes or additional filters to reduce result set size',
          estimatedImpact: 'Large result sets can cause slow rendering and high memory usage'
        });
      }

      return {
        data,
        executionTime,
        warnings,
        pagination: {
          currentPage: pagination.page,
          totalPages,
          totalRecords,
          hasMore
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Check if a date range requires progressive loading
   * @param dateRange - Date range to check
   * @returns Whether progressive loading is recommended
   */
  static shouldUseProgressiveLoading(dateRange: DateRange): {
    useProgressive: boolean;
    chunkSizeDays: number;
    estimatedChunks: number;
    warnings: PerformanceWarning[];
  } {
    const warnings: PerformanceWarning[] = [];
    const rangeDays = Math.ceil(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Use progressive loading for ranges larger than 6 months
    const useProgressive = rangeDays > 180;
    
    if (useProgressive) {
      // Determine chunk size based on total range
      let chunkSizeDays: number;
      if (rangeDays > 730) { // > 2 years
        chunkSizeDays = 30; // Monthly chunks
      } else if (rangeDays > 365) { // > 1 year
        chunkSizeDays = 60; // Bi-monthly chunks
      } else {
        chunkSizeDays = 90; // Quarterly chunks
      }

      const estimatedChunks = Math.ceil(rangeDays / chunkSizeDays);

      warnings.push({
        type: 'large_date_range',
        severity: 'info',
        message: `Large date range will be processed in ${estimatedChunks} chunks of ${chunkSizeDays} days each`,
        recommendation: 'Data will be loaded progressively to maintain good performance',
        estimatedImpact: `Processing will take approximately ${estimatedChunks * 2}-${estimatedChunks * 5} seconds`
      });

      return {
        useProgressive: true,
        chunkSizeDays,
        estimatedChunks,
        warnings
      };
    }

    return {
      useProgressive: false,
      chunkSizeDays: rangeDays,
      estimatedChunks: 1,
      warnings
    };
  }

  /**
   * Generate date range chunks for progressive loading
   * @param dateRange - Original date range
   * @param chunkSizeDays - Size of each chunk in days
   * @returns Array of date range chunks
   */
  static generateDateRangeChunks(dateRange: DateRange, chunkSizeDays: number): DateRange[] {
    const chunks: DateRange[] = [];
    const startTime = dateRange.startDate.getTime();
    const endTime = dateRange.endDate.getTime();
    const chunkSizeMs = chunkSizeDays * 24 * 60 * 60 * 1000;

    let currentStart = startTime;
    
    while (currentStart < endTime) {
      const currentEnd = Math.min(currentStart + chunkSizeMs - 1, endTime);
      
      chunks.push({
        startDate: new Date(currentStart),
        endDate: new Date(currentEnd)
      });
      
      currentStart = currentEnd + 1;
    }

    return chunks;
  }

  /**
   * Monitor memory usage and generate warnings
   * @param operationName - Name of the operation being monitored
   * @returns Memory usage warnings
   */
  static checkMemoryUsage(operationName: string): PerformanceWarning[] {
    const warnings: PerformanceWarning[] = [];
    
    try {
      // Check if we're in Node.js environment
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

        if (heapUsagePercent > 80) {
          warnings.push({
            type: 'high_memory_usage',
            severity: 'critical',
            message: `High memory usage: ${heapUsedMB}MB (${Math.round(heapUsagePercent)}%)`,
            recommendation: 'Consider reducing query scope, using pagination, or restarting the application',
            estimatedImpact: 'High memory usage can cause performance degradation or application crashes'
          });
        } else if (heapUsagePercent > 60) {
          warnings.push({
            type: 'high_memory_usage',
            severity: 'warning',
            message: `Elevated memory usage: ${heapUsedMB}MB (${Math.round(heapUsagePercent)}%)`,
            recommendation: 'Monitor memory usage and consider optimizing queries or using smaller result sets',
            estimatedImpact: 'Elevated memory usage may affect performance'
          });
        }
      }
    } catch (error) {
      // Memory monitoring failed, but don't break the operation
      console.warn('Memory usage monitoring failed:', error);
    }

    return warnings;
  }

  /**
   * Get performance recommendations based on operation characteristics
   * @param operationType - Type of operation (dashboard, reports, etc.)
   * @param dateRange - Date range being queried
   * @param expectedResultSize - Expected number of results
   * @returns Performance recommendations
   */
  static getPerformanceRecommendations(
    operationType: string,
    dateRange?: DateRange,
    expectedResultSize?: number
  ): PerformanceWarning[] {
    const recommendations: PerformanceWarning[] = [];

    // Date range recommendations
    if (dateRange) {
      const rangeDays = Math.ceil(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (operationType === 'dashboard' && rangeDays > 30) {
        recommendations.push({
          type: 'large_date_range',
          severity: 'warning',
          message: 'Dashboard queries work best with recent data (last 30 days)',
          recommendation: 'Consider using a shorter date range for dashboard views',
          estimatedImpact: 'Shorter date ranges provide faster loading and more relevant insights'
        });
      }

      if (operationType === 'export' && rangeDays > 365) {
        recommendations.push({
          type: 'large_date_range',
          severity: 'warning',
          message: 'Large exports may take several minutes to complete',
          recommendation: 'Consider breaking large exports into smaller date ranges',
          estimatedImpact: 'Large exports can timeout or consume significant server resources'
        });
      }
    }

    // Result size recommendations
    if (expectedResultSize) {
      if (expectedResultSize > this.MAX_RESULT_SET_SIZE) {
        recommendations.push({
          type: 'large_result_set',
          severity: 'critical',
          message: `Expected result set is very large (${expectedResultSize} records)`,
          recommendation: 'Use pagination, filters, or aggregation to reduce result set size',
          estimatedImpact: 'Large result sets can cause timeouts and poor user experience'
        });
      } else if (expectedResultSize > 1000) {
        recommendations.push({
          type: 'large_result_set',
          severity: 'warning',
          message: `Large result set expected (${expectedResultSize} records)`,
          recommendation: 'Consider using pagination for better performance',
          estimatedImpact: 'Large result sets may load slowly'
        });
      }
    }

    return recommendations;
  }
}