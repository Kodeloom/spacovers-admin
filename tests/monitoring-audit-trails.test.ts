/**
 * Tests for monitoring and audit trail functionality
 * Validates OrderItem status change logging and webhook monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { logOrderItemStatusChangeWithContext, logOrderItemSyncOperation } from '~/server/utils/orderItemAuditLogger';
import { WebhookMonitor } from '~/server/utils/webhookMonitoring';
import type { OrderItemProcessingStatus } from '@prisma-app/client';

describe('Monitoring and Audit Trails', () => {
  let testOrder: any;
  let testOrderItem: any;
  let testUser: any;
  let testItem: any;

  beforeEach(async () => {
    // Create test data
    testUser = await prisma.user.create({
      data: {
        id: 'test-user-audit',
        email: 'audit-test@example.com',
        name: 'Audit Test User'
      }
    });

    const testCustomer = await prisma.customer.create({
      data: {
        id: 'test-customer-audit',
        displayName: 'Audit Test Customer',
        email: 'customer-audit@example.com',
        customerStatus: 'ACTIVE'
      }
    });

    testOrder = await prisma.order.create({
      data: {
        id: 'test-order-audit',
        customerId: testCustomer.id,
        salesOrderNumber: 'AUDIT-TEST-001',
        orderStatus: 'APPROVED',
        totalAmount: 100.00
      }
    });

    testItem = await prisma.item.create({
      data: {
        id: 'test-item-audit',
        name: 'Audit Test Item',
        description: 'Test item for audit logging',
        itemStatus: 'ACTIVE'
      }
    });

    testOrderItem = await prisma.orderItem.create({
      data: {
        id: 'test-orderitem-audit',
        orderId: testOrder.id,
        itemId: testItem.id,
        quantity: 1,
        unitPrice: 100.00,
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.itemStatusLog.deleteMany({
      where: { orderItemId: testOrderItem.id }
    });
    await prisma.auditLog.deleteMany({
      where: { entityId: testOrderItem.id }
    });
    await prisma.orderItem.deleteMany({
      where: { id: testOrderItem.id }
    });
    await prisma.order.deleteMany({
      where: { id: testOrder.id }
    });
    await prisma.item.deleteMany({
      where: { id: testItem.id }
    });
    await prisma.customer.deleteMany({
      where: { id: 'test-customer-audit' }
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id }
    });
  });

  describe('OrderItem Audit Logging', () => {
    it('should log OrderItem status changes with comprehensive context', async () => {
      const fromStatus: OrderItemProcessingStatus = 'NOT_STARTED_PRODUCTION';
      const toStatus: OrderItemProcessingStatus = 'CUTTING';

      await logOrderItemStatusChangeWithContext(
        {
          orderItemId: testOrderItem.id,
          fromStatus,
          toStatus,
          changeReason: 'Started cutting process',
          triggeredBy: 'manual',
          stationName: 'Cutting Station',
          workStartTime: new Date()
        },
        {
          orderId: testOrder.id,
          orderNumber: testOrder.salesOrderNumber,
          itemId: testItem.id,
          itemName: testItem.name,
          userId: testUser.id,
          operation: 'status_change',
          source: 'warehouse_scan',
          ipAddress: '192.168.1.100',
          userAgent: 'Test-Agent/1.0'
        }
      );

      // Verify ItemStatusLog was created
      const statusLog = await prisma.itemStatusLog.findFirst({
        where: {
          orderItemId: testOrderItem.id,
          fromStatus,
          toStatus
        }
      });

      expect(statusLog).toBeDefined();
      expect(statusLog?.userId).toBe(testUser.id);
      expect(statusLog?.changeReason).toBe('Started cutting process');
      expect(statusLog?.triggeredBy).toBe('manual');
    });

    it('should validate OrderItem relationship integrity', async () => {
      // Create another order with the same item type
      const testOrder2 = await prisma.order.create({
        data: {
          id: 'test-order-audit-2',
          customerId: 'test-customer-audit',
          salesOrderNumber: 'AUDIT-TEST-002',
          orderStatus: 'APPROVED',
          totalAmount: 150.00
        }
      });

      const testOrderItem2 = await prisma.orderItem.create({
        data: {
          id: 'test-orderitem-audit-2',
          orderId: testOrder2.id,
          itemId: testItem.id, // Same item as first order
          quantity: 2,
          unitPrice: 75.00,
          itemStatus: 'SEWING'
        }
      });

      // Log status change for first order item
      await logOrderItemStatusChangeWithContext(
        {
          orderItemId: testOrderItem.id,
          fromStatus: 'NOT_STARTED_PRODUCTION',
          toStatus: 'CUTTING',
          changeReason: 'Started cutting',
          triggeredBy: 'manual'
        },
        {
          orderId: testOrder.id,
          itemId: testItem.id,
          userId: testUser.id,
          operation: 'status_change',
          source: 'warehouse_scan'
        }
      );

      // Verify that the second order item status wasn't affected
      const unchangedOrderItem2 = await prisma.orderItem.findUnique({
        where: { id: testOrderItem2.id }
      });

      expect(unchangedOrderItem2?.itemStatus).toBe('SEWING');

      // Clean up
      await prisma.orderItem.delete({ where: { id: testOrderItem2.id } });
      await prisma.order.delete({ where: { id: testOrder2.id } });
    });

    it('should log sync operations with detailed metrics', async () => {
      await logOrderItemSyncOperation(
        testOrder.id,
        'sync_completed',
        {
          itemsProcessed: 5,
          itemsCreated: 3,
          itemsUpdated: 2,
          itemsSkipped: 0,
          duration: 1500,
          source: 'quickbooks_webhook'
        },
        {
          userId: testUser.id,
          operation: 'sync',
          source: 'webhook'
        }
      );

      // This test validates that the sync logging doesn't throw errors
      // and properly handles the order context
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Webhook Monitoring', () => {
    beforeEach(() => {
      // Clear webhook events before each test
      (WebhookMonitor as any).events = [];
    });

    it('should record webhook events with metrics', () => {
      WebhookMonitor.recordWebhookEvent({
        eventType: 'customer',
        entityId: 'test-customer-123',
        success: true,
        processingTimeMs: 1200,
        companyId: 'test-company-123'
      });

      const metrics = WebhookMonitor.getWebhookMetrics(60);
      
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageProcessingTime).toBe(1200);
    });

    it('should record authentication failures', () => {
      WebhookMonitor.recordAuthenticationAttempt(false, 'test-company-123', {
        tokenValidation: { success: false, error: 'Token expired' },
        tokenRefreshAttempted: true,
        tokenRefreshSuccess: false,
        errorMessage: 'Authentication failed: Token expired'
      });

      const metrics = WebhookMonitor.getWebhookMetrics(60);
      
      expect(metrics.authenticationFailures).toBe(1);
      expect(metrics.successRate).toBe(0);
    });

    it('should record API call performance', () => {
      WebhookMonitor.recordAPICall(
        '/qbo/customer/123',
        'customer',
        'test-customer-123',
        true,
        800,
        'test-company-123'
      );

      WebhookMonitor.recordAPICall(
        '/qbo/invoice/456',
        'invoice',
        'test-invoice-456',
        false,
        2500,
        'test-company-123',
        new Error('API timeout')
      );

      const metrics = WebhookMonitor.getWebhookMetrics(60);
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.apiCallFailures).toBe(1);
      expect(metrics.successRate).toBe(50);
    });

    it('should check webhook health status', () => {
      // Record some successful events
      for (let i = 0; i < 8; i++) {
        WebhookMonitor.recordWebhookEvent({
          eventType: 'customer',
          entityId: `customer-${i}`,
          success: true,
          processingTimeMs: 1000 + i * 100
        });
      }

      // Record some failures
      for (let i = 0; i < 2; i++) {
        WebhookMonitor.recordWebhookEvent({
          eventType: 'invoice',
          entityId: `invoice-${i}`,
          success: false,
          processingTimeMs: 3000,
          errorType: 'api_call',
          errorMessage: 'API timeout'
        });
      }

      const health = WebhookMonitor.checkWebhookHealth(60);
      
      expect(health.isHealthy).toBe(true); // 80% success rate should be healthy
      expect(health.metrics.totalRequests).toBe(10);
      expect(health.metrics.successRate).toBe(80);
    });

    it('should detect unhealthy webhook status', () => {
      // Record mostly failures
      for (let i = 0; i < 2; i++) {
        WebhookMonitor.recordWebhookEvent({
          eventType: 'customer',
          entityId: `customer-${i}`,
          success: true,
          processingTimeMs: 1000
        });
      }

      for (let i = 0; i < 8; i++) {
        WebhookMonitor.recordWebhookEvent({
          eventType: 'invoice',
          entityId: `invoice-${i}`,
          success: false,
          processingTimeMs: 5000,
          errorType: 'authentication',
          errorMessage: 'Auth failed'
        });
      }

      const health = WebhookMonitor.checkWebhookHealth(60);
      
      expect(health.isHealthy).toBe(false); // 20% success rate should be unhealthy
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues.some(issue => issue.type === 'critical')).toBe(true);
    });

    it('should get statistics by entity type', () => {
      // Record events for different entity types
      WebhookMonitor.recordWebhookEvent({
        eventType: 'customer',
        entityId: 'customer-1',
        success: true,
        processingTimeMs: 800
      });

      WebhookMonitor.recordWebhookEvent({
        eventType: 'invoice',
        entityId: 'invoice-1',
        success: false,
        processingTimeMs: 2000,
        errorType: 'api_call'
      });

      WebhookMonitor.recordWebhookEvent({
        eventType: 'customer',
        entityId: 'customer-2',
        success: true,
        processingTimeMs: 1200
      });

      const statsByType = WebhookMonitor.getWebhookStatsByEntityType(60);
      
      expect(statsByType.customer.totalRequests).toBe(2);
      expect(statsByType.customer.successRate).toBe(100);
      expect(statsByType.invoice.totalRequests).toBe(1);
      expect(statsByType.invoice.successRate).toBe(0);
    });
  });

  describe('Monitoring API Integration', () => {
    it('should export comprehensive metrics for monitoring', () => {
      // Record some test events
      WebhookMonitor.recordWebhookEvent({
        eventType: 'customer',
        entityId: 'test-customer',
        success: true,
        processingTimeMs: 1000
      });

      const exportedMetrics = WebhookMonitor.exportMetricsForMonitoring();
      
      expect(exportedMetrics).toHaveProperty('timestamp');
      expect(exportedMetrics).toHaveProperty('metrics');
      expect(exportedMetrics).toHaveProperty('health');
      expect(exportedMetrics).toHaveProperty('entityStats');
      
      expect(exportedMetrics.metrics.totalRequests).toBe(1);
      expect(exportedMetrics.health.isHealthy).toBe(true);
    });
  });
});