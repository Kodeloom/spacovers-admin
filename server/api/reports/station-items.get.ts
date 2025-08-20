import { unenhancedPrisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    // Get all stations
    const stations = await unenhancedPrisma.station.findMany({
      orderBy: { name: 'asc' }
    });

    // Get current items at each station
    const stationItems = await Promise.all(
      stations.map(async (station) => {
        // Count items currently at this station (have startTime but no endTime)
        const itemsAtStation = await unenhancedPrisma.itemProcessingLog.count({
          where: {
            stationId: station.id,
            startTime: {
              gte: new Date(0) // Any date from epoch (1970) onwards
            },
            endTime: null // Still at this station
          }
        });

        return {
          stationId: station.id,
          stationName: station.name,
          itemsCount: itemsAtStation
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
