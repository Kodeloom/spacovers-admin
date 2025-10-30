/**
 * Print Queue Cleanup API Endpoint
 * Provides cleanup operations for the print queue system
 * 
 * Requirements: 8.4, 8.5 - Performance optimization and cleanup
 */

import { z } from 'zod';
import { auth } from '~/server/lib/auth';
import { PrintQueueCleanupService, type CleanupOptions } from '~/server/utils/printQueueCleanup';

const CleanupRequestSchema = z.object({
  printedItemsRetentionDays: z.number().min(1).max(365).optional(),
  removeOrphanedItems: z.boolean().optional(),
  clearCache: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  action: z.enum(['cleanup', 'statistics', 'health-check', 'optimize', 'emergency']).default('cleanup')
});

export default defineEventHandler(async (event) => {
  try {
    // Authentication check
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Authorization check - only admins and super admins can perform cleanup
    const userRoles = sessionData.user.roles || [];
    const hasAdminAccess = userRoles.some((role: any) => 
      role.name === 'Super Admin' || role.name === 'Admin'
    );

    if (!hasAdminAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required for print queue cleanup'
      });
    }

    // Parse and validate request body
    const body = await readBody(event);
    const validatedData = CleanupRequestSchema.parse(body);

    const {
      printedItemsRetentionDays = 30,
      removeOrphanedItems = true,
      clearCache = true,
      dryRun = false,
      action
    } = validatedData;

    let result: any;

    switch (action) {
      case 'cleanup':
        const cleanupOptions: CleanupOptions = {
          printedItemsRetentionDays,
          removeOrphanedItems,
          clearCache,
          dryRun
        };
        
        result = await PrintQueueCleanupService.performCleanup(cleanupOptions);
        break;

      case 'statistics':
        const statsOptions: CleanupOptions = {
          printedItemsRetentionDays,
          removeOrphanedItems
        };
        
        result = await PrintQueueCleanupService.getCleanupStatistics(statsOptions);
        break;

      case 'health-check':
        result = await PrintQueueCleanupService.healthCheck();
        break;

      case 'optimize':
        result = await PrintQueueCleanupService.optimizePerformance();
        break;

      case 'emergency':
        result = await PrintQueueCleanupService.emergencyCleanup();
        break;

      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid action specified'
        });
    }

    // Log the operation for audit purposes
    console.log(`Print queue ${action} performed by user ${sessionData.user.id}`, {
      action,
      dryRun,
      result: action === 'cleanup' ? {
        removedItems: result.removedItems,
        executionTimeMs: result.executionTimeMs
      } : 'completed'
    });

    return {
      success: true,
      action,
      timestamp: new Date().toISOString(),
      performedBy: sessionData.user.id,
      result
    };

  } catch (error: any) {
    console.error('Error in print queue cleanup API:', error);

    // If it's already a createError, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Handle validation errors
    if (error.name === 'ZodError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: error.errors
      });
    }

    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Error performing print queue cleanup operation',
      data: { message: error.message }
    });
  }
});