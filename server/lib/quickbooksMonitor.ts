/**
 * QuickBooks Integration Monitoring Service
 * Provides comprehensive monitoring, health checks, and alerting for the QuickBooks integration
 */

import { QuickBooksLogger, LogLevel } from './quickbooksLogger';
import { QuickBooksErrorHandler, QuickBooksErrorType } from './quickbooksErrorHandler';
import { getEnhancedPrismaClient } from './db';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'failed';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'failed';
  components: HealthCheckResult[];
  uptime: number;
  lastUpdated: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  enabled: boolean;
}

export class QuickBooksMonitor {
  private static instance: QuickBooksMonitor | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private lastHealthCheck: Date | null = null;
  private currentHealth: SystemHealth | null = null;

  // Default alert rules
  private alertRules: AlertRule[] = [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorRate > 10,
      severity: 'warning',
      message: 'Error rate exceeded 10% in the last hour',
      enabled: true
    },
    {
      id: 'critical-errors',
      name: 'Critical Errors',
      condition: (metrics) => metrics.criticalErrors > 0,
      severity: 'critical',
      message: 'Critical errors detected',
      enabled: true
    },
    {
      id: 'scheduler-down',
      name: 'Scheduler Not Running',
      condition: (metrics) => {
        if (!metrics.lastCheckTime) return true;
        const minutesSinceLastCheck = (Date.now() - metrics.lastCheckTime.getTime()) / (1000 * 60);
        return minutesSinceLastCheck > 45; // Should run every 30 minutes
      },
      severity: 'critical',
      message: 'Token refresh scheduler has not run recently',
      enabled: true
    },
    {
      id: 'scheduler-unhealthy',
      name: 'Scheduler Unhealthy',
      condition: (metrics) => !metrics.isHealthy,
      severity: 'warning',
      message: 'Token refresh scheduler health is degraded',
      enabled: true
    },
    {
      id: 'multiple-token-failures',
      name: 'Multiple Token Refresh Failures',
      condition: (metrics) => metrics.failedChecks > 3,
      severity: 'warning',
      message: 'Multiple token refresh failures detected',
      enabled: true
    },
    {
      id: 'expired-tokens',
      name: 'Expired Tokens',
      condition: (metrics) => metrics.tokensExpired > 0,
      severity: 'warning',
      message: 'Tokens have expired and require reconnection',
      enabled: true
    }
  ];

  private constructor() {
    this.startTime = new Date();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): QuickBooksMonitor {
    if (!this.instance) {
      this.instance = new QuickBooksMonitor();
    }
    return this.instance;
  }

  /**
   * Start monitoring services
   */
  start(): void {
    QuickBooksLogger.info('Monitor', 'Starting QuickBooks monitoring services...');

    // Start health check monitoring (every 5 minutes)
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        QuickBooksLogger.error('Monitor', 'Health check failed', error);
      });
    }, 5 * 60 * 1000);

    // Start alert checking (every 2 minutes)
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts().catch(error => {
        QuickBooksLogger.error('Monitor', 'Alert check failed', error);
      });
    }, 2 * 60 * 1000);

    // Perform initial health check
    setTimeout(() => {
      this.performHealthCheck().catch(error => {
        QuickBooksLogger.error('Monitor', 'Initial health check failed', error);
      });
    }, 10000); // Wait 10 seconds after startup

    QuickBooksLogger.info('Monitor', 'QuickBooks monitoring services started successfully');
  }

  /**
   * Stop monitoring services
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }

    QuickBooksLogger.info('Monitor', 'QuickBooks monitoring services stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const components: HealthCheckResult[] = [];

    try {
      // Check database connectivity
      const dbHealth = await this.checkDatabaseHealth();
      components.push(dbHealth);

      // Check scheduler health
      const schedulerHealth = await this.checkSchedulerHealth();
      components.push(schedulerHealth);

      // Check token health
      const tokenHealth = await this.checkTokenHealth();
      components.push(tokenHealth);

      // Check error rates
      const errorHealth = await this.checkErrorRates();
      components.push(errorHealth);

      // Determine overall health
      const failedComponents = components.filter(c => c.status === 'failed');
      const degradedComponents = components.filter(c => c.status === 'degraded');

      let overall: 'healthy' | 'degraded' | 'failed';
      if (failedComponents.length > 0) {
        overall = 'failed';
      } else if (degradedComponents.length > 0) {
        overall = 'degraded';
      } else {
        overall = 'healthy';
      }

      const health: SystemHealth = {
        overall,
        components,
        uptime: Date.now() - this.startTime.getTime(),
        lastUpdated: new Date()
      };

      this.currentHealth = health;
      this.lastHealthCheck = new Date();

      const duration = Date.now() - startTime;
      QuickBooksLogger.logSchedulerHealth(overall, {
        uptime: health.uptime,
        lastCheckTime: health.lastUpdated,
        checksCompleted: 1,
        checksFailed: failedComponents.length,
        averageCheckDuration: duration
      });

      return health;

    } catch (error) {
      const errorResult: HealthCheckResult = {
        component: 'HealthCheck',
        status: 'failed',
        message: 'Health check system failed',
        details: { error: error.message },
        timestamp: new Date()
      };

      const health: SystemHealth = {
        overall: 'failed',
        components: [errorResult],
        uptime: Date.now() - this.startTime.getTime(),
        lastUpdated: new Date()
      };

      this.currentHealth = health;
      QuickBooksLogger.error('Monitor', 'Health check system failed', error);
      
      return health;
    }
  }

  /**
   * Check database connectivity and health
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const { unenhancedPrisma: prisma } = await import('./db');
      
      // Simple connectivity test
      await prisma.$queryRaw`SELECT 1`;
      
      const duration = Date.now() - startTime;
      
      return {
        component: 'Database',
        status: duration < 1000 ? 'healthy' : 'degraded',
        message: `Database responsive in ${duration}ms`,
        details: { responseTime: duration },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        component: 'Database',
        status: 'failed',
        message: 'Database connection failed',
        details: { error: error.message },
        timestamp: new Date()
      };
    }
  }

  /**
   * Check scheduler health and performance
   */
  private async checkSchedulerHealth(): Promise<HealthCheckResult> {
    const schedulerStats = QuickBooksLogger.getSchedulerHealthStats(60);
    
    if (!schedulerStats.lastCheckTime) {
      return {
        component: 'Scheduler',
        status: 'failed',
        message: 'Scheduler has never run',
        details: schedulerStats,
        timestamp: new Date()
      };
    }

    const minutesSinceLastCheck = (Date.now() - schedulerStats.lastCheckTime.getTime()) / (1000 * 60);
    
    if (minutesSinceLastCheck > 45) {
      return {
        component: 'Scheduler',
        status: 'failed',
        message: `Scheduler hasn't run for ${Math.round(minutesSinceLastCheck)} minutes`,
        details: { ...schedulerStats, minutesSinceLastCheck },
        timestamp: new Date()
      };
    }

    if (!schedulerStats.isHealthy) {
      return {
        component: 'Scheduler',
        status: 'degraded',
        message: `Scheduler health degraded (${schedulerStats.errorRate.toFixed(1)}% error rate)`,
        details: schedulerStats,
        timestamp: new Date()
      };
    }

    return {
      component: 'Scheduler',
      status: 'healthy',
      message: `Scheduler healthy (${schedulerStats.successfulChecks}/${schedulerStats.totalChecks} checks successful)`,
      details: schedulerStats,
      timestamp: new Date()
    };
  }

  /**
   * Check token health across all integrations
   */
  private async checkTokenHealth(): Promise<HealthCheckResult> {
    try {
      const { unenhancedPrisma: prisma } = await import('./db');
      
      const activeIntegrations = await prisma.quickBooksIntegration?.findMany({
        where: { isActive: true }
      }) || [];

      if (activeIntegrations.length === 0) {
        return {
          component: 'Tokens',
          status: 'healthy',
          message: 'No active integrations',
          details: { activeIntegrations: 0 },
          timestamp: new Date()
        };
      }

      const now = new Date();
      const expiringSoon = activeIntegrations.filter(integration => {
        const timeUntilExpiry = integration.accessTokenExpiresAt.getTime() - now.getTime();
        return timeUntilExpiry < (10 * 60 * 1000); // Less than 10 minutes
      });

      const expired = activeIntegrations.filter(integration => 
        integration.refreshTokenExpiresAt <= now
      );

      if (expired.length > 0) {
        return {
          component: 'Tokens',
          status: 'failed',
          message: `${expired.length} integration(s) have expired refresh tokens`,
          details: { 
            total: activeIntegrations.length, 
            expired: expired.length,
            expiringSoon: expiringSoon.length 
          },
          timestamp: new Date()
        };
      }

      if (expiringSoon.length > 0) {
        return {
          component: 'Tokens',
          status: 'degraded',
          message: `${expiringSoon.length} token(s) expiring soon`,
          details: { 
            total: activeIntegrations.length, 
            expired: expired.length,
            expiringSoon: expiringSoon.length 
          },
          timestamp: new Date()
        };
      }

      return {
        component: 'Tokens',
        status: 'healthy',
        message: `All ${activeIntegrations.length} integration(s) have healthy tokens`,
        details: { 
          total: activeIntegrations.length, 
          expired: 0,
          expiringSoon: 0 
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        component: 'Tokens',
        status: 'failed',
        message: 'Failed to check token health',
        details: { error: error.message },
        timestamp: new Date()
      };
    }
  }

  /**
   * Check error rates and patterns
   */
  private async checkErrorRates(): Promise<HealthCheckResult> {
    const errorStats = QuickBooksLogger.getErrorStats(60);
    
    if (errorStats.criticalErrors > 0) {
      return {
        component: 'ErrorRates',
        status: 'failed',
        message: `${errorStats.criticalErrors} critical errors in the last hour`,
        details: errorStats,
        timestamp: new Date()
      };
    }

    if (errorStats.totalErrors > 10) {
      return {
        component: 'ErrorRates',
        status: 'degraded',
        message: `High error rate: ${errorStats.totalErrors} errors in the last hour`,
        details: errorStats,
        timestamp: new Date()
      };
    }

    return {
      component: 'ErrorRates',
      status: 'healthy',
      message: `Low error rate: ${errorStats.totalErrors} errors in the last hour`,
      details: errorStats,
      timestamp: new Date()
    };
  }

  /**
   * Check alert conditions and trigger alerts
   */
  private async checkAlerts(): Promise<void> {
    try {
      const schedulerStats = QuickBooksLogger.getSchedulerHealthStats(60);
      const errorStats = QuickBooksLogger.getErrorStats(60);
      
      const metrics = {
        ...schedulerStats,
        ...errorStats
      };

      const triggeredAlerts = this.alertRules
        .filter(rule => rule.enabled && rule.condition(metrics))
        .map(rule => ({
          ...rule,
          timestamp: new Date(),
          metrics
        }));

      if (triggeredAlerts.length > 0) {
        for (const alert of triggeredAlerts) {
          this.triggerAlert(alert);
        }
      }

    } catch (error) {
      QuickBooksLogger.error('Monitor', 'Alert checking failed', error);
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: any): void {
    const message = `ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`;
    
    switch (alert.severity) {
      case 'critical':
        QuickBooksLogger.critical('Alert', message, alert);
        break;
      case 'warning':
        QuickBooksLogger.warn('Alert', message, alert);
        break;
      default:
        QuickBooksLogger.info('Alert', message, alert);
    }

    // Here you could integrate with external alerting systems
    // like email, Slack, PagerDuty, etc.
    this.sendExternalAlert(alert);
  }

  /**
   * Send alert to external systems (placeholder for integration)
   */
  private sendExternalAlert(alert: any): void {
    // This is where you would integrate with external alerting systems
    // For now, we'll just log that an external alert would be sent
    QuickBooksLogger.debug('Alert', `External alert would be sent: ${alert.name}`, {
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp
    });
  }

  /**
   * Get current system health
   */
  getCurrentHealth(): SystemHealth | null {
    return this.currentHealth;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    uptime: number;
    lastHealthCheck: Date | null;
    healthCheckInterval: number;
    alertCheckInterval: number;
    alertRulesCount: number;
    enabledAlertRules: number;
  } {
    return {
      uptime: Date.now() - this.startTime.getTime(),
      lastHealthCheck: this.lastHealthCheck,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      alertCheckInterval: 2 * 60 * 1000, // 2 minutes
      alertRulesCount: this.alertRules.length,
      enabledAlertRules: this.alertRules.filter(rule => rule.enabled).length
    };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    QuickBooksLogger.info('Monitor', `Added alert rule: ${rule.name}`, rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const initialLength = this.alertRules.length;
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    
    if (this.alertRules.length < initialLength) {
      QuickBooksLogger.info('Monitor', `Removed alert rule: ${ruleId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Enable/disable alert rule
   */
  toggleAlertRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      QuickBooksLogger.info('Monitor', `${enabled ? 'Enabled' : 'Disabled'} alert rule: ${rule.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }
}