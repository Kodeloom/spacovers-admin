/**
 * API endpoint to get QuickBooks integration alerts and alert rules
 * Returns current alert status and configuration
 */

import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const monitor = QuickBooksMonitor.getInstance();
    
    // Get current alert rules
    const alertRules = monitor.getAlertRules();
    
    // Check current alert conditions
    const alertStatus = QuickBooksLogger.checkAlertingThresholds();
    
    // Get recent alert logs
    const recentAlerts = QuickBooksLogger.getRecentLogs(50, undefined, 'Alert');
    
    return {
      success: true,
      data: {
        alertRules,
        currentStatus: alertStatus,
        recentAlerts,
        summary: {
          totalRules: alertRules.length,
          enabledRules: alertRules.filter(rule => rule.enabled).length,
          shouldAlert: alertStatus.shouldAlert,
          activeAlerts: alertStatus.alerts.length
        },
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Failed to get alerts:', error);
    
    return {
      success: false,
      error: {
        message: 'Failed to retrieve alerts',
        details: error.message
      }
    };
  }
});