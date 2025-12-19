/**
 * Debug script to check what the UI APIs are actually returning
 * This will help identify if there's caching, filtering, or other UI-level issues
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function debugUIMismatch() {
  console.log('🔍 Debugging UI-level count mismatch...');
  
  try {
    // Test the exact API calls that the UI would make
    const startDate = '2025-11-18';
    const endDate = '2025-12-18';
    
    console.log(`📅 Testing with UI date format: ${startDate} to ${endDate}`);
    
    // Find Jorge's user ID
    const jorge = await prisma.user.findFirst({
      where: { name: 'Jorge' }
    });
    
    if (!jorge) {
      console.log('❌ Jorge not found');
      return;
    }
    
    // Find Cutting station ID
    const cuttingStation = await prisma.station.findFirst({
      where: { name: 'Cutting' }
    });
    
    if (!cuttingStation) {
      console.log('❌ Cutting station not found');
      return;
    }
    
    console.log(`👤 Jorge ID: ${jorge.id}`);
    console.log(`🏭 Cutting Station ID: ${cuttingStation.id}`);
    
    // 1. TEST PRODUCTIVITY API (Main Table)
    console.log('\n📊 TESTING PRODUCTIVITY API (Main Table):');
    
    // Convert dates to the format the productivity API expects
    const prodStartDate = new Date(startDate + 'T00:00:00.000Z');
    const prodEndDate = new Date(endDate + 'T23:59:59.999Z');
    
    // Simulate the exact query the productivity API makes
    const productivityLogs = await prisma.itemProcessingLog.findMany({
      where: {
        startTime: { not: null },
        startTime: { gte: prodStartDate },
        OR: [
          { endTime: { lte: prodEndDate } },
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
    
    // Filter for Jorge at Cutting (same as productivity API grouping)
    const jorgeAtCutting = productivityLogs.filter(log => 
      log.userId === jorge.id && 
      log.stationId === cuttingStation.id &&
      log.station?.name !== 'Office'
    );
    
    console.log(`   Productivity API would return: ${jorgeAtCutting.length} items for Jorge at Cutting`);
    
    // 2. TEST EMPLOYEE-ITEMS API (Modal)
    console.log('\n📱 TESTING EMPLOYEE-ITEMS API (Modal):');
    
    // Convert dates to the format the employee-items API expects
    const modalStartDate = new Date(startDate + 'T00:00:00.000Z');
    const modalEndDate = new Date(endDate + 'T23:59:59.999Z');
    
    // Simulate the exact query the employee-items API makes
    const modalCount = await prisma.itemProcessingLog.count({
      where: {
        userId: jorge.id,
        startTime: { not: null },
        startTime: { gte: modalStartDate },
        OR: [
          { endTime: { lte: modalEndDate } },
          { endTime: null }
        ],
        stationId: cuttingStation.id,
        station: {
          NOT: {
            name: 'Office'
          }
        },
        orderItem: {
          isProduct: true
        }
      }
    });
    
    console.log(`   Employee-Items API would return: ${modalCount} total scans for Jorge at Cutting`);
    
    // 3. COMPARISON
    console.log('\n🔍 COMPARISON:');
    console.log(`   Main Table (Productivity API): ${jorgeAtCutting.length}`);
    console.log(`   Modal (Employee-Items API): ${modalCount}`);
    console.log(`   Match: ${jorgeAtCutting.length === modalCount ? '✅ YES' : '❌ NO'}`);
    
    if (jorgeAtCutting.length !== modalCount) {
      console.log('\n❌ APIS ARE RETURNING DIFFERENT COUNTS!');
      console.log('This suggests there might be a subtle difference in the query logic.');
      
      // Let's check if it's the station filtering
      const modalCountWithoutStationFilter = await prisma.itemProcessingLog.count({
        where: {
          userId: jorge.id,
          startTime: { not: null },
          startTime: { gte: modalStartDate },
          OR: [
            { endTime: { lte: modalEndDate } },
            { endTime: null }
          ],
          orderItem: {
            isProduct: true
          }
        }
      });
      
      console.log(`   Modal without station filter: ${modalCountWithoutStationFilter}`);
      
      // Check if it's the Office exclusion
      const modalCountWithOffice = await prisma.itemProcessingLog.count({
        where: {
          userId: jorge.id,
          startTime: { not: null },
          startTime: { gte: modalStartDate },
          OR: [
            { endTime: { lte: modalEndDate } },
            { endTime: null }
          ],
          stationId: cuttingStation.id,
          orderItem: {
            isProduct: true
          }
        }
      });
      
      console.log(`   Modal with Office included: ${modalCountWithOffice}`);
      
    } else {
      console.log('\n✅ APIs return the same count - the issue is in the UI layer!');
      console.log('Possible causes:');
      console.log('   - Frontend caching');
      console.log('   - Client-side filtering');
      console.log('   - Different date ranges being sent');
      console.log('   - Pagination affecting the display');
    }
    
    // 4. CHECK FOR POTENTIAL UI ISSUES
    console.log('\n🔍 CHECKING FOR POTENTIAL UI ISSUES:');
    
    // Check if there are any logs that might be filtered out by pagination
    const modalLogs = await prisma.itemProcessingLog.findMany({
      where: {
        userId: jorge.id,
        startTime: { not: null },
        startTime: { gte: modalStartDate },
        OR: [
          { endTime: { lte: modalEndDate } },
          { endTime: null }
        ],
        stationId: cuttingStation.id,
        station: {
          NOT: {
            name: 'Office'
          }
        },
        orderItem: {
          isProduct: true
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 50 // Default page size
    });
    
    console.log(`   First page of modal would show: ${modalLogs.length} items`);
    
    // Check if the issue is with the summary calculation
    const totalPages = Math.ceil(modalCount / 50);
    console.log(`   Total pages in modal: ${totalPages}`);
    console.log(`   Items on first page: ${modalLogs.length}`);
    console.log(`   Total items across all pages: ${modalCount}`);
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
debugUIMismatch()
  .then(() => {
    console.log('UI Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('UI Debug script failed:', error);
    process.exit(1);
  });

export { debugUIMismatch };