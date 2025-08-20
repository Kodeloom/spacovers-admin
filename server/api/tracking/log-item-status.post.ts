import { OrderTrackingService } from '~/server/utils/orderTrackingService';
import type { OrderItemProcessingStatus } from '@prisma-app/client';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // Validate required fields
    const { orderItemId, toStatus, changeReason, triggeredBy } = body;
    
    if (!orderItemId || !toStatus || !changeReason || !triggeredBy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderItemId, toStatus, changeReason, triggeredBy'
      });
    }

    // Validate status values
    const validStatuses = ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'READY'];
    if (!validStatuses.includes(toStatus)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid toStatus: ${toStatus}. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate triggeredBy values
    const validTriggeredBy = ['manual', 'system', 'automation'];
    if (!validTriggeredBy.includes(triggeredBy)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid triggeredBy: ${triggeredBy}. Must be one of: ${validTriggeredBy.join(', ')}`
      });
    }

    // Log the status change
    await OrderTrackingService.logItemStatusChange({
      orderItemId,
      fromStatus: body.fromStatus,
      toStatus: toStatus as OrderItemProcessingStatus,
      userId: body.userId,
      changeReason,
      triggeredBy: triggeredBy as 'manual' | 'system' | 'automation',
      notes: body.notes,
    });

    return {
      success: true,
      message: 'Item status change logged successfully'
    };

  } catch (error) {
    console.error('Error logging item status change:', error);
    
    if (error.statusCode) {
      throw error; // Re-throw validation errors
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to log item status change'
    });
  }
});
