import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';
import { EmailService } from '~/server/lib/emailService';
import { createErrorResponse, handlePrismaError, logError, validateBarcodeFormat } from '~/utils/errorHandling';

// Helper function to get workflow step information
function getWorkflowStepInfo(fromStatus: string, toStatus: string, stationName: string) {
  const stepMap: { [key: string]: { step: number; description: string } } = {
    'NOT_STARTED_PRODUCTION->CUTTING': { 
      step: 1, 
      description: 'Office confirmed order printed - Production started' 
    },
    'CUTTING->SEWING': { 
      step: 2, 
      description: 'Cutting completed - Moving to Sewing' 
    },
    'SEWING->FOAM_CUTTING': { 
      step: 3, 
      description: 'Sewing completed - Moving to Foam Cutting' 
    },
    'FOAM_CUTTING->PACKAGING': { 
      step: 4, 
      description: 'Foam Cutting completed - Moving to Packaging' 
    },
    'PACKAGING->PRODUCT_FINISHED': { 
      step: 5, 
      description: 'Packaging completed - Product finished' 
    },
    'PRODUCT_FINISHED->READY': { 
      step: 6, 
      description: 'Office confirmed - Ready for delivery/pickup' 
    }
  };

  const key = `${fromStatus}->${toStatus}`;
  return stepMap[key] || { step: 0, description: `Status changed from ${fromStatus} to ${toStatus}` };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { orderItemId, stationId, userId, barcodeData, currentStatus, nextStatus } = body;

    if (!orderItemId || !stationId || !nextStatus) {
      const errorResponse = createErrorResponse('INVALID_REQUEST', 'Missing required fields');
      throw createError(errorResponse);
    }

    // Validate barcode format if provided
    if (body.barcode) {
      const barcodeValidation = validateBarcodeFormat(body.barcode);
      if (barcodeValidation) {
        const errorResponse = createErrorResponse('INVALID_BARCODE_FORMAT', barcodeValidation.message);
        throw createError(errorResponse);
      }
    }

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    const prisma = await getEnhancedPrismaClient(event);

    // Find the order item
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        item: true
      }
    });

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      });
    }

    // Find the station by ID or name
    let station;
    if (stationId.length > 10) {
      // Looks like an ID (long string)
      station = await prisma.station.findUnique({
        where: { id: stationId }
      });
    } else {
      // Try to find by exact name match first, then by contains
      station = await prisma.station.findFirst({
        where: { 
          OR: [
            { name: { equals: stationId, mode: 'insensitive' } },
            { name: { contains: stationId, mode: 'insensitive' } }
          ]
        }
      });
    }

    if (!station) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Station not found'
      });
    }

    // Validate scanner prefix if provided (for multi-scanner system)
    if (barcodeData?.prefix) {
      const scanner = await prisma.barcodeScanner.findFirst({
        where: {
          prefix: barcodeData.prefix,
          isActive: true
        },
        include: {
          user: true,
          station: true
        }
      });

      if (scanner) {
        // Verify the scanner belongs to the current user
        if (scanner.userId !== sessionData.user.id) {
          throw createError({
            statusCode: 403,
            statusMessage: `Scanner ${barcodeData.prefix} is assigned to ${scanner.user.name}. Please use your assigned scanner or contact your supervisor.`
          });
        }

        // Verify the scanner is assigned to the correct station
        if (scanner.stationId !== station.id) {
          throw createError({
            statusCode: 403,
            statusMessage: `Scanner ${barcodeData.prefix} is assigned to ${scanner.station.name} station, but you're trying to process work at ${station.name} station. Please use the correct scanner for this station.`
          });
        }

        console.log(`Scanner validation passed: ${barcodeData.prefix} - User: ${scanner.user.name} - Station: ${scanner.station.name}`);
      } else {
        // Scanner not found or inactive
        console.warn(`Scanner ${barcodeData.prefix} not found or inactive`);
        throw createError({
          statusCode: 404,
          statusMessage: `Scanner ${barcodeData.prefix} is not registered or is inactive. Please contact your supervisor to register this scanner.`
        });
      }
    } else {
      console.log('No scanner prefix provided - allowing scan without scanner validation');
    }

    // Check if user is already working on another item (single task focus)
    const activeWork = await prisma.itemProcessingLog.findFirst({
      where: {
        userId: sessionData.user.id,
        endTime: null // Still in progress
      },
      include: {
        orderItem: {
          include: {
            item: true,
            order: true
          }
        },
        station: true
      }
    });

    if (activeWork) {
      const activeOrderNumber = activeWork.orderItem.order.salesOrderNumber || activeWork.orderItem.order.id.slice(-8);
      const errorResponse = createErrorResponse(
        'USER_HAS_ACTIVE_WORK', 
        `Currently working on ${activeWork.orderItem.item.name} from Order #${activeOrderNumber} at ${activeWork.station.name} station`
      );
      throw createError(errorResponse);
    }

    // Check if there's an existing active log for this item (from previous station)
    const existingLog = await prisma.itemProcessingLog.findFirst({
      where: {
        orderItemId: orderItemId,
        endTime: null // Still in progress
      },
      include: {
        user: true,
        station: true
      }
    });

    // If someone else is working on this item, prevent concurrent access
    if (existingLog && existingLog.userId !== sessionData.user.id) {
      const errorResponse = createErrorResponse(
        'ITEM_BEING_PROCESSED', 
        `${existingLog.user.name} is working on this item at ${existingLog.station.name} station`,
        409
      );
      throw createError(errorResponse);
    }

    // If there's an existing log, close it first (completing previous station work)
    if (existingLog) {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - existingLog.startTime.getTime()) / 1000);
      
      await prisma.itemProcessingLog.update({
        where: { id: existingLog.id },
        data: {
          endTime: endTime,
          durationInSeconds: durationInSeconds,
          notes: `${existingLog.notes || ''} - Completed at ${endTime.toISOString()}`
        }
      });
    }

    // Update the order item status
    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        itemStatus: nextStatus
      }
    });

    // Create a new processing log entry for the current station work
    // Note: For the final step (PRODUCT_FINISHED -> READY), we don't start new work
    let processingLog = null;
    if (nextStatus !== 'READY') {
      processingLog = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItemId,
          stationId: station.id,
          userId: sessionData.user.id,
          startTime: new Date(),
          scannerPrefix: barcodeData?.prefix || null,
          notes: `Started work at ${station.name} station - Status: ${nextStatus}`
        }
      });
    } else {
      // For final step, just log the completion without starting new work
      await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItemId,
          stationId: station.id,
          userId: sessionData.user.id,
          startTime: new Date(),
          endTime: new Date(),
          durationInSeconds: 0,
          scannerPrefix: barcodeData?.prefix || null,
          notes: `Final scan - Product ready for delivery/pickup`
        }
      });
    }

    // Track order status changes based on workflow steps
    let orderStatusChanged = false;
    let newOrderStatus = orderItem.order.orderStatus;

    // Step 1: First item starting production (Office scan: NOT_STARTED -> CUTTING)
    if (nextStatus === 'CUTTING' && orderItem.order.orderStatus === 'APPROVED') {
      await prisma.order.update({
        where: { id: orderItem.orderId },
        data: {
          orderStatus: 'ORDER_PROCESSING'
        }
      });
      orderStatusChanged = true;
      newOrderStatus = 'ORDER_PROCESSING';

      // Send production started email notification
      try {
        await EmailService.sendOrderStatusEmail(orderItem.orderId, 'production_started');
      } catch (emailError) {
        console.error('Failed to send production started email:', emailError);
        // Don't fail the main operation if email fails
      }
    }

    // Step 6: Final step - check if all items are ready for shipping
    if (nextStatus === 'READY') {
      const allItems = await prisma.orderItem.findMany({
        where: { 
          orderId: orderItem.orderId,
          isProduct: true // Only check production items
        }
      });
      
      const allReady = allItems.every(item => item.itemStatus === 'READY');
      
      if (allReady) {
        await prisma.order.update({
          where: { id: orderItem.orderId },
          data: {
            orderStatus: 'READY_TO_SHIP',
            readyToShipAt: new Date()
          }
        });
        orderStatusChanged = true;
        newOrderStatus = 'READY_TO_SHIP';

        // Send order ready email notification
        try {
          await EmailService.sendOrderStatusEmail(orderItem.orderId, 'order_ready');
        } catch (emailError) {
          console.error('Failed to send order ready email:', emailError);
          // Don't fail the main operation if email fails
        }
      }
    }

    return {
      success: true,
      newItemStatus: nextStatus,
      orderStatusChanged: orderStatusChanged,
      newOrderStatus: newOrderStatus,
      processingLogId: processingLog?.id || null,
      message: `Item successfully moved to ${nextStatus.replace(/_/g, ' ')} status`,
      workflowStep: getWorkflowStepInfo(currentStatus, nextStatus, station.name)
    };

  } catch (error) {
    // Log error for debugging
    logError(error, 'warehouse/process-item', sessionData?.user?.id, {
      orderItemId,
      stationId,
      nextStatus,
      barcodeData
    });
    
    if (error.statusCode) {
      throw error;
    }

    // Handle Prisma errors
    if (error.code && error.code.startsWith('P')) {
      const prismaError = handlePrismaError(error);
      const errorResponse = createErrorResponse(prismaError.code, prismaError.message, 500);
      throw createError(errorResponse);
    }
    
    // Generic server error
    const errorResponse = createErrorResponse('SERVER_ERROR', error.message || 'Unknown error occurred', 500);
    throw createError(errorResponse);
  }
});