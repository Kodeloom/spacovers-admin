/**
 * Script to update the OrderItem schema to fix isolation issues
 * This script helps migrate the database schema to support proper OrderItem isolation
 */

import { execSync } from 'child_process';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

async function updateOrderItemSchema() {
  console.log('🔄 Updating OrderItem schema to fix isolation issues...\n');

  try {
    console.log('📋 Current schema status:');
    
    // Check current OrderItem records
    const orderItemCount = await prisma.orderItem.count();
    console.log(`   - Total OrderItem records: ${orderItemCount}`);
    
    // Check for potential conflicts with quickbooksOrderLineId
    const duplicateQboLineIds = await prisma.$queryRaw`
      SELECT "quickbooksOrderLineId", COUNT(*) as count
      FROM "OrderItem" 
      WHERE "quickbooksOrderLineId" IS NOT NULL
      GROUP BY "quickbooksOrderLineId"
      HAVING COUNT(*) > 1
    ` as Array<{ quickbooksOrderLineId: string; count: bigint }>;
    
    if (duplicateQboLineIds.length > 0) {
      console.log('⚠️  Found duplicate QuickBooks line IDs across orders:');
      for (const duplicate of duplicateQboLineIds) {
        console.log(`   - Line ID "${duplicate.quickbooksOrderLineId}": ${duplicate.count} occurrences`);
      }
      console.log('   This confirms the cross-order contamination issue.');
    } else {
      console.log('✅ No duplicate QuickBooks line IDs found.');
    }

    console.log('\n🔧 Regenerating Prisma schema...');
    
    // Generate the new schema from ZenStack
    try {
      execSync('npx zenstack generate', { stdio: 'inherit' });
      console.log('✅ ZenStack schema generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate ZenStack schema:', error);
      throw error;
    }

    console.log('\n📊 Creating database migration...');
    
    // Create and apply the migration
    try {
      execSync('npx prisma migrate dev --name fix-orderitem-isolation', { stdio: 'inherit' });
      console.log('✅ Database migration created and applied successfully');
    } catch (error) {
      console.error('❌ Failed to create/apply migration:', error);
      console.log('\n💡 You may need to run this manually:');
      console.log('   npx prisma migrate dev --name fix-orderitem-isolation');
      throw error;
    }

    console.log('\n🔍 Verifying schema changes...');
    
    // Verify the new schema is working
    const testOrderItems = await prisma.orderItem.findMany({
      take: 5,
      select: {
        id: true,
        orderId: true,
        quickbooksOrderLineId: true
      }
    });
    
    console.log('✅ Schema verification completed');
    console.log(`   - Sample OrderItem records: ${testOrderItems.length}`);
    
    console.log('\n🎯 Schema update completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the QBO sync operations to ensure they work with the new schema');
    console.log('2. Run the OrderItem isolation tests to verify the fixes');
    console.log('3. Monitor for any cross-order contamination issues');
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    console.log('\n🔧 Manual steps to complete the update:');
    console.log('1. Run: npx zenstack generate');
    console.log('2. Run: npx prisma migrate dev --name fix-orderitem-isolation');
    console.log('3. Verify the changes with: npx prisma studio');
    process.exit(1);
  }
}

// Run the schema update
if (require.main === module) {
  updateOrderItemSchema()
    .then(() => {
      console.log('\n🏆 Schema update completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Schema update failed:', error);
      process.exit(1);
    });
}

export { updateOrderItemSchema };