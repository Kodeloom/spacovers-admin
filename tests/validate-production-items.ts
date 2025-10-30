/**
 * Validation script to check for data inconsistencies in production items
 * This helps identify potential issues with the isProduct field or item statuses
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';

async function validateProductionItems() {
  console.log('🔍 Validating production items data consistency...');
  
  try {
    // Check 1: Items with isProduct = null or undefined
    const itemsWithNullIsProduct = await prisma.orderItem.count({
      where: {
        isProduct: null
      }
    });
    
    console.log(`Items with isProduct = null: ${itemsWithNullIsProduct}`);
    
    // Check 2: Items with production statuses but isProduct = false
    const nonProductionItemsWithProductionStatus = await prisma.orderItem.findMany({
      where: {
        isProduct: false,
        itemStatus: {
          in: ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY']
        }
      },
      select: {
        id: true,
        itemStatus: true,
        isProduct: true,
        item: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Non-production items with production statuses: ${nonProductionItemsWithProductionStatus.length}`);
    if (nonProductionItemsWithProductionStatus.length > 0) {
      console.log('⚠️  These items might need their isProduct flag corrected:');
      nonProductionItemsWithProductionStatus.forEach(item => {
        console.log(`  - ${item.item.name} (${item.itemStatus}, isProduct: ${item.isProduct})`);
      });
    }
    
    // Check 3: Items with isProduct = true but no production status
    const productionItemsWithoutProductionStatus = await prisma.orderItem.findMany({
      where: {
        isProduct: true,
        itemStatus: {
          notIn: ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY']
        }
      },
      select: {
        id: true,
        itemStatus: true,
        isProduct: true,
        item: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`Production items with non-production statuses: ${productionItemsWithoutProductionStatus.length}`);
    if (productionItemsWithoutProductionStatus.length > 0) {
      console.log('⚠️  These production items have unexpected statuses:');
      productionItemsWithoutProductionStatus.forEach(item => {
        console.log(`  - ${item.item.name} (${item.itemStatus}, isProduct: ${item.isProduct})`);
      });
    }
    
    // Check 4: Summary of all items by isProduct and status
    console.log('\n📊 Summary by isProduct flag:');
    
    const productionItemsSummary = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      where: {
        isProduct: true
      },
      _count: {
        id: true
      }
    });
    
    console.log('Production items (isProduct: true):');
    productionItemsSummary.forEach(item => {
      console.log(`  ${item.itemStatus}: ${item._count.id}`);
    });
    
    const nonProductionItemsSummary = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      where: {
        isProduct: false
      },
      _count: {
        id: true
      }
    });
    
    console.log('\nNon-production items (isProduct: false):');
    nonProductionItemsSummary.forEach(item => {
      console.log(`  ${item.itemStatus}: ${item._count.id}`);
    });
    
    // Check 5: Verify default values are working
    const itemsWithDefaultStatus = await prisma.orderItem.count({
      where: {
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    });
    
    console.log(`\nItems with default NOT_STARTED_PRODUCTION status: ${itemsWithDefaultStatus}`);
    
    const itemsWithDefaultIsProduct = await prisma.orderItem.count({
      where: {
        isProduct: false
      }
    });
    
    console.log(`Items with default isProduct: false: ${itemsWithDefaultIsProduct}`);
    
    console.log('\n✅ Validation completed!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

// Run the validation
validateProductionItems();