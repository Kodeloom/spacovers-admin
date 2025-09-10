/**
 * API endpoint to get QuickBooks integration logs
 * Supports filtering by component, level, and time range
 */

import { QuickBooksLogger, LogLevel } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    
    // Parse query parameters
    const count = Math.min(parseInt(query.count as string) || 50, 500); // Max 500 logs
    const level = query.level as LogLevel;
    const component = query.component as string;
    
    // Get logs with filters
    const logs = QuickBooksLogger.getRecentLogs(count, level, component);
    
    // Get error statistics
    const errorStats = QuickBooksLogger.getErrorStats(60);
    
    return {
      success: true,
      data: {
        logs,
        errorStats,
        filters: {
          count,
          level: level || 'all',
          component: component || 'all'
        },
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Failed to get logs:', error);
    
    return {
      success: false,
      error: {
        message: 'Failed to retrieve logs',
        details: error.message
      }
    };
  }
});