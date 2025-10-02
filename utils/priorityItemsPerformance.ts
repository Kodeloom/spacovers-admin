/**
 * Priority Items Performance Monitoring Utility
 * Tracks and optimizes performance for the warehouse priority items display
 * 
 * Requirements: 8.1, 8.3, 8.4, 8.5 - Performance optimization and monitoring
 */

interface PerformanceMetrics {
  apiResponseTime: number;
  renderTime: number;
  itemCount: number;
  timestamp: Date;
  useVirtualScrolling: boolean;
}

interface PerformanceThresholds {
  apiResponseTime: number; // milliseconds
  renderTime: number; // milliseconds
  maxItemsBeforeVirtualScrolling: number;
}

/**
 * Performance monitoring and optimization service for priority items
 */
export class PriorityItemsPerformance {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 50;
  
  // Performance thresholds for optimization decisions
  private static readonly thresholds: PerformanceThresholds = {
    apiResponseTime: 1000, // 1 second
    renderTime: 100, // 100ms
    maxItemsBeforeVirtualScrolling: 20
  };

  /**
   * Start timing an API request
   */
  static startApiTiming(): () => number {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }

  /**
   * Start timing a render operation
   */
  static startRenderTiming(): () => number {
    const startTime = performance.now();
    return () => performance.now() - startTime;
  }

  /**
   * Record performance metrics
   */
  static recordMetrics(
    apiResponseTime: number,
    renderTime: number,
    itemCount: number,
    useVirtualScrolling: boolean
  ): void {
    const metric: PerformanceMetrics = {
      apiResponseTime,
      renderTime,
      itemCount,
      timestamp: new Date(),
      useVirtualScrolling
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Log performance warnings
    this.checkPerformanceThresholds(metric);
  }

  /**
   * Check if performance thresholds are exceeded and log warnings
   */
  private static checkPerformanceThresholds(metric: PerformanceMetrics): void {
    if (metric.apiResponseTime > this.thresholds.apiResponseTime) {
      console.warn(
        `Priority Items API slow response: ${metric.apiResponseTime.toFixed(2)}ms ` +
        `(threshold: ${this.thresholds.apiResponseTime}ms) for ${metric.itemCount} items`
      );
    }

    if (metric.renderTime > this.thresholds.renderTime) {
      console.warn(
        `Priority Items slow render: ${metric.renderTime.toFixed(2)}ms ` +
        `(threshold: ${this.thresholds.renderTime}ms) for ${metric.itemCount} items. ` +
        `Virtual scrolling: ${metric.useVirtualScrolling ? 'enabled' : 'disabled'}`
      );
    }
  }

  /**
   * Determine if virtual scrolling should be used based on item count and performance
   */
  static shouldUseVirtualScrolling(itemCount: number): boolean {
    // Always use virtual scrolling for large lists
    if (itemCount > this.thresholds.maxItemsBeforeVirtualScrolling) {
      return true;
    }

    // Check recent performance metrics to decide
    const recentMetrics = this.metrics.slice(-10);
    if (recentMetrics.length < 3) {
      return false; // Not enough data, use default threshold
    }

    // Calculate average render time for non-virtual scrolling
    const nonVirtualMetrics = recentMetrics.filter(m => !m.useVirtualScrolling);
    if (nonVirtualMetrics.length === 0) {
      return false;
    }

    const avgRenderTime = nonVirtualMetrics.reduce((sum, m) => sum + m.renderTime, 0) / nonVirtualMetrics.length;
    
    // Use virtual scrolling if render time is consistently slow
    return avgRenderTime > this.thresholds.renderTime;
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    averageApiTime: number;
    averageRenderTime: number;
    averageItemCount: number;
    virtualScrollingUsage: number;
    totalMeasurements: number;
    recommendations: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageApiTime: 0,
        averageRenderTime: 0,
        averageItemCount: 0,
        virtualScrollingUsage: 0,
        totalMeasurements: 0,
        recommendations: ['No performance data available yet']
      };
    }

    const totalMetrics = this.metrics.length;
    const avgApiTime = this.metrics.reduce((sum, m) => sum + m.apiResponseTime, 0) / totalMetrics;
    const avgRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0) / totalMetrics;
    const avgItemCount = this.metrics.reduce((sum, m) => sum + m.itemCount, 0) / totalMetrics;
    const virtualScrollingUsage = this.metrics.filter(m => m.useVirtualScrolling).length / totalMetrics;

    const recommendations: string[] = [];

    // API performance recommendations
    if (avgApiTime > this.thresholds.apiResponseTime) {
      recommendations.push(
        `API response time is slow (${avgApiTime.toFixed(2)}ms avg). Consider adding database indexes.`
      );
    } else {
      recommendations.push('API performance is good');
    }

    // Render performance recommendations
    if (avgRenderTime > this.thresholds.renderTime) {
      recommendations.push(
        `Render time is slow (${avgRenderTime.toFixed(2)}ms avg). Virtual scrolling usage: ${(virtualScrollingUsage * 100).toFixed(1)}%`
      );
    } else {
      recommendations.push('Render performance is good');
    }

    // Virtual scrolling recommendations
    if (avgItemCount > this.thresholds.maxItemsBeforeVirtualScrolling && virtualScrollingUsage < 0.8) {
      recommendations.push(
        `Consider using virtual scrolling more often. Average item count: ${avgItemCount.toFixed(1)}`
      );
    }

    return {
      averageApiTime: Math.round(avgApiTime * 100) / 100,
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      averageItemCount: Math.round(avgItemCount * 100) / 100,
      virtualScrollingUsage: Math.round(virtualScrollingUsage * 100) / 100,
      totalMeasurements: totalMetrics,
      recommendations
    };
  }

  /**
   * Clear performance metrics (useful for testing)
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get recent performance trend
   */
  static getPerformanceTrend(): {
    isImproving: boolean;
    trend: 'improving' | 'stable' | 'degrading';
    details: string;
  } {
    if (this.metrics.length < 10) {
      return {
        isImproving: false,
        trend: 'stable',
        details: 'Not enough data to determine trend'
      };
    }

    const recent = this.metrics.slice(-5);
    const older = this.metrics.slice(-10, -5);

    const recentAvgTime = recent.reduce((sum, m) => sum + m.apiResponseTime + m.renderTime, 0) / recent.length;
    const olderAvgTime = older.reduce((sum, m) => sum + m.apiResponseTime + m.renderTime, 0) / older.length;

    const improvement = ((olderAvgTime - recentAvgTime) / olderAvgTime) * 100;

    if (improvement > 10) {
      return {
        isImproving: true,
        trend: 'improving',
        details: `Performance improved by ${improvement.toFixed(1)}%`
      };
    } else if (improvement < -10) {
      return {
        isImproving: false,
        trend: 'degrading',
        details: `Performance degraded by ${Math.abs(improvement).toFixed(1)}%`
      };
    } else {
      return {
        isImproving: false,
        trend: 'stable',
        details: `Performance is stable (${improvement.toFixed(1)}% change)`
      };
    }
  }

  /**
   * Optimize refresh interval based on performance
   */
  static getOptimalRefreshInterval(): number {
    const stats = this.getPerformanceStats();
    const baseInterval = 30000; // 30 seconds default

    // If API is slow, increase interval to reduce load
    if (stats.averageApiTime > this.thresholds.apiResponseTime) {
      return Math.min(baseInterval * 2, 60000); // Max 60 seconds
    }

    // If performance is good and item count is low, can refresh more frequently
    if (stats.averageApiTime < 500 && stats.averageItemCount < 10) {
      return Math.max(baseInterval / 2, 15000); // Min 15 seconds
    }

    return baseInterval;
  }
}

/**
 * Performance monitoring hook for Vue components
 */
export function usePriorityItemsPerformance() {
  const startApiTimer = () => PriorityItemsPerformance.startApiTiming();
  const startRenderTimer = () => PriorityItemsPerformance.startRenderTiming();
  
  const recordMetrics = (
    apiTime: number,
    renderTime: number,
    itemCount: number,
    useVirtualScrolling: boolean
  ) => {
    PriorityItemsPerformance.recordMetrics(apiTime, renderTime, itemCount, useVirtualScrolling);
  };

  const shouldUseVirtualScrolling = (itemCount: number) => 
    PriorityItemsPerformance.shouldUseVirtualScrolling(itemCount);

  const getOptimalRefreshInterval = () => 
    PriorityItemsPerformance.getOptimalRefreshInterval();

  const getPerformanceStats = () => 
    PriorityItemsPerformance.getPerformanceStats();

  return {
    startApiTimer,
    startRenderTimer,
    recordMetrics,
    shouldUseVirtualScrolling,
    getOptimalRefreshInterval,
    getPerformanceStats
  };
}