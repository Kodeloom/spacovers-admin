import { unenhancedPrisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const timeFilter = query.timeFilter as string;

    let dateFilter: any = {};

    // Calculate date range based on time filter
    const now = new Date();
    switch (timeFilter) {
      case '30':
        dateFilter = {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        break;
      case '60':
        dateFilter = {
          gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        };
        break;
      case '90':
        dateFilter = {
          gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'ytd':
        dateFilter = {
          gte: new Date(now.getFullYear(), 0, 1)
        };
        break;
      case '365':
        dateFilter = {
          gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'lifetime':
      default:
        dateFilter = {}; // No date filter for lifetime
        break;
    }

    // Get counts for each status
    const [pending, inProgress, readyToShip, completed] = await Promise.all([
      // Orders Pending - count orders created within time period
      unenhancedPrisma.order.count({
        where: {
          orderStatus: 'PENDING',
          createdAt: dateFilter
        }
      }),
      // Orders In Progress - count orders that changed to ORDER_PROCESSING within time period
      unenhancedPrisma.order.count({
        where: {
          orderStatus: 'ORDER_PROCESSING',
          // We'll need to check when the status changed to ORDER_PROCESSING
          // For now, we'll use a simple approach
          updatedAt: dateFilter
        }
      }),
      // Orders Ready to Ship - count orders that changed to READY_TO_SHIP within time period
      unenhancedPrisma.order.count({
        where: {
          orderStatus: 'READY_TO_SHIP',
          updatedAt: dateFilter
        }
      }),
      // Orders Completed - count orders that changed to COMPLETED within time period
      unenhancedPrisma.order.count({
        where: {
          orderStatus: 'COMPLETED',
          updatedAt: dateFilter
        }
      })
    ]);

    return {
      pending,
      inProgress,
      readyToShip,
      completed
    };
  } catch (error) {
    console.error('Error fetching order counts:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch order counts'
    });
  }
});
