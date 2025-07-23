import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { userId } = query;

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      });
    }

    // Find active processing log for this user (where endTime is null)
    const activeLog = await prisma.itemProcessingLog.findFirst({
      where: {
        userId: userId as string,
        endTime: null
      },
      include: {
        station: true,
        orderItem: {
          include: {
            item: true,
            order: {
              include: {
                customer: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    if (!activeLog) {
      return {
        activeTask: null
      };
    }

    return {
      activeTask: {
        id: activeLog.id,
        stationName: activeLog.station.name,
        itemName: activeLog.orderItem.item?.name,
        orderNumber: activeLog.orderItem.order.salesOrderNumber || activeLog.orderItem.order.id.slice(-8),
        customerName: activeLog.orderItem.order.customer?.name,
        startTime: activeLog.startTime
      }
    };

  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    console.error('Error checking active task:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error checking active task'
    });
  }
}); 