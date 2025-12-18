/**
 * Test script to verify scan counting logic
 * This will help debug the discrepancy between main table and modal counts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testScanCounting() {
  console.log('🔍 Testing scan counting logic...');
  
  try {
    // Get date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get all processing logs in date range (excluding Office)
    const allLogs = await prisma.itemProcessingLog.findMany({
      where: {
        startTime: { gte: startDate },
        OR: [
          { endTime: { lte: endDate } },
          { endTime: null }
        ],
        orderItem: {
          isProduct: true
        },
        station: {
          NOT: {
            name: 'Office'
          }
        }
      },
      include: {
        user: true,
        station: true,
        orderItem: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`\n📊 Found ${allLogs.length} total processing logs (excluding Office)`);
    
    // Group by user and station
    const userStationCounts = new Map();
    
    for (const log of allLogs) {
      const key = `${log.userId}-${log.stationId}`;
      const userStation = `${log.user?.name || 'Unknown'} at ${log.station?.name || 'Unknown'}`;
      
      if (!userStationCounts.has(key)) {
        userStationCounts.set(key, {
          userStation,
          userId: log.userId,
          stationId: log.stationId,
          scanCount: 0,
          logs: []
        });
      }
      
      const data = userStationCounts.get(key);
      data.scanCount++;
      data.logs.push({
        id: log.id,
        orderItemId: log.orderItemId,
        productNumber: log.orderItem?.productNumber,
        startTime: log.startTime,
        endTime: log.endTime,
        notes: log.notes
      });
    }
    
    console.log('\n📋 Scan counts by user and station:');
    for (const [key, data] of userStationCounts) {
      console.log(`\n  ${data.userStation}: ${data.scanCount} scans`);
      
      // Show first few scans as examples
      const exampleScans = data.logs.slice(0, 3);
      exampleScans.forEach((scan, idx) => {
        const isManual = scan.notes?.includes('Manually attributed') ? ' (MANUAL)' : '';
        console.log(`    ${idx + 1}. Product ${scan.productNumber || 'N/A'} - ${scan.startTime}${isManual}`);
      });
      
      if (data.logs.length > 3) {
        console.log(`    ... and ${data.logs.length - 3} more scans`);
      }
    }
    
    // Test a specific user if they exist
    const testUserId = Array.from(userStationCounts.values())[0]?.userId;
    if (testUserId) {
      console.log(`\n🔍 Testing modal count for user ${testUserId}:`);
      
      const modalCount = await prisma.itemProcessingLog.count({
        where: {
          userId: testUserId,
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
        }
      });
      
      const mainTableCount = Array.from(userStationCounts.values())
        .filter(data => data.userId === testUserId)
        .reduce((sum, data) => sum + data.scanCount, 0);
      
      console.log(`  Main table count: ${mainTableCount}`);
      console.log(`  Modal count: ${modalCount}`);
      console.log(`  Match: ${mainTableCount === modalCount ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log('\n✅ Scan counting test complete');
    
  } catch (error) {
    console.error('❌ Error during scan counting test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  testScanCounting()
    .then(() => {
      console.log('Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testScanCounting };