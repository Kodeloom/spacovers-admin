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
    const status = query.status as string;

    if (!status) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Status parameter is required'
      });
    }

    // Fetch items with the specified status
    const items = await prisma.orderItem.findMany({
      where: {
        itemStatus: status,
        isProduct: true // Only production items
      },
      include: {
        item: {
          select: {
            name: true
          }
        },
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            purchaseOrderNumber: true,
            priority: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { order: { priority: 'desc' } }, // High priority first
        { updatedAt: 'desc' } // Most recently updated first
      ]
    });

    return {
      success: true,
      data: items,
      count: items.length
    };

  } catch (error: any) {
    console.error('Error fetching items by status:', error);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch items by status',
      data: {
        success: false,
        data: [],
        count: 0,
        error: error?.message || 'Unknown error occurred'
      }
    });
  }
});