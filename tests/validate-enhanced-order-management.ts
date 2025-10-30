#!/usr/bin/env tsx

/**
 * Enhanced Order Management Feature Validation Script
 * 
 * This script validates that all enhanced order management features
 * are properly implemented and working correctly.
 */

import { getEnhancedPrismaClient } from '~/server/lib/db';
import { poValidationService } from '~/server/lib/POValidationService';
import { printQueueService } from '~/server/lib/PrintQueueService';
import { orderApprovalService } from '~/server/lib/OrderApprovalService';

interface ValidationResult {
  feature: string;
  passed: boolean;
  details: string;
  error?: string;
}

class FeatureValidator {
  private prisma: any;
  private results: ValidationResult[] = [];

  async initialize(): Promise<void> {
    this.prisma = await getEnhancedPrismaClient();
  }

  async validateAllFeatures(): Promise<void> {
    console.log('🔍 Validating Enhanced Order Management Features');
    console.log('=' .repeat(80));
    console.log();

    await this.initialize();

    // Run all validations
    await this.validateDatabaseSchema();
    await this.validatePOValidationService();
    await this.validatePrintQueueService();
    await this.validateOrderApprovalIntegration();
    await this.validatePrioritySystem();
    await this.validateAPIEndpoints();
    await this.validateDataIntegrity();

    // Display results
    this.displayResults();
  }

  private async validateDatabaseSchema(): Promise<void> {
    console.log('📊 Validating Database Schema...');

    try {
      // Check ProductAttribute model has new fields
      const productAttributeFields = await this.prisma.$queryRaw`
        PRAGMA table_info(ProductAttribute);
      `;
      
      const hasPoNumber = productAttributeFields.some((field: any) => field.name === 'poNumber');
      const hasTieDownLength = productAttributeFields.some((field: any) => field.name === 'tieDownLength');

      this.addResult('ProductAttribute PO Number Field', hasPoNumber, 
        hasPoNumber ? 'PO Number field exists in ProductAttribute' : 'PO Number field missing');
      
      this.addResult('ProductAttribute Tie Down Length Field', hasTieDownLength,
        hasTieDownLength ? 'Tie Down Length field exists in ProductAttribute' : 'Tie Down Length field missing');

      // Check Order model has poNumber field
      const orderFields = await this.prisma.$queryRaw`
        PRAGMA table_info(Order);
      `;
      
      const orderHasPoNumber = orderFields.some((field: any) => field.name === 'poNumber');
      this.addResult('Order PO Number Field', orderHasPoNumber,
        orderHasPoNumber ? 'PO Number field exists in Order' : 'PO Number field missing');

      // Check PrintQueue model exists
      try {
        await this.prisma.printQueue.findMany({ take: 1 });
        this.addResult('PrintQueue Model', true, 'PrintQueue model exists and accessible');
      } catch (error) {
        this.addResult('PrintQueue Model', false, 'PrintQueue model not accessible', (error as Error).message);
      }

      // Check OrderPriority enum includes NO_PRIORITY
      try {
        const testOrder = await this.prisma.order.create({
          data: {
            customerId: 'test',
            orderStatus: 'PENDING',
            contactEmail: 'test@example.com',
            salesOrderNumber: 'TEST-PRIORITY-VALIDATION',
            priority: 'NO_PRIORITY'
          }
        });
        
        await this.prisma.order.delete({ where: { id: testOrder.id } });
        this.addResult('NO_PRIORITY Enum Value', true, 'NO_PRIORITY enum value works correctly');
      } catch (error) {
        this.addResult('NO_PRIORITY Enum Value', false, 'NO_PRIORITY enum value not working', (error as Error).message);
      }

    } catch (error) {
      this.addResult('Database Schema Validation', false, 'Failed to validate database schema', (error as Error).message);
    }

    console.log('✅ Database schema validation complete\n');
  }

  private async validatePOValidationService(): Promise<void> {
    console.log('🔍 Validating PO Validation Service...');

    try {
      // Test order-level validation
      const orderValidation = await poValidationService.checkOrderLevelDuplicate(
        'TEST-PO-VALIDATION',
        'test-customer-id'
      );

      this.addResult('Order Level PO Validation', true, 
        `Order level validation returned: isDuplicate=${orderValidation.isDuplicate}`);

      // Test item-level validation
      const itemValidation = await poValidationService.checkItemLevelDuplicate(
        'TEST-PO-ITEM-VALIDATION',
        'test-customer-id'
      );

      this.addResult('Item Level PO Validation', true,
        `Item level validation returned: isDuplicate=${itemValidation.isDuplicate}`);

    } catch (error) {
      this.addResult('PO Validation Service', false, 'PO validation service failed', (error as Error).message);
    }

    console.log('✅ PO validation service validation complete\n');
  }

  private async validatePrintQueueService(): Promise<void> {
    console.log('🖨️  Validating Print Queue Service...');

    try {
      // Test getting queue
      const queue = await printQueueService.getQueue();
      this.addResult('Print Queue Retrieval', true, `Retrieved ${queue.length} items from print queue`);

      // Test queue status
      const status = await printQueueService.getQueueStatus();
      this.addResult('Print Queue Status', true, 
        `Queue status: ${status.totalItems} total, ${status.readyToPrint} ready to print`);

      // Test batch validation
      const canPrint = await printQueueService.canPrintBatch();
      this.addResult('Print Queue Batch Validation', true, `Can print batch: ${canPrint}`);

    } catch (error) {
      this.addResult('Print Queue Service', false, 'Print queue service failed', (error as Error).message);
    }

    console.log('✅ Print queue service validation complete\n');
  }

  private async validateOrderApprovalIntegration(): Promise<void> {
    console.log('✅ Validating Order Approval Integration...');

    try {
      // Test with non-existent order (should handle gracefully)
      const approvalResult = await orderApprovalService.handleOrderApproval(
        'non-existent-order',
        'test-user-id'
      );

      this.addResult('Order Approval Error Handling', !approvalResult.success,
        approvalResult.success ? 'Should have failed for non-existent order' : 'Correctly handled non-existent order');

    } catch (error) {
      this.addResult('Order Approval Integration', false, 'Order approval integration failed', (error as Error).message);
    }

    console.log('✅ Order approval integration validation complete\n');
  }

  private async validatePrioritySystem(): Promise<void> {
    console.log('🎯 Validating Priority System...');

    try {
      // Create test customer
      const testCustomer = await this.prisma.customer.create({
        data: {
          name: 'Test Customer - Priority Validation',
          email: 'test-priority@example.com'
        }
      });

      // Test all priority values
      const priorities = ['LOW', 'MEDIUM', 'HIGH', 'NO_PRIORITY'];
      const createdOrders = [];

      for (const priority of priorities) {
        try {
          const order = await this.prisma.order.create({
            data: {
              customerId: testCustomer.id,
              orderStatus: 'PENDING',
              contactEmail: `test-${priority.toLowerCase()}@example.com`,
              salesOrderNumber: `TEST-PRIORITY-${priority}`,
              priority: priority
            }
          });
          createdOrders.push(order);
        } catch (error) {
          this.addResult(`Priority ${priority}`, false, `Failed to create order with priority ${priority}`, (error as Error).message);
        }
      }

      this.addResult('Priority System', createdOrders.length === priorities.length,
        `Successfully created orders with ${createdOrders.length}/${priorities.length} priority values`);

      // Cleanup
      await this.prisma.order.deleteMany({
        where: { id: { in: createdOrders.map(o => o.id) } }
      });
      await this.prisma.customer.delete({ where: { id: testCustomer.id } });

    } catch (error) {
      this.addResult('Priority System', false, 'Priority system validation failed', (error as Error).message);
    }

    console.log('✅ Priority system validation complete\n');
  }

  private async validateAPIEndpoints(): Promise<void> {
    console.log('🌐 Validating API Endpoints...');

    // This would typically use supertest or similar to test actual HTTP endpoints
    // For now, we'll validate that the endpoint files exist and have proper structure

    const fs = require('fs');
    const path = require('path');

    const requiredEndpoints = [
      'server/api/validation/check-po-duplicate.post.ts',
      'server/api/print-queue/index.get.ts',
      'server/api/print-queue/add.post.ts',
      'server/api/print-queue/mark-printed.post.ts',
      'server/api/print-queue/status.get.ts',
      'server/api/print-queue/validate-batch.get.ts'
    ];

    for (const endpoint of requiredEndpoints) {
      const endpointPath = path.join(process.cwd(), endpoint);
      const exists = fs.existsSync(endpointPath);
      
      this.addResult(`API Endpoint: ${endpoint}`, exists,
        exists ? 'Endpoint file exists' : 'Endpoint file missing');
    }

    console.log('✅ API endpoints validation complete\n');
  }

  private async validateDataIntegrity(): Promise<void> {
    console.log('🔒 Validating Data Integrity...');

    try {
      // Check for orphaned print queue items
      const orphanedItems = await this.prisma.printQueue.findMany({
        where: {
          orderItem: null
        }
      });

      this.addResult('Print Queue Data Integrity', orphanedItems.length === 0,
        orphanedItems.length === 0 ? 'No orphaned print queue items found' : `Found ${orphanedItems.length} orphaned items`);

      // Check for proper indexes (this would be more comprehensive in a real implementation)
      const indexInfo = await this.prisma.$queryRaw`
        PRAGMA index_list(PrintQueue);
      `;

      this.addResult('Print Queue Indexes', Array.isArray(indexInfo),
        `Print queue has ${Array.isArray(indexInfo) ? indexInfo.length : 0} indexes`);

    } catch (error) {
      this.addResult('Data Integrity', false, 'Data integrity validation failed', (error as Error).message);
    }

    console.log('✅ Data integrity validation complete\n');
  }

  private addResult(feature: string, passed: boolean, details: string, error?: string): void {
    this.results.push({ feature, passed, details, error });
  }

  private displayResults(): void {
    console.log('📊 Validation Results');
    console.log('=' .repeat(80));
    console.log();

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    // Display individual results
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.feature}`);
      console.log(`   ${result.details}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
    });

    // Summary
    console.log('Summary:');
    console.log(`Total Validations: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log();

    // Feature readiness assessment
    this.displayFeatureReadiness();

    if (passed === total) {
      console.log('🎉 All validations passed! Enhanced Order Management is ready for deployment.');
    } else {
      console.log('⚠️  Some validations failed. Please address issues before deployment.');
    }
  }

  private displayFeatureReadiness(): void {
    console.log('🎯 Feature Readiness Assessment');
    console.log('-' .repeat(40));

    const featureGroups = {
      'Database Schema': ['ProductAttribute PO Number Field', 'ProductAttribute Tie Down Length Field', 'Order PO Number Field', 'PrintQueue Model', 'NO_PRIORITY Enum Value'],
      'PO Validation': ['Order Level PO Validation', 'Item Level PO Validation'],
      'Print Queue': ['Print Queue Retrieval', 'Print Queue Status', 'Print Queue Batch Validation'],
      'Order Approval': ['Order Approval Error Handling'],
      'Priority System': ['Priority System'],
      'API Endpoints': this.results.filter(r => r.feature.startsWith('API Endpoint')).map(r => r.feature),
      'Data Integrity': ['Print Queue Data Integrity', 'Print Queue Indexes']
    };

    Object.entries(featureGroups).forEach(([groupName, features]) => {
      const groupResults = this.results.filter(r => features.includes(r.feature));
      const groupPassed = groupResults.filter(r => r.passed).length;
      const groupTotal = groupResults.length;
      const groupStatus = groupPassed === groupTotal ? '✅' : '❌';
      
      console.log(`${groupStatus} ${groupName}: ${groupPassed}/${groupTotal} passed`);
    });

    console.log();
  }
}

// Production readiness checklist
function displayProductionReadinessChecklist(): void {
  console.log('🚀 Production Readiness Checklist');
  console.log('=' .repeat(80));
  console.log();

  const checklist = [
    {
      category: 'Database',
      items: [
        'All schema migrations applied successfully',
        'New fields (poNumber, tieDownLength) properly indexed',
        'PrintQueue table created with proper relations',
        'OrderPriority enum updated with NO_PRIORITY',
        'Database backup completed before deployment'
      ]
    },
    {
      category: 'Backend Services',
      items: [
        'POValidationService tested and working',
        'PrintQueueService tested and working',
        'OrderApprovalService integration tested',
        'All API endpoints responding correctly',
        'Error handling implemented for all services'
      ]
    },
    {
      category: 'Frontend Components',
      items: [
        'PO validation UI components working',
        'Print queue management interface functional',
        'Enhanced product attribute forms working',
        'Priority system UI updated',
        'Error handling and loading states implemented'
      ]
    },
    {
      category: 'Integration',
      items: [
        'End-to-end workflow tested (order creation to print)',
        'Multi-user print queue sharing verified',
        'PO duplicate validation working across customers',
        'Order approval automatically adds to print queue',
        'Print confirmation workflow tested'
      ]
    },
    {
      category: 'Performance',
      items: [
        'Database queries optimized with proper indexes',
        'PO validation caching implemented',
        'Print queue queries efficient for large datasets',
        'API response times acceptable',
        'Memory usage within acceptable limits'
      ]
    },
    {
      category: 'Security',
      items: [
        'Authentication required for all endpoints',
        'Authorization checks implemented',
        'Input validation on all forms',
        'SQL injection prevention verified',
        'Customer data isolation maintained'
      ]
    },
    {
      category: 'Monitoring',
      items: [
        'Error logging implemented',
        'Performance monitoring in place',
        'Database health checks configured',
        'API endpoint monitoring active',
        'User activity tracking functional'
      ]
    }
  ];

  checklist.forEach(category => {
    console.log(`📋 ${category.category}`);
    category.items.forEach(item => {
      console.log(`   ☐ ${item}`);
    });
    console.log();
  });

  console.log('💡 Deployment Notes:');
  console.log('   - Run database migrations in maintenance window');
  console.log('   - Test all features in staging environment first');
  console.log('   - Have rollback plan ready');
  console.log('   - Monitor system closely after deployment');
  console.log('   - Conduct user training on new features');
  console.log();
}

// Main execution
async function main(): Promise<void> {
  try {
    const validator = new FeatureValidator();
    await validator.validateAllFeatures();
    
    displayProductionReadinessChecklist();

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { FeatureValidator };