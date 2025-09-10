/**
 * API endpoint to manage QuickBooks integration alert rules
 * Allows adding, updating, and toggling alert rules
 */

import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { action, ruleId, rule } = body;
    
    const monitor = QuickBooksMonitor.getInstance();
    
    switch (action) {
      case 'add':
        if (!rule || !rule.id || !rule.name || !rule.condition || !rule.severity) {
          throw new Error('Invalid rule data: missing required fields');
        }
        
        monitor.addAlertRule(rule);
        QuickBooksLogger.info('AlertAPI', `Added alert rule: ${rule.name}`, rule);
        
        return {
          success: true,
          message: `Alert rule "${rule.name}" added successfully`,
          data: { rule }
        };
      
      case 'remove':
        if (!ruleId) {
          throw new Error('Rule ID is required for removal');
        }
        
        const removed = monitor.removeAlertRule(ruleId);
        if (!removed) {
          throw new Error(`Alert rule with ID "${ruleId}" not found`);
        }
        
        QuickBooksLogger.info('AlertAPI', `Removed alert rule: ${ruleId}`);
        
        return {
          success: true,
          message: `Alert rule removed successfully`,
          data: { ruleId }
        };
      
      case 'toggle':
        if (!ruleId || typeof body.enabled !== 'boolean') {
          throw new Error('Rule ID and enabled status are required');
        }
        
        const toggled = monitor.toggleAlertRule(ruleId, body.enabled);
        if (!toggled) {
          throw new Error(`Alert rule with ID "${ruleId}" not found`);
        }
        
        QuickBooksLogger.info('AlertAPI', `${body.enabled ? 'Enabled' : 'Disabled'} alert rule: ${ruleId}`);
        
        return {
          success: true,
          message: `Alert rule ${body.enabled ? 'enabled' : 'disabled'} successfully`,
          data: { ruleId, enabled: body.enabled }
        };
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    QuickBooksLogger.error('AlertAPI', 'Failed to manage alert rule', error);
    
    return {
      success: false,
      error: {
        message: error.message || 'Failed to manage alert rule',
        details: error.message
      }
    };
  }
});