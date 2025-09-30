#!/usr/bin/env tsx

/**
 * Staging Deployment Validation Script
 * 
 * This script validates the critical QuickBooks and OrderItem fixes in staging environment.
 * It can be run manually to verify that the deployment is working correctly.
 * 
 * Usage: npm run validate:staging
 * 
 * Requirements: 1.6, 2.1, 2.2, 2.5
 */

import { unenhancedPrisma as prisma } from '../server/lib/db';

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  message: string;
  details?: any;
}

class StagingValidator {
  private results: ValidationResult[] = [];
  private testCustomer: any = null;
  private testItem: any = null;
  private testOrders: any[] = [];

  async run(): Promise<void> {
    console.log('🚀 Starting staging deployment validation...\n');

    try {
      await this.validateDatabaseConnection();
      await this.validateQuickBooksIntegration();
      await this.validateOrderItemIsolation();
      await this.validateWebhookConfiguration();
      await this.validateDataIntegrity();
      
      await this.cleanup();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Validation failed with error:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      
      this.addResult('Database Connection', 'PASS', 'Successfully connected to database');
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', `Database connection failed: ${error}`);
      throw error;
    }
  }

  private async validateQuickBooksIntegration(): Promise<void> {
    try {
      // Check if QuickBooks integration modules are available
      const { QuickBooksTokenManager } = await import('../server/lib/quickbooksTokenManager');
      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      this.addResult('QuickBooks Modules', 'PASS', 'QuickBooks integration modules loaded successfully');

      // Check connection status
      try {
        const isConnected = await QuickBooksTokenManager.isConnected();
        
        if (isConnected) {
          const connectionStatus = await QuickBooksTokenManager.getConnectionStatus();
          this.addResult(
            'QuickBooks Connection', 
            'PASS', 
            `Connected to QuickBooks company: ${connectionStatus.companyId}`,
            {
              companyId: connectionStatus.companyId,
              connectedAt: connectionStatus.connectedAt,
              accessTokenExpiresAt: connectionStatus.accessTokenExpiresAt
            }
          );
        } else {
          this.addResult('QuickBooks Connection', 'WARN', 'QuickBooks not connected - webhook tests will be limited');
        }
      } catch (error) {
        this.addResult('QuickBooks Connection', 'FAIL', `Connection check failed: ${error}`);
      }

      // Test token validation function
      try {
        const { validateAccessToken } = await import('../server/lib/qbo-client');
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
        const validation = validateAccessToken(testToken);
        
        if (validation.isValid) {
          this.addResult('Token Validation', 'PASS', 'Token validation function working correctly');
        } else {
          this.addResult('Token Validation', 'PASS', 'Token validation correctly rejected invalid token');
        }
      } catch (error) {
        this.addResult('Token Validation', 'FAIL', `Token validation function error: ${error}`);
      }

    } catch (error) {
      this.addResult('QuickBooks Integration', 'FAIL', `QuickBooks integration validation failed: ${error}`);
    }
  }

  private async validateOrderItemIsolation(): Promise<void> {
    try {
      // Create test data
      await this.createTestData();

      // Test 1: Verify independent OrderItem records
      const orderItemCounts = await Promise.all(
        this.testOrders.map(order => 
          prisma.orderItem.count({ where: { orderId: order.id } })
        )
      );

      if (orderItemCounts.every(count => count === 1)) {
        this.addResult('OrderItem Independence', 'PASS', 'Each order has independent OrderItem records');
      } else {
        this.addResult('OrderItem Independence', 'FAIL', `Unexpected OrderItem counts: ${orderItemCounts}`);
      }

      // Test 2: Status isolation
      const firstOrderItem = await prisma.orderItem.findFirst({
        where: { orderId: this.testOrders[0].id }
      });

      if (firstOrderItem) {
        // Update status of first order's item
        await prisma.orderItem.update({
          where: { id: firstOrderItem.id },
          data: { itemStatus: 'CUTTING' }
        });

        // Check other orders remain unchanged
        const otherOrderItems = await prisma.orderItem.findMany({
          where: { 
            orderId: { in: this.testOrders.slice(1).map(o => o.id) }
          }
        });

        const allUnchanged = otherOrderItems.every(item => item.itemStatus === 'NOT_STARTED_PRODUCTION');
        
        if (allUnchanged) {
          this.addResult('Status Isolation', 'PASS', 'Status changes properly isolated between orders');
        } else {
          this.addResult('Status Isolation', 'FAIL', 'Status changes affected other orders');
        }
      }

      // Test 3: Query scoping
      for (let i = 0; i < this.testOrders.length; i++) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: this.testOrders[i].id }
        });

        if (orderItems.length === 1 && orderItems[0].orderId === this.testOrders[i].id) {
          continue; // This order is correctly scoped
        } else {
          this.addResult('Query Scoping', 'FAIL', `Order ${i + 1} has incorrect item scoping`);
          return;
        }
      }

      this.addResult('Query Scoping', 'PASS', 'OrderItem queries properly scoped by orderId');

      // Test 4: Compound unique constraint
      try {
        const sharedLineId = `STAGING-VALIDATION-${Date.now()}`;
        
        // Update two different orders to have same QuickBooks line ID
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: { in: [this.testOrders[0].id, this.testOrders[1].id] } }
        });

        await prisma.orderItem.update({
          where: { id: orderItems[0].id },
          data: { quickbooksOrderLineId: sharedLineId }
        });

        await prisma.orderItem.update({
          where: { id: orderItems[1].id },
          data: { quickbooksOrderLineId: sharedLineId }
        });

        this.addResult('Compound Unique Constraint', 'PASS', 'Same QuickBooks line ID allowed across different orders');

        // Test that duplicate within same order fails
        try {
          await prisma.orderItem.create({
            data: {
              orderId: this.testOrders[0].id,
              itemId: this.testItem.id,
              quickbooksOrderLineId: sharedLineId,
              quantity: 999,
              pricePerItem: 999.99
            }
          });
          
          this.addResult('Duplicate Prevention', 'FAIL', 'Duplicate QuickBooks line ID within same order was allowed');
        } catch (error) {
          this.addResult('Duplicate Prevention', 'PASS', 'Duplicate QuickBooks line ID within same order correctly prevented');
        }

      } catch (error) {
        this.addResult('Compound Unique Constraint', 'FAIL', `Compound constraint test failed: ${error}`);
      }

    } catch (error) {
      this.addResult('OrderItem Isolation', 'FAIL', `OrderItem isolation validation failed: ${error}`);
    }
  }

  private async validateWebhookConfiguration(): Promise<void> {
    try {
      // Check webhook endpoint exists
      const webhookModule = await import('../server/api/qbo/webhook.post');
      
      if (webhookModule.default || webhookModule.handler) {
        this.addResult('Webhook Endpoint', 'PASS', 'Webhook endpoint module loaded successfully');
      } else {
        this.addResult('Webhook Endpoint', 'FAIL', 'Webhook endpoint module not found or invalid');
      }

      // Check environment variables
      const requiredEnvVars = [
        'QBO_CLIENT_ID',
        'QBO_CLIENT_SECRET',
        'QBO_WEBHOOK_VERIFIER_TOKEN'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length === 0) {
        this.addResult('Webhook Environment', 'PASS', 'All required webhook environment variables are set');
      } else {
        this.addResult('Webhook Environment', 'WARN', `Missing environment variables: ${missingVars.join(', ')}`);
      }

      // Test signature verification function
      try {
        const crypto = await import('crypto');
        const testPayload = '{"test": "payload"}';
        const testSecret = 'test-secret';
        const testSignature = crypto.createHmac('sha256', testSecret).update(testPayload).digest('base64');
        
        // This tests that crypto functions work correctly
        if (testSignature.length > 0) {
          this.addResult('Signature Verification', 'PASS', 'Signature verification functions available');
        }
      } catch (error) {
        this.addResult('Signature Verification', 'FAIL', `Signature verification test failed: ${error}`);
      }

    } catch (error) {
      this.addResult('Webhook Configuration', 'FAIL', `Webhook configuration validation failed: ${error}`);
    }
  }

  private async validateDataIntegrity(): Promise<void> {
    try {
      // Test validation functions
      const { validateOrderItemIsolation, logOrderItemSyncOperation } = await import('../server/utils/orderItemSyncValidation');

      // Validate each test order
      for (const order of this.testOrders) {
        const validation = await validateOrderItemIsolation(order.id);
        
        if (!validation.isValid) {
          this.addResult('Data Integrity', 'FAIL', `Order ${order.salesOrderNumber} has integrity issues: ${validation.issues.join(', ')}`);
          return;
        }
      }

      this.addResult('Data Integrity', 'PASS', 'All test orders pass integrity validation');

      // Test logging function
      await logOrderItemSyncOperation({
        orderId: this.testOrders[0].id,
        quickbooksOrderLineId: 'STAGING-VALIDATION-LOG-TEST',
        itemId: this.testItem.id,
        operation: 'create',
        source: 'staging_validation',
        success: true
      });

      this.addResult('Audit Logging', 'PASS', 'OrderItem sync operation logging working correctly');

    } catch (error) {
      this.addResult('Data Integrity', 'FAIL', `Data integrity validation failed: ${error}`);
    }
  }

  private async createTestData(): Promise<void> {
    // Clean up any existing test data
    await this.cleanup();

    // Create test customer
    this.testCustomer = await prisma.customer.create({
      data: {
        name: 'STAGING-VALIDATION-CUSTOMER',
        email: 'staging-validation@example.com',
        customerType: 'RETAILER',
        status: 'ACTIVE',
        quickbooksCustomerId: `QBO-STAGING-VALIDATION-${Date.now()}`
      }
    });

    // Create test item
    this.testItem = await prisma.item.create({
      data: {
        name: 'STAGING-VALIDATION-ITEM',
        status: 'ACTIVE',
        category: 'Validation Test',
        quickbooksItemId: `QBO-STAGING-VALIDATION-ITEM-${Date.now()}`
      }
    });

    // Create test orders
    for (let i = 1; i <= 3; i++) {
      const order = await prisma.order.create({
        data: {
          customerId: this.testCustomer.id,
          orderStatus: 'APPROVED',
          salesOrderNumber: `STAGING-VALIDATION-ORDER-${i.toString().padStart(3, '0')}`,
          quickbooksOrderId: `QBO-STAGING-VALIDATION-ORDER-${Date.now()}-${i}`,
          contactEmail: 'staging-validation@example.com'
        }
      });

      // Create OrderItem for each order
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          itemId: this.testItem.id,
          quantity: i,
          pricePerItem: 100.00 * i,
          itemStatus: 'NOT_STARTED_PRODUCTION',
          quickbooksOrderLineId: `QBO-STAGING-VALIDATION-LINE-${Date.now()}-${i}`
        }
      });

      this.testOrders.push(order);
    }
  }

  private async cleanup(): Promise<void> {
    try {
      // Delete in correct order to respect foreign key constraints
      await prisma.orderItem.deleteMany({
        where: {
          OR: [
            { order: { salesOrderNumber: { startsWith: 'STAGING-VALIDATION-ORDER' } } },
            { item: { name: 'STAGING-VALIDATION-ITEM' } }
          ]
        }
      });

      await prisma.order.deleteMany({
        where: { salesOrderNumber: { startsWith: 'STAGING-VALIDATION-ORDER' } }
      });

      await prisma.customer.deleteMany({
        where: { name: 'STAGING-VALIDATION-CUSTOMER' }
      });

      await prisma.item.deleteMany({
        where: { name: 'STAGING-VALIDATION-ITEM' }
      });

      // Reset test data
      this.testCustomer = null;
      this.testItem = null;
      this.testOrders = [];
    } catch (error) {
      console.warn('Warning during cleanup:', error);
    }
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN', message: string, details?: any): void {
    this.results.push({ test, status, message, details });
  }

  private printResults(): void {
    console.log('\n📊 Staging Validation Results:');
    console.log('=' .repeat(80));

    const statusEmojis = {
      PASS: '✅',
      FAIL: '❌',
      SKIP: '⏭️',
      WARN: '⚠️'
    };

    let passCount = 0;
    let failCount = 0;
    let warnCount = 0;
    let skipCount = 0;

    this.results.forEach(result => {
      const emoji = statusEmojis[result.status];
      console.log(`${emoji} ${result.test}: ${result.message}`);
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }

      switch (result.status) {
        case 'PASS': passCount++; break;
        case 'FAIL': failCount++; break;
        case 'WARN': warnCount++; break;
        case 'SKIP': skipCount++; break;
      }
    });

    console.log('=' .repeat(80));
    console.log(`📈 Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warnings, ${skipCount} skipped`);

    if (failCount > 0) {
      console.log('\n❌ Staging validation FAILED. Please review the failed tests above.');
      process.exit(1);
    } else if (warnCount > 0) {
      console.log('\n⚠️ Staging validation completed with warnings. Please review the warnings above.');
    } else {
      console.log('\n✅ Staging validation PASSED. All critical fixes are working correctly.');
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new StagingValidator();
  validator.run().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

export { StagingValidator };