/**
 * Script to fix processing logs with negative durations
 * This addresses the issue where manually attributed sewing logs had negative durations
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixNegativeDurations() {
  console.log('🔍 Searching for processing logs with negative durations...');
  
  try {
    // Find all processing logs with negative durations
    const negativeLogsCount = await prisma.itemProcessingLog.count({
      where: {
        durationInSeconds: {
          lt: 0
        }
      }
    });
    
    console.log(`Found ${negativeLogsCount} processing logs with negative durations`);
    
    if (negativeLogsCount === 0) {
      console.log('✅ No negative durations found. Nothing to fix.');
      return;
    }
    
    // Get the actual records to see what we're dealing with
    const negativeLogs = await prisma.itemProcessingLog.findMany({
      where: {
        durationInSeconds: {
          lt: 0
        }
      },
      include: {
        user: true,
        station: true,
        orderItem: true
      }
    });
    
    console.log('📋 Processing logs with negative durations:');
    negativeLogs.forEach(log => {
      console.log(`  - ID: ${log.id}, Station: ${log.station?.name}, User: ${log.user?.name}, Duration: ${log.durationInSeconds}s`);
      console.log(`    Start: ${log.startTime}, End: ${log.endTime}`);
    });
    
    // Fix each negative duration log
    let fixedCount = 0;
    
    for (const log of negativeLogs) {
      let newEndTime = log.endTime;
      let newDuration = log.durationInSeconds;
      
      if (log.startTime && log.endTime) {
        // Recalculate duration
        const calculatedDuration = Math.floor((new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / 1000);
        
        if (calculatedDuration <= 0) {
          // If still negative, set end time to 1 second after start time
          newEndTime = new Date(new Date(log.startTime).getTime() + 1000);
          newDuration = 1; // 1 second
          console.log(`  🔧 Fixing log ${log.id}: Setting end time to 1 second after start time`);
        } else {
          newDuration = calculatedDuration;
          console.log(`  🔧 Fixing log ${log.id}: Recalculated duration to ${newDuration}s`);
        }
      } else if (log.startTime && !log.endTime) {
        // If no end time, set it to 1 second after start time
        newEndTime = new Date(new Date(log.startTime).getTime() + 1000);
        newDuration = 1; // 1 second
        console.log(`  🔧 Fixing log ${log.id}: Adding missing end time (1 second after start)`);
      } else {
        console.log(`  ⚠️ Skipping log ${log.id}: Missing start time`);
        continue;
      }
      
      // Update the record
      await prisma.itemProcessingLog.update({
        where: { id: log.id },
        data: {
          endTime: newEndTime,
          durationInSeconds: newDuration
        }
      });
      
      fixedCount++;
    }
    
    console.log(`✅ Fixed ${fixedCount} processing logs with negative durations`);
    
    // Verify the fix
    const remainingNegativeCount = await prisma.itemProcessingLog.count({
      where: {
        durationInSeconds: {
          lt: 0
        }
      }
    });
    
    if (remainingNegativeCount === 0) {
      console.log('🎉 All negative durations have been fixed!');
    } else {
      console.log(`⚠️ ${remainingNegativeCount} negative durations still remain. Manual review may be needed.`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing negative durations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixNegativeDurations()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixNegativeDurations };