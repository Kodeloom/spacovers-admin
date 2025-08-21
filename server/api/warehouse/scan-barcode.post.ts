import { unenhancedPrisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { barcode } = body;

    if (!barcode) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Barcode is required'
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

    // Decode the barcode to get orderItemId
    // The barcode format should be: ORDER_ITEM_{id}
    // For now, we'll assume the barcode contains the orderItemId directly
    let orderItemId = barcode;
    
    // If barcode has a prefix, extract the ID
    if (barcode.startsWith('ORDER_ITEM_')) {
      orderItemId = barcode.replace('ORDER_ITEM_', '');
    }

    // Fetch the order item with full details
    const orderItem = await unenhancedPrisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        item: true
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
    const activeProcessing = await unenhancedPrisma.itemProcessingLog.findFirst({
      where: {
        orderItemId: orderItem.id,
        endTime: null // Still in progress
      }
    });

    if (activeProcessing) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Item is already being processed at another station'
      });
    }

    // Return the order item details
    return {
      success: true,
      data: orderItem
    };

  } catch (error) {
    console.error('Error scanning barcode:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to scan barcode'
    });
  }
});
