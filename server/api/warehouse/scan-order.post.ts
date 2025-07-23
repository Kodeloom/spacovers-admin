import { unenhancedPrisma as prisma } from '~/server/lib/db';

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

    // Find order by barcode
    const order = await prisma.order.findFirst({
      where: {
        barcode: barcode
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found with the provided barcode'
      });
    }

    // Check if order is approved for production
    if (order.orderStatus === 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order must be approved before production can begin'
      });
    }

    return {
      order
    };

  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    
    console.error('Error scanning order:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error scanning order'
    });
  }
}); 