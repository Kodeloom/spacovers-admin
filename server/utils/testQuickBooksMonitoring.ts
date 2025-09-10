/**
 * Test utility for QuickBooks monitoring and logging functionality
 * This can be used to verify that all monitoring components are working correctly
 */

import { QuickBooksLogger, LogLevel } from '~/server/lib/quickbooksLogger';
import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';
import { QuickBooksErrorHandler, QuickBooksErrorType } from '~/server/lib/quickbooksErrorHandler';

export class QuickBooksMonitoringTest {
  /**
   * Run comprehensive monitoring tests
   */
  static async runTests(): Promise<{
    success: boolean;
    results: Array<{ test: string; passed: boolean; message: string }>;
  }> {
    const results: Array<{ test: string; passed: boolean; message: string }> = [];

    try {
      // Test 1: Logger functionality
      results.push(await this.testLogger());

      // Test 2: Error handler functionality
      results.push(await this.testErrorHandler());

      // Test 3: Monitor health checks
      results.push(await this.testMonitorHealthChecks());

      // Test 4: Alert system
      results.push(await this.testAlertSystem());

      // Test 5: Performance metrics
      results.push(await this.testPerformanceMetrics());

      // Test 6: Audit trail
      results.push(await this.testAuditTrail());

      const allPassed = results.every(result => result.passed);

      return {
        success: allPassed,
        results
      };

    } catch (error) {
      results.push({
        test: 'Overall Test Execution',
        passed: false,
        message: `Test execution failed: ${error.message}`
      });

      return {
        success: false,
        results
      };
    }
  }

  /**
   * Test logger functionality
   */
  private static async testLogger(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      // Test different log levels
      QuickBooksLogger.debug('Test', 'Debug message test');
      QuickBooksLogger.info('Test', 'Info message test');
      QuickBooksLogger.warn('Test', 'Warning message test');
      QuickBooksLogger.error('Test', 'Error message test', new Error('Test error'));

      // Test specialized logging methods
      QuickBooksLogger.logTokenRefresh(true, 'test-company', 1000, undefined, 'manual');
      QuickBooksLogger.logSchedulerEvent('check-completed', 'Test scheduler event');
      QuickBooksLogger.logConnectionEvent('connected', 'test-company', 'test-user');
      QuickBooksLogger.logPerformanceMetrics('test-operation', {
        duration: 500,
        success: true
      });

      // Test log retrieval
      const recentLogs = QuickBooksLogger.getRecentLogs(10);
      const errorStats = QuickBooksLogger.getErrorStats(60);
      const schedulerStats = QuickBooksLogger.getSchedulerHealthStats(60);

      if (recentLogs.length === 0) {
        return {
          test: 'Logger Functionality',
          passed: false,
          message: 'No logs were created or retrieved'
        };
      }

      return {
        test: 'Logger Functionality',
        passed: true,
        message: `Logger working correctly. Created ${recentLogs.length} log entries.`
      };

    } catch (error) {
      return {
        test: 'Logger Functionality',
        passed: false,
        message: `Logger test failed: ${error.message}`
      };
    }
  }

  /**
   * Test error handler functionality
   */
  private static async testErrorHandler(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      // Test error creation
      const testError = new Error('Test error message');
      const qbError = QuickBooksErrorHandler.createError(testError, 'test-context');

      if (!qbError.type || !qbError.userMessage || !qbError.timestamp) {
        return {
          test: 'Error Handler',
          passed: false,
          message: 'Error handler did not create proper error structure'
        };
      }

      // Test error recovery
      const recoveryResult = await QuickBooksErrorHandler.handleErrorWithRecovery(
        async () => {
          throw new Error('Test recovery error');
        },
        'test-recovery',
        1,
        100
      );

      if (recoveryResult.success) {
        return {
          test: 'Error Handler',
          passed: false,
          message: 'Error recovery should have failed but reported success'
        };
      }

      // Test recovery suggestions
      const suggestions = QuickBooksErrorHandler.getRecoverySuggestions(QuickBooksErrorType.NETWORK_ERROR);
      
      if (!suggestions || suggestions.length === 0) {
        return {
          test: 'Error Handler',
          passed: false,
          message: 'No recovery suggestions provided'
        };
      }

      return {
        test: 'Error Handler',
        passed: true,
        message: 'Error handler working correctly with proper error structure and recovery'
      };

    } catch (error) {
      return {
        test: 'Error Handler',
        passed: false,
        message: `Error handler test failed: ${error.message}`
      };
    }
  }

  /**
   * Test monitor health checks
   */
  private static async testMonitorHealthChecks(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      const monitor = QuickBooksMonitor.getInstance();
      
      // Perform health check
      const health = await monitor.performHealthCheck();
      
      if (!health || !health.overall || !health.components) {
        return {
          test: 'Monitor Health Checks',
          passed: false,
          message: 'Health check did not return proper structure'
        };
      }

      if (health.components.length === 0) {
        return {
          test: 'Monitor Health Checks',
          passed: false,
          message: 'No health check components found'
        };
      }

      // Check that all required components are present
      const requiredComponents = ['Database', 'Scheduler', 'Tokens', 'ErrorRates'];
      const componentNames = health.components.map(c => c.component);
      const missingComponents = requiredComponents.filter(comp => !componentNames.includes(comp));

      if (missingComponents.length > 0) {
        return {
          test: 'Monitor Health Checks',
          passed: false,
          message: `Missing health check components: ${missingComponents.join(', ')}`
        };
      }

      return {
        test: 'Monitor Health Checks',
        passed: true,
        message: `Health checks working correctly. Overall status: ${health.overall}, Components: ${health.components.length}`
      };

    } catch (error) {
      return {
        test: 'Monitor Health Checks',
        passed: false,
        message: `Monitor health check test failed: ${error.message}`
      };
    }
  }

  /**
   * Test alert system
   */
  private static async testAlertSystem(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      const monitor = QuickBooksMonitor.getInstance();
      
      // Get current alert rules
      const alertRules = monitor.getAlertRules();
      
      if (!alertRules || alertRules.length === 0) {
        return {
          test: 'Alert System',
          passed: false,
          message: 'No alert rules found'
        };
      }

      // Test adding a custom alert rule
      const testRule = {
        id: 'test-rule',
        name: 'Test Alert Rule',
        condition: () => false, // Never trigger
        severity: 'info' as const,
        message: 'Test alert message',
        enabled: true
      };

      monitor.addAlertRule(testRule);
      
      const updatedRules = monitor.getAlertRules();
      const testRuleExists = updatedRules.some(rule => rule.id === 'test-rule');
      
      if (!testRuleExists) {
        return {
          test: 'Alert System',
          passed: false,
          message: 'Failed to add test alert rule'
        };
      }

      // Test removing the rule
      const removed = monitor.removeAlertRule('test-rule');
      
      if (!removed) {
        return {
          test: 'Alert System',
          passed: false,
          message: 'Failed to remove test alert rule'
        };
      }

      // Test alert threshold checking
      const alertStatus = QuickBooksLogger.checkAlertingThresholds();
      
      if (!alertStatus || typeof alertStatus.shouldAlert !== 'boolean' || !Array.isArray(alertStatus.alerts)) {
        return {
          test: 'Alert System',
          passed: false,
          message: 'Alert threshold checking returned invalid structure'
        };
      }

      return {
        test: 'Alert System',
        passed: true,
        message: `Alert system working correctly. ${alertRules.length} default rules, threshold checking functional`
      };

    } catch (error) {
      return {
        test: 'Alert System',
        passed: false,
        message: `Alert system test failed: ${error.message}`
      };
    }
  }

  /**
   * Test performance metrics
   */
  private static async testPerformanceMetrics(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      // Log some performance metrics
      QuickBooksLogger.logPerformanceMetrics('test-operation-1', {
        duration: 100,
        success: true
      });

      QuickBooksLogger.logPerformanceMetrics('test-operation-2', {
        duration: 250,
        success: false,
        retryCount: 2
      });

      // Get recent logs to verify performance metrics were logged
      const recentLogs = QuickBooksLogger.getRecentLogs(20, undefined, 'Performance');
      
      if (recentLogs.length === 0) {
        return {
          test: 'Performance Metrics',
          passed: false,
          message: 'No performance metrics were logged'
        };
      }

      // Verify log structure
      const performanceLog = recentLogs[0];
      if (!performanceLog.context || typeof performanceLog.context.duration !== 'number') {
        return {
          test: 'Performance Metrics',
          passed: false,
          message: 'Performance metrics do not have proper structure'
        };
      }

      return {
        test: 'Performance Metrics',
        passed: true,
        message: `Performance metrics working correctly. Logged ${recentLogs.length} performance entries`
      };

    } catch (error) {
      return {
        test: 'Performance Metrics',
        passed: false,
        message: `Performance metrics test failed: ${error.message}`
      };
    }
  }

  /**
   * Test audit trail functionality
   */
  private static async testAuditTrail(): Promise<{ test: string; passed: boolean; message: string }> {
    try {
      // Log some connection events
      QuickBooksLogger.logConnectionEvent('connected', 'test-company-1', 'test-user-1');
      QuickBooksLogger.logConnectionEvent('disconnected', 'test-company-1', 'test-user-1');
      QuickBooksLogger.logConnectionEvent('reconnected', 'test-company-2', 'test-user-2');

      // Get audit trail
      const auditTrail = QuickBooksLogger.getConnectionAuditTrail(undefined, 1);
      
      if (auditTrail.length === 0) {
        return {
          test: 'Audit Trail',
          passed: false,
          message: 'No audit trail entries found'
        };
      }

      // Verify audit trail structure
      const auditEntry = auditTrail[0];
      if (!auditEntry.context || !auditEntry.context.event || !auditEntry.companyId) {
        return {
          test: 'Audit Trail',
          passed: false,
          message: 'Audit trail entries do not have proper structure'
        };
      }

      // Test filtering by company
      const companyAuditTrail = QuickBooksLogger.getConnectionAuditTrail('test-company-1', 1);
      const hasCorrectCompany = companyAuditTrail.every(entry => entry.companyId === 'test-company-1');
      
      if (!hasCorrectCompany) {
        return {
          test: 'Audit Trail',
          passed: false,
          message: 'Audit trail filtering by company is not working correctly'
        };
      }

      return {
        test: 'Audit Trail',
        passed: true,
        message: `Audit trail working correctly. ${auditTrail.length} total entries, filtering functional`
      };

    } catch (error) {
      return {
        test: 'Audit Trail',
        passed: false,
        message: `Audit trail test failed: ${error.message}`
      };
    }
  }

  /**
   * Generate test report
   */
  static generateTestReport(results: { success: boolean; results: Array<{ test: string; passed: boolean; message: string }> }): string {
    const { success, results: testResults } = results;
    
    let report = '\n=== QuickBooks Monitoring Test Report ===\n\n';
    report += `Overall Status: ${success ? 'PASSED' : 'FAILED'}\n`;
    report += `Tests Run: ${testResults.length}\n`;
    report += `Passed: ${testResults.filter(r => r.passed).length}\n`;
    report += `Failed: ${testResults.filter(r => !r.passed).length}\n\n`;
    
    report += 'Detailed Results:\n';
    report += '-'.repeat(50) + '\n';
    
    testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `${index + 1}. ${result.test}: ${status}\n`;
      report += `   ${result.message}\n\n`;
    });
    
    return report;
  }
}

/**
 * Utility function to run monitoring tests from API or console
 */
export async function runQuickBooksMonitoringTests(): Promise<string> {
  const results = await QuickBooksMonitoringTest.runTests();
  const report = QuickBooksMonitoringTest.generateTestReport(results);
  
  console.log(report);
  return report;
}