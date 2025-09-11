/**
 * Manual test for Total Items Ready calculation fix
 * Tests the implementation of task 4: Fix "Total Items Ready" calculation
 * 
 * This test verifies:
 * 1. Items with status READY or PRODUCT_FINISHED are counted
 * 2. Only production items (isProduct: true) are included
 * 3. Individual order items are counted, not orders
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { MetricsService } from '~/utils/metricsService';

async function testTotalItemsReadyCalculation() {
  console.log('🧪 Testing Total Items Ready calculation...');
  
  try {
    // Test 1: Direct database query to verify current data
    console.log('\n📊 Current database state:');
    
    const allOrderItems = await prisma.orderItem.findMany({
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
    
    console.log(`Total order items in database: ${allOrderItems.length}`);
    
    const productionItems = allOrderItems.filter(item => item.isProduct);
    console.log(`Production items (isProduct: true): ${productionItems.length}`);
    
    const readyItems = allOrderItems.filter(item => 
      item.itemStatus === 'READY' && item.isProduct
    );
    console.log(`Items with READY status (production only): ${readyItems.length}`);
    
    const productFinishedItems = allOrderItems.filter(item => 
      item.itemStatus === 'PRODUCT_FINISHED' && item.isProduct
    );
    console.log(`Items with PRODUCT_FINISHED status (production only): ${productFinishedItems.length}`);
    
    const expectedTotal = readyItems.length + productFinishedItems.length;
    console.log(`Expected Total Items Ready: ${expectedTotal}`);
    
    // Test 2: Test the new getTotalItemsReady method
    console.log('\n🔧 Testing MetricsService.getTotalItemsReady():');
    const calculatedTotal = await MetricsService.getTotalItemsReady();
    console.log(`Calculated Total Items Ready: ${calculatedTotal}`);
    
    // Test 3: Test the orders page metrics
    console.log('\n📈 Testing getOrdersPageMetrics():');
    const ordersMetrics = await MetricsService.getOrdersPageMetrics();
    console.log(`Orders page Total Items Ready: ${ordersMetrics.totalItemsReady}`);
    
    // Verification
    console.log('\n✅ Verification:');
    if (calculatedTotal === expectedTotal) {
      console.log('✅ getTotalItemsReady() calculation is CORRECT');
    } else {
      console.log('❌ getTotalItemsReady() calculation is INCORRECT');
      console.log(`Expected: ${expectedTotal}, Got: ${calculatedTotal}`);
    }
    
    if (ordersMetrics.totalItemsReady === expectedTotal) {
      console.log('✅ Orders page metrics calculation is CORRECT');
    } else {
      console.log('❌ Orders page metrics calculation is INCORRECT');
      console.log(`Expected: ${expectedTotal}, Got: ${ordersMetrics.totalItemsReady}`);
    }
    
    // Test 4: Verify production metrics only count production items
    console.log('\n🏭 Testing production metrics filtering:');
    const allItemsByStatus = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      _count: { id: true },
      where: {
        isProduct: true  // Should only count production items
      }
    });
    
    console.log('Production items by status (isProduct: true only):');
    allItemsByStatus.forEach(item => {
      console.log(`  ${item.itemStatus}: ${item._count.id}`);
    });
    
    const productionMetrics = ordersMetrics.productionMetrics;
    console.log('\nCalculated production metrics:');
    console.log(`  NOT_STARTED_PRODUCTION: ${productionMetrics.notStarted}`);
    console.log(`  CUTTING: ${productionMetrics.cutting}`);
    console.log(`  SEWING: ${productionMetrics.sewing}`);
    console.log(`  FOAM_CUTTING: ${productionMetrics.foamCutting}`);
    console.log(`  PACKAGING: ${productionMetrics.packaging}`);
    console.log(`  PRODUCT_FINISHED: ${productionMetrics.finished}`);
    console.log(`  READY: ${productionMetrics.ready}`);
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTotalItemsReadyCalculation();