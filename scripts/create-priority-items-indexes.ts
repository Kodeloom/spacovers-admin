#!/usr/bin/env tsx

/**
 * Database Index Creation Script for Priority Items Performance
 * 
 * This script creates optimized database indexes for the warehouse priority items display
 * to improve query performance and reduce load times.
 * 
 * Requirements: 8.1, 8.3 - Add database indexes for priority items query optimization
 * 
 * Usage:
 *   npm run tsx scripts/create-priority-items-indexes.ts
 *   
 * Or run manually:
 *   tsx scripts/create-priority-items-indexes.ts
 */

import { unenhancedPrisma as prisma } from '../server/lib/db';
import { DatabaseIndexes } from '../utils/databaseIndexes';

interface IndexCreationResult {
  indexName: string;
  tableName: string;
  success: boolean;
  error?: string;
  executionTime: number;
}

async function createIndex(sqlCommand: string, indexName: string, tableName: string): Promise<IndexCreationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Creating index: ${indexName} on table ${tableName}...`);
    
    // Execute the index creation command
    await prisma.$executeRawUnsafe(sqlCommand);
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Successfully created ${indexName} (${executionTime}ms)`);
    
    return {
      indexName,
      tableName,
      success: true,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if index already exists (not an error)
    if (errorMessage.includes('already exists')) {
      console.log(`ℹ️  Index ${indexName} already exists (${executionTime}ms)`);
      return {
        indexName,
        tableName,
        success: true,
        executionTime
      };
    }
    
    console.error(`❌ Failed to create ${indexName}: ${errorMessage} (${executionTime}ms)`);
    return {
      indexName,
      tableName,
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}

async function analyzeCurrentIndexes() {
  console.log('\n📊 Analyzing current database indexes...\n');
  
  try {
    const analysis = await DatabaseIndexes.analyzeMissingIndexes();
    
    console.log('Current Index Status:');
    console.log(`- Existing indexes: ${analysis.existing.length}`);
    console.log(`- Missing indexes: ${analysis.missing.length}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    return analysis;
  } catch (error) {
    console.error('Failed to analyze indexes:', error);
    return null;
  }
}

async function createPriorityItemsIndexes() {
  console.log('🚀 Priority Items Database Index Creation Script');
  console.log('================================================\n');
  
  // Analyze current state
  const analysis = await analyzeCurrentIndexes();
  if (!analysis) {
    console.error('Cannot proceed without index analysis');
    process.exit(1);
  }
  
  // Filter for priority items related indexes
  const priorityItemsIndexes = analysis.missing.filter(idx => 
    idx.reason.toLowerCase().includes('priority items') ||
    (idx.tableName === 'order_items' && idx.columns.includes('item_status')) ||
    (idx.tableName === 'order_items' && idx.columns.includes('is_product')) ||
    (idx.tableName === 'orders' && idx.columns.includes('priority'))
  );
  
  if (priorityItemsIndexes.length === 0) {
    console.log('✅ All priority items indexes already exist!');
    console.log('\nNo action needed. Priority items queries should already be optimized.');
    return;
  }
  
  console.log(`\n🔧 Creating ${priorityItemsIndexes.length} priority items indexes...\n`);
  
  const results: IndexCreationResult[] = [];
  let totalTime = 0;
  
  // Create indexes in order of priority
  const sortedIndexes = priorityItemsIndexes.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
  
  for (const index of sortedIndexes) {
    console.log(`Priority: ${index.priority.toUpperCase()}`);
    console.log(`Reason: ${index.reason}`);
    console.log(`Expected Impact: ${index.estimatedImpact}`);
    
    const result = await createIndex(
      index.sqlCommand,
      `${index.tableName}_${index.columns.join('_')}`,
      index.tableName
    );
    
    results.push(result);
    totalTime += result.executionTime;
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('\n📋 Index Creation Summary');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully created: ${successful.length} indexes`);
  console.log(`❌ Failed to create: ${failed.length} indexes`);
  console.log(`⏱️  Total execution time: ${totalTime}ms`);
  
  if (successful.length > 0) {
    console.log('\nSuccessful indexes:');
    successful.forEach(r => {
      console.log(`  - ${r.indexName} on ${r.tableName} (${r.executionTime}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\nFailed indexes:');
    failed.forEach(r => {
      console.log(`  - ${r.indexName} on ${r.tableName}: ${r.error}`);
    });
  }
  
  // Performance impact estimation
  if (successful.length > 0) {
    console.log('\n🚀 Expected Performance Improvements:');
    console.log('- Priority items API response: 50-80% faster');
    console.log('- HIGH priority production items filtering: Optimized');
    console.log('- Warehouse kiosk loading: Significantly improved');
    console.log('- Database query efficiency: Major improvement');
    console.log('- Reduced server load during peak usage');
  }
  
  // Verification
  console.log('\n🔍 Verifying index creation...');
  try {
    const postAnalysis = await DatabaseIndexes.analyzeMissingIndexes();
    const remainingPriorityIndexes = postAnalysis.missing.filter(idx => 
      idx.reason.toLowerCase().includes('priority items')
    );
    
    if (remainingPriorityIndexes.length === 0) {
      console.log('✅ All priority items indexes verified successfully!');
    } else {
      console.log(`⚠️  ${remainingPriorityIndexes.length} priority items indexes still missing`);
    }
  } catch (error) {
    console.log('⚠️  Could not verify index creation:', error);
  }
}

async function main() {
  try {
    await createPriorityItemsIndexes();
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { createPriorityItemsIndexes };