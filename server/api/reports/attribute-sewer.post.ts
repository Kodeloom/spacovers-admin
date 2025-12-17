import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { logError } from '~/utils/errorHandling';

export default defineEventHandler(async (event) => {
  let sessionData: any = null;
  let body: any = {};
  
  try {
    body = await readBody(event);

    // Get the current user session
    sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Validate required fields
    const { orderItemId, sewerId } = body;
    
    if (!orderItemId || !sewerId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: orderItemId and sewerId are required'
      });
    }

    // Verify the order item exists and is in an advanced status
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        itemProcessingLogs: {
          include: {
            station: true,
            user: true
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });

    if (!orderItem) {
      console.error(`❌ Order item not found: ${orderItemId}`);
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      });
    }

    console.log(`🔍 Found order item:`, {
      id: orderItem.id,
      productNumber: orderItem.productNumber,
      status: orderItem.itemStatus,
      existingLogs: orderItem.itemProcessingLogs.length,
      logStations: orderItem.itemProcessingLogs.map(log => log.station?.name).join(', ')
    });

    // Check if item already has a sewing station log
    const hasSewerScan = orderItem.itemProcessingLogs.some(log => 
      log.station?.name === 'Sewing'
    );

    if (hasSewerScan) {
      throw createError({
        statusCode: 400,
        statusMessage: 'This item already has sewing attribution'
      });
    }

    // Verify the sewer exists and is active
    const sewer = await prisma.user.findUnique({
      where: { id: sewerId }
    });

    if (!sewer || sewer.status !== 'ACTIVE') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid sewer: user not found or not active'
      });
    }

    // Get the Sewing station
    const sewingStation = await prisma.station.findFirst({
      where: { name: 'Sewing' }
    });

    if (!sewingStation) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Sewing station not found in system'
      });
    }

    // Find the chronological position where the sewing log should be inserted
    // This should be after any Cutting logs and before any Foam Cutting logs
    const sortedLogs = orderItem.itemProcessingLogs
      .filter(log => log.startTime)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Find the appropriate time window for the sewing work
    let sewingStartTime: Date;
    let sewingEndTime: Date | null = null;

    // Look for cutting completion time (when cutting log got endTime)
    const cuttingLog = sortedLogs.find(log => log.station?.name === 'Cutting');
    
    // Look for the next station after cutting (should be where sewing work ended)
    const nextStationLog = sortedLogs.find(log => 
      log.station?.name !== 'Office' && 
      log.station?.name !== 'Cutting' &&
      log.station?.name !== 'Sewing'
    );

    // IMPORTANT: Use recent dates to ensure the log appears in current reports
    // We'll use the item's last update time or current time to ensure visibility
    const recentTime = new Date(Math.max(
      orderItem.updatedAt.getTime(),
      Date.now() - (24 * 60 * 60 * 1000) // At least within last 24 hours
    ));

    if (cuttingLog && cuttingLog.endTime) {
      // If cutting ended recently, use that time
      const cuttingEndTime = new Date(cuttingLog.endTime);
      if (cuttingEndTime.getTime() > (Date.now() - (30 * 24 * 60 * 60 * 1000))) { // Within 30 days
        sewingStartTime = cuttingEndTime;
      } else {
        // Use recent time if cutting was too long ago
        sewingStartTime = new Date(recentTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
      }
    } else {
      // Fallback: use recent time
      sewingStartTime = new Date(recentTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    }

    if (nextStationLog && nextStationLog.startTime) {
      const nextStartTime = new Date(nextStationLog.startTime);
      // Only use next station time if it's after our sewing start time AND makes sense chronologically
      if (nextStartTime.getTime() > sewingStartTime.getTime()) {
        sewingEndTime = nextStartTime;
      } else {
        // Use a minimal duration (1 second) if next station time doesn't make sense
        sewingEndTime = new Date(sewingStartTime.getTime() + 1000); // 1 second later
      }
    } else {
      // Default to 1 second of sewing work (minimal duration for attribution)
      sewingEndTime = new Date(sewingStartTime.getTime() + 1000); // 1 second later
    }

    // SAFETY CHECK: Ensure endTime is always after startTime
    if (sewingEndTime && sewingEndTime.getTime() <= sewingStartTime.getTime()) {
      console.warn(`⚠️ Invalid time range detected. EndTime (${sewingEndTime.toISOString()}) is not after StartTime (${sewingStartTime.toISOString()}). Using 1-second default duration.`);
      sewingEndTime = new Date(sewingStartTime.getTime() + 1000); // 1 second later
    }

    // Calculate duration if we have both start and end times
    let durationInSeconds: number | null = null;
    if (sewingEndTime) {
      const calculatedDuration = Math.floor((sewingEndTime.getTime() - sewingStartTime.getTime()) / 1000);
      
      // Safety check: ensure duration is positive
      if (calculatedDuration > 0) {
        durationInSeconds = calculatedDuration;
      } else {
        console.error(`❌ Calculated negative duration: ${calculatedDuration} seconds. StartTime: ${sewingStartTime.toISOString()}, EndTime: ${sewingEndTime.toISOString()}`);
        // Force a 1-second duration if calculation results in negative or zero
        durationInSeconds = 1; // 1 second
        sewingEndTime = new Date(sewingStartTime.getTime() + 1000);
      }
    }

    console.log(`🧵 Sewing attribution timing:`, {
      item: orderItem.productNumber,
      sewingStart: sewingStartTime.toISOString(),
      sewingEnd: sewingEndTime?.toISOString(),
      durationSeconds: durationInSeconds,
      itemUpdated: orderItem.updatedAt.toISOString(),
      cuttingEnd: cuttingLog?.endTime,
      nextStationStart: nextStationLog?.startTime,
      timeValidation: {
        startBeforeEnd: sewingEndTime ? sewingStartTime.getTime() < sewingEndTime.getTime() : 'N/A',
        durationPositive: durationInSeconds ? durationInSeconds > 0 : 'N/A'
      }
    });

    // Log what we're about to create
    console.log(`🧵 About to create sewing processing log:`, {
      orderItemId,
      sewerId,
      sewerName: sewer.name,
      stationId: sewingStation.id,
      stationName: sewingStation.name,
      startTime: sewingStartTime.toISOString(),
      endTime: sewingEndTime?.toISOString(),
      durationInSeconds
    });

    // Create the sewing processing log
    let sewingLog;
    try {
      sewingLog = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItemId,
          userId: sewerId,
          stationId: sewingStation.id,
          startTime: sewingStartTime,
          endTime: sewingEndTime,
          durationInSeconds: durationInSeconds,
          // Add a note that this was manually attributed
          notes: `Manually attributed by ${sessionData.user.name} on ${new Date().toISOString()}`
        },
        include: {
          user: true,
          station: true
        }
      });

      console.log(`✅ Successfully created sewing processing log:`, {
        logId: sewingLog.id,
        item: orderItem.productNumber,
        sewer: sewingLog.user.name,
        station: sewingLog.station.name,
        startTime: sewingLog.startTime,
        endTime: sewingLog.endTime,
        duration: sewingLog.durationInSeconds
      });

    } catch (createError: any) {
      console.error(`❌ Failed to create sewing processing log:`, {
        error: createError.message,
        code: createError.code,
        meta: createError.meta,
        orderItemId,
        sewerId,
        stationId: sewingStation.id
      });
      throw createError;
    }

    // Verify the log was actually created by querying it back
    const verifyLog = await prisma.itemProcessingLog.findUnique({
      where: { id: sewingLog.id },
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

    if (verifyLog) {
      console.log(`✅ Verified sewing log exists in database:`, {
        logId: verifyLog.id,
        orderItemId: verifyLog.orderItemId,
        productNumber: verifyLog.orderItem.productNumber,
        user: verifyLog.user.name,
        station: verifyLog.station.name
      });
    } else {
      console.error(`❌ Sewing log not found after creation! ID: ${sewingLog.id}`);
    }

    return {
      success: true,
      message: `Successfully attributed sewing work to ${sewer.name}`,
      sewingLog: {
        id: sewingLog.id,
        userName: sewingLog.user.name,
        stationName: sewingLog.station.name,
        startTime: sewingLog.startTime,
        endTime: sewingLog.endTime,
        duration: durationInSeconds
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'sewer_attribution', sessionData?.user?.id, { 
      orderItemId: body?.orderItemId,
      sewerId: body?.sewerId 
    });
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while attributing sewer',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Contact support if the problem persists'
          ]
        }
      });
    }
    
    // Generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while attributing sewer',
      data: {
        retryable: false,
        suggestions: [
          'Check that the item and sewer are valid',
          'Contact support if the problem persists'
        ]
      }
    });
  }
});