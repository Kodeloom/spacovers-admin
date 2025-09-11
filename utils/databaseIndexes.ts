/**
 * Database Index Management Utility
 * Provides index recommendations and management for performance optimization
 * 
 * Requirements: 9.1, 9.2 - Add proper database indexes for frequently queried fields
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';

/**
 * Interface for index recommendation
 */
export interface IndexRecommendation {
  tableName: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  sqlCommand: string;
}

/**
 * Interface for existing index information
 */
export interface ExistingIndex {
  tableName: string;
  indexName: string;
  columns: string[];
  indexType: string;
  isUnique: boolean;
  size: string;
}

/**
 * Database Index Management Service
 * Analyzes query patterns and provides index recommendations
 */
export class DatabaseIndexes {
  
  /**
   * Get recommended indexes for metrics performance optimization
   * Based on common query patterns in the metrics system
   */
  static getRecommendedIndexes(): IndexRecommendation[] {
    return [
      // Order table indexes for dashboard and reports
      {
        tableName: 'orders',
        columns: ['order_status'],
        indexType: 'btree',
        reason: 'Frequently used in dashboard status counts and filtering',
        priority: 'high',
        estimatedImpact: 'Significant improvement for dashboard queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders (order_status);'
      },
      {
        tableName: 'orders',
        columns: ['created_at'],
        indexType: 'btree',
        reason: 'Used in date range filtering for reports and revenue calculations',
        priority: 'high',
        estimatedImpact: 'Major improvement for time-based queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders (created_at);'
      },
      {
        tableName: 'orders',
        columns: ['created_at', 'order_status'],
        indexType: 'btree',
        reason: 'Composite index for filtered date range queries by status',
        priority: 'high',
        estimatedImpact: 'Optimal performance for filtered dashboard queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_status ON orders (created_at, order_status);'
      },
      {
        tableName: 'orders',
        columns: ['ready_to_ship_at'],
        indexType: 'btree',
        reason: 'Used in lead time calculations and shipping metrics',
        priority: 'medium',
        estimatedImpact: 'Improved lead time calculation performance',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_ready_to_ship_at ON orders (ready_to_ship_at) WHERE ready_to_ship_at IS NOT NULL;'
      },
      {
        tableName: 'orders',
        columns: ['total_amount'],
        indexType: 'btree',
        reason: 'Used in revenue aggregation queries',
        priority: 'medium',
        estimatedImpact: 'Faster revenue calculations',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_total_amount ON orders (total_amount) WHERE total_amount IS NOT NULL;'
      },

      // OrderItem table indexes for production metrics
      {
        tableName: 'order_items',
        columns: ['item_status'],
        indexType: 'btree',
        reason: 'Frequently used in production metrics and status counting',
        priority: 'high',
        estimatedImpact: 'Significant improvement for production status queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_status ON order_items (item_status);'
      },
      {
        tableName: 'order_items',
        columns: ['is_product'],
        indexType: 'btree',
        reason: 'Used to filter production items in all production metrics',
        priority: 'high',
        estimatedImpact: 'Essential for accurate production metrics filtering',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_is_product ON order_items (is_product);'
      },
      {
        tableName: 'order_items',
        columns: ['is_product', 'item_status'],
        indexType: 'btree',
        reason: 'Composite index for production item status queries',
        priority: 'high',
        estimatedImpact: 'Optimal performance for production metrics',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_status ON order_items (is_product, item_status);'
      },
      {
        tableName: 'order_items',
        columns: ['order_id'],
        indexType: 'btree',
        reason: 'Foreign key relationship for order-item joins',
        priority: 'medium',
        estimatedImpact: 'Improved join performance',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);'
      },

      // ItemProcessingLog table indexes for productivity metrics
      {
        tableName: 'item_processing_logs',
        columns: ['start_time'],
        indexType: 'btree',
        reason: 'Used in date range filtering for productivity reports',
        priority: 'high',
        estimatedImpact: 'Major improvement for productivity queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_start_time ON item_processing_logs (start_time);'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['user_id'],
        indexType: 'btree',
        reason: 'Used in employee productivity calculations',
        priority: 'high',
        estimatedImpact: 'Faster employee-specific queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_user_id ON item_processing_logs (user_id);'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['station_id'],
        indexType: 'btree',
        reason: 'Used in station-based productivity analysis',
        priority: 'medium',
        estimatedImpact: 'Improved station productivity queries',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_station_id ON item_processing_logs (station_id);'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['order_item_id'],
        indexType: 'btree',
        reason: 'Used for unique item counting in productivity metrics',
        priority: 'high',
        estimatedImpact: 'Essential for accurate unique item counting',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_order_item_id ON item_processing_logs (order_item_id);'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['start_time', 'user_id'],
        indexType: 'btree',
        reason: 'Composite index for user productivity in date ranges',
        priority: 'high',
        estimatedImpact: 'Optimal performance for employee productivity reports',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_time_user ON item_processing_logs (start_time, user_id);'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['end_time'],
        indexType: 'btree',
        reason: 'Used to filter completed processing logs',
        priority: 'medium',
        estimatedImpact: 'Better filtering of completed work',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_end_time ON item_processing_logs (end_time) WHERE end_time IS NOT NULL;'
      },
      {
        tableName: 'item_processing_logs',
        columns: ['duration_in_seconds'],
        indexType: 'btree',
        reason: 'Used in productivity time calculations',
        priority: 'medium',
        estimatedImpact: 'Faster duration-based aggregations',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processing_logs_duration ON item_processing_logs (duration_in_seconds) WHERE duration_in_seconds IS NOT NULL;'
      },

      // Customer table indexes for order filtering
      {
        tableName: 'customers',
        columns: ['status'],
        indexType: 'btree',
        reason: 'Used in customer filtering for reports',
        priority: 'low',
        estimatedImpact: 'Minor improvement for customer-based filtering',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_status ON customers (status);'
      },

      // User table indexes for productivity reports
      {
        tableName: 'users',
        columns: ['status'],
        indexType: 'btree',
        reason: 'Used to filter active users in productivity reports',
        priority: 'low',
        estimatedImpact: 'Better user filtering performance',
        sqlCommand: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status ON users (status);'
      }
    ];
  }

  /**
   * Get existing indexes from the database
   * Queries PostgreSQL system tables to get current index information
   */
  static async getExistingIndexes(): Promise<ExistingIndex[]> {
    try {
      const result = await prisma.$queryRaw<{
        table_name: string;
        index_name: string;
        column_names: string;
        index_type: string;
        is_unique: boolean;
        size: string;
      }[]>`
        SELECT 
          t.relname as table_name,
          i.relname as index_name,
          array_to_string(array_agg(a.attname ORDER BY a.attnum), ', ') as column_names,
          am.amname as index_type,
          ix.indisunique as is_unique,
          pg_size_pretty(pg_relation_size(i.oid)) as size
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
          AND t.relname IN ('orders', 'order_items', 'item_processing_logs', 'customers', 'users', 'stations')
          AND i.relname NOT LIKE 'pg_%'
        GROUP BY t.relname, i.relname, am.amname, ix.indisunique, i.oid
        ORDER BY t.relname, i.relname;
      `;

      return result.map(row => ({
        tableName: row.table_name,
        indexName: row.index_name,
        columns: row.column_names.split(', '),
        indexType: row.index_type,
        isUnique: row.is_unique,
        size: row.size
      }));
    } catch (error) {
      console.error('Error fetching existing indexes:', error);
      return [];
    }
  }

  /**
   * Analyze missing indexes by comparing recommendations with existing indexes
   */
  static async analyzeMissingIndexes(): Promise<{
    missing: IndexRecommendation[];
    existing: ExistingIndex[];
    recommendations: string[];
  }> {
    const [recommended, existing] = await Promise.all([
      Promise.resolve(this.getRecommendedIndexes()),
      this.getExistingIndexes()
    ]);

    // Create a set of existing index signatures for comparison
    const existingSignatures = new Set(
      existing.map(idx => `${idx.tableName}:${idx.columns.sort().join(',')}`
    ));

    // Find missing indexes
    const missing = recommended.filter(rec => {
      const signature = `${rec.tableName}:${rec.columns.sort().join(',')}`;
      return !existingSignatures.has(signature);
    });

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (missing.length === 0) {
      recommendations.push('✅ All recommended indexes are already present');
    } else {
      recommendations.push(`⚠️  Found ${missing.length} missing indexes that could improve performance`);
      
      const highPriority = missing.filter(idx => idx.priority === 'high');
      if (highPriority.length > 0) {
        recommendations.push(`🔴 ${highPriority.length} high-priority indexes missing - these should be created immediately`);
      }
      
      const mediumPriority = missing.filter(idx => idx.priority === 'medium');
      if (mediumPriority.length > 0) {
        recommendations.push(`🟡 ${mediumPriority.length} medium-priority indexes missing - consider creating during maintenance window`);
      }
      
      const lowPriority = missing.filter(idx => idx.priority === 'low');
      if (lowPriority.length > 0) {
        recommendations.push(`🟢 ${lowPriority.length} low-priority indexes missing - create when convenient`);
      }
    }

    return {
      missing,
      existing,
      recommendations
    };
  }

  /**
   * Generate SQL script to create all missing indexes
   */
  static async generateIndexCreationScript(): Promise<string> {
    const analysis = await this.analyzeMissingIndexes();
    
    if (analysis.missing.length === 0) {
      return '-- All recommended indexes already exist\n-- No action needed';
    }

    const script = [
      '-- Database Index Creation Script',
      '-- Generated for metrics performance optimization',
      '-- Run during maintenance window to avoid blocking operations',
      '',
      '-- Note: CONCURRENTLY option allows index creation without blocking writes',
      '-- but requires more time and cannot be run in a transaction',
      ''
    ];

    // Group by priority
    const byPriority = {
      high: analysis.missing.filter(idx => idx.priority === 'high'),
      medium: analysis.missing.filter(idx => idx.priority === 'medium'),
      low: analysis.missing.filter(idx => idx.priority === 'low')
    };

    for (const [priority, indexes] of Object.entries(byPriority)) {
      if (indexes.length === 0) continue;
      
      script.push(`-- ${priority.toUpperCase()} PRIORITY INDEXES`);
      script.push('');
      
      for (const idx of indexes) {
        script.push(`-- ${idx.reason}`);
        script.push(`-- Expected impact: ${idx.estimatedImpact}`);
        script.push(idx.sqlCommand);
        script.push('');
      }
    }

    script.push('-- Verify index creation with:');
    script.push('-- SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN (\'orders\', \'order_items\', \'item_processing_logs\');');

    return script.join('\n');
  }

  /**
   * Analyze query performance impact of missing indexes
   */
  static async analyzePerformanceImpact(): Promise<{
    criticalMissing: IndexRecommendation[];
    estimatedImprovements: string[];
    priorityActions: string[];
  }> {
    const analysis = await this.analyzeMissingIndexes();
    
    const criticalMissing = analysis.missing.filter(idx => 
      idx.priority === 'high' && 
      (idx.tableName === 'orders' || idx.tableName === 'item_processing_logs')
    );

    const estimatedImprovements: string[] = [];
    const priorityActions: string[] = [];

    if (criticalMissing.length > 0) {
      estimatedImprovements.push('🚀 Creating high-priority indexes could improve query performance by 50-90%');
      estimatedImprovements.push('📊 Dashboard load times could improve from 2-5 seconds to under 1 second');
      estimatedImprovements.push('📈 Report generation could improve from 10-30 seconds to 2-5 seconds');
      
      priorityActions.push('1. Create indexes on orders(created_at, order_status) immediately');
      priorityActions.push('2. Create indexes on item_processing_logs(start_time, user_id) for productivity queries');
      priorityActions.push('3. Create indexes on order_items(is_product, item_status) for production metrics');
    } else {
      estimatedImprovements.push('✅ Critical indexes are present - performance should be good');
      priorityActions.push('✅ No critical actions needed');
    }

    return {
      criticalMissing,
      estimatedImprovements,
      priorityActions
    };
  }

  /**
   * Monitor index usage and effectiveness
   */
  static async getIndexUsageStats(): Promise<{
    indexName: string;
    tableName: string;
    scans: number;
    tuplesRead: number;
    tuplesReturned: number;
    efficiency: number;
  }[]> {
    try {
      const result = await prisma.$queryRaw<{
        index_name: string;
        table_name: string;
        idx_scan: bigint;
        idx_tup_read: bigint;
        idx_tup_fetch: bigint;
      }[]>`
        SELECT 
          i.indexrelname as index_name,
          t.relname as table_name,
          s.idx_scan,
          s.idx_tup_read,
          s.idx_tup_fetch
        FROM pg_stat_user_indexes s
        JOIN pg_class i ON i.oid = s.indexrelid
        JOIN pg_class t ON t.oid = s.relid
        WHERE t.relname IN ('orders', 'order_items', 'item_processing_logs', 'customers', 'users')
          AND s.idx_scan > 0
        ORDER BY s.idx_scan DESC;
      `;

      return result.map(row => {
        const scans = Number(row.idx_scan);
        const tuplesRead = Number(row.idx_tup_read);
        const tuplesReturned = Number(row.idx_tup_fetch);
        const efficiency = tuplesRead > 0 ? (tuplesReturned / tuplesRead) * 100 : 0;

        return {
          indexName: row.index_name,
          tableName: row.table_name,
          scans,
          tuplesRead,
          tuplesReturned,
          efficiency: Math.round(efficiency * 100) / 100
        };
      });
    } catch (error) {
      console.error('Error fetching index usage stats:', error);
      return [];
    }
  }
}