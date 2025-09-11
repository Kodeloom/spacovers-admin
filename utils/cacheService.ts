/**
 * Cache Service for Metrics Performance Optimization
 * Provides in-memory caching for expensive metric calculations
 * 
 * Requirements: 15.5 - Performance optimization and caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

/**
 * Simple in-memory cache with TTL support for metrics data
 * Uses Map for O(1) access and automatic cleanup of expired entries
 */
export class CacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static stats = { hits: 0, misses: 0 };
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  // Cache TTL configurations (in milliseconds)
  private static readonly TTL_CONFIG = {
    DASHBOARD_METRICS: 2 * 60 * 1000,      // 2 minutes - frequently updated
    ORDERS_METRICS: 1 * 60 * 1000,         // 1 minute - real-time updates needed
    REPORTS_METRICS: 5 * 60 * 1000,        // 5 minutes - less frequent updates
    PRODUCTIVITY_DATA: 10 * 60 * 1000,     // 10 minutes - historical data
    REVENUE_DATA: 15 * 60 * 1000,          // 15 minutes - financial data
    LEAD_TIME_DATA: 30 * 60 * 1000,        // 30 minutes - statistical data
    EXPENSIVE_QUERIES: 20 * 60 * 1000,     // 20 minutes - for complex calculations
    LARGE_DATASETS: 60 * 60 * 1000,        // 1 hour - for large result sets
  };

  /**
   * Initialize the cache service with automatic cleanup
   */
  static initialize(): void {
    if (this.cleanupInterval) {
      return; // Already initialized
    }

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    console.log('CacheService initialized with automatic cleanup');
  }

  /**
   * Get cached data if available and not expired
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set cached data with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (optional, uses default based on key type)
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    const actualTtl = ttl || this.getDefaultTTL(key);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: actualTtl
    });
  }

  /**
   * Get default TTL based on cache key pattern
   * @param key - Cache key
   * @returns TTL in milliseconds
   */
  private static getDefaultTTL(key: string): number {
    if (key.includes('dashboard')) return this.TTL_CONFIG.DASHBOARD_METRICS;
    if (key.includes('orders')) return this.TTL_CONFIG.ORDERS_METRICS;
    if (key.includes('reports')) return this.TTL_CONFIG.REPORTS_METRICS;
    if (key.includes('productivity')) return this.TTL_CONFIG.PRODUCTIVITY_DATA;
    if (key.includes('revenue')) return this.TTL_CONFIG.REVENUE_DATA;
    if (key.includes('leadtime')) return this.TTL_CONFIG.LEAD_TIME_DATA;
    
    // Default TTL for unknown keys
    return 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Delete specific cache entry
   * @param key - Cache key to delete
   */
  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    console.log('Cache cleared');
  }

  /**
   * Remove expired entries from cache
   */
  static cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  static getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    };
  }

  /**
   * Generate cache key for dashboard metrics
   */
  static getDashboardCacheKey(): string {
    return 'metrics:dashboard:all';
  }

  /**
   * Generate cache key for orders metrics with filters
   * @param filters - Order filters object
   */
  static getOrdersCacheKey(filters?: any): string {
    if (!filters || Object.keys(filters).length === 0) {
      return 'metrics:orders:all';
    }

    // Create a stable key from filters
    const filterKey = JSON.stringify(filters, Object.keys(filters).sort());
    const hash = this.simpleHash(filterKey);
    return `metrics:orders:${hash}`;
  }

  /**
   * Generate cache key for reports metrics with date range
   * @param startDate - Start date
   * @param endDate - End date
   */
  static getReportsCacheKey(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `metrics:reports:${start}:${end}`;
  }

  /**
   * Generate cache key for productivity data
   * @param startDate - Start date
   * @param endDate - End date
   */
  static getProductivityCacheKey(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `metrics:productivity:${start}:${end}`;
  }

  /**
   * Generate cache key for revenue data
   * @param startDate - Start date
   * @param endDate - End date
   */
  static getRevenueCacheKey(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `metrics:revenue:${start}:${end}`;
  }

  /**
   * Generate cache key for lead time data
   * @param startDate - Start date
   * @param endDate - End date
   */
  static getLeadTimeCacheKey(startDate: Date, endDate: Date): string {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `metrics:leadtime:${start}:${end}`;
  }

  /**
   * Simple hash function for creating stable cache keys
   * @param str - String to hash
   * @returns Hash string
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Pattern to match cache keys (simple string contains)
   */
  static invalidatePattern(pattern: string): number {
    let removedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cache invalidation: removed ${removedCount} entries matching pattern '${pattern}'`);
    }

    return removedCount;
  }

  /**
   * Invalidate all dashboard-related cache entries
   */
  static invalidateDashboard(): void {
    this.invalidatePattern('dashboard');
  }

  /**
   * Invalidate all orders-related cache entries
   */
  static invalidateOrders(): void {
    this.invalidatePattern('orders');
  }

  /**
   * Invalidate all reports-related cache entries
   */
  static invalidateReports(): void {
    this.invalidatePattern('reports');
  }

  /**
   * Get cache key for expensive query results
   * @param queryName - Name of the query
   * @param parameters - Query parameters for uniqueness
   */
  static getExpensiveQueryCacheKey(queryName: string, parameters: any): string {
    const paramHash = this.simpleHash(JSON.stringify(parameters, Object.keys(parameters || {}).sort()));
    return `expensive:${queryName}:${paramHash}`;
  }

  /**
   * Get cache key for large dataset results
   * @param datasetName - Name of the dataset
   * @param filters - Filters applied to the dataset
   */
  static getLargeDatasetCacheKey(datasetName: string, filters: any): string {
    const filterHash = this.simpleHash(JSON.stringify(filters, Object.keys(filters || {}).sort()));
    return `dataset:${datasetName}:${filterHash}`;
  }

  /**
   * Cache expensive query result with extended TTL
   * @param queryName - Name of the query
   * @param parameters - Query parameters
   * @param data - Data to cache
   */
  static setExpensiveQuery<T>(queryName: string, parameters: any, data: T): void {
    const key = this.getExpensiveQueryCacheKey(queryName, parameters);
    this.set(key, data, this.TTL_CONFIG.EXPENSIVE_QUERIES);
  }

  /**
   * Get cached expensive query result
   * @param queryName - Name of the query
   * @param parameters - Query parameters
   */
  static getExpensiveQuery<T>(queryName: string, parameters: any): T | null {
    const key = this.getExpensiveQueryCacheKey(queryName, parameters);
    return this.get<T>(key);
  }

  /**
   * Cache large dataset with extended TTL
   * @param datasetName - Name of the dataset
   * @param filters - Filters applied
   * @param data - Data to cache
   */
  static setLargeDataset<T>(datasetName: string, filters: any, data: T): void {
    const key = this.getLargeDatasetCacheKey(datasetName, filters);
    this.set(key, data, this.TTL_CONFIG.LARGE_DATASETS);
  }

  /**
   * Get cached large dataset
   * @param datasetName - Name of the dataset
   * @param filters - Filters applied
   */
  static getLargeDataset<T>(datasetName: string, filters: any): T | null {
    const key = this.getLargeDatasetCacheKey(datasetName, filters);
    return this.get<T>(key);
  }

  /**
   * Preload cache with commonly accessed data
   * Should be called during application startup or low-traffic periods
   */
  static async preloadCache(): Promise<void> {
    try {
      console.log('Starting cache preload...');
      
      // Import MetricsService here to avoid circular dependency
      const { MetricsService } = await import('./metricsService');
      
      // Preload dashboard metrics
      await MetricsService.getDashboardMetrics();
      
      // Preload orders metrics without filters
      await MetricsService.getOrdersPageMetrics();
      
      console.log('Cache preload completed successfully');
    } catch (error) {
      console.error('Error during cache preload:', error);
    }
  }

  /**
   * Get cache memory usage estimation
   */
  static getMemoryUsage(): {
    entryCount: number;
    estimatedSizeKB: number;
    largestEntries: { key: string; estimatedSizeKB: number }[];
  } {
    let totalSize = 0;
    const entrySizes: { key: string; estimatedSizeKB: number }[] = [];

    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation of memory usage
      const jsonSize = JSON.stringify(entry.data).length;
      const sizeKB = Math.round((jsonSize * 2) / 1024); // Rough estimate including overhead
      totalSize += sizeKB;
      entrySizes.push({ key, estimatedSizeKB: sizeKB });
    }

    // Sort by size and get top 10
    const largestEntries = entrySizes
      .sort((a, b) => b.estimatedSizeKB - a.estimatedSizeKB)
      .slice(0, 10);

    return {
      entryCount: this.cache.size,
      estimatedSizeKB: totalSize,
      largestEntries
    };
  }

  /**
   * Optimize cache by removing least recently used entries if memory usage is high
   */
  static optimizeCache(): void {
    const memoryUsage = this.getMemoryUsage();
    const maxSizeKB = 50 * 1024; // 50MB limit
    
    if (memoryUsage.estimatedSizeKB > maxSizeKB) {
      console.log(`Cache size (${memoryUsage.estimatedSizeKB}KB) exceeds limit (${maxSizeKB}KB), optimizing...`);
      
      // Remove entries older than half their TTL
      const now = Date.now();
      let removedCount = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        const age = now - entry.timestamp;
        const halfTTL = entry.ttl / 2;
        
        if (age > halfTTL) {
          this.cache.delete(key);
          removedCount++;
        }
      }
      
      console.log(`Cache optimization complete: removed ${removedCount} entries`);
    }
  }

  /**
   * Shutdown the cache service and cleanup resources
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    console.log('CacheService shutdown complete');
  }
}

// Initialize cache service when module is loaded
CacheService.initialize();