/**
 * Quick script to reset an item status back to NOT_STARTED_PRODUCTION for testing
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function resetItemStatus() {
  console.log('🔄 Resetting item status for testing...\n');

  try {
    // Find the most recent item that was moved to CUTTING status
    const recentItem = await prisma.orderItem.findFirst({
      where: {
        itemStatus: 'CUTTING'
      },
      include: {
        order: true,
        item: true,
        itemProcessingLogs: {
          orderBy: {
            startTime: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (!recentItem) {
      console.log('❌ No items found in CUTTING status');
      return;
    }

    console.log('📋 Found item to reset:');
    console.log(`   - Order: ${recentItem.order.salesOrderNumber || recentItem.order.id}`);
    console.log(`   - Item: ${recentItem.item?.name || 'Unknown'}`);
    console.log(`   - Current Status: ${recentItem.itemStatus}`);
    console.log(`   - Item ID: ${recentItem.id}`);

    // Reset the item status
    await prisma.orderItem.update({
      where: { id: recentItem.id },
      data: {
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    });

    // Delete any processing logs for this item (to clean up test data)
    const deletedLogs = await prisma.itemProcessingLog.deleteMany({
      where: {
        orderItemId: recentItem.id
      }
    });

    // Reset order status back to APPROVED if it was changed
    if (recentItem.order.orderStatus === 'ORDER_PROCESSING') {
      await prisma.order.update({
        where: { id: recentItem.orderId },
        data: {
          orderStatus: 'APPROVED'
        }
      });
      console.log('✅ Order status reset to APPROVED');
    }

    console.log('✅ Item status reset to NOT_STARTED_PRODUCTION');
    console.log(`✅ Deleted ${deletedLogs.count} processing logs`);
    console.log('\n🎯 Ready for testing! Try scanning the barcode again.');

  } catch (error) {
    console.error('❌ Error resetting item status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  resetItemStatus()
    .then(() => {
      console.log('\n🏆 Reset completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Reset failed:', error);
      process.exit(1);
    });
}

export { resetItemStatus };