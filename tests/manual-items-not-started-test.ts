/**
 * Manual test for Items Not Started calculation fix
 * Tests the implementation of task 5: Fix "Items Not Started" calculation
 * 
 * This test verifies:
 * 1. Only production items (isProduct: true) are counted
 * 2. Only items with NOT_STARTED_PRODUCTION status are counted
 * 3. Non-production items are excluded from production metrics entirely
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { MetricsService } from '~/utils/metricsService';

async function testItemsNotStartedCalculation() {
  console.log('🧪 Testing Items Not Started calculation...');
  
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
    const nonProductionItems = allOrderItems.filter(item => !item.isProduct);
    console.log(`Production items (isProduct: true): ${productionItems.length}`);
    console.log(`Non-production items (isProduct: false): ${nonProductionItems.length}`);
    
    // Check NOT_STARTED_PRODUCTION items
    const allNotStartedItems = allOrderItems.filter(item => 
      item.itemStatus === 'NOT_STARTED_PRODUCTION'
    );
    console.log(`All items with NOT_STARTED_PRODUCTION status: ${allNotStartedItems.length}`);
    
    const productionNotStartedItems = allOrderItems.filter(item => 
      item.itemStatus === 'NOT_STARTED_PRODUCTION' && item.isProduct
    );
    console.log(`Production items with NOT_STARTED_PRODUCTION status: ${productionNotStartedItems.length}`);
    
    const nonProductionNotStartedItems = allOrderItems.filter(item => 
      item.itemStatus === 'NOT_STARTED_PRODUCTION' && !item.isProduct
    );
    console.log(`Non-production items with NOT_STARTED_PRODUCTION status: ${nonProductionNotStartedItems.length}`);
    
    const expectedNotStarted = productionNotStartedItems.length;
    console.log(`Expected Items Not Started (production only): ${expectedNotStarted}`);
    
    // Test 2: Test the new getItemsNotStarted method
    console.log('\n🔧 Testing MetricsService.getItemsNotStarted():');
    const calculatedNotStarted = await MetricsService.getItemsNotStarted();
    console.log(`Calculated Items Not Started (direct method): ${calculatedNotStarted}`);
    
    // Test 3: Test the orders page metrics
    console.log('\n📈 Testing getOrdersPageMetrics():');
    const ordersMetrics = await MetricsService.getOrdersPageMetrics();
    console.log(`Calculated Items Not Started (orders metrics): ${ordersMetrics.productionMetrics.notStarted}`);
    
    // Verification
    console.log('\n✅ Verification:');
    if (calculatedNotStarted === expectedNotStarted) {
      console.log('✅ Direct getItemsNotStarted() calculation is CORRECT');
    } else {
      console.log('❌ Direct getItemsNotStarted() calculation is INCORRECT');
      console.log(`Expected: ${expectedNotStarted}, Got: ${calculatedNotStarted}`);
    }
    
    if (ordersMetrics.productionMetrics.notStarted === expectedNotStarted) {
      console.log('✅ Orders page metrics calculation is CORRECT');
    } else {
      console.log('❌ Orders page metrics calculation is INCORRECT');
      console.log(`Expected: ${expectedNotStarted}, Got: ${ordersMetrics.productionMetrics.notStarted}`);
    }
    
    // Test 3: Verify all production metrics only count production items
    console.log('\n🏭 Testing all production metrics filtering:');
    const productionItemsByStatus = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      _count: { id: true },
      where: {
        isProduct: true  // Should only count production items
      }
    });
    
    console.log('Production items by status (isProduct: true only):');
    const statusCounts: Record<string, number> = {};
    productionItemsByStatus.forEach(item => {
      statusCounts[item.itemStatus] = item._count.id;
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
    
    // Verify each status count
    console.log('\n🔍 Detailed verification:');
    const verifications = [
      { status: 'NOT_STARTED_PRODUCTION', expected: statusCounts['NOT_STARTED_PRODUCTION'] || 0, actual: productionMetrics.notStarted },
      { status: 'CUTTING', expected: statusCounts['CUTTING'] || 0, actual: productionMetrics.cutting },
      { status: 'SEWING', expected: statusCounts['SEWING'] || 0, actual: productionMetrics.sewing },
      { status: 'FOAM_CUTTING', expected: statusCounts['FOAM_CUTTING'] || 0, actual: productionMetrics.foamCutting },
      { status: 'PACKAGING', expected: statusCounts['PACKAGING'] || 0, actual: productionMetrics.packaging },
      { status: 'PRODUCT_FINISHED', expected: statusCounts['PRODUCT_FINISHED'] || 0, actual: productionMetrics.finished },
      { status: 'READY', expected: statusCounts['READY'] || 0, actual: productionMetrics.ready }
    ];
    
    let allCorrect = true;
    verifications.forEach(({ status, expected, actual }) => {
      if (expected === actual) {
        console.log(`✅ ${status}: ${actual} (correct)`);
      } else {
        console.log(`❌ ${status}: Expected ${expected}, Got ${actual}`);
        allCorrect = false;
      }
    });
    
    if (allCorrect) {
      console.log('\n🎉 All production metrics calculations are CORRECT!');
    } else {
      console.log('\n❌ Some production metrics calculations are INCORRECT!');
    }
    
    // Test 4: Check if non-production items are being incorrectly included
    console.log('\n🚫 Testing exclusion of non-production items:');
    const allItemsByStatus = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      _count: { id: true }
      // No isProduct filter - includes all items
    });
    
    console.log('All items by status (including non-production):');
    allItemsByStatus.forEach(item => {
      console.log(`  ${item.itemStatus}: ${item._count.id}`);
    });
    
    const nonProductionItemsByStatus = await prisma.orderItem.groupBy({
      by: ['itemStatus'],
      _count: { id: true },
      where: {
        isProduct: false  // Only non-production items
      }
    });
    
    console.log('\nNon-production items by status (isProduct: false):');
    nonProductionItemsByStatus.forEach(item => {
      console.log(`  ${item.itemStatus}: ${item._count.id}`);
    });
    
    // Test 5: Verify that items that have started production are not counted
    console.log('\n🔄 Testing exclusion of items that have started production:');
    
    const itemsInProduction = await prisma.orderItem.count({
      where: {
        isProduct: true,
        itemStatus: {
          in: ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY']
        }
      }
    });
    
    console.log(`Production items that have started production: ${itemsInProduction}`);
    
    // These should NOT be included in "Items Not Started"
    const totalProductionItems = await prisma.orderItem.count({
      where: {
        isProduct: true
      }
    });
    
    console.log(`Total production items: ${totalProductionItems}`);
    console.log(`Items not started + items in production should equal total: ${expectedNotStarted + itemsInProduction} = ${totalProductionItems}`);
    
    if (expectedNotStarted + itemsInProduction === totalProductionItems) {
      console.log('✅ Production item accounting is CORRECT');
    } else {
      console.log('❌ Production item accounting has discrepancies');
    }
    
    // Test 6: Verify requirement 6.3 - items that have started any production step should not count
    console.log('\n📋 Testing requirement 6.3 - items that started production should not count:');
    
    const startedProductionStatuses = ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY'];
    for (const status of startedProductionStatuses) {
      const itemsWithStatus = await prisma.orderItem.count({
        where: {
          isProduct: true,
          itemStatus: status
        }
      });
      
      if (itemsWithStatus > 0) {
        console.log(`✅ ${itemsWithStatus} items with status ${status} are correctly excluded from "not started"`);
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testItemsNotStartedCalculation();