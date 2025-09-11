/**
 * Direct Prisma test to bypass ZenStack and test database constraints
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function testDirectPrismaCreate() {
  console.log('🧪 Testing direct Prisma client for office scanner creation...\n');

  let testUserId: string;

  try {
    // Create a test user first
    console.log('📋 Creating test user...');
    const testUser = await prisma.user.create({
      data: {
        name: 'Direct Prisma Test User',
        email: `direct-test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;
    console.log(`✅ Created test user: ${testUser.id}`);

    // Test 1: Create scanner with null stationId
    console.log('\n🔧 Test 1: Creating scanner with null stationId...');
    
    const officeScannerData = {
      prefix: `DIRECT-O1A-${Date.now().toString().slice(-6)}`,
      stationId: null, // Explicitly null
      userId: testUserId,
      model: 'Direct Test Office Scanner',
      serialNumber: 'DIRECT-001',
      isActive: true
    };

    console.log('Data to create:', JSON.stringify(officeScannerData, null, 2));

    const officeScanner = await prisma.barcodeScanner.create({
      data: officeScannerData,
      include: {
        station: true,
        user: true
      }
    });

    console.log('✅ Office scanner created successfully with direct Prisma!');
    console.log(`   - ID: ${officeScanner.id}`);
    console.log(`   - Prefix: ${officeScanner.prefix}`);
    console.log(`   - StationId: ${officeScanner.stationId}`);
    console.log(`   - Station: ${officeScanner.station}`);

    // Test 2: Create scanner with undefined stationId (omitted field)
    console.log('\n🔧 Test 2: Creating scanner with undefined stationId...');
    
    const officeScannerData2 = {
      prefix: `DIRECT-O2A-${Date.now().toString().slice(-6)}`,
      // stationId omitted (undefined)
      userId: testUserId,
      model: 'Direct Test Office Scanner 2',
      isActive: true
    };

    console.log('Data to create (no stationId field):', JSON.stringify(officeScannerData2, null, 2));

    const officeScanner2 = await prisma.barcodeScanner.create({
      data: officeScannerData2,
      include: {
        station: true,
        user: true
      }
    });

    console.log('✅ Office scanner 2 created successfully with direct Prisma!');
    console.log(`   - ID: ${officeScanner2.id}`);
    console.log(`   - Prefix: ${officeScanner2.prefix}`);
    console.log(`   - StationId: ${officeScanner2.stationId}`);

    console.log('\n🎉 Direct Prisma tests completed successfully!');
    console.log('✅ Database schema supports null stationId values');
    console.log('✅ Issue is likely with ZenStack enhanced client or API validation');

  } catch (error) {
    console.error('❌ Direct Prisma test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
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
      console.log('✅ Cleaned up test data');
    }
    
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testDirectPrismaCreate()
    .then(() => {
      console.log('\n🏆 Direct Prisma test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Direct Prisma test failed:', error);
      process.exit(1);
    });
}

export { testDirectPrismaCreate };