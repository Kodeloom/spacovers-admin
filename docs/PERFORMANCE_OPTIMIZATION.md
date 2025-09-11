# Performance Optimization Documentation

This document describes the performance optimizations implemented for the warehouse scanning system metrics.

## Overview

The performance optimization implementation includes three main components:

1. **Database Indexes** - Optimized database queries with proper indexing
2. **Query Result Caching** - In-memory caching for expensive calculations
3. **Optimized Database Queries** - Efficient aggregation functions and query patterns

## Database Indexes

### Added Indexes

The following indexes have been added to improve query performance:

#### Orders Table
- `idx_orders_created_at` - For date-based filtering
- `idx_orders_order_status` - For status-based filtering
- `idx_orders_customer_id` - For customer-based filtering
- `idx_orders_priority` - For priority-based filtering
- `idx_orders_ready_to_ship_at` - For lead time calculations
- `idx_orders_status_created` - Composite index for status and date queries
- `idx_orders_complex_metrics` - Composite index for complex metrics queries
- `idx_orders_active_status` - Partial index for active orders only

#### OrderItem Table
- `idx_order_items_item_status` - For production metrics
- `idx_order_items_order_id` - For order-item relationships
- `idx_order_items_created_at` - For date-based filtering
- `idx_order_items_status_order` - Composite index for status and order queries

#### ItemProcessingLog Table
- `idx_item_processing_logs_start_time` - For productivity metrics
- `idx_item_processing_logs_end_time` - For completed processing logs
- `idx_item_processing_logs_user_id` - For user-based productivity
- `idx_item_processing_logs_station_id` - For station-based productivity
- `idx_item_processing_logs_duration` - For duration-based queries
- `idx_item_processing_logs_user_start` - Composite index for user productivity
- `idx_item_processing_logs_station_start` - Composite index for station productivity
- `idx_processing_logs_completed` - Partial index for completed logs only

#### Status Log Tables
- Indexes for timestamp-based queries and status tracking
- Composite indexes for efficient audit trail queries

### Migration

To apply the database indexes, run the migration:

```bash
npx prisma migrate deploy
```

## Caching System

### Cache Service (`utils/cacheService.ts`)

The caching system provides:

- **In-memory caching** with TTL (Time To Live) support
- **Automatic cleanup** of expired entries
- **Cache statistics** for monitoring hit rates
- **Pattern-based invalidation** for targeted cache clearing

#### Cache TTL Configuration

- Dashboard Metrics: 2 minutes
- Orders Metrics: 1 minute
- Reports Metrics: 5 minutes
- Productivity Data: 10 minutes
- Revenue Data: 15 minutes
- Lead Time Data: 30 minutes

#### Usage Example

```typescript
import { CacheService } from '~/utils/cacheService';

// Get cached data
const cachedData = CacheService.get<DashboardMetrics>('dashboard:metrics');

// Set cached data
CacheService.set('dashboard:metrics', data, 120000); // 2 minutes TTL

// Invalidate cache pattern
CacheService.invalidatePattern('dashboard');
```

### Cache Invalidation (`utils/cacheInvalidation.ts`)

Automatic cache invalidation when data changes:

```typescript
import { CacheInvalidationService } from '~/utils/cacheInvalidation';

// Invalidate when orders change
CacheInvalidationService.invalidateOrderCaches('update', orderId);

// Invalidate when processing logs change
CacheInvalidationService.invalidateProcessingCaches('create');
```

## Optimized Queries

### Optimized Query Service (`utils/optimizedQueries.ts`)

Provides efficient database queries using:

- **Aggregation functions** instead of multiple queries
- **Batch operations** for related data
- **Proper joins** with minimal data transfer
- **Raw SQL** for complex date operations

#### Key Optimizations

1. **Single Aggregation Queries**: Instead of multiple separate queries, use single queries with aggregations
2. **Batch Data Loading**: Load related data (users, stations) in batch queries
3. **Efficient Grouping**: Use database-level groupBy operations
4. **Raw SQL for Performance**: Use raw SQL for complex date truncation and aggregation

#### Example: Dashboard Metrics

```typescript
// Before: Multiple separate queries
const totalOrders = await prisma.order.count();
const revenue = await prisma.order.aggregate({ _sum: { totalAmount: true } });
// ... more queries

// After: Single optimized query
const [totalOrdersResult, revenueResult, statusCounts] = await Promise.all([
  prisma.order.count(),
  prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: { /* date filters */ }
  }),
  prisma.order.groupBy({
    by: ['orderStatus'],
    _count: { id: true }
  })
]);
```

## Performance Monitoring

### Performance Monitor (`utils/performanceMonitor.ts`)

Tracks query performance and provides optimization recommendations:

- **Query execution time tracking**
- **Cache hit rate monitoring**
- **Slow query detection**
- **Performance recommendations**

#### Usage

```typescript
import { PerformanceMonitor } from '~/utils/performanceMonitor';

// Track query performance
const trackedFunction = PerformanceMonitor.trackPerformance(
  'dashboard_metrics',
  () => MetricsService.getDashboardMetrics()
);

// Get performance metrics
const metrics = PerformanceMonitor.getPerformanceMetrics(60); // Last 60 minutes
```

### Performance API Endpoints

#### GET `/api/metrics/performance`

Returns performance metrics and cache statistics:

```json
{
  "success": true,
  "data": {
    "performance": {
      "averageExecutionTime": 150,
      "totalQueries": 45,
      "cacheHitRate": 75.5,
      "recommendations": ["Cache performance is good"]
    },
    "cache": {
      "hits": 34,
      "misses": 11,
      "entries": 12,
      "hitRate": 75.5
    }
  }
}
```

#### POST `/api/cache/manage`

Provides cache management operations:

```json
{
  "action": "clear|invalidate|warmup|cleanup|stats",
  "pattern": "dashboard" // for invalidate action
}
```

## Integration with Metrics Service

The MetricsService has been updated to use the optimization features:

1. **Cache-First Approach**: Check cache before executing queries
2. **Optimized Queries**: Use OptimizedQueries service for better performance
3. **Performance Tracking**: All metrics queries are tracked for monitoring
4. **Automatic Cache Management**: Cache results with appropriate TTL

### Updated Methods

- `getDashboardMetrics()` - Uses caching and optimized queries
- `getOrdersPageMetrics()` - Uses caching with filter-based cache keys
- `getReportsMetrics()` - Uses caching with date-range-based cache keys

## Performance Benefits

### Expected Improvements

1. **Query Performance**: 50-80% reduction in query execution time
2. **Cache Hit Rate**: 70-90% cache hit rate for frequently accessed data
3. **Database Load**: Significant reduction in database queries
4. **Response Time**: Faster API response times for cached data

### Monitoring

Use the performance monitoring endpoints to track:

- Query execution times
- Cache hit rates
- Slow query identification
- Performance trends over time

## Best Practices

### For Developers

1. **Use Caching**: Always check cache before expensive operations
2. **Invalidate Appropriately**: Invalidate cache when data changes
3. **Monitor Performance**: Use performance tracking for new queries
4. **Optimize Queries**: Use aggregation functions instead of multiple queries

### For System Administrators

1. **Monitor Cache Performance**: Check cache hit rates regularly
2. **Database Maintenance**: Ensure indexes are being used effectively
3. **Performance Alerts**: Set up alerts for slow queries
4. **Regular Cleanup**: Perform regular cache cleanup and maintenance

## Troubleshooting

### Common Issues

1. **Low Cache Hit Rate**: Check TTL settings and cache invalidation patterns
2. **Slow Queries**: Review database indexes and query optimization
3. **Memory Usage**: Monitor cache size and implement cleanup if needed
4. **Cache Invalidation**: Ensure proper cache invalidation on data changes

### Debug Tools

- Performance monitoring API: `/api/metrics/performance`
- Cache management API: `/api/cache/manage`
- Database query analysis through performance monitor
- Cache statistics and recommendations

## Future Enhancements

Potential future optimizations:

1. **Redis Caching**: Move from in-memory to Redis for distributed caching
2. **Query Result Streaming**: For large datasets
3. **Database Connection Pooling**: Optimize database connections
4. **CDN Integration**: Cache static metric data at CDN level
5. **Background Processing**: Move heavy calculations to background jobs