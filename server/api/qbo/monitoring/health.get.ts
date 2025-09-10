/**
 * API endpoint to get QuickBooks integration health status
 * Returns comprehensive health information for monitoring dashboards
 */

import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const monitor = QuickBooksMonitor.getInstance();
    
    // Get current health status
    let health = monitor.getCurrentHealth();
    
    // If no health data available, perform a health check
    if (!health) {
      health = await monitor.performHealthCheck();
    }
    
    // Get additional monitoring stats
    const monitoringStats = monitor.getMonitoringStats();
    const schedulerStats = QuickBooksLogger.getSchedulerHealthStats(60);
    const errorStats = QuickBooksLogger.getErrorStats(60);
    
    return {
      success: true,
      data: {
        health,
        monitoring: monitoringStats,
        scheduler: schedulerStats,
        errors: errorStats,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    QuickBooksLogger.error('HealthAPI', 'Failed to get health status', error);
    
    return {
      success: false,
      error: {
        message: 'Failed to retrieve health status',
        details: error.message
      }
    };
  }
});