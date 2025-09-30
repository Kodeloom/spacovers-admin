/**
 * Comprehensive monitoring for QuickBooks webhook integration
 * Tracks success rates, authentication failures, and performance metrics
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export interface WebhookMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  authenticationFailures: number;
  signatureFailures: number;
  apiCallFailures: number;
  averageProcessingTime: number;
  successRate: number;
  lastSuccessfulWebhook?: Date;
  lastFailedWebhook?: Date;
}

export interface WebhookEvent {
  id: string;
  timestamp: Date;
  eventType: 'customer' | 'invoice' | 'item' | 'estimate';
  entityId: string;
  success: boolean;
  processingTimeMs: number;
  errorType?: 'authentication' | 'signature' | 'api_call' | 'database' | 'validation';
  errorMessage?: string;
  companyId?: string;
  retryCount?: number;
}

class WebhookMonitor {
  private static events: WebhookEvent[] = [];
  private static maxEvents = 1000; // Keep last 1000 events in memory

  /**
   * Records a webhook processing event
   */
  static recordWebhookEvent(event: Omit<WebhookEvent, 'id' | 'timestamp'>): void {
    const webhookEvent: WebhookEvent = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(webhookEvent);

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log the event
    const logLevel = event.success ? 'info' : 'error';
    const message = `Webhook ${event.eventType} ${event.success ? 'processed successfully' : 'failed'}`;
    
    QuickBooksLogger.log(
      logLevel as any,
      'WebhookMonitor',
      message,
      {
        entityId: event.entityId,
        processingTime: event.processingTimeMs,
        errorType: event.errorType,
        errorMessage: event.errorMessage,
        retryCount: event.retryCount
      },
      undefined,
      event.companyId
    );
  }

  /**
   * Records webhook authentication attempt
   */
  static recordAuthenticationAttempt(
    success: boolean,
    companyId?: string,
    errorDetails?: {
      tokenValidation?: any;
      tokenRefreshAttempted?: boolean;
      tokenRefreshSuccess?: boolean;
      errorMessage?: string;
    }
  ): void {
    const context = {
      success,
      companyId,
      timestamp: new Date().toISOString(),
      ...errorDetails
    };

    if (success) {
      QuickBooksLogger.info('WebhookAuth', 'Webhook authentication successful', context, undefined, companyId);
    } else {
      QuickBooksLogger.error('WebhookAuth', 'Webhook authentication failed', errorDetails, undefined, companyId);
    }

    // Store authentication metrics
    this.recordWebhookEvent({
      eventType: 'customer', // Generic type for auth events
      entityId: 'auth_check',
      success,
      processingTimeMs: 0,
      errorType: success ? undefined : 'authentication',
      errorMessage: errorDetails?.errorMessage,
      companyId
    });
  }

  /**
   * Records signature verification attempt
   */
  static recordSignatureVerification(
    success: boolean,
    details: {
      signatureLength?: number;
      payloadLength?: number;
      errorMessage?: string;
    }
  ): void {
    const context = {
      success,
      timestamp: new Date().toISOString(),
      ...details
    };

    if (success) {
      QuickBooksLogger.debug('WebhookSignature', 'Signature verification successful', context);
    } else {
      QuickBooksLogger.error('WebhookSignature', 'Signature verification failed', context);
    }
  }

  /**
   * Records API call performance and results
   */
  static recordAPICall(
    endpoint: string,
    entityType: 'customer' | 'invoice' | 'item' | 'estimate',
    entityId: string,
    success: boolean,
    durationMs: number,
    companyId?: string,
    error?: any
  ): void {
    const context = {
      endpoint,
      entityType,
      entityId,
      duration: durationMs,
      success,
      companyId,
      error: error ? {
        message: error.message,
        status: error.status || error.statusCode,
        type: error.name || error.type
      } : undefined
    };

    QuickBooksLogger.logAPIRequest(
      endpoint,
      'GET',
      success,
      durationMs,
      companyId,
      error
    );

    // Record as webhook event for metrics
    this.recordWebhookEvent({
      eventType: entityType,
      entityId,
      success,
      processingTimeMs: durationMs,
      errorType: success ? undefined : 'api_call',
      errorMessage: error?.message,
      companyId
    });
  }

  /**
   * Gets webhook metrics for a specific time range
   */
  static getWebhookMetrics(timeRangeMinutes: number = 60): WebhookMetrics {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    const totalRequests = recentEvents.length;
    const successfulRequests = recentEvents.filter(e => e.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const authenticationFailures = recentEvents.filter(e => e.errorType === 'authentication').length;
    const signatureFailures = recentEvents.filter(e => e.errorType === 'signature').length;
    const apiCallFailures = recentEvents.filter(e => e.errorType === 'api_call').length;

    const processingTimes = recentEvents.map(e => e.processingTimeMs).filter(t => t > 0);
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
      : 0;

    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const successfulEvents = recentEvents.filter(e => e.success);
    const failedEvents = recentEvents.filter(e => !e.success);

    const lastSuccessfulWebhook = successfulEvents.length > 0 
      ? successfulEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : undefined;

    const lastFailedWebhook = failedEvents.length > 0 
      ? failedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp
      : undefined;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      authenticationFailures,
      signatureFailures,
      apiCallFailures,
      averageProcessingTime,
      successRate,
      lastSuccessfulWebhook,
      lastFailedWebhook
    };
  }

  /**
   * Gets detailed webhook statistics by entity type
   */
  static getWebhookStatsByEntityType(timeRangeMinutes: number = 60): Record<string, WebhookMetrics> {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    const entityTypes = ['customer', 'invoice', 'item', 'estimate'];
    const statsByType: Record<string, WebhookMetrics> = {};

    for (const entityType of entityTypes) {
      const typeEvents = recentEvents.filter(e => e.eventType === entityType);
      
      const totalRequests = typeEvents.length;
      const successfulRequests = typeEvents.filter(e => e.success).length;
      const failedRequests = totalRequests - successfulRequests;
      
      const authenticationFailures = typeEvents.filter(e => e.errorType === 'authentication').length;
      const signatureFailures = typeEvents.filter(e => e.errorType === 'signature').length;
      const apiCallFailures = typeEvents.filter(e => e.errorType === 'api_call').length;

      const processingTimes = typeEvents.map(e => e.processingTimeMs).filter(t => t > 0);
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      statsByType[entityType] = {
        totalRequests,
        successfulRequests,
        failedRequests,
        authenticationFailures,
        signatureFailures,
        apiCallFailures,
        averageProcessingTime,
        successRate
      };
    }

    return statsByType;
  }

  /**
   * Checks if webhook monitoring indicates system health issues
   */
  static checkWebhookHealth(timeRangeMinutes: number = 60): {
    isHealthy: boolean;
    issues: Array<{
      type: 'critical' | 'warning' | 'info';
      message: string;
      details: any;
    }>;
    metrics: WebhookMetrics;
  } {
    const metrics = this.getWebhookMetrics(timeRangeMinutes);
    const issues: Array<{ type: 'critical' | 'warning' | 'info'; message: string; details: any }> = [];

    // Check success rate
    if (metrics.successRate < 50) {
      issues.push({
        type: 'critical',
        message: `Webhook success rate critically low: ${metrics.successRate.toFixed(1)}%`,
        details: { successRate: metrics.successRate, totalRequests: metrics.totalRequests }
      });
    } else if (metrics.successRate < 80) {
      issues.push({
        type: 'warning',
        message: `Webhook success rate below threshold: ${metrics.successRate.toFixed(1)}%`,
        details: { successRate: metrics.successRate, totalRequests: metrics.totalRequests }
      });
    }

    // Check authentication failures
    if (metrics.authenticationFailures > 5) {
      issues.push({
        type: 'critical',
        message: `High number of authentication failures: ${metrics.authenticationFailures}`,
        details: { authenticationFailures: metrics.authenticationFailures }
      });
    } else if (metrics.authenticationFailures > 2) {
      issues.push({
        type: 'warning',
        message: `Multiple authentication failures detected: ${metrics.authenticationFailures}`,
        details: { authenticationFailures: metrics.authenticationFailures }
      });
    }

    // Check if no successful webhooks recently
    if (metrics.lastSuccessfulWebhook) {
      const timeSinceLastSuccess = Date.now() - metrics.lastSuccessfulWebhook.getTime();
      const minutesSinceLastSuccess = timeSinceLastSuccess / (1000 * 60);
      
      if (minutesSinceLastSuccess > 120) { // 2 hours
        issues.push({
          type: 'critical',
          message: `No successful webhooks for ${Math.round(minutesSinceLastSuccess)} minutes`,
          details: { lastSuccessfulWebhook: metrics.lastSuccessfulWebhook, minutesSinceLastSuccess }
        });
      }
    } else if (metrics.totalRequests > 0) {
      issues.push({
        type: 'critical',
        message: 'No successful webhooks recorded in time range',
        details: { totalRequests: metrics.totalRequests }
      });
    }

    // Check processing time
    if (metrics.averageProcessingTime > 30000) { // 30 seconds
      issues.push({
        type: 'warning',
        message: `High average processing time: ${(metrics.averageProcessingTime / 1000).toFixed(1)}s`,
        details: { averageProcessingTime: metrics.averageProcessingTime }
      });
    }

    const isHealthy = issues.filter(issue => issue.type === 'critical').length === 0;

    return {
      isHealthy,
      issues,
      metrics
    };
  }

  /**
   * Gets recent webhook events for debugging
   */
  static getRecentWebhookEvents(count: number = 50, entityType?: string): WebhookEvent[] {
    let filteredEvents = this.events;

    if (entityType) {
      filteredEvents = filteredEvents.filter(event => event.eventType === entityType);
    }

    return filteredEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * Clears old webhook events from memory
   */
  static clearOldEvents(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const initialCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.events.length;
    
    if (removedCount > 0) {
      QuickBooksLogger.info('WebhookMonitor', `Cleared ${removedCount} old webhook events`);
    }
    
    return removedCount;
  }

  /**
   * Exports webhook metrics for external monitoring systems
   */
  static exportMetricsForMonitoring(): {
    timestamp: string;
    metrics: WebhookMetrics;
    health: ReturnType<typeof WebhookMonitor.checkWebhookHealth>;
    entityStats: Record<string, WebhookMetrics>;
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getWebhookMetrics(60),
      health: this.checkWebhookHealth(60),
      entityStats: this.getWebhookStatsByEntityType(60)
    };
  }
}

export { WebhookMonitor };