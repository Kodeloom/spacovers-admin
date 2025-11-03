import { unenhancedPrisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    // Map station names to item statuses
    const stationStatusMap: Record<string, string> = {
      'Cutting': 'CUTTING',
      'Sewing': 'SEWING', 
      'Foam Cutting': 'FOAM_CUTTING',
      'Stuffing': 'STUFFING',
      'Packaging': 'PACKAGING'
    };

    // Get counts for each station based on item status
    const stationItems = await Promise.all(
      Object.entries(stationStatusMap).map(async ([stationName, itemStatus]) => {
        // Count items with this status (only production items)
        const itemsCount = await unenhancedPrisma.orderItem.count({
          where: {
            itemStatus: itemStatus,
            isProduct: true // Only count production items
          }
        });

        return {
          stationId: itemStatus, // Use status as ID for consistency
          stationName: stationName,
          itemsCount: itemsCount
        };
      })
    );

    return stationItems;
  } catch (error) {
    console.error('Error fetching station items:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch station items'
    });
  }
});
