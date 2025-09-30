/**
 * API endpoint for webhook monitoring metrics
 * Provides real-time webhook performance and health data
 */

import { WebhookMonitor } from '~/server/utils/webhookMonitoring';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const timeRangeMinutes = parseInt(query.timeRange as string) || 60;
    const includeEvents = query.includeEvents === 'true';
    const entityType = query.entityType as string;

    // Validate time range
    if (timeRangeMinutes < 1 || timeRangeMinutes > 1440) { // Max 24 hours
      throw createError({
        statusCode: 400,
        statusMessage: 'Time range must be between 1 and 1440 minutes'
      });
    }

    // Get comprehensive metrics
    const metrics = WebhookMonitor.getWebhookMetrics(timeRangeMinutes);
    const health = WebhookMonitor.checkWebhookHealth(timeRangeMinutes);
    const entityStats = WebhookMonitor.getWebhookStatsByEntityType(timeRangeMinutes);

    // Get QuickBooks logger stats for additional context
    const qbErrorStats = QuickBooksLogger.getErrorStats(timeRangeMinutes);
    const qbSchedulerHealth = QuickBooksLogger.getSchedulerHealthStats(timeRangeMinutes);

    const response: any = {
      timestamp: new Date().toISOString(),
      timeRangeMinutes,
      webhook: {
        metrics,
        health: {
          isHealthy: health.isHealthy,
          issues: health.issues
        },
        entityStats
      },
      quickbooks: {
        errorStats: qbErrorStats,
        schedulerHealth: qbSchedulerHealth
      }
    };

    // Include recent events if requested
    if (includeEvents) {
      const eventCount = parseInt(query.eventCount as string) || 50;
      response.recentEvents = WebhookMonitor.getRecentWebhookEvents(eventCount, entityType);
    }

    // Log the metrics request
    QuickBooksLogger.debug('MonitoringAPI', 'Webhook metrics requested', {
      timeRangeMinutes,
      includeEvents,
      entityType,
      metricsSnapshot: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successRate,
        isHealthy: health.isHealthy
      }
    });

    return response;

  } catch (error: any) {
    QuickBooksLogger.error('MonitoringAPI', 'Error retrieving webhook metrics', error);
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve webhook metrics',
      data: { error: error.message }
    });
  }
});