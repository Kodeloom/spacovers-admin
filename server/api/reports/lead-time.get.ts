import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { startDate, endDate } = query;

    // Build where clause for filtering orders
    const whereClause = {
      orderStatus: { not: 'PENDING' }, // Only non-pending orders
      ...(startDate && { createdAt: { gte: new Date(startDate as string) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate as string) } }),
    };

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate lead times and production metrics
    const result = orders.map((order: Record<string, any>) => {
      const now = new Date();
      const createdAt = new Date(order.createdAt);
      const approvedAt = order.approvedAt ? new Date(order.approvedAt) : null;
      const readyToShipAt = order.readyToShipAt ? new Date(order.readyToShipAt) : null;

      // Calculate days in production
      let daysInProduction = 0;
      if (approvedAt) {
        const endDate = readyToShipAt || now;
        daysInProduction = Math.ceil((endDate.getTime() - approvedAt.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate total lead time (from creation to ready)
      let totalLeadTime = 0;
      if (readyToShipAt) {
        totalLeadTime = Math.ceil((readyToShipAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: order.id,
        salesOrderNumber: order.salesOrderNumber,
        customerName: order.customer?.name || 'Unknown',
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        approvedAt: order.approvedAt,
        readyToShipAt: order.readyToShipAt,
        daysInProduction,
        totalLeadTime,
        totalItems: order.items.length,
        readyItems: order.items.filter((item: { itemStatus: string }) => item.itemStatus === 'READY').length,
      };
    });

    return result;

  } catch (error) {
    console.error('Error generating lead time report:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error generating lead time report'
    });
  }
}); 