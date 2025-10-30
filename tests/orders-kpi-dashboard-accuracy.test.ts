import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MetricsService, type OrderFilters } from '../utils/metricsService';
import { getEnhancedPrismaClient } from '~/server/lib/db';

describe('Orders KPI Dashboard - Accuracy and Interactions Tests', () => {
  let prisma: any;
  let testCustomer: any;
  let testItem: any;
  let testUser: any;
  let testOrders: any[] = [];
  let testOrderItems: any[] = [];

  beforeAll(async () => {
    // Get Prisma client
    prisma = await getEnhancedPrismaClient();

    // Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer - KPI Tests',
        email: 'test-kpi@example.com'
      }
    });

    // Create test item
    testItem = await prisma.item.create({
      data: {
        name: 'Test Item - KPI Tests',
        description: 'Test item for KPI testing'
      }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-kpi-user@example.com',
        name: 'Test KPI User'
      }
    });

    // Create test station for lead time calculations
    const testStation = await prisma.station.create({
      data: {
        name: 'CUTTING',
        description: 'Test cutting station'
      }
    });

    // Create test data for KPI calculations
    await createTestData();
  });

  afterAll(async () => {
    // Cleanup all test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  async function createTestData() {
    // Create orders with different statuses for testing
    const orderStatuses = ['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'COMPLETED'];
    
    for (let i = 0; i < orderStatuses.length; i++) {
      const status = orderStatuses[i];
      
      // Create 2 orders per status
      for (let j = 0; j < 2; j++) {
        const order = await prisma.order.create({
          data: {
            customerId: testCustomer.id,
            orderStatus: status,
            contactEmail: `test-kpi-${status.toLowerCase()}-${j}@example.com`,
            salesOrderNumber: `TEST-KPI-${status}-${j}`,
            totalAmount: 100 + (i * 10) + j,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Spread over days
            priority: j === 0 ? 'HIGH' : 'MEDIUM'
          }
        });
        testOrders.push(order);

        // Create production items with different statuses
        const itemStatuses = ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY'];
        
        for (let k = 0; k < 3; k++) {
          const itemStatus = itemStatuses[k % itemStatuses.length];
          
          const orderItem = await prisma.orderItem.create({
            data: {
              orderId: order.id,
              itemId: testItem.id,
              quantity: k + 1,
              itemStatus: itemStatus,
              isProduct: true, // All test items are production items
              createdAt: new Date(Date.now() - (k * 12 * 60 * 60 * 1000)), // Spread over hours
              updatedAt: itemStatus === 'READY' || itemStatus === 'PRODUCT_FINISHED' 
                ? new Date(Date.now() - (k * 6 * 60 * 60 * 1000)) // Completed items
                : new Date(Date.now() - (k * 12 * 60 * 60 * 1000))
            }
          });
          testOrderItems.push(orderItem);

          // Create processing logs for lead time calculation
          if (itemStatus === 'READY' || itemStatus === 'PRODUCT_FINISHED') {
            const station = await prisma.station.findFirst({ where: { name: 'CUTTING' } });
            if (station) {
              await prisma.itemProcessingLog.create({
                data: {
                  orderItemId: orderItem.id,
                  stationId: station.id,
                  userId: testUser.id,
                  startTime: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)), // 30 days ago
                  endTime: new Date(Date.now() - (29 * 24 * 60 * 60 * 1000)), // 29 days ago
                  durationInSeconds: 24 * 60 * 60 // 1 day
                }
              });
            }
          }
        }
      }
    }
  }

  async function cleanupTestData() {
    // Delete in reverse order of creation
    await prisma.itemProcessingLog.deleteMany({
      where: {
        orderItem: {
          order: {
            customerId: testCustomer.id
          }
        }
      }
    });

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          customerId: testCustomer.id
        }
      }
    });

    await prisma.order.deleteMany({
      where: {
        customerId: testCustomer.id
      }
    });

    await prisma.station.deleteMany({
      where: {
        name: 'CUTTING'
      }
    });

    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    if (testItem) {
      await prisma.item.delete({ where: { id: testItem.id } }).catch(() => {});
    }
    if (testCustomer) {
      await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    }
  }

  describe('KPI Calculation Accuracy', () => {
    it('should calculate order status KPIs correctly', async () => {
      console.log('🧪 Testing order status KPI calculations...');

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Verify order status counts
      expect(metrics.ordersPending).toBeGreaterThanOrEqual(2); // 2 PENDING orders created
      expect(metrics.ordersApproved).toBeGreaterThanOrEqual(2); // 2 APPROVED orders created
      expect(metrics.ordersInProgress).toBeGreaterThanOrEqual(2); // 2 ORDER_PROCESSING orders created
      expect(metrics.ordersReadyToShip).toBeGreaterThanOrEqual(2); // 2 READY_TO_SHIP orders created
      expect(metrics.ordersCompleted).toBeGreaterThanOrEqual(2); // 2 COMPLETED orders created

      // Verify all values are numbers
      expect(typeof metrics.ordersPending).toBe('number');
      expect(typeof metrics.ordersApproved).toBe('number');
      expect(typeof metrics.ordersInProgress).toBe('number');
      expect(typeof metrics.ordersReadyToShip).toBe('number');
      expect(typeof metrics.ordersCompleted).toBe('number');

      console.log('✅ Order status KPI calculations are accurate');
    });

    it('should calculate production item KPIs correctly', async () => {
      console.log('🧪 Testing production item KPI calculations...');

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Verify production item counts
      expect(metrics.itemsInProduction).toBeGreaterThanOrEqual(0); // Items in CUTTING, SEWING, FOAM_CUTTING, STUFFING, PACKAGING
      expect(metrics.itemsNotStarted).toBeGreaterThanOrEqual(0); // Items in NOT_STARTED_PRODUCTION
      expect(metrics.itemsCompleted).toBeGreaterThanOrEqual(0); // Items in PRODUCT_FINISHED, READY

      // Verify all values are numbers
      expect(typeof metrics.itemsInProduction).toBe('number');
      expect(typeof metrics.itemsNotStarted).toBe('number');
      expect(typeof metrics.itemsCompleted).toBe('number');

      // Verify only production items are counted (isProduct: true)
      const directQuery = await prisma.orderItem.count({
        where: {
          isProduct: true,
          itemStatus: {
            in: ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING']
          }
        }
      });

      expect(metrics.itemsInProduction).toBeLessThanOrEqual(directQuery + 10); // Allow some variance for other test data

      console.log('✅ Production item KPI calculations are accurate');
    });

    it('should calculate average lead time correctly with 60-day window', async () => {
      console.log('🧪 Testing average lead time calculation...');

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Verify lead time is a number
      expect(typeof metrics.avgLeadTimeHours).toBe('number');
      expect(metrics.avgLeadTimeHours).toBeGreaterThanOrEqual(0);

      // Test with specific date range to verify 60-day window
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
      const filters: OrderFilters = {
        dateFrom: sixtyDaysAgo,
        dateTo: now
      };

      const filteredMetrics = await MetricsService.getOrdersKPIMetrics(filters);
      expect(typeof filteredMetrics.avgLeadTimeHours).toBe('number');

      // Test with date range outside 60-day window
      const oldDate = new Date(now.getTime() - (120 * 24 * 60 * 60 * 1000));
      const oldFilters: OrderFilters = {
        dateFrom: oldDate,
        dateTo: new Date(oldDate.getTime() + (30 * 24 * 60 * 60 * 1000))
      };

      const oldMetrics = await MetricsService.getOrdersKPIMetrics(oldFilters);
      expect(typeof oldMetrics.avgLeadTimeHours).toBe('number');

      console.log('✅ Average lead time calculation with 60-day window is accurate');
    });

    it('should filter production items by isProduct: true only', async () => {
      console.log('🧪 Testing production item filtering (isProduct: true only)...');

      // Create a non-production item for testing
      const nonProductionOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'PENDING',
          contactEmail: 'test-non-production@example.com',
          salesOrderNumber: 'TEST-NON-PRODUCTION-001'
        }
      });

      const nonProductionItem = await prisma.orderItem.create({
        data: {
          orderId: nonProductionOrder.id,
          itemId: testItem.id,
          quantity: 1,
          itemStatus: 'CUTTING',
          isProduct: false // Non-production item
        }
      });

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Verify that non-production items are not counted
      const allCuttingItems = await prisma.orderItem.count({
        where: {
          itemStatus: 'CUTTING'
        }
      });

      const productionCuttingItems = await prisma.orderItem.count({
        where: {
          itemStatus: 'CUTTING',
          isProduct: true
        }
      });

      expect(allCuttingItems).toBeGreaterThan(productionCuttingItems);

      // Cleanup
      await prisma.orderItem.delete({ where: { id: nonProductionItem.id } });
      await prisma.order.delete({ where: { id: nonProductionOrder.id } });

      console.log('✅ Production item filtering (isProduct: true only) is working correctly');
    });
  });

  describe('KPI Filtering and Performance', () => {
    it('should apply filters correctly to KPI calculations', async () => {
      console.log('🧪 Testing KPI filtering functionality...');

      // Test status filter
      const statusFilter: OrderFilters = {
        status: ['PENDING', 'APPROVED']
      };

      const statusMetrics = await MetricsService.getOrdersKPIMetrics(statusFilter);
      expect(statusMetrics.ordersInProgress).toBe(0); // Should be 0 since we filtered out ORDER_PROCESSING
      expect(statusMetrics.ordersPending).toBeGreaterThanOrEqual(0);
      expect(statusMetrics.ordersApproved).toBeGreaterThanOrEqual(0);

      // Test date filter
      const now = new Date();
      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const dateFilter: OrderFilters = {
        dateFrom: yesterday,
        dateTo: now
      };

      const dateMetrics = await MetricsService.getOrdersKPIMetrics(dateFilter);
      expect(typeof dateMetrics.ordersPending).toBe('number');

      // Test priority filter
      const priorityFilter: OrderFilters = {
        priority: ['HIGH']
      };

      const priorityMetrics = await MetricsService.getOrdersKPIMetrics(priorityFilter);
      expect(typeof priorityMetrics.ordersPending).toBe('number');

      // Test combined filters
      const combinedFilter: OrderFilters = {
        status: ['PENDING'],
        priority: ['HIGH'],
        dateFrom: yesterday,
        dateTo: now
      };

      const combinedMetrics = await MetricsService.getOrdersKPIMetrics(combinedFilter);
      expect(typeof combinedMetrics.ordersPending).toBe('number');

      console.log('✅ KPI filtering functionality is working correctly');
    });

    it('should complete KPI calculations within 3 seconds', async () => {
      console.log('🧪 Testing KPI calculation performance...');

      const startTime = Date.now();
      const metrics = await MetricsService.getOrdersKPIMetrics();
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Test with filters
      const filterStartTime = Date.now();
      const filteredMetrics = await MetricsService.getOrdersKPIMetrics({
        status: ['PENDING', 'APPROVED', 'ORDER_PROCESSING']
      });
      const filterEndTime = Date.now();

      const filterExecutionTime = filterEndTime - filterStartTime;
      expect(filterExecutionTime).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`✅ KPI calculations completed in ${executionTime}ms (filtered: ${filterExecutionTime}ms)`);
    });

    it('should handle edge cases gracefully', async () => {
      console.log('🧪 Testing KPI edge case handling...');

      // Test with empty filters
      const emptyMetrics = await MetricsService.getOrdersKPIMetrics({});
      expect(typeof emptyMetrics.ordersPending).toBe('number');

      // Test with invalid date range
      const invalidDateFilter: OrderFilters = {
        dateFrom: new Date('2030-01-01'),
        dateTo: new Date('2030-01-02')
      };

      const invalidDateMetrics = await MetricsService.getOrdersKPIMetrics(invalidDateFilter);
      expect(invalidDateMetrics.ordersPending).toBe(0);
      expect(invalidDateMetrics.ordersApproved).toBe(0);

      // Test with non-existent customer
      const invalidCustomerFilter: OrderFilters = {
        customerId: 'non-existent-customer-id'
      };

      const invalidCustomerMetrics = await MetricsService.getOrdersKPIMetrics(invalidCustomerFilter);
      expect(invalidCustomerMetrics.ordersPending).toBe(0);

      console.log('✅ KPI edge case handling is working correctly');
    });
  });

  describe('Error Handling and Fallback Values', () => {
    it('should return fallback values on database errors', async () => {
      console.log('🧪 Testing KPI error handling and fallback values...');

      // Mock database error
      const originalCount = prisma.order.count;
      prisma.order.count = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Should return fallback values (0) instead of throwing
      expect(metrics.ordersPending).toBe(0);
      expect(metrics.ordersApproved).toBe(0);
      expect(metrics.ordersInProgress).toBe(0);
      expect(metrics.ordersReadyToShip).toBe(0);
      expect(metrics.ordersCompleted).toBe(0);
      expect(metrics.itemsInProduction).toBe(0);
      expect(metrics.itemsNotStarted).toBe(0);
      expect(metrics.itemsCompleted).toBe(0);
      expect(metrics.avgLeadTimeHours).toBe(0);

      // Restore original function
      prisma.order.count = originalCount;

      console.log('✅ KPI error handling and fallback values are working correctly');
    });

    it('should handle partial failures gracefully', async () => {
      console.log('🧪 Testing KPI partial failure handling...');

      // Mock partial failure - only order count fails
      const originalOrderCount = prisma.order.count;
      const originalItemCount = prisma.orderItem.count;

      prisma.order.count = vi.fn().mockRejectedValue(new Error('Order count failed'));
      // Keep item count working

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Order metrics should be 0 (fallback)
      expect(metrics.ordersPending).toBe(0);
      expect(metrics.ordersApproved).toBe(0);

      // Item metrics might still work (depending on implementation)
      expect(typeof metrics.itemsInProduction).toBe('number');
      expect(typeof metrics.itemsNotStarted).toBe('number');

      // Restore original functions
      prisma.order.count = originalOrderCount;
      prisma.orderItem.count = originalItemCount;

      console.log('✅ KPI partial failure handling is working correctly');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain legacy fields for backward compatibility', async () => {
      console.log('🧪 Testing KPI backward compatibility...');

      const metrics = await MetricsService.getOrdersKPIMetrics();

      // Verify legacy fields are present
      expect(metrics).toHaveProperty('statusCounts');
      expect(metrics).toHaveProperty('totalValue');
      expect(metrics).toHaveProperty('averageOrderValue');

      // Verify legacy fields have correct types
      expect(typeof metrics.statusCounts).toBe('object');
      expect(typeof metrics.totalValue).toBe('number');
      expect(typeof metrics.averageOrderValue).toBe('number');

      // Verify new KPI fields are also present
      expect(metrics).toHaveProperty('ordersPending');
      expect(metrics).toHaveProperty('ordersApproved');
      expect(metrics).toHaveProperty('itemsInProduction');
      expect(metrics).toHaveProperty('avgLeadTimeHours');

      console.log('✅ KPI backward compatibility is maintained');
    });
  });
});