import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    console.log('API received body:', JSON.stringify(body, null, 2));
    const { barcode, barcodeData } = body;

    if (!barcode || !barcodeData) {
      console.log('Missing barcode or barcodeData:', { barcode, barcodeData });
      throw createError({
        statusCode: 400,
        statusMessage: 'Barcode and barcode data are required'
      });
    }

    const { orderNumber, itemId } = barcodeData;
    console.log('Looking for order:', orderNumber, 'item:', itemId);

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    const prisma = await getEnhancedPrismaClient(event);

    // Find the order by sales order number
    const order = await prisma.order.findFirst({
      where: {
        salesOrderNumber: orderNumber
      },
      include: {
        customer: true,
        items: {
          include: {
            item: true,
            productAttributes: true,
            itemProcessingLogs: {
              orderBy: {
                startTime: 'desc'
              },
              take: 1,
              include: {
                station: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      console.log('Order not found for orderNumber:', orderNumber);
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      });
    }
    
    console.log('Found order:', order.id, 'with', order.items.length, 'items');

    // Verify the order is not pending (must be approved or in production)
    if (order.orderStatus === 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order must be approved before production can begin. Please contact office staff.'
      });
    }

    // Additional validation for archived orders
    if (order.orderStatus === 'ARCHIVED' || order.orderStatus === 'CANCELLED') {
      throw createError({
        statusCode: 400,
        statusMessage: `Cannot process ${order.orderStatus.toLowerCase()} order. Please contact office staff.`
      });
    }

    // Verify the item exists in this order
    // PRIORITY 1: Try matching by productNumber (NEW FORMAT)
    // Product numbers are numeric (e.g., 1001, 1002, etc.)
    const itemIdAsNumber = parseInt(itemId, 10);
    let orderItem = !isNaN(itemIdAsNumber) 
      ? order.items.find(item => (item as any).productNumber === itemIdAsNumber)
      : undefined;
    
    // PRIORITY 2: Try direct match with full CUID (OLD FORMAT - for backward compatibility)
    if (!orderItem) {
      orderItem = order.items.find(item => item.id === itemId);
    }
    
    // PRIORITY 3: Try the old short format: {position}{first4chars} (LEGACY)
    if (!orderItem && itemId.length === 6) {
      const position = parseInt(itemId.substring(0, 2)) - 1; // Convert back to 0-based index
      const idPrefix = itemId.substring(2); // Get the first 4 chars
      
      // Find production items only (same logic as frontend)
      const productionItems = order.items.filter(item => 
        item.item?.isProductionItem === true
      );
      
      // Check if the position is valid and the ID prefix matches
      if (position >= 0 && position < productionItems.length) {
        const candidateItem = productionItems[position];
        if (candidateItem.id.startsWith(idPrefix)) {
          orderItem = candidateItem;
        }
      }
    }
    
    // PRIORITY 4: Fallback - try matching with last 8 characters (LEGACY)
    if (!orderItem && itemId.length === 8) {
      orderItem = order.items.find(item => item.id.slice(-8) === itemId);
    }
    
    if (!orderItem) {
      console.log('Item not found. Looking for itemId:', itemId);
      console.log('Available item IDs:', order.items.map(item => item.id));
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found in this order'
      });
    }
    
    console.log('Found orderItem:', orderItem.id, 'with status:', orderItem.itemStatus);

    // Return the order with the item status - let the client handle workflow validation
    // This way we can show proper status-based error messages

    // Return the order with all items
    return {
      order: order
    };

  } catch (error) {
    console.error('Error scanning order:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to scan order'
    });
  }
});