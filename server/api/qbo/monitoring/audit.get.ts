/**
 * API endpoint to get QuickBooks connection audit trail
 * Returns connection/disconnection events for compliance and debugging
 */

import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    
    // Parse query parameters
    const companyId = query.companyId as string;
    const timeRangeHours = Math.min(parseInt(query.hours as string) || 24, 168); // Max 7 days
    
    // Get audit trail
    const auditTrail = QuickBooksLogger.getConnectionAuditTrail(companyId, timeRangeHours);
    
    // Group events by type for summary
    const eventSummary = auditTrail.reduce((acc, log) => {
      const eventType = log.context?.event || 'unknown';
      acc[eventType] = (acc[eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      success: true,
      data: {
        auditTrail,
        summary: {
          totalEvents: auditTrail.length,
          eventTypes: eventSummary,
          timeRange: `${timeRangeHours} hours`,
          companyFilter: companyId || 'all companies'
        },
        filters: {
          companyId: companyId || null,
          timeRangeHours
        },
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Failed to get audit trail:', error);
    
    return {
      success: false,
      error: {
        message: 'Failed to retrieve audit trail',
        details: error.message
      }
    };
  }
});