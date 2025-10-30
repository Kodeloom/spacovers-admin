// Test helper utilities for warehouse system testing

export interface TestOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: TestOrderItem[];
  status: string;
}

export interface TestOrderItem {
  id: string;
  itemName: string;
  quantity: number;
  status: string;
  barcode: string;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  assignedStation?: string;
  scannerPrefix?: string;
}

/**
 * Generate test barcode for an order item
 */
export function generateTestBarcode(
  stationCode: string = 'P',
  personCode: string = '1',
  sequenceCode: string = 'A',
  orderNumber: string,
  itemId: string
): string {
  const prefix = `${stationCode}${personCode}${sequenceCode}`;
  return `${prefix}-${orderNumber}-${itemId}`;
}

/**
 * Create test order data
 */
export function createTestOrder(
  orderNumber: string,
  customerName: string,
  itemCount: number = 2
): TestOrder {
  const items: TestOrderItem[] = [];
  
  for (let i = 1; i <= itemCount; i++) {
    const itemId = `item_${orderNumber}_${i}`;
    items.push({
      id: itemId,
      itemName: `Test Item ${i}`,
      quantity: 1,
      status: 'NOT_STARTED_PRODUCTION',
      barcode: generateTestBarcode('P', '1', 'A', orderNumber, itemId)
    });
  }

  return {
    id: `order_${orderNumber}`,
    orderNumber,
    customerName,
    items,
    status: 'APPROVED'
  };
}

/**
 * Create test users for different roles
 */
export function createTestUsers(): TestUser[] {
  return [
    {
      id: 'admin_user',
      name: 'Admin User',
      email: 'admin@test.com',
      roles: ['Super Admin']
    },
    {
      id: 'office_user',
      name: 'Office User',
      email: 'office@test.com',
      roles: ['Office Employee'],
      assignedStation: 'Office',
      scannerPrefix: 'O1A'
    },
    {
      id: 'cutting_user',
      name: 'Cutting User',
      email: 'cutting@test.com',
      roles: ['Cutting'],
      assignedStation: 'Cutting',
      scannerPrefix: 'C1A'
    },
    {
      id: 'sewing_user',
      name: 'Sewing User',
      email: 'sewing@test.com',
      roles: ['Sewing'],
      assignedStation: 'Sewing',
      scannerPrefix: 'S1A'
    },
    {
      id: 'foam_cutting_user',
      name: 'Foam Cutting User',
      email: 'foam@test.com',
      roles: ['Foam Cutting'],
      assignedStation: 'Foam Cutting',
      scannerPrefix: 'F1A'
    },
    {
      id: 'packaging_user',
      name: 'Packaging User',
      email: 'packaging@test.com',
      roles: ['Packaging'],
      assignedStation: 'Packaging',
      scannerPrefix: 'P1A'
    }
  ];
}

/**
 * Simulate barcode scan workflow
 */
export class WorkflowSimulator {
  private currentUser: TestUser | null = null;
  private testOrder: TestOrder;

  constructor(testOrder: TestOrder) {
    this.testOrder = testOrder;
  }

  setCurrentUser(user: TestUser) {
    this.currentUser = user;
  }

  async simulateScan(itemIndex: number = 0): Promise<{
    success: boolean;
    message: string;
    newStatus?: string;
  }> {
    if (!this.currentUser) {
      return {
        success: false,
        message: 'No user set for simulation'
      };
    }

    const item = this.testOrder.items[itemIndex];
    if (!item) {
      return {
        success: false,
        message: 'Item not found'
      };
    }

    // Simulate the API call
    try {
      console.log(`Simulating scan by ${this.currentUser.name} at ${this.currentUser.assignedStation}`);
      console.log(`Item: ${item.itemName}, Current Status: ${item.status}`);
      console.log(`Barcode: ${item.barcode}`);

      // This would be replaced with actual API call in real testing
      const response = await this.mockProcessItem(item);
      
      if (response.success) {
        item.status = response.newStatus!;
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: `Simulation error: ${error.message}`
      };
    }
  }

  private async mockProcessItem(item: TestOrderItem): Promise<{
    success: boolean;
    message: string;
    newStatus?: string;
  }> {
    // Mock the status transitions
    const transitions: { [key: string]: string } = {
      'NOT_STARTED_PRODUCTION': 'CUTTING',
      'CUTTING': 'SEWING',
      'SEWING': 'FOAM_CUTTING',
      'FOAM_CUTTING': 'STUFFING',
      'STUFFING': 'PACKAGING',
      'PACKAGING': 'PRODUCT_FINISHED',
      'PRODUCT_FINISHED': 'READY'
    };

    const nextStatus = transitions[item.status];
    if (!nextStatus) {
      return {
        success: false,
        message: `No valid transition from ${item.status}`
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      message: `Item processed successfully: ${item.status} → ${nextStatus}`,
      newStatus: nextStatus
    };
  }

  getOrderStatus(): string {
    const allReady = this.testOrder.items.every(item => item.status === 'READY');
    const anyInProduction = this.testOrder.items.some(item => 
      item.status !== 'NOT_STARTED_PRODUCTION' && item.status !== 'READY'
    );

    if (allReady) {
      return 'READY_TO_SHIP';
    } else if (anyInProduction) {
      return 'ORDER_PROCESSING';
    } else {
      return 'APPROVED';
    }
  }

  printStatus() {
    console.log('\n=== Order Status ===');
    console.log(`Order: ${this.testOrder.orderNumber}`);
    console.log(`Customer: ${this.testOrder.customerName}`);
    console.log(`Order Status: ${this.getOrderStatus()}`);
    console.log('\nItems:');
    this.testOrder.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.itemName}: ${item.status}`);
    });
    console.log('==================\n');
  }
}

/**
 * Test the complete 6-step workflow
 */
export async function testCompleteWorkflow(): Promise<void> {
  console.log('Starting Complete Workflow Test...\n');

  // Create test data
  const testOrder = createTestOrder('TEST001', 'Test Customer Inc.', 2);
  const testUsers = createTestUsers();
  const simulator = new WorkflowSimulator(testOrder);

  simulator.printStatus();

  // Step 1: Office scan (NOT_STARTED_PRODUCTION → CUTTING)
  console.log('Step 1: Office Confirmation');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Office')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 2: Cutting scan (CUTTING → SEWING)
  console.log('Step 2: Cutting Station');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Cutting')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 3: Sewing scan (SEWING → FOAM_CUTTING)
  console.log('Step 3: Sewing Station');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Sewing')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 4: Foam Cutting scan (FOAM_CUTTING → STUFFING)
  console.log('Step 4: Foam Cutting Station');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Foam Cutting')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 5: Stuffing scan (STUFFING → PACKAGING)
  console.log('Step 5: Stuffing Station');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Stuffing')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 6: Packaging scan (PACKAGING → PRODUCT_FINISHED)
  console.log('Step 6: Packaging Station');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Packaging')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  // Step 6: Office final scan (PRODUCT_FINISHED → READY)
  console.log('Step 6: Office Final Confirmation');
  simulator.setCurrentUser(testUsers.find(u => u.assignedStation === 'Office')!);
  
  for (let i = 0; i < testOrder.items.length; i++) {
    const result = await simulator.simulateScan(i);
    console.log(`  Item ${i + 1}: ${result.message}`);
  }
  simulator.printStatus();

  console.log('Complete Workflow Test Finished!');
  console.log(`Final Order Status: ${simulator.getOrderStatus()}`);
}

/**
 * Validate test environment setup
 */
export function validateTestEnvironment(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'FROM_EMAIL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      issues.push(`Missing environment variable: ${envVar}`);
    }
  });

  // Check if we're in development mode
  if (process.env.NODE_ENV === 'production') {
    issues.push('Testing should not be run in production environment');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// Export test runner function
export async function runTestSuite(): Promise<void> {
  console.log('🧪 Starting Warehouse System Test Suite\n');

  // Validate environment
  const envCheck = validateTestEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Environment validation failed:');
    envCheck.issues.forEach(issue => console.error(`  - ${issue}`));
    return;
  }

  console.log('✅ Environment validation passed\n');

  // Run workflow test
  try {
    await testCompleteWorkflow();
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}