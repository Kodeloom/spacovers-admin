import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { startDate, endDate, stationId, userId } = query;

    // Build where clause for filtering
    const whereClause = {
      endTime: { not: null }, // Only completed tasks
      ...(startDate && { startTime: { gte: new Date(startDate as string) } }),
      ...(endDate && { endTime: { lte: new Date(endDate as string) } }),
      ...(stationId && { stationId: stationId as string }),
      ...(userId && { userId: userId as string }),
    };

    // Fetch processing logs with related data
    const processingLogs = await prisma.itemProcessingLog.findMany({
      where: whereClause,
      include: {
        user: true,
        station: true,
        orderItem: {
          include: {
            item: true
          }
        }
      }
    });

    // Group by user and station to calculate aggregated data
    const aggregatedData = new Map<string, {
      userId: string;
      userName: string;
      stationId: string;
      stationName: string;
      itemsProcessed: number;
      totalDuration: number;
      totalCost: number;
      durations: number[];
    }>();

    for (const log of processingLogs) {
      const key = `${log.userId}-${log.stationId}`;
      
      if (!aggregatedData.has(key)) {
        aggregatedData.set(key, {
          userId: log.userId,
          userName: log.user.name,
          stationId: log.stationId,
          stationName: log.station.name,
          itemsProcessed: 0,
          totalDuration: 0,
          totalCost: 0,
          durations: []
        });
      }

      const data = aggregatedData.get(key)!;
      data.itemsProcessed += 1;
      
      if (log.durationInSeconds) {
        data.totalDuration += log.durationInSeconds;
        data.durations.push(log.durationInSeconds);
        
        // Calculate cost (duration in hours * hourly rate)
        if (log.user.hourlyRate) {
          const hours = log.durationInSeconds / 3600;
          data.totalCost += hours * parseFloat(log.user.hourlyRate.toString());
        }
      }
    }

    // Convert map to array and calculate averages
    const result = Array.from(aggregatedData.values()).map(data => ({
      ...data,
      avgDuration: data.durations.length > 0 
        ? Math.round(data.totalDuration / data.durations.length)
        : 0
    }));

    // Sort by total cost descending
    result.sort((a, b) => b.totalCost - a.totalCost);

    return result;

  } catch (error) {
    console.error('Error generating productivity report:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Error generating productivity report'
    });
  }
}); 