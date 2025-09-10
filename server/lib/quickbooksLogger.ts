/**
 * Comprehensive logging utility for QuickBooks integration
 * Provides structured logging with different severity levels and error tracking
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
  userId?: string;
  companyId?: string;
  errorType?: string;
  stackTrace?: string;
}

export class QuickBooksLogger {
  private static logs: LogEntry[] = [];
  private static maxLogs = 1000; // Keep last 1000 log entries in memory

  /**
   * Log a message with specified level
   */
  static log(
    level: LogLevel,
    component: string,
    message: string,
    context?: any,
    userId?: string,
    companyId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component,
      message,
      context,
      userId,
      companyId
    };

    // Add to in-memory logs
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with appropriate level
    const logMessage = this.formatLogMessage(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, context);
        break;
      case LogLevel.INFO:
        console.log(logMessage, context);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, context);
        break;
    }
  }

  /**
   * Log debug information
   */
  static debug(component: string, message: string, context?: any, userId?: string, companyId?: string): void {
    this.log(LogLevel.DEBUG, component, message, context, userId, companyId);
  }

  /**
   * Log informational messages
   */
  static info(component: string, message: string, context?: any, userId?: string, companyId?: string): void {
    this.log(LogLevel.INFO, component, message, context, userId, companyId);
  }

  /**
   * Log warnings
   */
  static warn(component: string, message: string, context?: any, userId?: string, companyId?: string): void {
    this.log(LogLevel.WARN, component, message, context, userId, companyId);
  }

  /**
   * Log errors
   */
  static error(component: string, message: string, error?: any, userId?: string, companyId?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      component,
      message,
      context: error,
      userId,
      companyId,
      errorType: error?.type || error?.name,
      stackTrace: error?.stack
    };

    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.error(this.formatLogMessage(entry), error);
  }

  /**
   * Log critical errors that require immediate attention
   */
  static critical(component: string, message: string, error?: any, userId?: string, companyId?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: LogLevel.CRITICAL,
      component,
      message,
      context: error,
      userId,
      companyId,
      errorType: error?.type || error?.name,
      stackTrace: error?.stack
    };

    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.error(`🚨 CRITICAL: ${this.formatLogMessage(entry)}`, error);
  }

  /**
   * Format log message for console output
   */
  private static formatLogMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const userInfo = entry.userId ? ` [User: ${entry.userId}]` : '';
    const companyInfo = entry.companyId ? ` [Company: ${entry.companyId}]` : '';
    
    return `[${timestamp}] [${entry.level}] [${entry.component}]${userInfo}${companyInfo} ${entry.message}`;
  }

  /**
   * Get recent logs for debugging
   */
  static getRecentLogs(count: number = 50, level?: LogLevel, component?: string): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    return filteredLogs.slice(-count);
  }

  /**
   * Get error statistics
   */
  static getErrorStats(timeRangeMinutes: number = 60): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByComponent: Record<string, number>;
    criticalErrors: number;
  } {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const recentLogs = this.logs.filter(log => 
      log.timestamp >= cutoffTime && 
      (log.level === LogLevel.ERROR || log.level === LogLevel.CRITICAL)
    );

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};
    let criticalErrors = 0;

    recentLogs.forEach(log => {
      if (log.level === LogLevel.CRITICAL) {
        criticalErrors++;
      }

      if (log.errorType) {
        errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1;
      }

      errorsByComponent[log.component] = (errorsByComponent[log.component] || 0) + 1;
    });

    return {
      totalErrors: recentLogs.length,
      errorsByType,
      errorsByComponent,
      criticalErrors
    };
  }

  /**
   * Clear old logs (useful for memory management)
   */
  static clearOldLogs(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.logs.length;
    
    if (removedCount > 0) {
      this.info('QuickBooksLogger', `Cleared ${removedCount} old log entries`);
    }
    
    return removedCount;
  }

  /**
   * Log token refresh events with specific context
   */
  static logTokenRefresh(
    success: boolean,
    companyId: string,
    duration: number,
    error?: any,
    triggeredBy: 'scheduler' | 'api-call' | 'manual' = 'scheduler'
  ): void {
    const context = {
      companyId,
      duration,
      triggeredBy,
      success
    };

    if (success) {
      this.info('TokenRefresh', `Token refreshed successfully for company ${companyId} (${duration}ms)`, context, undefined, companyId);
    } else {
      this.error('TokenRefresh', `Token refresh failed for company ${companyId} after ${duration}ms`, error, undefined, companyId);
    }
  }

  /**
   * Log scheduler events
   */
  static logSchedulerEvent(
    event: 'started' | 'stopped' | 'check-started' | 'check-completed' | 'error',
    message: string,
    context?: any
  ): void {
    const level = event === 'error' ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'Scheduler', message, context);
  }

  /**
   * Log API request events
   */
  static logAPIRequest(
    endpoint: string,
    method: string,
    success: boolean,
    duration: number,
    companyId?: string,
    error?: any
  ): void {
    const context = {
      endpoint,
      method,
      duration,
      success,
      companyId
    };

    if (success) {
      this.debug('APIRequest', `${method} ${endpoint} completed successfully (${duration}ms)`, context, undefined, companyId);
    } else {
      this.error('APIRequest', `${method} ${endpoint} failed after ${duration}ms`, error, undefined, companyId);
    }
  }

  /**
   * Log connection/disconnection events for audit trail
   */
  static logConnectionEvent(
    event: 'connected' | 'disconnected' | 'reconnected',
    companyId: string,
    userId?: string,
    details?: any
  ): void {
    const context = {
      event,
      companyId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    };

    const message = `QuickBooks ${event} for company ${companyId}${userId ? ` by user ${userId}` : ''}`;
    
    this.info('ConnectionAudit', message, context, userId, companyId);
  }

  /**
   * Log scheduler health and performance metrics
   */
  static logSchedulerHealth(
    status: 'healthy' | 'degraded' | 'failed',
    metrics: {
      uptime?: number;
      lastCheckTime?: Date;
      checksCompleted?: number;
      checksFailed?: number;
      averageCheckDuration?: number;
      tokensRefreshed?: number;
      tokensExpired?: number;
    },
    error?: any
  ): void {
    const context = {
      status,
      metrics,
      timestamp: new Date().toISOString()
    };

    const message = `Scheduler health check: ${status}`;
    
    if (status === 'failed') {
      this.error('SchedulerHealth', message, error);
    } else if (status === 'degraded') {
      this.warn('SchedulerHealth', message, context);
    } else {
      this.info('SchedulerHealth', message, context);
    }
  }

  /**
   * Log performance metrics for monitoring
   */
  static logPerformanceMetrics(
    operation: string,
    metrics: {
      duration: number;
      success: boolean;
      retryCount?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
    companyId?: string
  ): void {
    const context = {
      operation,
      ...metrics,
      timestamp: new Date().toISOString()
    };

    const message = `Performance: ${operation} ${metrics.success ? 'succeeded' : 'failed'} in ${metrics.duration}ms`;
    
    if (metrics.success) {
      this.debug('Performance', message, context, undefined, companyId);
    } else {
      this.warn('Performance', message, context, undefined, companyId);
    }
  }

  /**
   * Get scheduler health statistics
   */
  static getSchedulerHealthStats(timeRangeMinutes: number = 60): {
    isHealthy: boolean;
    uptime: number;
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    averageCheckDuration: number;
    lastCheckTime?: Date;
    tokensRefreshed: number;
    tokensExpired: number;
    errorRate: number;
  } {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const schedulerLogs = this.logs.filter(log => 
      log.timestamp >= cutoffTime && 
      (log.component === 'Scheduler' || log.component === 'SchedulerHealth')
    );

    const checkLogs = schedulerLogs.filter(log => 
      log.message.includes('check completed') || log.message.includes('check failed')
    );

    const successfulChecks = checkLogs.filter(log => log.level === LogLevel.INFO).length;
    const failedChecks = checkLogs.filter(log => log.level === LogLevel.ERROR).length;
    const totalChecks = successfulChecks + failedChecks;

    const tokenRefreshLogs = this.logs.filter(log =>
      log.timestamp >= cutoffTime &&
      log.component === 'TokenRefresh' &&
      log.message.includes('refreshed successfully')
    );

    const tokenExpiredLogs = this.logs.filter(log =>
      log.timestamp >= cutoffTime &&
      log.component === 'TokenRefresh' &&
      log.message.includes('expired')
    );

    const durations = checkLogs
      .map(log => log.context?.duration)
      .filter(d => typeof d === 'number');
    
    const averageCheckDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;

    const lastCheckLog = schedulerLogs
      .filter(log => log.message.includes('check'))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    const errorRate = totalChecks > 0 ? (failedChecks / totalChecks) * 100 : 0;
    const isHealthy = errorRate < 10 && failedChecks < 3; // Less than 10% error rate and fewer than 3 failures

    return {
      isHealthy,
      uptime: timeRangeMinutes,
      totalChecks,
      successfulChecks,
      failedChecks,
      averageCheckDuration,
      lastCheckTime: lastCheckLog?.timestamp,
      tokensRefreshed: tokenRefreshLogs.length,
      tokensExpired: tokenExpiredLogs.length,
      errorRate
    };
  }

  /**
   * Get connection audit trail
   */
  static getConnectionAuditTrail(companyId?: string, timeRangeHours: number = 24): LogEntry[] {
    const cutoffTime = new Date(Date.now() - (timeRangeHours * 60 * 60 * 1000));
    
    return this.logs.filter(log => 
      log.timestamp >= cutoffTime &&
      log.component === 'ConnectionAudit' &&
      (!companyId || log.companyId === companyId)
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Check if alerting thresholds are exceeded
   */
  static checkAlertingThresholds(): {
    shouldAlert: boolean;
    alerts: Array<{
      type: 'critical' | 'warning' | 'info';
      message: string;
      details: any;
    }>;
  } {
    const alerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string; details: any }> = [];
    
    // Check error rates
    const errorStats = this.getErrorStats(60); // Last hour
    if (errorStats.criticalErrors > 0) {
      alerts.push({
        type: 'critical',
        message: `${errorStats.criticalErrors} critical errors in the last hour`,
        details: errorStats
      });
    }
    
    if (errorStats.totalErrors > 10) {
      alerts.push({
        type: 'warning',
        message: `High error rate: ${errorStats.totalErrors} errors in the last hour`,
        details: errorStats
      });
    }

    // Check scheduler health
    const schedulerHealth = this.getSchedulerHealthStats(60);
    if (!schedulerHealth.isHealthy) {
      alerts.push({
        type: 'warning',
        message: `Scheduler health degraded: ${schedulerHealth.errorRate.toFixed(1)}% error rate`,
        details: schedulerHealth
      });
    }

    // Check if scheduler hasn't run recently
    if (schedulerHealth.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - schedulerHealth.lastCheckTime.getTime();
      const minutesSinceLastCheck = timeSinceLastCheck / (1000 * 60);
      
      if (minutesSinceLastCheck > 45) { // Should run every 30 minutes
        alerts.push({
          type: 'critical',
          message: `Scheduler hasn't run for ${Math.round(minutesSinceLastCheck)} minutes`,
          details: { lastCheckTime: schedulerHealth.lastCheckTime, minutesSinceLastCheck }
        });
      }
    }

    // Check for expired tokens
    if (schedulerHealth.tokensExpired > 0) {
      alerts.push({
        type: 'warning',
        message: `${schedulerHealth.tokensExpired} tokens expired in the last hour`,
        details: { tokensExpired: schedulerHealth.tokensExpired }
      });
    }

    return {
      shouldAlert: alerts.some(alert => alert.type === 'critical') || alerts.length > 3,
      alerts
    };
  }
}