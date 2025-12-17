/**
 * Debug script to check sewing attribution logs and productivity query
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSewingAttribution() {
  console.log('🔍 Debugging sewing attribution and productivity query...');
  
  try {
    // 1. Check all manually attributed sewing logs
    const manualSewingLogs = await prisma.itemProcessingLog.findMany({
      where: {
        station: { name: 'Sewing' },
        notes: { contains: 'Manually attributed' }
      },
      include: {
        user: true,
        station: true,
        orderItem: {
          include: {
            item: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    console.log(`\n📋 Found ${manualSewingLogs.length} manually attributed sewing logs:`);
    manualSewingLogs.forEach((log, index) => {
      console.log(`\n  ${index + 1}. Log ID: ${log.id}`);
      console.log(`     User: ${log.user?.name || 'Unknown'}`);
      console.log(`     Station: ${log.station?.name || 'Unknown'}`);
      console.log(`     Start Time: ${log.startTime}`);
      console.log(`     End Time: ${log.endTime}`);
      console.log(`     Duration: ${log.durationInSeconds} seconds`);
      console.log(`     Order Item: ${log.orderItem?.productNumber || 'Unknown'}`);
      console.log(`     Is Product: ${log.orderItem?.isProduct}`);
      console.log(`     Notes: ${log.notes}`);
    });
    
    // 2. Check what the productivity query would return for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`\n🔍 Checking productivity query for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const productivityLogs = await prisma.itemProcessingLog.findMany({
      where: {
        startTime: { gte: startDate },
        OR: [
          { endTime: { lte: endDate } },
          { endTime: null }
        ],
        orderItem: {
          isProduct: true
        }
      },
      include: {
        user: true,
        station: true,
        orderItem: true
      }
    });
    
    console.log(`\n📊 Productivity query returned ${productivityLogs.length} logs`);
    
    // Filter for sewing logs specifically
    const sewingLogsInQuery = productivityLogs.filter(log => log.station?.name === 'Sewing');
    console.log(`🧵 Of which ${sewingLogsInQuery.length} are sewing station logs`);
    
    if (sewingLogsInQuery.length > 0) {
      console.log('\n🧵 Sewing logs in productivity query:');
      sewingLogsInQuery.forEach((log, index) => {
        console.log(`\n  ${index + 1}. Log ID: ${log.id}`);
        console.log(`     User: ${log.user?.name || 'Unknown'}`);
        console.log(`     Start Time: ${log.startTime}`);
        console.log(`     End Time: ${log.endTime}`);
        console.log(`     Duration: ${log.durationInSeconds} seconds`);
        console.log(`     Is Manual Attribution: ${log.notes?.includes('Manually attributed') ? 'YES' : 'NO'}`);
        console.log(`     Order Item Is Product: ${log.orderItem?.isProduct}`);
      });
    }
    
    // 3. Check if there are any sewing logs that fall outside the date range
    const allSewingLogs = await prisma.itemProcessingLog.findMany({
      where: {
        station: { name: 'Sewing' }
      },
      include: {
        user: true,
        orderItem: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    const sewingLogsOutsideRange = allSewingLogs.filter(log => {
      if (!log.startTime) return false;
      const logDate = new Date(log.startTime);
      return logDate < startDate || logDate > endDate;
    });
    
    if (sewingLogsOutsideRange.length > 0) {
      console.log(`\n⚠️  Found ${sewingLogsOutsideRange.length} sewing logs outside the 30-day range:`);
      sewingLogsOutsideRange.slice(0, 5).forEach((log, index) => {
        console.log(`  ${index + 1}. User: ${log.user?.name}, Start: ${log.startTime}, Manual: ${log.notes?.includes('Manually attributed') ? 'YES' : 'NO'}`);
      });
    }
    
    // 4. Check for any data inconsistencies
    const inconsistentLogs = manualSewingLogs.filter(log => {
      return !log.orderItem?.isProduct || 
             !log.startTime || 
             !log.endTime || 
             log.durationInSeconds <= 0;
    });
    
    if (inconsistentLogs.length > 0) {
      console.log(`\n❌ Found ${inconsistentLogs.length} inconsistent manual sewing logs:`);
      inconsistentLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. Log ID: ${log.id}`);
        console.log(`     Issues: ${[
          !log.orderItem?.isProduct ? 'Not a product item' : null,
          !log.startTime ? 'Missing start time' : null,
          !log.endTime ? 'Missing end time' : null,
          log.durationInSeconds <= 0 ? `Invalid duration: ${log.durationInSeconds}` : null
        ].filter(Boolean).join(', ')}`);
      });
    }
    
    console.log('\n✅ Debug analysis complete');
    
  } catch (error) {
    console.error('❌ Error during debug analysis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  debugSewingAttribution()
    .then(() => {
      console.log('Debug script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSewingAttribution };