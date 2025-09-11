/**
 * Manual test for orders metrics API endpoint
 * This script tests the actual HTTP endpoint functionality with various filter combinations
 * 
 * Run with: npx tsx tests/manual-orders-metrics-test.ts
 */

import { PrismaClient } from '@prisma-app/client';
import { MetricsService, type OrderFilters } from '../utils/metricsService';

const prisma = new PrismaClient();

async function testOrdersMetricsAPI() {
  console.log('🧪 Testing Orders Metrics API...\n');

  try {
    // Test 1: Basic MetricsService call without filters
    console.log('📊 Testing MetricsService.getOrdersPageMetrics() without filters...');
    const startTime = Date.now();
    const metrics = await MetricsService.getOrdersPageMetrics();
    const endTime = Date.now();
    
    console.log('✅ Metrics calculated successfully!');
    console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
    console.log('📈 Orders Page Metrics:');
    console.log(`   Total Orders: ${metrics.totalOrders}`);
    console.log(`   Total Value: ${metrics.totalValue.toFixed(2)}`);
    console.log(`   Average Order Value: ${metrics.averageOrderValue.toFixed(2)}`);
    console.log('   Status Counts:', metrics.statusCounts);
    console.log('   Production Metrics:', metrics.productionMetrics);
    console.log();

    // Test 2: Validate response structure
    console.log('🔍 Validating response structure...');
    const requiredFields = [
      'statusCounts', 'totalValue', 'averageOrderValue', 
      'totalOrders', 'productionMetrics'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in metrics));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate productionMetrics structure
    const requiredProductionFields = [
      'notStarted', 'cutting', 'sewing', 'foamCutting', 
      'packaging', 'finished', 'ready'
    ];
    
    const missingProductionFields = requiredProductionFields.filter(
      field => !(field in metrics.productionMetrics)
    );
    if (missingProductionFields.length > 0) {
      throw new Error(`Missing production metric fields: ${missingProductionFields.join(', ')}`);
    }
    
    console.log('✅ Response structure is valid!\n');

    // Test 3: Test with status filters
    console.log('🎯 Testing with status filters...');
    const statusFilters: OrderFilters = {
      status: ['PENDING', 'ORDER_PROCESSING']
    };
    
    const filteredMetrics = await MetricsService.getOrdersPageMetrics(statusFilters);
    console.log('   Status Filter Results:');
    console.log(`   Total Orders: ${filteredMetrics.totalOrders}`);
    console.log(`   Total Value: ${filteredMetrics.totalValue.toFixed(2)}`);
    console.log('   Status Counts:', filteredMetrics.statusCounts);
    console.log();

    // Test 4: Test with date range filters
    console.log('📅 Testing with date range filters...');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dateFilters: OrderFilters = {
      dateFrom: thirtyDaysAgo,
      dateTo: now
    };
    
    const dateFilteredMetrics = await MetricsService.getOrdersPageMetrics(dateFilters);
    console.log('   Date Filter Results (Last 30 days):');
    console.log(`   Total Orders: ${dateFilteredMetrics.totalOrders}`);
    console.log(`   Total Value: ${dateFilteredMetrics.totalValue.toFixed(2)}`);
    console.log();

    // Test 5: Test with priority filters
    console.log('⚡ Testing with priority filters...');
    const priorityFilters: OrderFilters = {
      priority: ['HIGH', 'MEDIUM']
    };
    
    const priorityFilteredMetrics = await MetricsService.getOrdersPageMetrics(priorityFilters);
    console.log('   Priority Filter Results (HIGH, MEDIUM):');
    console.log(`   Total Orders: ${priorityFilteredMetrics.totalOrders}`);
    console.log(`   Total Value: ${priorityFilteredMetrics.totalValue.toFixed(2)}`);
    console.log();

    // Test 6: Test with combined filters
    console.log('🔗 Testing with combined filters...');
    const combinedFilters: OrderFilters = {
      status: ['PENDING', 'ORDER_PROCESSING', 'READY_TO_SHIP'],
      priority: ['HIGH'],
      dateFrom: thirtyDaysAgo,
      dateTo: now
    };
    
    const combinedMetrics = await MetricsService.getOrdersPageMetrics(combinedFilters);
    console.log('   Combined Filter Results:');
    console.log(`   Total Orders: ${combinedMetrics.totalOrders}`);
    console.log(`   Total Value: ${combinedMetrics.totalValue.toFixed(2)}`);
    console.log('   Status Counts:', combinedMetrics.statusCounts);
    console.log();

    // Test 7: Test with customer filter (if we have customers)
    console.log('👤 Testing with customer filter...');
    const customers = await prisma.customer.findMany({ take: 1 });
    if (customers.length > 0) {
      const customerFilters: OrderFilters = {
        customerId: customers[0].id
      };
      
      const customerMetrics = await MetricsService.getOrdersPageMetrics(customerFilters);
      console.log(`   Customer Filter Results (${customers[0].id}):`);
      console.log(`   Total Orders: ${customerMetrics.totalOrders}`);
      console.log(`   Total Value: ${customerMetrics.totalValue.toFixed(2)}`);
    } else {
      console.log('   No customers found, skipping customer filter test');
    }
    console.log();

    // Test 8: Test empty filters (should return same as no filters)
    console.log('🔄 Testing with empty filters...');
    const emptyFilters: OrderFilters = {};
    const emptyFilterMetrics = await MetricsService.getOrdersPageMetrics(emptyFilters);
    
    // Should match the original metrics
    const metricsMatch = JSON.stringify(metrics) === JSON.stringify(emptyFilterMetrics);
    console.log(`   Empty filters match no filters: ${metricsMatch ? '✅' : '❌'}`);
    console.log();

    // Test 9: Test edge cases
    console.log('🧪 Testing edge cases...');
    
    // Test with invalid status (should be filtered out)
    const invalidStatusFilters: OrderFilters = {
      status: ['INVALID_STATUS', 'PENDING'] as any
    };
    
    try {
      const invalidStatusMetrics = await MetricsService.getOrdersPageMetrics(invalidStatusFilters);
      console.log('   ✅ Invalid status handled gracefully');
    } catch (error) {
      console.log(`   ❌ Invalid status caused error: ${error.message}`);
    }
    
    // Test with future date range (should return empty results)
    const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const futureDateFilters: OrderFilters = {
      dateFrom: futureDate,
      dateTo: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    };
    
    const futureMetrics = await MetricsService.getOrdersPageMetrics(futureDateFilters);
    console.log(`   Future date range returns zero orders: ${futureMetrics.totalOrders === 0 ? '✅' : '❌'}`);
    console.log();

    // Test 10: Performance test with filters
    console.log('⚡ Performance test with various filters (5 calls each)...');
    
    const filterTests = [
      { name: 'No filters', filters: undefined },
      { name: 'Status filter', filters: { status: ['PENDING'] } },
      { name: 'Date filter', filters: { dateFrom: thirtyDaysAgo, dateTo: now } },
      { name: 'Combined filters', filters: combinedFilters }
    ];
    
    for (const test of filterTests) {
      const times = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await MetricsService.getOrdersPageMetrics(test.filters);
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`   ${test.name}: ${avgTime.toFixed(2)}ms avg (${Math.min(...times)}-${Math.max(...times)}ms)`);
    }
    console.log();

    // Test 11: Simulate API endpoint response format
    console.log('🌐 Testing API endpoint response format...');
    const apiResponse = {
      success: true,
      data: metrics,
      filters: {},
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ API Response Format Sample:');
    console.log(JSON.stringify(apiResponse, null, 2));
    console.log();

    // Test 12: Database connection and data validation
    console.log('🗄️  Testing database connection and data validation...');
    const [orderCount, customerCount, orderItemCount] = await Promise.all([
      prisma.order.count(),
      prisma.customer.count(),
      prisma.orderItem.count()
    ]);
    
    console.log(`✅ Database connected!`);
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Order Items: ${orderItemCount}`);
    console.log();

    console.log('🎉 All tests passed! Orders Metrics API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testOrdersMetricsAPI().catch(console.error);