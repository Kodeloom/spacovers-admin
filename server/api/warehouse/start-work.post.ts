import { unenhancedPrisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { orderItemId, stationCode } = body;

    if (!orderItemId || !stationCode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order item ID and station code are required'
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

    // Verify the station code
    const station = await unenhancedPrisma.station.findFirst({
      where: { barcode: stationCode }
    });

    if (!station) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid station code'
      });
    }

    // Check if user has permission to work at this station
    const userRole = await unenhancedPrisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: {
          stations: {
            some: {
              stationId: station.id
            }
          }
        }
      },
      include: {
        role: true
      }
    });

    if (!userRole) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have permission to work at this station'
      });
    }

    // Check if user is already working on another item
    const activeWork = await unenhancedPrisma.itemProcessingLog.findFirst({
      where: {
        userId: session.user.id,
        endTime: null
      }
    });

    if (activeWork) {
      throw createError({
        statusCode: 400,
        statusMessage: 'You are already working on another item. Please complete it first.'
      });
    }

    // Get the order item
    const orderItem = await unenhancedPrisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true
      }
    });

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      });
    }

    // Verify the order is approved
    if (orderItem.order.orderStatus !== 'APPROVED') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order is not approved for production'
      });
    }

    // Check if this item is already being processed
    const existingProcessing = await unenhancedPrisma.itemProcessingLog.findFirst({
      where: {
        orderItemId: orderItem.id,
        endTime: null
      }
    });

    if (existingProcessing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item is already being processed at another station'
      });
    }

    // Determine the new item status based on the station
    let newItemStatus;
    switch (station.name) {
      case 'Cutting':
        newItemStatus = 'CUTTING';
        break;
      case 'Sewing':
        newItemStatus = 'SEWING';
        break;
      case 'Foam Cutting':
        newItemStatus = 'FOAM_CUTTING';
        break;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: 'Unknown station type'
        });
    }

    // Start a transaction to update both the item status and create the processing log
    const result = await unenhancedPrisma.$transaction(async (tx) => {
      // Update the order item status
      const updatedOrderItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: { itemStatus: newItemStatus }
      });

      // Create the processing log entry
      const processingLog = await tx.itemProcessingLog.create({
        data: {
          orderItemId: orderItemId,
          stationId: station.id,
          userId: session.user.id,
          startTime: new Date(),
          notes: `Started work at ${station.name} station`
        }
      });

      // If this is the first item starting production, update order status
      if (orderItem.order.orderStatus === 'APPROVED') {
        await tx.order.update({
          where: { id: orderItem.order.id },
          data: { orderStatus: 'ORDER_PROCESSING' }
        });
      }

      return { updatedOrderItem, processingLog };
    });

    // Log the status change for audit purposes
    await unenhancedPrisma.itemStatusLog.create({
      data: {
        orderItemId: orderItemId,
        fromStatus: orderItem.itemStatus,
        toStatus: newItemStatus,
        userId: session.user.id,
        reason: `Started work at ${station.name} station`,
        timestamp: new Date()
      }
    });

    return {
      success: true,
      data: {
        orderItem: result.updatedOrderItem,
        processingLog: result.processingLog,
        station: station
      }
    };

  } catch (error) {
    console.error('Error starting work:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to start work'
    });
  }
});
