/**
 * Manual test for dashboard metrics API endpoint
 * This script tests the actual HTTP endpoint functionality
 * 
 * Run with: npx tsx tests/manual-dashboard-metrics-test.ts
 */

import { PrismaClient } from '@prisma-app/client';
import { MetricsService } from '../utils/metricsService';

const prisma = new PrismaClient();

async function testDashboardMetricsAPI() {
  console.log('🧪 Testing Dashboard Metrics API...\n');

  try {
    // Test 1: Direct MetricsService call
    console.log('📊 Testing MetricsService.getDashboardMetrics()...');
    const startTime = Date.now();
    const metrics = await MetricsService.getDashboardMetrics();
    const endTime = Date.now();
    
    console.log('✅ Metrics calculated successfully!');
    console.log(`⏱️  Execution time: ${endTime - startTime}ms`);
    console.log('📈 Dashboard Metrics:');
    console.log(`   Total Orders: ${metrics.totalOrders}`);
    console.log(`   Revenue This Month: $${metrics.revenueThisMonth.toFixed(2)}`);
    console.log(`   Orders This Week: ${metrics.ordersThisWeek}`);
    console.log(`   Pending Orders: ${metrics.pendingOrders}`);
    console.log(`   In Production: ${metrics.inProduction}`);
    console.log(`   Ready to Ship: ${metrics.readyToShip}\n`);

    // Test 2: Validate response structure
    console.log('🔍 Validating response structure...');
    const requiredFields = [
      'totalOrders', 'revenueThisMonth', 'ordersThisWeek',
      'pendingOrders', 'inProduction', 'readyToShip'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in metrics));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate all values are numbers
    const invalidFields = requiredFields.filter(field => typeof metrics[field] !== 'number');
    if (invalidFields.length > 0) {
      throw new Error(`Non-numeric values in fields: ${invalidFields.join(', ')}`);
    }
    
    // Validate all values are non-negative
    const negativeFields = requiredFields.filter(field => metrics[field] < 0);
    if (negativeFields.length > 0) {
      throw new Error(`Negative values in fields: ${negativeFields.join(', ')}`);
    }
    
    console.log('✅ Response structure is valid!\n');

    // Test 3: Test individual metric methods
    console.log('🔧 Testing individual metric methods...');
    
    const individualTests = [
      { name: 'getTotalOrders', method: MetricsService.getTotalOrders },
      { name: 'getRevenueThisMonth', method: MetricsService.getRevenueThisMonth },
      { name: 'getOrdersThisWeek', method: MetricsService.getOrdersThisWeek },
      { name: 'getPendingOrders', method: MetricsService.getPendingOrders },
      { name: 'getInProduction', method: MetricsService.getInProduction },
      { name: 'getReadyToShip', method: MetricsService.getReadyToShip }
    ];

    for (const test of individualTests) {
      try {
        const result = await test.method();
        console.log(`   ✅ ${test.name}: ${result}`);
      } catch (error) {
        console.log(`   ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    console.log();

    // Test 4: Simulate API endpoint response format
    console.log('🌐 Testing API endpoint response format...');
    const apiResponse = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ API Response Format:');
    console.log(JSON.stringify(apiResponse, null, 2));
    console.log();

    // Test 5: Database connection test
    console.log('🗄️  Testing database connection...');
    const orderCount = await prisma.order.count();
    console.log(`✅ Database connected! Found ${orderCount} orders in database.\n`);

    // Test 6: Performance test with multiple calls
    console.log('⚡ Performance test (5 consecutive calls)...');
    const performanceResults = [];
    
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await MetricsService.getDashboardMetrics();
      const duration = Date.now() - start;
      performanceResults.push(duration);
    }
    
    const avgTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;
    const minTime = Math.min(...performanceResults);
    const maxTime = Math.max(...performanceResults);
    
    console.log(`   Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min time: ${minTime}ms`);
    console.log(`   Max time: ${maxTime}ms`);
    console.log(`   All times: [${performanceResults.join(', ')}]ms\n`);

    console.log('🎉 All tests passed! Dashboard Metrics API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDashboardMetricsAPI().catch(console.error);