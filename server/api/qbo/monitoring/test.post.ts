/**
 * API endpoint to run QuickBooks monitoring system tests
 * This endpoint allows administrators to verify that all monitoring components are working correctly
 */

import { runQuickBooksMonitoringTests } from '~/server/utils/testQuickBooksMonitoring';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    QuickBooksLogger.info('MonitoringTest', 'Starting QuickBooks monitoring system tests...');
    
    const testReport = await runQuickBooksMonitoringTests();
    
    QuickBooksLogger.info('MonitoringTest', 'QuickBooks monitoring system tests completed');
    
    return {
      success: true,
      data: {
        report: testReport,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    QuickBooksLogger.error('MonitoringTest', 'Failed to run monitoring tests', error);
    
    return {
      success: false,
      error: {
        message: 'Failed to run monitoring tests',
        details: error.message
      }
    };
  }
});