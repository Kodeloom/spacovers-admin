/**
 * Performance Monitoring Utility
 * Monitors query performance and provides optimization recommendations
 * 
 * Requirements: 15.5 - Performance optimization and monitoring
 */

interface QueryPerformanceData {
  queryName: string;
  executionTime: number;
  timestamp: Date;
  cacheHit: boolean;
  recordCount?: number;
  parameters?: any;
}

interface PerformanceMetrics {
  averageExecutionTime: number;
  slowestQuery: QueryPerformanceData | null;
  fastestQuery: QueryPerformanceData | null;
  totalQueries: number;
  cacheHitRate: number;
  recommendations: string[];
}

/**
 * Performance Monitor Service
 * Tracks and analyzes query performance for optimization
 */
export class PerformanceMonitor {
  private static queryHistory: QueryPerformanceData[] = [];
  private static readonly MAX_HISTORY_SIZE = 1000;
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  /**
   * Record query performance data
   * @param queryName - Name of the query being executed
   * @param executionTime - Execution time in milliseconds
   * @param cacheHit - Whether the result came from cache
   * @param recordCount - Number of records returned (optional)
   * @param parameters - Query parameters (optional)
   */
  static recordQuery(
    queryName: string,
    executionTime: number,
    cacheHit: boolean,
    recordCount?: number,
    parameters?: any
  ): void {
    const queryData: QueryPerformanceData = {
      queryName,
      executionTime,
      timestamp: new Date(),
      cacheHit,
      recordCount,
      parameters
    };

    this.queryHistory.push(queryData);

    // Maintain history size limit
    if (this.queryHistory.length > this.MAX_HISTORY_SIZE) {
      this.queryHistory.shift();
    }

    // Log slow queries immediately
    if (executionTime > this.SLOW_QUERY_THRESHOLD && !cacheHit) {
      console.warn(`Slow query detected: ${queryName} took ${executionTime}ms`, {
        recordCount,
        parameters
      });
    }
  }

  /**
   * Create a performance tracking wrapper for async functions
   * @param queryName - Name to identify the query
   * @param fn - Async function to wrap
   * @returns Wrapped function with performance tracking
   */
  static trackPerformance<T>(
    queryName: string,
    fn: () => Promise<T>
  ): () => Promise<T> {
    return async (): Promise<T> => {
      const startTime = Date.now();
      let cacheHit = false;
      let result: T;
      let recordCount: number | undefined;

      try {
        result = await fn();
        
        // Try to determine if this was a cache hit
        // This is a heuristic based on execution time
        cacheHit = (Date.now() - startTime) < 10; // Less than 10ms likely cache hit
        
        // Try to get record count if result is an array or has length property
        if (Array.isArray(result)) {
          recordCount = result.length;
        } else if (result && typeof result === 'object' && 'length' in result) {
          recordCount = (result as any).length;
        }

        return result;
      } finally {
        const executionTime = Date.now() - startTime;
        this.recordQuery(queryName, executionTime, cacheHit, recordCount);
      }
    };
  }

  /**
   * Get performance metrics for analysis
   * @param timeRangeMinutes - Time range to analyze (default: 60 minutes)
   * @returns Performance metrics and recommendations
   */
  static getPerformanceMetrics(timeRangeMinutes: number = 60): PerformanceMetrics {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const recentQueries = this.queryHistory.filter(q => q.timestamp >= cutoffTime);

    if (recentQueries.length === 0) {
      return {
        averageExecutionTime: 0,
        slowestQuery: null,
        fastestQuery: null,
        totalQueries: 0,
        cacheHitRate: 0,
        recommendations: ['No query data available for analysis']
      };
    }

    // Calculate metrics
    const totalExecutionTime = recentQueries.reduce((sum, q) => sum + q.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / recentQueries.length;
    
    const slowestQuery = recentQueries.reduce((slowest, current) => 
      current.executionTime > slowest.executionTime ? current : slowest
    );
    
    const fastestQuery = recentQueries.reduce((fastest, current) => 
      current.executionTime < fastest.executionTime ? current : fastest
    );
    
    const cacheHits = recentQueries.filter(q => q.cacheHit).length;
    const cacheHitRate = (cacheHits / recentQueries.length) * 100;

    // Generate recommendations
    const recommendations = this.generateRecommendations(recentQueries, {
      averageExecutionTime,
      cacheHitRate,
      slowestQuery
    });

    return {
      averageExecutionTime,
      slowestQuery,
      fastestQuery,
      totalQueries: recentQueries.length,
      cacheHitRate,
      recommendations
    };
  }

  /**
   * Generate performance recommendations based on metrics
   */
  private static generateRecommendations(
    queries: QueryPerformanceData[],
    metrics: { averageExecutionTime: number; cacheHitRate: number; slowestQuery: QueryPerformanceData }
  ): string[] {
    const recommendations: string[] = [];

    // Cache hit rate recommendations
    if (metrics.cacheHitRate < 30) {
      recommendations.push('Very low cache hit rate. Consider increasing cache TTL or reviewing cache strategy.');
    } else if (metrics.cacheHitRate < 60) {
      recommendations.push('Low cache hit rate. Consider optimizing cache keys or increasing cache duration.');
    } else if (metrics.cacheHitRate > 90) {
      recommendations.push('Excellent cache performance. Current caching strategy is working well.');
    }

    // Average execution time recommendations
    if (metrics.averageExecutionTime > 500) {
      recommendations.push('High average query execution time. Consider adding database indexes or optimizing queries.');
    } else if (metrics.averageExecutionTime < 100) {
      recommendations.push('Good query performance. Queries are executing efficiently.');
    }

    // Slow query recommendations
    if (metrics.slowestQuery.executionTime > this.SLOW_QUERY_THRESHOLD) {
      recommendations.push(`Slowest query (${metrics.slowestQuery.queryName}) took ${metrics.slowestQuery.executionTime}ms. Consider optimization.`);
    }

    // Query frequency analysis
    const queryFrequency = new Map<string, number>();
    queries.forEach(q => {
      queryFrequency.set(q.queryName, (queryFrequency.get(q.queryName) || 0) + 1);
    });

    const mostFrequentQuery = Array.from(queryFrequency.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostFrequentQuery && mostFrequentQuery[1] > queries.length * 0.5) {
      recommendations.push(`Query "${mostFrequentQuery[0]}" represents ${Math.round((mostFrequentQuery[1] / queries.length) * 100)}% of all queries. Consider aggressive caching.`);
    }

    // Record count analysis
    const largeResultQueries = queries.filter(q => q.recordCount && q.recordCount > 1000);
    if (largeResultQueries.length > 0) {
      recommendations.push(`${largeResultQueries.length} queries returned more than 1000 records. Consider pagination or result limiting.`);
    }

    return recommendations;
  }

  /**
   * Get detailed query analysis by query name
   * @param queryName - Name of the query to analyze
   * @param timeRangeMinutes - Time range to analyze (default: 60 minutes)
   */
  static getQueryAnalysis(queryName: string, timeRangeMinutes: number = 60): {
    queryName: string;
    executionCount: number;
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    cacheHitRate: number;
    recentExecutions: QueryPerformanceData[];
  } {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const queryExecutions = this.queryHistory.filter(q => 
      q.queryName === queryName && q.timestamp >= cutoffTime
    );

    if (queryExecutions.length === 0) {
      return {
        queryName,
        executionCount: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        cacheHitRate: 0,
        recentExecutions: []
      };
    }

    const executionTimes = queryExecutions.map(q => q.executionTime);
    const cacheHits = queryExecutions.filter(q => q.cacheHit).length;

    return {
      queryName,
      executionCount: queryExecutions.length,
      averageExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      cacheHitRate: (cacheHits / queryExecutions.length) * 100,
      recentExecutions: queryExecutions.slice(-10) // Last 10 executions
    };
  }

  /**
   * Clear performance history
   */
  static clearHistory(): void {
    this.queryHistory = [];
    console.log('Performance monitoring history cleared');
  }

  /**
   * Export performance data for external analysis
   * @param timeRangeMinutes - Time range to export (default: 60 minutes)
   */
  static exportPerformanceData(timeRangeMinutes: number = 60): QueryPerformanceData[] {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    return this.queryHistory.filter(q => q.timestamp >= cutoffTime);
  }

  /**
   * Get real-time performance dashboard data
   */
  static getDashboardData(): {
    currentMetrics: PerformanceMetrics;
    topSlowQueries: QueryPerformanceData[];
    queryFrequency: { queryName: string; count: number }[];
    cacheEffectiveness: { queryName: string; hitRate: number }[];
  } {
    const currentMetrics = this.getPerformanceMetrics(60);
    
    // Get top 5 slowest queries from last hour
    const recentQueries = this.queryHistory.filter(q => 
      q.timestamp >= new Date(Date.now() - (60 * 60 * 1000))
    );
    
    const topSlowQueries = recentQueries
      .filter(q => !q.cacheHit)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);

    // Query frequency analysis
    const queryFrequency = new Map<string, number>();
    recentQueries.forEach(q => {
      queryFrequency.set(q.queryName, (queryFrequency.get(q.queryName) || 0) + 1);
    });

    const queryFrequencyArray = Array.from(queryFrequency.entries())
      .map(([queryName, count]) => ({ queryName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cache effectiveness by query
    const cacheStats = new Map<string, { hits: number; total: number }>();
    recentQueries.forEach(q => {
      const stats = cacheStats.get(q.queryName) || { hits: 0, total: 0 };
      stats.total++;
      if (q.cacheHit) stats.hits++;
      cacheStats.set(q.queryName, stats);
    });

    const cacheEffectiveness = Array.from(cacheStats.entries())
      .map(([queryName, stats]) => ({
        queryName,
        hitRate: (stats.hits / stats.total) * 100
      }))
      .sort((a, b) => b.hitRate - a.hitRate)
      .slice(0, 10);

    return {
      currentMetrics,
      topSlowQueries,
      queryFrequency: queryFrequencyArray,
      cacheEffectiveness
    };
  }
}