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
    const startDate = new Date('2025-11-18T00:00:00.000Z'); // UPDATE THIS
    const endDate = new Date('2025-12-18T23:59:59.999Z');   // UPDATE THIS
    
    console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Find a user with scans to test
    const userWithScans = await prisma.itemProcessingLog.findFirst({
      where: {
        startTime: { gte: startDate },
        OR: [
          { endTime: { lte: endDate } },
          { endTime: null }
        ],
        station: {
          NOT: {
            name: 'Office'
          }
        }
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
    
    // MODAL LOGIC (from employee-items.get.ts)
    console.log('\n📱 MODAL QUERY:');
    const modalWhereClause = {
      userId: userId,
      startTime: { not: null },
      startTime: { gte: startDate },
      OR: [
        { endTime: { lte: endDate } },
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
        orderItem: true
      }
    });
    
    console.log(`   Modal count: ${modalCount}`);
    console.log(`   Modal logs found: ${modalLogs.length}`);
    
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
        console.log(`   - ${log.id}: ${log.orderItem?.isProduct ? 'PRODUCT' : 'NON-PRODUCT'}, Station: ${log.station?.name}`);
      });
      
      console.log(`\n📱 Only in modal (${onlyInModal.length}):`);
      onlyInModal.forEach(log => {
        console.log(`   - ${log.id}: ${log.orderItem?.isProduct ? 'PRODUCT' : 'NON-PRODUCT'}, Station: ${log.station?.name}`);
      });
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