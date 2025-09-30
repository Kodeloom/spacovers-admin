/**
 * Webhook enhancement utilities for monitoring integration
 * Provides wrapper functions to add monitoring to existing webhook operations
 */

import { WebhookMonitor } from './webhookMonitoring';
import type { H3Event } from 'h3';

/**
 * Wraps webhook signature verification with monitoring
 */
export function enhanceSignatureVerification(
  originalVerifyFunction: (signature: string, payload: string) => boolean
) {
  return function verifyWebhookSignatureWithMonitoring(signature: string, payload: string): boolean {
    const startTime = Date.now();
    
    try {
      const isValid = originalVerifyFunction(signature, payload);
      
      WebhookMonitor.recordSignatureVerification(isValid, {
        signatureLength: signature?.length || 0,
        payloadLength: payload?.length || 0
      });
      
      return isValid;
    } catch (error: any) {
      WebhookMonitor.recordSignatureVerification(false, {
        signatureLength: signature?.length || 0,
        payloadLength: payload?.length || 0,
        errorMessage: error.message
      });
      
      throw error;
    }
  };
}

/**
 * Wraps webhook authentication with monitoring
 */
export function enhanceWebhookAuthentication(
  originalAuthFunction: (event: H3Event) => Promise<any>
) {
  return async function authenticateWebhookWithMonitoring(event: H3Event): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await originalAuthFunction(event);
      
      WebhookMonitor.recordAuthenticationAttempt(true, result?.token?.realmId, {
        tokenValidation: { success: true },
        tokenRefreshAttempted: false
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      WebhookMonitor.recordAuthenticationAttempt(false, undefined, {
        tokenValidation: { success: false, error: error.message },
        tokenRefreshAttempted: error.message?.includes('refresh'),
        errorMessage: error.message
      });
      
      throw error;
    }
  };
}

/**
 * Wraps API fetch operations with monitoring
 */
export function enhanceAPIFetch<T>(
  originalFetchFunction: (entityId: string, event: H3Event) => Promise<T>,
  entityType: 'customer' | 'invoice' | 'item' | 'estimate'
) {
  return async function fetchWithMonitoring(entityId: string, event: H3Event): Promise<T> {
    const startTime = Date.now();
    const endpoint = `qbo/${entityType}/${entityId}`;
    
    try {
      const result = await originalFetchFunction(entityId, event);
      const duration = Date.now() - startTime;
      
      // Extract company ID from result or event context
      const companyId = (result as any)?.companyId || event.context?.companyId;
      
      WebhookMonitor.recordAPICall(
        endpoint,
        entityType,
        entityId,
        true,
        duration,
        companyId
      );
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const companyId = event.context?.companyId;
      
      WebhookMonitor.recordAPICall(
        endpoint,
        entityType,
        entityId,
        false,
        duration,
        companyId,
        error
      );
      
      throw error;
    }
  };
}

/**
 * Wraps complete webhook processing with monitoring
 */
export function enhanceWebhookProcessing(
  originalProcessFunction: (event: H3Event) => Promise<any>
) {
  return async function processWebhookWithMonitoring(event: H3Event): Promise<any> {
    const startTime = Date.now();
    const requestId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to context for tracking
    event.context.requestId = requestId;
    
    try {
      const result = await originalProcessFunction(event);
      const duration = Date.now() - startTime;
      
      // Record successful processing
      console.log(`[WebhookMonitor] Webhook processing completed successfully in ${duration}ms (ID: ${requestId})`);
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Record failed processing
      console.error(`[WebhookMonitor] Webhook processing failed after ${duration}ms (ID: ${requestId}):`, error);
      
      // Determine error type for monitoring
      let errorType: 'authentication' | 'signature' | 'api_call' | 'database' | 'validation' = 'validation';
      
      if (error.message?.includes('signature') || error.message?.includes('verification')) {
        errorType = 'signature';
      } else if (error.message?.includes('token') || error.message?.includes('auth')) {
        errorType = 'authentication';
      } else if (error.message?.includes('API') || error.message?.includes('fetch')) {
        errorType = 'api_call';
      } else if (error.message?.includes('database') || error.message?.includes('prisma')) {
        errorType = 'database';
      }
      
      WebhookMonitor.recordWebhookEvent({
        eventType: 'customer', // Generic for error tracking
        entityId: 'error',
        success: false,
        processingTimeMs: duration,
        errorType,
        errorMessage: error.message
      });
      
      throw error;
    }
  };
}

/**
 * Creates a monitoring wrapper for the entire webhook endpoint
 */
export function createWebhookMonitoringWrapper() {
  return {
    enhanceSignatureVerification,
    enhanceWebhookAuthentication,
    enhanceAPIFetch,
    enhanceWebhookProcessing,
    
    // Utility to get monitoring stats
    getMonitoringStats: () => WebhookMonitor.exportMetricsForMonitoring(),
    
    // Utility to check health
    checkHealth: () => WebhookMonitor.checkWebhookHealth()
  };
}