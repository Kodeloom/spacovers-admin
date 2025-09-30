import { unenhancedPrisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';
import { logOrderItemStatusChange } from '~/server/utils/orderItemValidation';
import { getClientIP } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { processingLogId } = body;

    if (!processingLogId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Processing log ID is required'
      });
    }

    // Get the current user session
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Get the processing log
    const processingLog = await unenhancedPrisma.itemProcessingLog.findUnique({
      where: { id: processingLogId },
      include: {
        orderItem: {
          include: {
            order: true,
            item: true
          }
        },
        station: true
      }
    });

    if (!processingLog) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Processing log not found'
      });
    }

    // Verify the user owns this work
    if (processingLog.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You can only complete your own work'
      });
    }

    // Check if work is already completed
    if (processingLog.endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Work is already completed'
      });
    }

    // Calculate duration
    const endTime = new Date();
    const durationInSeconds = Math.floor((endTime.getTime() - processingLog.startTime.getTime()) / 1000);

    // Determine the next status based on current station
    let nextItemStatus;
    let isFinalStep = false;

    switch (processingLog.station.name) {
      case 'Cutting':
        nextItemStatus = 'SEWING';
        break;
      case 'Sewing':
        nextItemStatus = 'FOAM_CUTTING';
        break;
      case 'Foam Cutting':
        nextItemStatus = 'READY';
        isFinalStep = true;
        break;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Unknown station type'
        });
    }

    // Start a transaction to update everything
    const result = await unenhancedPrisma.$transaction(async (tx) => {
      // Update the processing log with end time and duration
      const updatedProcessingLog = await tx.itemProcessingLog.update({
        where: { id: processingLogId },
        data: {
          endTime: endTime,
          durationInSeconds: durationInSeconds,
          notes: `${processingLog.notes || ''} - Completed at ${endTime.toLocaleString()}`
        }
      });

      // Update the order item status
      const updatedOrderItem = await tx.orderItem.update({
        where: { id: processingLog.orderItemId },
        data: { itemStatus: nextItemStatus }
      });

      // Log the status change with enhanced audit context
      const { logOrderItemStatusChangeWithContext } = await import('~/server/utils/orderItemAuditLogger');
      const workDuration = processingLog.startTime ? 
        Math.floor((new Date().getTime() - processingLog.startTime.getTime()) / 1000) : undefined;
      
      await logOrderItemStatusChangeWithContext(
        {
          orderItemId: processingLog.orderItemId,
          fromStatus: processingLog.orderItem.itemStatus,
          toStatus: nextItemStatus,
          changeReason: `Completed work at ${processingLog.station.name} station`,
          triggeredBy: 'manual',
          stationId: processingLog.stationId,
          stationName: processingLog.station.name,
          workStartTime: processingLog.startTime,
          workEndTime: new Date(),
          durationSeconds: workDuration
        },
        {
          orderId: processingLog.orderItem.order.id,
          orderNumber: processingLog.orderItem.order.salesOrderNumber,
          itemId: processingLog.orderItem.itemId,
          itemName: processingLog.orderItem.item.name,
          userId: session.user.id,
          operation: 'status_change',
          source: 'warehouse_scan',
          ipAddress: getClientIP(event),
          userAgent: getHeader(event, 'user-agent')
        }
      );

      // If this was the final step, check if all items in the order are ready
      if (isFinalStep) {
        const allOrderItems = await tx.orderItem.findMany({
          where: { orderId: processingLog.orderItem.order.id }
        });

        const allReady = allOrderItems.every(item => item.itemStatus === 'READY');
        
        if (allReady) {
          // Update order status to ready to ship
          await tx.order.update({
            where: { id: processingLog.orderItem.order.id },
            data: { 
              orderStatus: 'READY_TO_SHIP',
              readyToShipAt: new Date()
            }
          });
        }
      }

      return { updatedProcessingLog, updatedOrderItem };
    });

    // Enhanced ItemStatusLog entry is created by logOrderItemStatusChangeWithContext above
    // This provides comprehensive audit trail with work duration and station context

    return {
      success: true,
      data: {
        processingLog: result.updatedProcessingLog,
        orderItem: result.updatedOrderItem,
        duration: durationInSeconds,
        nextStatus: nextItemStatus,
        isFinalStep: isFinalStep
      }
    };

  } catch (error) {
    console.error('Error completing work:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to complete work'
    });
  }
});
