import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
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
  let sessionData = null; // Declare outside try block for error handling
  let orderItemId, stationId, nextStatus, barcodeData, userId, currentStatus; // Declare outside try block for error handling
  
  try {
    const body = await readBody(event);
    ({ orderItemId, stationId, userId, barcodeData, currentStatus, nextStatus } = body);

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
    sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    const prisma = await getEnhancedPrismaClient(event);
    // Use unenhanced client for processing logs to avoid permission issues
    const logPrisma = unenhancedPrisma;

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
    
    console.log('🔍 Station Info:', {
      stationId: station.id,
      stationName: station.name,
      requestedStationId: stationId
    });

    console.log('🔍 Process Item Debug Info:', {
      orderItemId,
      stationId,
      userId,
      scannerPrefix: barcodeData?.prefix,
      currentStatus,
      nextStatus,
      sessionUserId: sessionData.user.id
    });

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
      
      console.log('🔍 Scanner Info:', {
        found: !!scanner,
        scannerUserId: scanner?.userId,
        scannerStationId: scanner?.stationId,
        scannerStationName: scanner?.station?.name,
        requestedStationId: stationId
      });

      if (scanner) {
        // In kiosk mode, the scanner identifies the user doing the work
        // No need to validate against logged-in user - scanner determines who gets credit
        console.log(`🔍 Scanner ${barcodeData.prefix} identifies user: ${scanner.user.name} for this work`);
        
        // Use the scanner's user for all work logging instead of the logged-in user
        sessionData.user = scanner.user;

        // Verify the scanner is assigned to the correct station
        // Special handling for office scanners - they can work with any station for workflow transitions
        const isOfficeScanner = scanner.station?.name === 'Office' || scanner.stationId === null;
        const isOfficeStation = station.name === 'Office';
        
        if (!isOfficeScanner && !isOfficeStation && scanner.stationId !== station.id) {
          throw createError({
            statusCode: 403,
            statusMessage: `Scanner ${barcodeData.prefix} is assigned to ${scanner.station?.name || 'Office'} station, but you're trying to process work at ${station.name} station. Please use the correct scanner for this station.`
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

    // Note: Removed active work check - workers scan when they FINISH work, not start
    // This allows workers to complete multiple items in sequence without restrictions
    console.log('📋 Allowing scan - workers scan when completing work, not starting');

    // Check if there's an existing active log for this item (from previous station)
    const existingLog = await logPrisma.itemProcessingLog.findFirst({
      where: {
        orderItemId: orderItemId,
        endTime: null // Still in progress
      },
      include: {
        user: true,
        station: true
      }
    });

    // Note: Removed concurrent access check - workers scan when finishing, not starting
    // Multiple scans are allowed as they represent completion of work, not conflicts
    console.log(`📋 ${existingLog ? 'Existing log found - will close it' : 'No existing log'} for item processing`);

    // If there's an existing log, close it first (completing previous station work)
    if (existingLog) {
      const endTime = new Date();
      const durationInSeconds = Math.floor((endTime.getTime() - existingLog.startTime.getTime()) / 1000);
      
      await logPrisma.itemProcessingLog.update({
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

    // Create ItemStatusLog entry for UI display and audit trail
    try {
      await logPrisma.itemStatusLog.create({
        data: {
          orderItemId: orderItemId,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          userId: sessionData.user.id,
          changeReason: `Scanned at ${station.name} station`,
          triggeredBy: 'scanner',
          notes: `Scanner: ${barcodeData?.prefix || 'Unknown'} - ${getWorkflowStepInfo(currentStatus, nextStatus, station.name).description}`
        }
      });
      console.log('✅ ItemStatusLog created for UI display');
    } catch (statusLogError) {
      console.error('❌ Failed to create ItemStatusLog:', statusLogError);
      // Don't fail the whole operation
    }

    // Create ItemProcessingLog entry for time tracking and existing KPIs
    let processingLog = null;
    if (nextStatus !== 'READY') {
      console.log('📝 Creating processing log for ongoing work');
      try {
        processingLog = await logPrisma.itemProcessingLog.create({
          data: {
            orderItemId: orderItemId,
            stationId: station.id,
            userId: sessionData.user.id,
            startTime: new Date(),
            notes: `Started work at ${station.name} station - Status: ${nextStatus} - Scanner: ${barcodeData?.prefix || 'Unknown'}`
          }
        });
        console.log('✅ Processing log created:', processingLog.id);
      } catch (logError) {
        console.error('❌ Failed to create processing log:', logError);
        // Don't fail the whole operation, just log the error
      }
    } else {
      console.log('📝 Creating completion log for final step');
      try {
        const completionLog = await logPrisma.itemProcessingLog.create({
          data: {
            orderItemId: orderItemId,
            stationId: station.id,
            userId: sessionData.user.id,
            startTime: new Date(),
            endTime: new Date(),
            durationInSeconds: 0,
            notes: `Final scan - Product ready for delivery/pickup - Scanner: ${barcodeData?.prefix || 'Unknown'}`
          }
        });
        console.log('✅ Completion log created:', completionLog.id);
      } catch (logError) {
        console.error('❌ Failed to create completion log:', logError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Track order status changes based on workflow steps
    let orderStatusChanged = false;
    let newOrderStatus = orderItem.order.orderStatus;

    // Step 1: First item starting production (Office scan: NOT_STARTED -> CUTTING)
    if (nextStatus === 'CUTTING' && orderItem.order.orderStatus === 'APPROVED') {
      console.log('🔄 Updating order status from APPROVED to ORDER_PROCESSING');
      await prisma.order.update({
        where: { id: orderItem.orderId },
        data: {
          orderStatus: 'ORDER_PROCESSING'
        }
      });
      orderStatusChanged = true;
      newOrderStatus = 'ORDER_PROCESSING';
      console.log('✅ Order status updated to ORDER_PROCESSING');

      // Create OrderStatusLog entry for audit trail
      try {
        await logPrisma.orderStatusLog.create({
          data: {
            orderId: orderItem.orderId,
            fromStatus: 'APPROVED',
            toStatus: 'ORDER_PROCESSING',
            userId: sessionData.user.id,
            changeReason: 'Production started - first item scanned',
            triggeredBy: 'scanner',
            notes: `Production started by ${sessionData.user.name || 'Unknown'} scanning item at ${station.name} station - Scanner: ${barcodeData?.prefix || 'Unknown'}`
          }
        });
        console.log('✅ OrderStatusLog created for APPROVED -> ORDER_PROCESSING');
      } catch (orderLogError) {
        console.error('❌ Failed to create OrderStatusLog:', orderLogError);
        // Don't fail the main operation
      }

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
      const allItems = await logPrisma.orderItem.findMany({
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

        // Create OrderStatusLog entry for final status change
        try {
          await logPrisma.orderStatusLog.create({
            data: {
              orderId: orderItem.orderId,
              fromStatus: 'ORDER_PROCESSING',
              toStatus: 'READY_TO_SHIP',
              userId: sessionData.user.id,
              changeReason: 'All items completed - ready to ship',
              triggeredBy: 'scanner',
              notes: `Order completed by ${sessionData.user.name || 'Unknown'} - final item scanned at ${station.name} station - Scanner: ${barcodeData?.prefix || 'Unknown'}`
            }
          });
          console.log('✅ OrderStatusLog created for ORDER_PROCESSING -> READY_TO_SHIP');
        } catch (orderLogError) {
          console.error('❌ Failed to create OrderStatusLog:', orderLogError);
          // Don't fail the main operation
        }

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