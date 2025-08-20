import { OrderTrackingService } from '~/server/utils/orderTrackingService';
import type { OrderSystemStatus } from '@prisma-app/client';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    
    // Validate required fields
    const { orderId, toStatus, changeReason, triggeredBy } = body;
    
    if (!orderId || !toStatus || !changeReason || !triggeredBy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderId, toStatus, changeReason, triggeredBy'
      });
    }

    // Validate status values
    const validStatuses = ['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
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
    await OrderTrackingService.logOrderStatusChange({
      orderId,
      fromStatus: body.fromStatus,
      toStatus: toStatus as OrderSystemStatus,
      userId: body.userId,
      changeReason,
      triggeredBy: triggeredBy as 'manual' | 'system' | 'automation',
      notes: body.notes,
    });

    return {
      success: true,
      message: 'Order status change logged successfully'
    };

  } catch (error) {
    console.error('Error logging order status change:', error);
    
    if (error.statusCode) {
      throw error; // Re-throw validation errors
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to log order status change'
    });
  }
});
