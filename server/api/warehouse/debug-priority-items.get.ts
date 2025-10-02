import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Get all order items with their order info for debugging
    const allItems = await prisma.orderItem.findMany({
      select: {
        id: true,
        itemStatus: true,
        isProduct: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            priority: true,
            orderStatus: true,
            createdAt: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        },
        item: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    return {
      success: true,
      data: allItems,
      meta: {
        totalCount: allItems.length,
        message: 'Debug data - showing recent order items with all details'
      }
    };

  } catch (error) {
    console.error('Debug API error:', error);
    
    return {
      success: false,
      error: 'Failed to fetch debug data',
      data: [],
      meta: {
        totalCount: 0
      }
    };
  }
});