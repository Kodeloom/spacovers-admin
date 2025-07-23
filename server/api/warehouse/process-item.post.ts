import { PrismaClient, type OrderItemProcessingStatus } from '@prisma-app/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    });
  }

  try {
    const body = await readBody(event);
    const { orderId, orderItemId, stationIdentifier, userId } = body;

    // Validate required fields
    if (!orderId || !orderItemId || !stationIdentifier || !userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderId, orderItemId, stationIdentifier, userId'
      });
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the order and verify it's approved
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              item: true
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.orderStatus !== 'APPROVED' && order.orderStatus !== 'ORDER_PROCESSING') {
        throw new Error('Order is not approved for production');
      }

      // 2. Fetch the order item
      const orderItem = await tx.orderItem.findUnique({
        where: { id: orderItemId },
        include: {
          item: true,
          order: true
        }
      });

      if (!orderItem) {
        throw new Error('Order item not found');
      }

      if (orderItem.orderId !== orderId) {
        throw new Error('Order item does not belong to the specified order');
      }

      if (orderItem.itemStatus === 'READY') {
        throw new Error('This item has already completed production');
      }

      // 3. Find the station by barcode or name
      const station = await tx.station.findFirst({
        where: {
          OR: [
            { barcode: stationIdentifier },
            { name: { equals: stationIdentifier, mode: 'insensitive' } }
          ]
        },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!station) {
        throw new Error(`Station not found: ${stationIdentifier}`);
      }

      // 4. Fetch user with roles
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // 5. Check role-station authorization (optional - for now we'll allow any user)
      // In a real implementation, you'd check if user's roles are associated with the station
      // const userRoleIds = user.roles.map(ur => ur.role.id);
      // const stationRoleIds = station.roles.map(sr => sr.role.id);
      // const hasPermission = userRoleIds.some(roleId => stationRoleIds.includes(roleId));
      // if (!hasPermission) {
      //   throw new Error(`User does not have permission to work at station: ${station.name}`);
      // }

      // 6. Check for existing active task by this user
      const existingActiveTask = await tx.itemProcessingLog.findFirst({
        where: {
          userId: userId,
          endTime: null
        }
      });

      if (existingActiveTask) {
        throw new Error('User already has an active task. Please complete current task before starting a new one.');
      }

      // 7. Validate station sequence
      const expectedStation = getNextStationForItem(orderItem.itemStatus);
      if (expectedStation && station.name !== expectedStation) {
        throw new Error(`Invalid station. Expected: ${expectedStation}, but got: ${station.name}`);
      }

      // 8. If there's an existing processing log for this item (at previous station), close it
      const existingItemLog = await tx.itemProcessingLog.findFirst({
        where: {
          orderItemId: orderItemId,
          endTime: null
        }
      });

      if (existingItemLog) {
        const endTime = new Date();
        const durationInSeconds = Math.floor((endTime.getTime() - new Date(existingItemLog.startTime).getTime()) / 1000);
        
        await tx.itemProcessingLog.update({
          where: { id: existingItemLog.id },
          data: {
            endTime,
            durationInSeconds
          }
        });
      }

      // 9. Create new processing log entry
      const startTime = new Date();
      const processingLog = await tx.itemProcessingLog.create({
        data: {
          orderItemId,
          stationId: station.id,
          userId,
          startTime,
          notes: `Started processing at ${station.name}`
        }
      });

      // 10. Update order item status
      const newItemStatus = getItemStatusForStation(station.name) as OrderItemProcessingStatus;
      const updatedOrderItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          itemStatus: newItemStatus
        }
      });

      // 11. Update order status if this is the first item to start production
      if (order.orderStatus === 'APPROVED') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'ORDER_PROCESSING'
          }
        });
      }

      // 12. Check if all items in the order are now READY
      const allOrderItems = await tx.orderItem.findMany({
        where: { orderId }
      });

      const allItemsReady = allOrderItems.every(item => 
        item.id === orderItemId ? newItemStatus === 'READY' : item.itemStatus === 'READY'
      );

      if (allItemsReady) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            orderStatus: 'READY_TO_SHIP',
            readyToShipAt: new Date()
          }
        });
      }

      // Send email notifications
      if (newItemStatus === 'READY') {
        // Send item ready notification
        try {
          const { emailService } = await import('~/server/utils/emailService');
          await emailService.sendOrderItemReady(order.contactEmail, {
            orderNumber: order.salesOrderNumber || order.id.slice(-8),
            customerName: order.customer?.name || 'Valued Customer',
            itemName: orderItem.item?.name || 'Item',
            quantity: orderItem.quantity
          });
        } catch (emailError) {
          console.error('Error sending item ready email:', emailError);
        }
      }

      if (allItemsReady) {
        // Send order ready to ship notification
        try {
          const { emailService } = await import('~/server/utils/emailService');
          await emailService.sendOrderStatusUpdate(order.contactEmail, {
            orderNumber: order.salesOrderNumber || order.id.slice(-8),
            customerName: order.customer?.name || 'Valued Customer',
            orderStatus: 'READY_TO_SHIP'
          });
        } catch (emailError) {
          console.error('Error sending order ready email:', emailError);
        }
      }

      return {
        processingLog,
        updatedOrderItem,
        station,
        orderStatusUpdated: order.orderStatus === 'APPROVED' || allItemsReady
      };
    });

    return {
      success: true,
      message: `Item processing started at ${result.station.name}`,
      data: result
    };

  } catch (error: unknown) {
    console.error('Error in warehouse processing:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error processing warehouse item';
    throw createError({
      statusCode: 400,
      statusMessage: errorMessage
    });
  }
});

// Helper function to determine the next station based on current item status
function getNextStationForItem(currentStatus: string): string | null {
  switch (currentStatus) {
    case 'NOT_STARTED_PRODUCTION':
      return 'Cutting';
    case 'CUTTING':
      return 'Sewing';
    case 'SEWING':
      return 'Foam Cutting';
    default:
      return null;
  }
}

// Helper function to determine the item status based on station
function getItemStatusForStation(stationName: string): string {
  switch (stationName.toLowerCase()) {
    case 'cutting':
      return 'CUTTING';
    case 'sewing':
      return 'SEWING';
    case 'foam cutting':
      return 'FOAM_CUTTING';
    default:
      throw new Error(`Unknown station: ${stationName}`);
  }
} 