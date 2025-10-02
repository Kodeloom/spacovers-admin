import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PriorityItemsPerformance } from '~/utils/priorityItemsPerformance';

describe('Priority Items Performance Optimization', () => {
  beforeEach(() => {
    PriorityItemsPerformance.clearMetrics();
  });

  describe('Virtual Scrolling Decision', () => {
    it('should use virtual scrolling for large item counts', () => {
      expect(PriorityItemsPerformance.shouldUseVirtualScrolling(25)).toBe(true);
      expect(PriorityItemsPerformance.shouldUseVirtualScrolling(50)).toBe(true);
    });

    it('should not use virtual scrolling for small item counts', () => {
      expect(PriorityItemsPerformance.shouldUseVirtualScrolling(5)).toBe(false);
      expect(PriorityItemsPerformance.shouldUseVirtualScrolling(15)).toBe(false);
    });

    it('should use virtual scrolling based on performance history', () => {
      // Record slow render times for small lists
      for (let i = 0; i < 5; i++) {
        PriorityItemsPerformance.recordMetrics(500, 150, 15, false); // Slow render
      }

      // Should now recommend virtual scrolling even for smaller lists
      expect(PriorityItemsPerformance.shouldUseVirtualScrolling(15)).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should record and track performance metrics', () => {
      PriorityItemsPerformance.recordMetrics(800, 50, 20, false);
      PriorityItemsPerformance.recordMetrics(600, 30, 15, true);

      const stats = PriorityItemsPerformance.getPerformanceStats();
      
      expect(stats.totalMeasurements).toBe(2);
      expect(stats.averageApiTime).toBe(700);
      expect(stats.averageRenderTime).toBe(40);
      expect(stats.averageItemCount).toBe(17.5);
      expect(stats.virtualScrollingUsage).toBe(0.5);
    });

    it('should provide performance recommendations', () => {
      // Record good performance
      PriorityItemsPerformance.recordMetrics(300, 20, 10, false);
      
      const stats = PriorityItemsPerformance.getPerformanceStats();
      
      expect(stats.recommendations).toContain('API performance is good');
      expect(stats.recommendations).toContain('Render performance is good');
    });

    it('should warn about slow performance', () => {
      // Record slow performance
      PriorityItemsPerformance.recordMetrics(2000, 200, 30, false);
      
      const stats = PriorityItemsPerformance.getPerformanceStats();
      
      expect(stats.recommendations.some(r => r.includes('slow'))).toBe(true);
    });
  });

  describe('Refresh Interval Optimization', () => {
    it('should return default interval for good performance', () => {
      PriorityItemsPerformance.recordMetrics(400, 30, 10, false);
      
      const interval = PriorityItemsPerformance.getOptimalRefreshInterval();
      expect(interval).toBe(30000); // Default 30 seconds
    });

    it('should increase interval for slow API performance', () => {
      PriorityItemsPerformance.recordMetrics(2000, 30, 20, false);
      
      const interval = PriorityItemsPerformance.getOptimalRefreshInterval();
      expect(interval).toBeGreaterThan(30000);
      expect(interval).toBeLessThanOrEqual(60000);
    });

    it('should decrease interval for fast performance with few items', () => {
      PriorityItemsPerformance.recordMetrics(200, 20, 5, false);
      
      const interval = PriorityItemsPerformance.getOptimalRefreshInterval();
      expect(interval).toBeLessThan(30000);
      expect(interval).toBeGreaterThanOrEqual(15000);
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should detect improving performance', () => {
      // Record degrading then improving performance
      for (let i = 0; i < 5; i++) {
        PriorityItemsPerformance.recordMetrics(1000 - i * 100, 100 - i * 10, 20, false);
      }
      for (let i = 0; i < 5; i++) {
        PriorityItemsPerformance.recordMetrics(500 - i * 50, 50 - i * 5, 20, false);
      }

      const trend = PriorityItemsPerformance.getPerformanceTrend();
      expect(trend.trend).toBe('improving');
      expect(trend.isImproving).toBe(true);
    });

    it('should detect stable performance', () => {
      // Record consistent performance
      for (let i = 0; i < 10; i++) {
        PriorityItemsPerformance.recordMetrics(500, 50, 20, false);
      }

      const trend = PriorityItemsPerformance.getPerformanceTrend();
      expect(trend.trend).toBe('stable');
    });

    it('should handle insufficient data', () => {
      // Record only a few metrics
      PriorityItemsPerformance.recordMetrics(500, 50, 20, false);

      const trend = PriorityItemsPerformance.getPerformanceTrend();
      expect(trend.trend).toBe('stable');
      expect(trend.details).toContain('Not enough data');
    });
  });

  describe('Performance Thresholds', () => {
    it('should log warnings for slow API responses', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      PriorityItemsPerformance.recordMetrics(2000, 50, 20, false); // Slow API
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Priority Items API slow response')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log warnings for slow render times', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      PriorityItemsPerformance.recordMetrics(500, 200, 20, false); // Slow render
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Priority Items slow render')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should limit metrics history to prevent memory leaks', () => {
      // Record more metrics than the limit
      for (let i = 0; i < 100; i++) {
        PriorityItemsPerformance.recordMetrics(500, 50, 20, false);
      }

      const stats = PriorityItemsPerformance.getPerformanceStats();
      expect(stats.totalMeasurements).toBeLessThanOrEqual(50); // MAX_METRICS_HISTORY
    });

    it('should clear metrics when requested', () => {
      PriorityItemsPerformance.recordMetrics(500, 50, 20, false);
      expect(PriorityItemsPerformance.getPerformanceStats().totalMeasurements).toBe(1);

      PriorityItemsPerformance.clearMetrics();
      expect(PriorityItemsPerformance.getPerformanceStats().totalMeasurements).toBe(0);
    });
  });
});

describe('Priority Items Performance Hook', () => {
  it('should provide performance monitoring functions', async () => {
    const { usePriorityItemsPerformance } = await import('~/utils/priorityItemsPerformance');
    
    const {
      startApiTimer,
      startRenderTimer,
      recordMetrics,
      shouldUseVirtualScrolling,
      getOptimalRefreshInterval,
      getPerformanceStats
    } = usePriorityItemsPerformance();

    expect(typeof startApiTimer).toBe('function');
    expect(typeof startRenderTimer).toBe('function');
    expect(typeof recordMetrics).toBe('function');
    expect(typeof shouldUseVirtualScrolling).toBe('function');
    expect(typeof getOptimalRefreshInterval).toBe('function');
    expect(typeof getPerformanceStats).toBe('function');
  });

  it('should measure timing correctly', async () => {
    const { usePriorityItemsPerformance } = await import('~/utils/priorityItemsPerformance');
    const { startApiTimer } = usePriorityItemsPerformance();

    const endTimer = startApiTimer();
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const duration = endTimer();
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100); // Should be reasonable
  });
});