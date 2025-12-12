/**
 * Migration script to add product numbers to existing order items
 * This script will:
 * 1. Assign unique product numbers to all existing order items (starting from 01001)
 * 2. Order items are numbered by creation date (oldest first)
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function addProductNumbers() {
  console.log('🚀 Starting product number migration...');
  
  try {
    // Get all order items ordered by creation date
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productNumber: null // Only process items without product numbers
      },
      orderBy: {
        createdAt: 'asc' // Oldest first
      },
      select: {
        id: true,
        createdAt: true
      }
    });

    console.log(`📦 Found ${orderItems.length} order items without product numbers`);

    if (orderItems.length === 0) {
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

    // Start from 01001 or continue from the highest existing number
    let nextProductNumber = highestProductNumber?.productNumber 
      ? highestProductNumber.productNumber + 1 
      : 1001;

    console.log(`🔢 Starting product number assignment from: ${nextProductNumber}`);

    // Update each order item with a product number
    let updated = 0;
    for (const orderItem of orderItems) {
      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: { productNumber: nextProductNumber }
      });
      
      updated++;
      if (updated % 100 === 0) {
        console.log(`   Progress: ${updated}/${orderItems.length} items updated...`);
      }
      
      nextProductNumber++;
    }

    console.log(`✅ Successfully assigned product numbers to ${updated} order items`);
    console.log(`📊 Product number range: ${highestProductNumber?.productNumber || 1001} to ${nextProductNumber - 1}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addProductNumbers()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
