/**
 * Debug script to find why main table and modal counts are different
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function debugCountMismatch() {
  console.log('🔍 Debugging count mismatch between main table and modal...');
  
  try {
    // Get date range - YOU NEED TO SET THIS TO MATCH YOUR UI
    // Check what date range you have selected in the productivity report UI
    // and update these dates to match exactly
    
    console.log('⚠️  IMPORTANT: Make sure these dates match your UI date filter!');
    
    // CHANGE THESE DATES TO MATCH YOUR UI:
    const startDate = new Date('2025-11-18T00:00:00.000Z'); // Matches your API call
    const endDate = new Date('2025-12-18T23:59:59.999Z');   // Matches your API call
    
    console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Test both date formats used by the APIs
    const modalStartDate = '2025-11-18'; // Format used by modal API
    const modalEndDate = '2025-12-18';   // Format used by modal API
    console.log(`📅 Modal API date format: ${modalStartDate} to ${modalEndDate}`);
    
    // Convert modal dates to full ISO format for comparison
    const modalStartISO = new Date(modalStartDate + 'T00:00:00.000Z');
    const modalEndISO = new Date(modalEndDate + 'T23:59:59.999Z');
    console.log(`📅 Modal dates converted: ${modalStartISO.toISOString()} to ${modalEndISO.toISOString()}`);
    
    if (startDate.getTime() !== modalStartISO.getTime() || endDate.getTime() !== modalEndISO.getTime()) {
        console.log('⚠️  DATE MISMATCH DETECTED! Main table and modal are using different date ranges!');
    }
    
    // MANUALLY SET THE EXACT USER AND STATION YOU'RE SEEING THE MISMATCH WITH
    // Based on your API responses - Jorge at Cutting showing 66 vs 96:
    
    const targetUserName = 'Jorge'; // Matches your API response
    const targetStationName = 'Cutting'; // Matches your API response (not Sewing!)
    
    // Find the specific user and station
    const userWithScans = await prisma.itemProcessingLog.findFirst({
      where: {
        user: { name: targetUserName },
        station: { name: targetStationName },
        startTime: { gte: startDate },
        OR: [
          { endTime: { lte: endDate } },
          { endTime: null }
        ]
      },
      include: {
        user: true,
        station: true
      }
    });
    
    if (!userWithScans) {
      console.log('❌ No scans found in date range');
      return;
    }
    
    const userId = userWithScans.userId;
    const stationId = userWithScans.stationId;
    const userName = userWithScans.user?.name;
    const stationName = userWithScans.station?.name;
    
    console.log(`\n👤 Testing user: ${userName} at ${stationName}`);
    console.log(`   userId: ${userId}`);
    console.log(`   stationId: ${stationId}`);
    
    // MAIN TABLE LOGIC (from productivity.get.ts)
    console.log('\n📊 MAIN TABLE QUERY:');
    const mainTableWhereClause = {
      startTime: { not: null },
      startTime: { gte: startDate },
      OR: [
        { endTime: { lte: endDate } },
        { endTime: null }
      ],
      orderItem: {
        isProduct: true
      }
    };
    
    const mainTableLogs = await prisma.itemProcessingLog.findMany({
      where: mainTableWhereClause,
      include: {
        user: true,
        station: true,
        orderItem: true
      }
    });
    
    // Filter by user and station (same as main table grouping)
    const mainTableUserStationLogs = mainTableLogs.filter(log => 
      log.userId === userId && 
      log.stationId === stationId &&
      log.station?.name !== 'Office'
    );
    
    console.log(`   Total logs in date range: ${mainTableLogs.length}`);
    console.log(`   Logs for ${userName} at ${stationName}: ${mainTableUserStationLogs.length}`);
    
    // Test the exact grouping logic from productivity.get.ts
    const groupedData = {};
    mainTableLogs.forEach(log => {
      const key = `${log.userId}-${log.stationId}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          userId: log.userId,
          userName: log.user?.name,
          stationId: log.stationId,
          stationName: log.station?.name,
          scans: []
        };
      }
      groupedData[key].scans.push(log);
    });
    
    const jorgeKey = `${userId}-${stationId}`;
    const jorgeGroup = groupedData[jorgeKey];
    if (jorgeGroup) {
      console.log(`📊 Main table grouped count for Jorge-Cutting: ${jorgeGroup.scans.length}`);
    } else {
      console.log(`📊 No grouped data found for Jorge-Cutting combination`);
    }
    
    // MODAL LOGIC (from employee-items.get.ts) - Testing both date formats
    console.log('\n📱 MODAL QUERY:');
    
    // Test with exact same date logic as modal API
    const modalStartDateOnly = new Date('2025-11-18T00:00:00.000Z');
    const modalEndDateOnly = new Date('2025-12-18T23:59:59.999Z');
    
    const modalWhereClause = {
      userId: userId,
      startTime: { not: null },
      startTime: { gte: modalStartDateOnly },
      OR: [
        { endTime: { lte: modalEndDateOnly } },
        { endTime: null }
      ],
      stationId: stationId,
      station: {
        NOT: {
          name: 'Office'
        }
      },
      orderItem: {
        isProduct: true
      }
    };
    
    const modalCount = await prisma.itemProcessingLog.count({
      where: modalWhereClause
    });
    
    const modalLogs = await prisma.itemProcessingLog.findMany({
      where: modalWhereClause,
      include: {
        user: true,
        station: true,
        orderItem: {
          include: {
            item: true,
            order: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`   Modal count: ${modalCount}`);
    console.log(`   Modal logs found: ${modalLogs.length}`);
    
    // Also test with the exact date range from your API call
    const modalLogsExact = await prisma.itemProcessingLog.findMany({
      where: {
        userId: userId,
        stationId: stationId,
        startTime: { gte: new Date('2025-11-18T00:00:00.000Z') },
        OR: [
          { endTime: { lte: new Date('2025-12-18T23:59:59.999Z') } },
          { endTime: null }
        ],
        orderItem: {
          isProduct: true
        }
      }
    });
    
    console.log(`📱 Modal API exact match count: ${modalLogsExact.length}`);
    
    // Test if the issue is with the OR condition
    const modalLogsWithEndTime = await prisma.itemProcessingLog.findMany({
      where: {
        userId: userId,
        stationId: stationId,
        startTime: { gte: modalStartDateOnly },
        endTime: { lte: modalEndDateOnly },
        orderItem: {
          isProduct: true
        }
      }
    });
    
    const modalLogsWithoutEndTime = await prisma.itemProcessingLog.findMany({
      where: {
        userId: userId,
        stationId: stationId,
        startTime: { gte: modalStartDateOnly },
        endTime: null,
        orderItem: {
          isProduct: true
        }
      }
    });
    
    console.log(`📱 Modal logs with endTime: ${modalLogsWithEndTime.length}`);
    console.log(`📱 Modal logs without endTime (in progress): ${modalLogsWithoutEndTime.length}`);
    console.log(`📱 Total should be: ${modalLogsWithEndTime.length + modalLogsWithoutEndTime.length}`);
    
    // COMPARISON
    console.log('\n🔍 COMPARISON:');
    console.log(`   Main table count: ${mainTableUserStationLogs.length}`);
    console.log(`   Modal count: ${modalCount}`);
    console.log(`   Match: ${mainTableUserStationLogs.length === modalCount ? '✅ YES' : '❌ NO'}`);
    
    if (mainTableUserStationLogs.length !== modalCount) {
      console.log('\n❌ MISMATCH DETECTED! Analyzing differences...');
      
      // Check what's different
      const mainTableIds = new Set(mainTableUserStationLogs.map(log => log.id));
      const modalIds = new Set(modalLogs.map(log => log.id));
      
      const onlyInMainTable = mainTableUserStationLogs.filter(log => !modalIds.has(log.id));
      const onlyInModal = modalLogs.filter(log => !mainTableIds.has(log.id));
      
      console.log(`\n📊 Only in main table (${onlyInMainTable.length}):`);
      onlyInMainTable.forEach(log => {
        console.log(`   - ${log.id}: ${log.orderItem?.isProduct ? 'PRODUCT' : 'NON-PRODUCT'}, Station: ${log.station?.name}, StartTime: ${log.startTime}, EndTime: ${log.endTime}, Notes: ${log.notes || 'none'}`);
      });
      
      console.log(`\n📱 Only in modal (${onlyInModal.length}):`);
      onlyInModal.forEach(log => {
        console.log(`   - ${log.id}: ${log.orderItem?.isProduct ? 'PRODUCT' : 'NON-PRODUCT'}, Station: ${log.station?.name}, StartTime: ${log.startTime}, EndTime: ${log.endTime}, Notes: ${log.notes || 'none'}`);
      });
      
      // Additional debugging - check for manual sewer attribution
      const manualSewerLogs = modalLogs.filter(log => log.notes?.includes('Manually attributed'));
      if (manualSewerLogs.length > 0) {
        console.log(`\n🧵 Manual sewer attribution logs in modal (${manualSewerLogs.length}):`);
        manualSewerLogs.forEach(log => {
          console.log(`   - ${log.id}: User: ${log.user?.name}, StartTime: ${log.startTime}, EndTime: ${log.endTime}, Duration: ${log.durationInSeconds}s`);
        });
      }
      
      // Check if there are any logs with null endTime
      const inProgressLogs = modalLogs.filter(log => !log.endTime);
      if (inProgressLogs.length > 0) {
        console.log(`\n⏳ In-progress logs (no endTime) in modal (${inProgressLogs.length}):`);
        inProgressLogs.forEach(log => {
          console.log(`   - ${log.id}: User: ${log.user?.name}, StartTime: ${log.startTime}, Station: ${log.station?.name}`);
        });
      }
    }
    
    // Additional debugging - check for potential edge cases
    console.log('\n🔍 ADDITIONAL DEBUGGING:');
    
    // Check if there are multiple users with similar names
    const allUsers = await prisma.user.findMany({
      where: {
        name: {
          contains: targetUserName,
          mode: 'insensitive'
        }
      }
    });
    
    if (allUsers.length > 1) {
      console.log(`⚠️  Found ${allUsers.length} users with similar names:`);
      allUsers.forEach(user => {
        console.log(`   - ${user.name} (ID: ${user.id})`);
      });
    }
    
    // Check if there are multiple stations with similar names
    const allStations = await prisma.station.findMany({
      where: {
        name: {
          contains: targetStationName,
          mode: 'insensitive'
        }
      }
    });
    
    if (allStations.length > 1) {
      console.log(`⚠️  Found ${allStations.length} stations with similar names:`);
      allStations.forEach(station => {
        console.log(`   - ${station.name} (ID: ${station.id})`);
      });
    }
    
    // Check for any logs with isProduct: false that might be affecting counts
    const nonProductLogs = await prisma.itemProcessingLog.count({
      where: {
        userId: userId,
        stationId: stationId,
        startTime: { gte: startDate },
        OR: [
          { endTime: { lte: endDate } },
          { endTime: null }
        ],
        orderItem: {
          isProduct: false
        }
      }
    });
    
    if (nonProductLogs > 0) {
      console.log(`⚠️  Found ${nonProductLogs} non-product logs that are excluded from counts`);
    }
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
debugCountMismatch()
  .then(() => {
    console.log('Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Debug script failed:', error);
    process.exit(1);
  });

export { debugCountMismatch };