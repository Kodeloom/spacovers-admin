import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    const query = getQuery(event);
    const limit = Math.min(parseInt(query.limit as string) || 5, 10); // Max 10 orders

    // Fetch recent orders with customer info
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        salesOrderNumber: true,
        purchaseOrderNumber: true,
        orderStatus: true,
        createdAt: true,
        customer: {
          select: {
            name: true
          }
        }
      }
    });

    // Format the response to match expected structure
    const formattedOrders = orders.map(order => ({
      id: order.id,
      salesOrderNumber: order.salesOrderNumber,
      purchaseOrderNumber: order.purchaseOrderNumber,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      customerName: order.customer?.name || 'Unknown Customer'
    }));

    return formattedOrders;

  } catch (error: any) {
    console.error('Error fetching recent orders:', error);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Return empty array on error to prevent dashboard from breaking
    return [];
  }
});