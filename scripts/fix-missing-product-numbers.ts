/**
 * Script to fix order items that are missing product numbers
 * This will assign product numbers to any order items that don't have them
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function fixMissingProductNumbers() {
  console.log('🔍 Checking for order items without product numbers...');
  
  try {
    // Find all order items without product numbers
    const itemsWithoutProductNumbers = await prisma.orderItem.findMany({
      where: {
        productNumber: null
      },
      orderBy: {
        createdAt: 'asc' // Oldest first
      },
      select: {
        id: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            salesOrderNumber: true
          }
        }
      }
    });

    console.log(`📦 Found ${itemsWithoutProductNumbers.length} order items without product numbers`);

    if (itemsWithoutProductNumbers.length === 0) {
      console.log('✅ All order items already have product numbers');
      return;
    }

    // Get the highest existing product number to continue from there
    const highestProductNumber = await prisma.orderItem.findFirst({
      where: {
        productNumber: { not: null }
      },
      orderBy: {
        productNumber: 'desc'
      },
      select: {
        productNumber: true
      }
    });

    // Start from 1001 or continue from the highest existing number
    let nextProductNumber = highestProductNumber?.productNumber 
      ? highestProductNumber.productNumber + 1 
      : 1001;

    console.log(`🔢 Starting product number assignment from: ${nextProductNumber}`);

    // Update each order item with a product number
    let updated = 0;
    for (const orderItem of itemsWithoutProductNumbers) {
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { productNumber: nextProductNumber }
      });
      
      console.log(`   ✓ Assigned P${nextProductNumber.toString().padStart(5, '0')} to order item ${orderItem.id} (Order: ${orderItem.order.salesOrderNumber || orderItem.order.id})`);
      
      updated++;
      nextProductNumber++;
    }

    console.log(`✅ Successfully assigned product numbers to ${updated} order items`);
    console.log(`📊 Product number range: ${highestProductNumber?.productNumber || 1001} to ${nextProductNumber - 1}`);
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixMissingProductNumbers()
  .then(() => {
    console.log('🎉 Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
  });