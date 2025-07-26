import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const enhancedPrisma = await getEnhancedPrismaClient(event);
    
    // Find the last order with a salesOrderNumber
    const lastOrder = await enhancedPrisma.order.findFirst({
      where: {
        salesOrderNumber: {
          not: null
        }
      },
      orderBy: {
        salesOrderNumber: 'desc'
      },
      select: {
        salesOrderNumber: true
      }
    });

    let nextOrderNumber = '1001'; // Default starting number
    
    if (lastOrder?.salesOrderNumber) {
      // Extract numeric part and increment
      const numericPart = parseInt(lastOrder.salesOrderNumber.replace(/\D/g, ''), 10);
      if (!isNaN(numericPart)) {
        nextOrderNumber = (numericPart + 1).toString();
      }
    }

    return { nextOrderNumber };
  } catch (error) {
    console.error('Error getting last order number:', error);
    throw createError({ statusCode: 500, statusMessage: 'Failed to get last order number' });
  }
}); 