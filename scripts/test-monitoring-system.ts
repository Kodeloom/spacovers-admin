/**
 * Test script to demonstrate monitoring and audit trail functionality
 * Run with: npx tsx scripts/test-monitoring-system.ts
 */

import { unenhancedPrisma as prisma } from '../server/lib/db';
import { logOrderItemStatusChangeWithContext, logOrderItemSyncOperation } from '../server/utils/orderItemAuditLogger';
import { WebhookMonitor } from '../server/utils/webhookMonitoring';
import { QuickBooksLogger } from '../server/lib/quickbooksLogger';

async function demonstrateOrderItemAuditLogging() {
  console.log('\n🔍 Demonstrating OrderItem Audit Logging...\n');

  try {
    // Find an existing order item for demonstration
    const orderItem = await prisma.orderItem.findFirst({
      include: {
        order: {
          select: {
            id: true,
            salesOrderNumber: true
          }
        },
        item: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!orderItem) {
      console.log('❌ No OrderItems found in database. Please create some test data first.');
      return;
    }

    console.log(`📋 Found OrderItem: ${orderItem.item.name} in order ${orderItem.order.salesOrderNumber || orderItem.order.id}`);
    console.log(`   Current status: ${orderItem.itemStatus}`);

    // Simulate a status change with comprehensive logging
    await logOrderItemStatusChangeWithContext(
      {
        orderItemId: orderItem.id,
        fromStatus: orderItem.itemStatus,
        toStatus: 'CUTTING',
        changeReason: 'Monitoring system test - started cutting process',
        triggeredBy: 'system',
        stationName: 'Test Cutting Station',
        workStartTime: new Date(),
        notes: 'This is a test status change for monitoring demonstration'
      },
      {
        orderId: orderItem.orderId,
        orderNumber: orderItem.order.salesOrderNumber,
        itemId: orderItem.itemId,
        itemName: orderItem.item.name,
        userId: 'system-test',
        operation: 'status_change',
        source: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'Monitoring-Test-Script/1.0'
      }
    );

    console.log('✅ Status change logged successfully with enhanced audit context');

    // Demonstrate sync operation logging
    await logOrderItemSyncOperation(
      orderItem.orderId,
      'sync_completed',
      {
        itemsProcessed: 5,
        itemsCreated: 2,
        itemsUpdated: 3,
        itemsSkipped: 0,
        duration: 2500,
        source: 'monitoring_test'
      },
      {
        userId: 'system-test',
        operation: 'sync',
        source: 'system'
      }
    );

    console.log('✅ Sync operation logged successfully');

    // Query recent audit logs
    const recentStatusLogs = await prisma.itemStatusLog.findMany({
      where: {
        orderItemId: orderItem.id,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 5
    });

    console.log(`\n📊 Recent status changes for this OrderItem (${recentStatusLogs.length} found):`);
    recentStatusLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.fromStatus || 'NEW'} → ${log.toStatus} (${log.changeReason})`);
      console.log(`      Time: ${log.timestamp.toISOString()}`);
      console.log(`      Triggered by: ${log.triggeredBy}`);
    });

  } catch (error) {
    console.error('❌ Error demonstrating OrderItem audit logging:', error);
  }
}

async function demonstrateWebhookMonitoring() {
  console.log('\n📡 Demonstrating Webhook Monitoring...\n');

  try {
    // Simulate various webhook events
    console.log('🔄 Simulating webhook events...');

    // Successful events
    for (let i = 0; i < 8; i++) {
      WebhookMonitor.recordWebhookEvent({
        eventType: i % 2 === 0 ? 'customer' : 'invoice',
        entityId: `test-entity-${i}`,
        success: true,
        processingTimeMs: 800 + Math.random() * 1000,
        companyId: 'demo-company-123'
      });
    }

    // Some failures
    WebhookMonitor.recordWebhookEvent({
      eventType: 'invoice',
      entityId: 'failed-invoice-1',
      success: false,
      processingTimeMs: 5000,
      errorType: 'api_call',
      errorMessage: 'API timeout after 5 seconds',
      companyId: 'demo-company-123'
    });

    WebhookMonitor.recordWebhookEvent({
      eventType: 'customer',
      entityId: 'failed-customer-1',
      success: false,
      processingTimeMs: 200,
      errorType: 'authentication',
      errorMessage: 'Invalid access token',
      companyId: 'demo-company-123'
    });

    console.log('✅ Webhook events recorded');

    // Get and display metrics
    const metrics = WebhookMonitor.getWebhookMetrics(60);
    console.log('\n📊 Webhook Metrics (last 60 minutes):');
    console.log(`   Total Requests: ${metrics.totalRequests}`);
    console.log(`   Successful: ${metrics.successfulRequests}`);
    console.log(`   Failed: ${metrics.failedRequests}`);
    console.log(`   Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`   Avg Processing Time: ${metrics.averageProcessingTime.toFixed(0)}ms`);
    console.log(`   Authentication Failures: ${metrics.authenticationFailures}`);
    console.log(`   API Call Failures: ${metrics.apiCallFailures}`);

    // Check health status
    const health = WebhookMonitor.checkWebhookHealth(60);
    console.log(`\n🏥 Health Status: ${health.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    
    if (health.issues.length > 0) {
      console.log('   Issues detected:');
      health.issues.forEach((issue, index) => {
        const icon = issue.type === 'critical' ? '🚨' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${index + 1}. ${icon} ${issue.message}`);
      });
    }

    // Show statistics by entity type
    const entityStats = WebhookMonitor.getWebhookStatsByEntityType(60);
    console.log('\n📈 Statistics by Entity Type:');
    Object.entries(entityStats).forEach(([entityType, stats]) => {
      if (stats.totalRequests > 0) {
        console.log(`   ${entityType.toUpperCase()}:`);
        console.log(`     Requests: ${stats.totalRequests}`);
        console.log(`     Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(`     Avg Time: ${stats.averageProcessingTime.toFixed(0)}ms`);
      }
    });

    // Demonstrate authentication monitoring
    console.log('\n🔐 Simulating authentication events...');
    
    WebhookMonitor.recordAuthenticationAttempt(true, 'demo-company-123', {
      tokenValidation: { success: true },
      tokenRefreshAttempted: false
    });

    WebhookMonitor.recordAuthenticationAttempt(false, 'demo-company-456', {
      tokenValidation: { success: false, error: 'Token expired' },
      tokenRefreshAttempted: true,
      tokenRefreshSuccess: false,
      errorMessage: 'Token refresh failed: Invalid refresh token'
    });

    console.log('✅ Authentication events recorded');

    // Show recent events
    const recentEvents = WebhookMonitor.getRecentWebhookEvents(5);
    console.log(`\n📋 Recent Webhook Events (${recentEvents.length} shown):`);
    recentEvents.forEach((event, index) => {
      const status = event.success ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${event.eventType} ${event.entityId} (${event.processingTimeMs}ms)`);
      if (!event.success && event.errorMessage) {
        console.log(`      Error: ${event.errorMessage}`);
      }
    });

  } catch (error) {
    console.error('❌ Error demonstrating webhook monitoring:', error);
  }
}

async function demonstrateQuickBooksLogging() {
  console.log('\n📚 Demonstrating QuickBooks Logger Integration...\n');

  try {
    // Log some sample events
    QuickBooksLogger.info('MonitoringDemo', 'Testing QuickBooks logger integration', {
      testType: 'monitoring_demonstration',
      timestamp: new Date().toISOString()
    });

    QuickBooksLogger.logTokenRefresh(true, 'demo-company-123', 1200, undefined, 'manual');
    
    QuickBooksLogger.logConnectionEvent('connected', 'demo-company-123', 'demo-user-123', {
      connectionType: 'webhook_test',
      environment: 'development'
    });

    QuickBooksLogger.error('MonitoringDemo', 'Simulated error for demonstration', 
      new Error('This is a test error'), 'demo-user-123', 'demo-company-123');

    console.log('✅ QuickBooks logger events recorded');

    // Get error statistics
    const errorStats = QuickBooksLogger.getErrorStats(60);
    console.log('\n📊 QuickBooks Error Statistics (last 60 minutes):');
    console.log(`   Total Errors: ${errorStats.totalErrors}`);
    console.log(`   Critical Errors: ${errorStats.criticalErrors}`);
    console.log('   Errors by Type:', errorStats.errorsByType);
    console.log('   Errors by Component:', errorStats.errorsByComponent);

    // Get scheduler health
    const schedulerHealth = QuickBooksLogger.getSchedulerHealthStats(60);
    console.log('\n🔧 Scheduler Health:');
    console.log(`   Is Healthy: ${schedulerHealth.isHealthy ? '✅' : '❌'}`);
    console.log(`   Total Checks: ${schedulerHealth.totalChecks}`);
    console.log(`   Success Rate: ${(100 - schedulerHealth.errorRate).toFixed(1)}%`);
    console.log(`   Tokens Refreshed: ${schedulerHealth.tokensRefreshed}`);

    // Check alerting thresholds
    const alertCheck = QuickBooksLogger.checkAlertingThresholds();
    console.log(`\n🚨 Alert Status: ${alertCheck.shouldAlert ? '⚠️ ALERTS TRIGGERED' : '✅ NO ALERTS'}`);
    if (alertCheck.alerts.length > 0) {
      console.log('   Active Alerts:');
      alertCheck.alerts.forEach((alert, index) => {
        const icon = alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${index + 1}. ${icon} ${alert.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Error demonstrating QuickBooks logging:', error);
  }
}

async function main() {
  console.log('🚀 Starting Monitoring System Demonstration\n');
  console.log('This script demonstrates the enhanced monitoring and audit trail capabilities.');
  
  try {
    await demonstrateOrderItemAuditLogging();
    await demonstrateWebhookMonitoring();
    await demonstrateQuickBooksLogging();

    console.log('\n✅ Monitoring system demonstration completed successfully!');
    console.log('\n📋 Summary of capabilities demonstrated:');
    console.log('   • Enhanced OrderItem status change logging with full context');
    console.log('   • OrderItem relationship validation and isolation checking');
    console.log('   • Comprehensive webhook event monitoring and metrics');
    console.log('   • Webhook health status checking and alerting');
    console.log('   • QuickBooks integration logging and error tracking');
    console.log('   • Authentication failure monitoring');
    console.log('   • Performance metrics and processing time tracking');
    
    console.log('\n🔗 Access monitoring data via API endpoints:');
    console.log('   • GET /api/monitoring/webhook-metrics - Webhook performance metrics');
    console.log('   • GET /api/monitoring/orderitem-audit - OrderItem audit trails');
    
  } catch (error) {
    console.error('❌ Error in monitoring demonstration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the demonstration
main().catch(console.error);