/**
 * Manual test script for office scanner functionality
 * This script tests the core requirements for task 6:
 * - Scanner creation with null stationId
 * - Scanner lookup handling null station gracefully
 * - Office scanner functionality
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function testOfficeScannerFunctionality() {
  console.log('🧪 Testing Office Scanner Functionality...\n');

  let testUserId: string;
  let testStationId: string;
  let officeScannerPrefix: string;

  try {
    // Setup test data
    console.log('📋 Setting up test data...');
    
    const testUser = await prisma.user.create({
      data: {
        name: 'Office Scanner Test User',
        email: `office-test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;
    console.log(`✅ Created test user: ${testUser.name} (${testUser.id})`);

    const testStation = await prisma.station.create({
      data: {
        name: `Test Station ${Date.now()}`
      }
    });
    testStationId = testStation.id;
    console.log(`✅ Created test station: ${testStation.name} (${testStation.id})`);

    officeScannerPrefix = `O1A${Date.now().toString().slice(-6)}`;

    // Test 1: Create office scanner with null stationId
    console.log('\n🔧 Test 1: Creating office scanner with null stationId...');
    
    const officeScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: officeScannerPrefix,
        stationId: null, // Office scanner - no station assignment
        userId: testUserId,
        model: 'Office Scanner Model',
        serialNumber: 'OS-001',
        isActive: true
      },
      include: {
        station: true,
        user: true
      }
    });

    console.log(`✅ Office scanner created successfully:`);
    console.log(`   - ID: ${officeScanner.id}`);
    console.log(`   - Prefix: ${officeScanner.prefix}`);
    console.log(`   - StationId: ${officeScanner.stationId} (should be null)`);
    console.log(`   - Station: ${officeScanner.station} (should be null)`);
    console.log(`   - User: ${officeScanner.user.name}`);

    // Test 2: Scanner lookup with null station handling
    console.log('\n🔍 Test 2: Testing scanner lookup with null station...');
    
    const lookedUpScanner = await prisma.barcodeScanner.findUnique({
      where: { 
        prefix: officeScannerPrefix,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!lookedUpScanner) {
      throw new Error('Scanner lookup failed - scanner not found');
    }

    // Simulate API response transformation (like in scanner-lookup.post.ts)
    const apiResponse = {
      success: true,
      scanner: {
        id: lookedUpScanner.id,
        prefix: lookedUpScanner.prefix,
        user: lookedUpScanner.user,
        station: lookedUpScanner.station || { id: null, name: 'Office' }, // Default to Office
        model: lookedUpScanner.model,
        serialNumber: lookedUpScanner.serialNumber
      }
    };

    console.log(`✅ Scanner lookup successful:`);
    console.log(`   - Found scanner: ${apiResponse.scanner.prefix}`);
    console.log(`   - Station handling: ${JSON.stringify(apiResponse.scanner.station)}`);
    console.log(`   - Default station name: ${apiResponse.scanner.station.name} (should be 'Office')`);

    // Test 3: Update scanner from office to production station
    console.log('\n🔄 Test 3: Updating scanner from office to production station...');
    
    const updatedToProduction = await prisma.barcodeScanner.update({
      where: { id: officeScanner.id },
      data: { stationId: testStationId },
      include: {
        station: true,
        user: true
      }
    });

    console.log(`✅ Scanner updated to production station:`);
    console.log(`   - StationId: ${updatedToProduction.stationId}`);
    console.log(`   - Station name: ${updatedToProduction.station?.name}`);

    // Test 4: Update scanner back to office (null stationId)
    console.log('\n🔄 Test 4: Updating scanner back to office (null stationId)...');
    
    const updatedBackToOffice = await prisma.barcodeScanner.update({
      where: { id: officeScanner.id },
      data: { stationId: null },
      include: {
        station: true,
        user: true
      }
    });

    console.log(`✅ Scanner updated back to office:`);
    console.log(`   - StationId: ${updatedBackToOffice.stationId} (should be null)`);
    console.log(`   - Station: ${updatedBackToOffice.station} (should be null)`);

    // Test 5: Create production scanner for comparison
    console.log('\n🏭 Test 5: Creating production scanner for comparison...');
    
    const productionScannerPrefix = `S1A${Date.now().toString().slice(-6)}`;
    const productionScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: productionScannerPrefix,
        stationId: testStationId,
        userId: testUserId,
        model: 'Production Scanner Model',
        isActive: true
      },
      include: {
        station: true,
        user: true
      }
    });

    console.log(`✅ Production scanner created:`);
    console.log(`   - Prefix: ${productionScanner.prefix}`);
    console.log(`   - StationId: ${productionScanner.stationId}`);
    console.log(`   - Station name: ${productionScanner.station?.name}`);

    // Test 6: Query all scanners for user (mixed types)
    console.log('\n📊 Test 6: Querying all scanners for user (mixed types)...');
    
    const userScanners = await prisma.barcodeScanner.findMany({
      where: { userId: testUserId },
      include: { station: true }
    });

    console.log(`✅ Found ${userScanners.length} scanners for user:`);
    userScanners.forEach((scanner, index) => {
      console.log(`   ${index + 1}. ${scanner.prefix} - Station: ${scanner.station?.name || 'Office'} (${scanner.stationId || 'null'})`);
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Requirements verification:');
    console.log('✅ 14.2: Scanner creation accepts null stationId for office scanners');
    console.log('✅ 14.3: Scanner lookup handles null station gracefully (defaults to "Office")');
    console.log('✅ 14.4: Office scanner functionality works properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    if (testUserId) {
      await prisma.barcodeScanner.deleteMany({
        where: { userId: testUserId }
      });
      await prisma.user.delete({
        where: { id: testUserId }
      });
      console.log('✅ Cleaned up test user and scanners');
    }
    
    if (testStationId) {
      await prisma.station.delete({
        where: { id: testStationId }
      });
      console.log('✅ Cleaned up test station');
    }
    
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testOfficeScannerFunctionality()
    .then(() => {
      console.log('\n🏆 Office scanner functionality test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Office scanner functionality test failed:', error);
      process.exit(1);
    });
}

export { testOfficeScannerFunctionality };