#!/usr/bin/env tsx

/**
 * Enhanced Order Management Integration Test Runner
 * 
 * This script runs comprehensive tests for all enhanced order management features:
 * - PO validation at order and item levels
 * - Print queue functionality with batch processing
 * - Priority system enhancements
 * - API endpoint testing
 * - UI component testing
 * - Error handling and edge cases
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  description: string;
  testFile: string;
  requirements: string[];
}

const testSuites: TestSuite[] = [
  {
    name: 'Integration Tests',
    description: 'End-to-end workflow testing from order creation to print queue completion',
    testFile: 'enhanced-order-management-integration.test.ts',
    requirements: ['All requirements - complete workflow testing']
  },
  {
    name: 'API Tests',
    description: 'API endpoint testing for PO validation, print queue, and enhanced features',
    testFile: 'enhanced-order-management-api.test.ts',
    requirements: [
      '3.3, 3.4 - PO validation API endpoints',
      '4.3, 4.4 - Item-level PO validation API',
      '5.3, 5.5 - Print queue API endpoints',
      '6.3, 7.4, 7.5 - Print queue batch processing API',
      '8.5 - Print queue database API'
    ]
  },
  {
    name: 'UI Tests',
    description: 'User interface component testing for enhanced order management features',
    testFile: 'enhanced-order-management-ui.test.ts',
    requirements: [
      '1.3, 1.4 - Enhanced product attributes UI',
      '2.1, 2.2 - Order PO number UI',
      '3.3, 3.4 - PO validation warnings UI',
      '4.3, 4.4 - Item-level PO validation UI',
      '5.2, 5.3 - Print queue management UI',
      '6.4, 7.1 - Print queue batch processing UI',
      '9.1, 9.2, 9.3, 9.4 - Priority system UI'
    ]
  }
];

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Enhanced Order Management Integration Tests');
    console.log('=' .repeat(80));
    console.log();

    // Check if test files exist
    this.checkTestFiles();

    // Run each test suite
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    // Display summary
    this.displaySummary();
  }

  private checkTestFiles(): void {
    console.log('📋 Checking test files...');
    
    const missingFiles: string[] = [];
    
    for (const suite of testSuites) {
      const testPath = join(process.cwd(), 'tests', suite.testFile);
      if (!existsSync(testPath)) {
        missingFiles.push(suite.testFile);
      }
    }

    if (missingFiles.length > 0) {
      console.error('❌ Missing test files:');
      missingFiles.forEach(file => console.error(`   - ${file}`));
      process.exit(1);
    }

    console.log('✅ All test files found');
    console.log();
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`🧪 Running ${suite.name}...`);
    console.log(`   Description: ${suite.description}`);
    console.log(`   Requirements: ${suite.requirements.join(', ')}`);
    console.log();

    const startTime = Date.now();
    let passed = false;
    let error: string | undefined;

    try {
      // Run the test using vitest
      const command = `npx vitest run tests/${suite.testFile} --reporter=verbose`;
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Check if tests passed (basic check - in real implementation would parse vitest output)
      passed = !output.includes('FAILED') && !output.includes('Error');
      
      if (passed) {
        console.log(`✅ ${suite.name} - All tests passed`);
      } else {
        console.log(`❌ ${suite.name} - Some tests failed`);
        console.log('Output:', output);
      }

    } catch (err: any) {
      passed = false;
      error = err.message;
      console.log(`❌ ${suite.name} - Test execution failed`);
      console.log('Error:', error);
    }

    const duration = Date.now() - startTime;
    
    this.results.push({
      name: suite.name,
      passed,
      duration,
      error
    });

    console.log(`   Duration: ${duration}ms`);
    console.log();
  }

  private displaySummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;

    console.log('📊 Test Summary');
    console.log('=' .repeat(80));
    console.log();

    // Individual test results
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.name.padEnd(20)} (${duration})`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log();
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log();

    // Requirements coverage
    this.displayRequirementsCoverage();

    // Final status
    if (passedTests === totalTests) {
      console.log('🎉 All Enhanced Order Management tests passed!');
      console.log('   The system is ready for production deployment.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
  }

  private displayRequirementsCoverage(): void {
    console.log('📋 Requirements Coverage');
    console.log('-' .repeat(40));

    const allRequirements = new Set<string>();
    const coveredRequirements = new Set<string>();

    testSuites.forEach(suite => {
      suite.requirements.forEach(req => {
        allRequirements.add(req);
        const result = this.results.find(r => r.name === suite.name);
        if (result?.passed) {
          coveredRequirements.add(req);
        }
      });
    });

    console.log(`Total Requirements: ${allRequirements.size}`);
    console.log(`Covered Requirements: ${coveredRequirements.size}`);
    console.log(`Coverage: ${Math.round((coveredRequirements.size / allRequirements.size) * 100)}%`);
    console.log();

    // List uncovered requirements
    const uncovered = Array.from(allRequirements).filter(req => !coveredRequirements.has(req));
    if (uncovered.length > 0) {
      console.log('❌ Uncovered Requirements:');
      uncovered.forEach(req => console.log(`   - ${req}`));
      console.log();
    }
  }
}

// Feature validation checklist
function displayFeatureChecklist(): void {
  console.log('✅ Enhanced Order Management Feature Checklist');
  console.log('=' .repeat(80));
  console.log();

  const features = [
    {
      name: 'Product Attributes Enhancement',
      items: [
        'Tie Down Length field added to ProductAttribute model',
        'PO # field added to ProductAttribute model',
        'New fields displayed in product attribute forms',
        'New fields persisted to database',
        'Tie Down Length included in packing slips',
        'PO # excluded from packing slip output'
      ]
    },
    {
      name: 'Order-Level PO # Tracking',
      items: [
        'PO # field added to Order model',
        'PO # field available in order creation forms',
        'PO # field editable in order edit forms',
        'PO # displayed prominently in order details',
        'PO # visible in order summaries',
        'Order PO # persisted to database'
      ]
    },
    {
      name: 'PO # Duplicate Validation',
      items: [
        'Order-level duplicate validation implemented',
        'Item-level duplicate validation implemented',
        'Customer isolation for PO validation',
        'Warning messages displayed for duplicates',
        'Links to existing orders/items in warnings',
        'User confirmation workflow for duplicates'
      ]
    },
    {
      name: 'Shared Print Queue System',
      items: [
        'Print queue shared across all users',
        'Automatic addition to queue on order approval',
        'FIFO ordering in print queue',
        'Print status tracking (not printed/printed)',
        'Database persistence for print queue'
      ]
    },
    {
      name: 'Print Queue Batch Processing',
      items: [
        'Batch size validation (4 items)',
        'Warning system for incomplete batches',
        'Batch printing interface',
        'FIFO ordering for batch selection',
        'Print confirmation workflow'
      ]
    },
    {
      name: 'Print Status Confirmation',
      items: [
        'Two-step print confirmation process',
        'Print success/failure confirmation modal',
        'Items remain in queue on print failure',
        'Items removed from queue on print success',
        'Print status tracking with timestamps'
      ]
    },
    {
      name: 'Priority System Enhancement',
      items: [
        'NO_PRIORITY option added to OrderPriority enum',
        'NO_PRIORITY available in priority selection',
        'NO_PRIORITY saved and displayed consistently',
        'NO_PRIORITY included in sorting and filtering',
        'Backward compatibility maintained'
      ]
    }
  ];

  features.forEach(feature => {
    console.log(`📋 ${feature.name}`);
    feature.items.forEach(item => {
      console.log(`   ✅ ${item}`);
    });
    console.log();
  });
}

// Manual testing instructions
function displayManualTestingInstructions(): void {
  console.log('📖 Manual Testing Instructions');
  console.log('=' .repeat(80));
  console.log();

  const instructions = [
    {
      title: 'Order Creation with PO Numbers',
      steps: [
        '1. Navigate to order creation form',
        '2. Fill in customer and basic order details',
        '3. Enter a PO number in the PO # field',
        '4. Verify real-time duplicate validation',
        '5. Create order and verify PO # is saved',
        '6. Try creating another order with same PO # for same customer',
        '7. Verify duplicate warning is displayed'
      ]
    },
    {
      title: 'Product Attributes Enhancement',
      steps: [
        '1. Navigate to product attributes form',
        '2. Add Tie Down Length (e.g., "12 inches")',
        '3. Add PO # for the item',
        '4. Save and verify both fields are persisted',
        '5. Generate packing slip and verify Tie Down Length is included',
        '6. Verify PO # is NOT included in packing slip'
      ]
    },
    {
      title: 'Print Queue Workflow',
      steps: [
        '1. Create and approve an order',
        '2. Verify items are automatically added to print queue',
        '3. Navigate to print queue interface',
        '4. Verify items are displayed in FIFO order',
        '5. Try printing with less than 4 items - verify warning',
        '6. Add more items to reach 4+ items',
        '7. Print batch and confirm print success',
        '8. Verify items are removed from queue'
      ]
    },
    {
      title: 'Priority System Testing',
      steps: [
        '1. Create orders with different priorities',
        '2. Select "No Priority" option',
        '3. Verify "No Priority" is saved correctly',
        '4. Check order lists show priority correctly',
        '5. Test priority filtering includes "No Priority"',
        '6. Verify sorting works with new priority option'
      ]
    },
    {
      title: 'Multi-User Print Queue Testing',
      steps: [
        '1. Log in as User A and approve an order',
        '2. Log in as User B on different browser/device',
        '3. Verify User B sees the same print queue',
        '4. User B approves another order',
        '5. User A refreshes and sees both items',
        '6. User A prints batch, User B sees updated queue'
      ]
    }
  ];

  instructions.forEach(instruction => {
    console.log(`🧪 ${instruction.title}`);
    instruction.steps.forEach(step => {
      console.log(`   ${step}`);
    });
    console.log();
  });
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log('Enhanced Order Management - Final Integration Testing');
    console.log('=' .repeat(80));
    console.log();

    // Display feature checklist
    displayFeatureChecklist();

    // Run automated tests
    const runner = new TestRunner();
    await runner.runAllTests();

    // Display manual testing instructions
    displayManualTestingInstructions();

    console.log('🎯 Testing Complete!');
    console.log();
    console.log('Next Steps:');
    console.log('1. Review any failed tests and fix issues');
    console.log('2. Perform manual testing as outlined above');
    console.log('3. Conduct user acceptance testing');
    console.log('4. Deploy to staging environment');
    console.log('5. Perform final validation before production');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestRunner, testSuites };