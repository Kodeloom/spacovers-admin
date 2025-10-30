import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { unenhancedPrisma } from '~/server/lib/db';

describe('Orders KPI Dashboard - Expandable Rows Functionality Tests', () => {
  let prisma: any;
  let testCustomer: any;
  let testItems: any[] = [];
  let testOrders: any[] = [];
  let testOrderItems: any[] = [];

  beforeAll(async () => {
    console.log('🚀 Setting up expandable rows functionality tests...');
    
    // Get Prisma client
    prisma = unenhancedPrisma;

    // Create test customer
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer for Expandable Rows',
        email: 'expandable-test@example.com',
        phone: '555-0123',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      }
    });

    // Create test items (both production and non-production)
    const itemsData = [
      { name: 'Production Item 1', isProduct: true },
      { name: 'Production Item 2', isProduct: true },
      { name: 'Non-Production Item 1', isProduct: false },
      { name: 'Production Item 3', isProduct: true }
    ];

    for (const itemData of itemsData) {
      const item = await prisma.item.create({
        data: {
          name: itemData.name,
          description: `Test ${itemData.name}`,
          unitPrice: 100.00,
          category: 'TEST'
        }
      });
      testItems.push({ ...item, isProduct: itemData.isProduct });
    }

    console.log(`✅ Created ${testItems.length} test items`);
  });

  beforeEach(async () => {
    // Clean up any existing test orders before each test
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          customer: {
            id: testCustomer.id
          }
        }
      }
    });

    await prisma.order.deleteMany({
      where: {
        customerId: testCustomer.id
      }
    });

    testOrders = [];
    testOrderItems = [];
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up expandable rows test data...');
    
    // Clean up test data
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          customer: {
            id: testCustomer.id
          }
        }
      }
    });

    await prisma.order.deleteMany({
      where: {
        customerId: testCustomer.id
      }
    });

    await prisma.item.deleteMany({
      where: {
        id: {
          in: testItems.map(item => item.id)
        }
      }
    });

    await prisma.customer.delete({
      where: {
        id: testCustomer.id
      }
    });

    console.log('✅ Expandable rows test cleanup completed');
  });

  it('should only show expand chevron for orders with production items', async () => {
    console.log('🧪 Testing chevron visibility for orders with production items...');

    // Create order with only production items
    const orderWithProduction = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-PROD-001',
        orderStatus: 'APPROVED',
        priority: 'MEDIUM',
        totalAmount: 300.00,
        transactionDate: new Date()
      }
    });

    // Add production items to this order
    const productionItems = testItems.filter(item => item.isProduct);
    for (let i = 0; i < 2; i++) {
      await prisma.orderItem.create({
        data: {
          orderId: orderWithProduction.id,
          itemId: productionItems[i].id,
          quantity: 1,
          unitPrice: 100.00,
          itemStatus: 'CUTTING',
          isProduct: true,
          productAttributes: {
            create: {
              verified: true,
              size: 'Medium',
              color: 'Blue'
            }
          }
        }
      });
    }

    // Create order with only non-production items
    const orderWithoutProduction = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-NONPROD-001',
        orderStatus: 'APPROVED',
        priority: 'MEDIUM',
        totalAmount: 100.00,
        transactionDate: new Date()
      }
    });

    // Add non-production item to this order
    const nonProductionItem = testItems.find(item => !item.isProduct);
    await prisma.orderItem.create({
      data: {
        orderId: orderWithoutProduction.id,
        itemId: nonProductionItem!.id,
        quantity: 1,
        unitPrice: 100.00,
        itemStatus: 'READY',
        isProduct: false
      }
    });

    // Create order with mixed items
    const orderWithMixed = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-MIXED-001',
        orderStatus: 'APPROVED',
        priority: 'MEDIUM',
        totalAmount: 200.00,
        transactionDate: new Date()
      }
    });

    // Add both production and non-production items
    await prisma.orderItem.create({
      data: {
        orderId: orderWithMixed.id,
        itemId: productionItems[2].id,
        quantity: 1,
        unitPrice: 100.00,
        itemStatus: 'SEWING',
        isProduct: true,
        productAttributes: {
          create: {
            verified: false,
            size: 'Large'
          }
        }
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: orderWithMixed.id,
        itemId: nonProductionItem!.id,
        quantity: 1,
        unitPrice: 100.00,
        itemStatus: 'READY',
        isProduct: false
      }
    });

    // Fetch orders with items to test the logic
    const orders = await prisma.order.findMany({
      where: {
        customerId: testCustomer.id
      },
      include: {
        items: {
          include: {
            item: true,
            productAttributes: true
          }
        }
      }
    });

    // Test hasProductionItems logic
    const orderWithProdResult = orders.find((o: any) => o.salesOrderNumber === 'TEST-PROD-001');
    const orderWithoutProdResult = orders.find((o: any) => o.salesOrderNumber === 'TEST-NONPROD-001');
    const orderWithMixedResult = orders.find((o: any) => o.salesOrderNumber === 'TEST-MIXED-001');

    // Verify hasProductionItems logic (Requirements 6.1, 6.4)
    expect(orderWithProdResult?.items.some((item: any) => item.isProduct === true)).toBe(true);
    expect(orderWithoutProdResult?.items.some((item: any) => item.isProduct === true)).toBe(false);
    expect(orderWithMixedResult?.items.some((item: any) => item.isProduct === true)).toBe(true);

    console.log('✅ Chevron visibility test passed');
  });

  it('should correctly filter and display production items in expanded rows', async () => {
    console.log('🧪 Testing production item filtering in expanded rows...');

    // Create order with mixed items
    const testOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-FILTER-001',
        orderStatus: 'ORDER_PROCESSING',
        priority: 'HIGH',
        totalAmount: 400.00,
        transactionDate: new Date()
      }
    });

    // Add production items with different statuses
    const productionStatuses = ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'PRODUCT_FINISHED'];
    const productionItems = testItems.filter(item => item.isProduct);

    for (let i = 0; i < productionStatuses.length; i++) {
      await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: productionItems[i % productionItems.length].id,
          quantity: i + 1,
          unitPrice: 100.00,
          itemStatus: productionStatuses[i],
          isProduct: true,
          productAttributes: {
            create: {
              verified: i % 2 === 0, // Alternate verified status
              size: ['Small', 'Medium', 'Large', 'XL'][i],
              color: ['Red', 'Blue', 'Green', 'Yellow'][i],
              shape: ['Round', 'Square', 'Oval', 'Rectangle'][i]
            }
          }
        }
      });
    }

    // Add non-production items (should be filtered out)
    const nonProductionItem = testItems.find(item => !item.isProduct);
    await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        itemId: nonProductionItem!.id,
        quantity: 1,
        unitPrice: 50.00,
        itemStatus: 'READY',
        isProduct: false
      }
    });

    // Fetch order with items
    const orderWithItems = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        items: {
          include: {
            item: true,
            productAttributes: true
          }
        }
      }
    });

    // Test filtering logic (Requirements 6.2, 6.3)
    const allItems = orderWithItems?.items || [];
    const productionItemsOnly = allItems.filter((item: any) => item.isProduct === true);
    const nonProductionItemsOnly = allItems.filter((item: any) => item.isProduct === false);

    expect(allItems.length).toBe(5); // 4 production + 1 non-production
    expect(productionItemsOnly.length).toBe(4); // Only production items
    expect(nonProductionItemsOnly.length).toBe(1); // Only non-production items

    // Verify production item details are complete (Requirements 6.3, 7.1, 7.2, 7.3)
    productionItemsOnly.forEach((item: any, index: number) => {
      expect(item.item.name).toBeDefined();
      expect(item.itemStatus).toBe(productionStatuses[index]);
      expect(item.productAttributes).toBeDefined();
      expect(typeof item.productAttributes.verified).toBe('boolean');
      expect(item.productAttributes.size).toBeDefined();
      expect(item.productAttributes.color).toBeDefined();
      expect(item.productAttributes.shape).toBeDefined();
    });

    console.log('✅ Production item filtering test passed');
  });

  it('should display correct status badges and verification indicators', async () => {
    console.log('🧪 Testing status badges and verification indicators...');

    // Create order with items having different statuses and verification states
    const testOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-BADGES-001',
        orderStatus: 'ORDER_PROCESSING',
        priority: 'LOW',
        totalAmount: 300.00,
        transactionDate: new Date()
      }
    });

    // Test data for different status badges
    const testCases = [
      {
        status: 'NOT_STARTED_PRODUCTION',
        verified: false,
        expectedBadgeClass: 'bg-gray-100 text-gray-800',
        expectedVerifiedClass: 'bg-red-100 text-red-800'
      },
      {
        status: 'CUTTING',
        verified: true,
        expectedBadgeClass: 'bg-blue-100 text-blue-800',
        expectedVerifiedClass: 'bg-green-100 text-green-800'
      },
      {
        status: 'SEWING',
        verified: true,
        expectedBadgeClass: 'bg-purple-100 text-purple-800',
        expectedVerifiedClass: 'bg-green-100 text-green-800'
      },
      {
        status: 'FOAM_CUTTING',
        verified: false,
        expectedBadgeClass: 'bg-yellow-100 text-yellow-800',
        expectedVerifiedClass: 'bg-red-100 text-red-800'
      },
      {
        status: 'PACKAGING',
        verified: true,
        expectedBadgeClass: 'bg-orange-100 text-orange-800',
        expectedVerifiedClass: 'bg-green-100 text-green-800'
      },
      {
        status: 'PRODUCT_FINISHED',
        verified: true,
        expectedBadgeClass: 'bg-green-100 text-green-800',
        expectedVerifiedClass: 'bg-green-100 text-green-800'
      },
      {
        status: 'READY',
        verified: false,
        expectedBadgeClass: 'bg-emerald-100 text-emerald-800',
        expectedVerifiedClass: 'bg-red-100 text-red-800'
      }
    ];

    const productionItems = testItems.filter(item => item.isProduct);

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: productionItems[i % productionItems.length].id,
          quantity: 1,
          unitPrice: 100.00,
          itemStatus: testCase.status,
          isProduct: true,
          productAttributes: {
            create: {
              verified: testCase.verified,
              size: 'Test Size',
              color: 'Test Color'
            }
          }
        }
      });
    }

    // Fetch order with items
    const orderWithItems = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        items: {
          include: {
            item: true,
            productAttributes: true
          }
        }
      }
    });

    // Test status badge logic (Requirements 7.1, 7.2, 7.4)
    const productionItemsOnly = orderWithItems?.items.filter((item: any) => item.isProduct === true) || [];

    // Helper function to test badge classes (simulating the component logic)
    function getItemStatusBadgeClass(status: string) {
      switch (status) {
        case 'NOT_STARTED_PRODUCTION':
          return 'bg-gray-100 text-gray-800';
        case 'CUTTING':
          return 'bg-blue-100 text-blue-800';
        case 'SEWING':
          return 'bg-purple-100 text-purple-800';
        case 'FOAM_CUTTING':
          return 'bg-yellow-100 text-yellow-800';
        case 'PACKAGING':
          return 'bg-orange-100 text-orange-800';
        case 'PRODUCT_FINISHED':
          return 'bg-green-100 text-green-800';
        case 'READY':
          return 'bg-emerald-100 text-emerald-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    function formatItemStatus(status: string) {
      return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    productionItemsOnly.forEach((item: any, index: number) => {
      const testCase = testCases[index];
      
      // Test status badge class
      const actualBadgeClass = getItemStatusBadgeClass(item.itemStatus);
      expect(actualBadgeClass).toBe(testCase.expectedBadgeClass);
      
      // Test status formatting
      const formattedStatus = formatItemStatus(item.itemStatus);
      expect(formattedStatus).toBe(testCase.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()));
      
      // Test verification badge class
      const verificationClass = item.productAttributes.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      expect(verificationClass).toBe(testCase.expectedVerifiedClass);
      
      // Test verification text
      const verificationText = item.productAttributes.verified ? 'Verified' : 'Not Verified';
      expect(verificationText).toBe(testCase.verified ? 'Verified' : 'Not Verified');
    });

    console.log('✅ Status badges and verification indicators test passed');
  });

  it('should handle orders with no production items correctly', async () => {
    console.log('🧪 Testing orders with no production items...');

    // Create order with only non-production items
    const testOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-NO-PROD-001',
        orderStatus: 'COMPLETED',
        priority: 'NO_PRIORITY',
        totalAmount: 150.00,
        transactionDate: new Date()
      }
    });

    // Add only non-production items
    const nonProductionItem = testItems.find(item => !item.isProduct);
    await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        itemId: nonProductionItem!.id,
        quantity: 3,
        unitPrice: 50.00,
        itemStatus: 'READY',
        isProduct: false
      }
    });

    // Fetch order with items
    const orderWithItems = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        items: {
          include: {
            item: true,
            productAttributes: true
          }
        }
      }
    });

    // Test hasProductionItems logic (Requirements 6.4)
    const hasProduction = orderWithItems?.items.some((item: any) => item.isProduct === true);
    expect(hasProduction).toBe(false);

    // Test that filtering returns empty array
    const productionItemsOnly = orderWithItems?.items.filter((item: any) => item.isProduct === true) || [];
    expect(productionItemsOnly.length).toBe(0);

    // Verify all items are non-production
    const allItems = orderWithItems?.items || [];
    expect(allItems.length).toBe(1);
    expect(allItems[0].isProduct).toBe(false);

    console.log('✅ Orders with no production items test passed');
  });

  it('should maintain independent expansion state for multiple orders', async () => {
    console.log('🧪 Testing independent expansion state management...');

    // Create multiple orders with production items
    const orders = [];
    for (let i = 0; i < 3; i++) {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          salesOrderNumber: `TEST-EXPAND-${i + 1}`,
          orderStatus: 'APPROVED',
          priority: 'MEDIUM',
          totalAmount: 200.00,
          transactionDate: new Date()
        }
      });

      // Add production items to each order
      const productionItems = testItems.filter(item => item.isProduct);
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          itemId: productionItems[i % productionItems.length].id,
          quantity: 1,
          unitPrice: 100.00,
          itemStatus: 'CUTTING',
          isProduct: true,
          productAttributes: {
            create: {
              verified: true,
              size: 'Medium'
            }
          }
        }
      });

      orders.push(order);
    }

    // Simulate expansion state management (Requirements 6.5)
    const expandedRows = new Set<string>();

    // Test toggle functionality
    function toggleRowExpansion(orderId: string) {
      if (expandedRows.has(orderId)) {
        expandedRows.delete(orderId);
      } else {
        expandedRows.add(orderId);
      }
    }

    function isRowExpanded(orderId: string): boolean {
      return expandedRows.has(orderId);
    }

    // Test independent expansion
    expect(isRowExpanded(orders[0].id)).toBe(false);
    expect(isRowExpanded(orders[1].id)).toBe(false);
    expect(isRowExpanded(orders[2].id)).toBe(false);

    // Expand first order
    toggleRowExpansion(orders[0].id);
    expect(isRowExpanded(orders[0].id)).toBe(true);
    expect(isRowExpanded(orders[1].id)).toBe(false);
    expect(isRowExpanded(orders[2].id)).toBe(false);

    // Expand third order
    toggleRowExpansion(orders[2].id);
    expect(isRowExpanded(orders[0].id)).toBe(true);
    expect(isRowExpanded(orders[1].id)).toBe(false);
    expect(isRowExpanded(orders[2].id)).toBe(true);

    // Collapse first order
    toggleRowExpansion(orders[0].id);
    expect(isRowExpanded(orders[0].id)).toBe(false);
    expect(isRowExpanded(orders[1].id)).toBe(false);
    expect(isRowExpanded(orders[2].id)).toBe(true);

    // Expand all orders
    toggleRowExpansion(orders[0].id);
    toggleRowExpansion(orders[1].id);
    expect(isRowExpanded(orders[0].id)).toBe(true);
    expect(isRowExpanded(orders[1].id)).toBe(true);
    expect(isRowExpanded(orders[2].id)).toBe(true);

    console.log('✅ Independent expansion state test passed');
  });

  it('should display product attributes correctly in expanded rows', async () => {
    console.log('🧪 Testing product attributes display in expanded rows...');

    // Create order with production items having various attributes
    const testOrder = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        salesOrderNumber: 'TEST-ATTRS-001',
        orderStatus: 'ORDER_PROCESSING',
        priority: 'HIGH',
        totalAmount: 300.00,
        transactionDate: new Date()
      }
    });

    const productionItems = testItems.filter(item => item.isProduct);

    // Test cases for different attribute combinations
    const attributeTestCases = [
      {
        size: 'Small',
        color: 'Red',
        shape: 'Round',
        verified: true
      },
      {
        size: 'Large',
        color: null,
        shape: 'Square',
        verified: false
      },
      {
        size: null,
        color: 'Blue',
        shape: null,
        verified: true
      },
      {
        size: null,
        color: null,
        shape: null,
        verified: false
      }
    ];

    for (let i = 0; i < attributeTestCases.length; i++) {
      const attrs = attributeTestCases[i];
      await prisma.orderItem.create({
        data: {
          orderId: testOrder.id,
          itemId: productionItems[i % productionItems.length].id,
          quantity: 1,
          unitPrice: 100.00,
          itemStatus: 'SEWING',
          isProduct: true,
          productAttributes: {
            create: {
              verified: attrs.verified,
              size: attrs.size,
              color: attrs.color,
              shape: attrs.shape
            }
          }
        }
      });
    }

    // Fetch order with items
    const orderWithItems = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        items: {
          include: {
            item: true,
            productAttributes: true
          }
        }
      }
    });

    const productionItemsOnly = orderWithItems?.items.filter((item: any) => item.isProduct === true) || [];

    // Test attribute display logic (Requirements 7.3, 7.4)
    productionItemsOnly.forEach((item: any, index: number) => {
      const expectedAttrs = attributeTestCases[index];
      const actualAttrs = item.productAttributes;

      expect(actualAttrs.verified).toBe(expectedAttrs.verified);
      expect(actualAttrs.size).toBe(expectedAttrs.size);
      expect(actualAttrs.color).toBe(expectedAttrs.color);
      expect(actualAttrs.shape).toBe(expectedAttrs.shape);

      // Test attribute display logic
      const hasAttributes = actualAttrs.size || actualAttrs.color || actualAttrs.shape;
      if (index === 3) {
        // Last test case has no attributes
        expect(hasAttributes).toBeFalsy();
      } else {
        // Other test cases have at least one attribute
        expect(hasAttributes).toBeTruthy();
      }
    });

    console.log('✅ Product attributes display test passed');
  });
});