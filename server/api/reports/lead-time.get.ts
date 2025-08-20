import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { startDate, endDate, days } = query;

    // Build where clause for filtering orders
    const whereClause: any = {
      // Include orders that have progressed beyond PENDING
      // (APPROVED, ORDER_PROCESSING, READY_TO_SHIP, SHIPPED, COMPLETED)
      orderStatus: { 
        notIn: ['PENDING', 'CANCELLED', 'ARCHIVED'] 
      },
    };

    // If days parameter is provided, use it to calculate date range
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));
      whereClause.createdAt = { gte: daysAgo };
    } else {
      // Fall back to startDate/endDate if provided
      if (startDate) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(startDate as string) };
      if (endDate) whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(endDate as string) };
    }

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

      // Calculate total lead time with fallback hierarchy
      let totalLeadTime = 0;
      let endDate = null;

      // Check in priority order: readyToShipAt -> shippedAt -> completed (updatedAt)
      if (readyToShipAt) {
        endDate = new Date(readyToShipAt);
      } else if (order.shippedAt) {
        endDate = new Date(order.shippedAt);
      } else if (order.orderStatus === 'COMPLETED') {
        endDate = new Date(order.updatedAt); // When it was marked completed
      }

      if (endDate) {
        totalLeadTime = Math.ceil((endDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
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

    // Calculate average lead time
    const completedOrders = result.filter((order: any) => order.totalLeadTime > 0);
    const avgLeadTime = completedOrders.length > 0 
      ? Math.round(completedOrders.reduce((sum: number, order: any) => sum + order.totalLeadTime, 0) / completedOrders.length)
      : 0;

    // If days parameter is provided, return just the average lead time
    if (days) {
      return { avgLeadTime };
    }

    // Otherwise return the full result with average
    return {
      orders: result,
      avgLeadTime
    };

  } catch (error) {
    console.error('Error generating lead time report:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error generating lead time report'
    });
  }
}); 