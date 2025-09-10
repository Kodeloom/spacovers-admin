#!/usr/bin/env tsx

/**
 * QuickBooks Migration Master Script
 * 
 * This script orchestrates the complete migration from per-user QuickBooks tokens
 * to the new company-wide QuickBooksIntegration system.
 * 
 * Usage:
 *   npm run quickbooks:migrate        # Run full migration
 *   npm run quickbooks:migrate --dry-run  # Preview migration without changes
 *   npm run quickbooks:cleanup        # Run cleanup only (after migration)
 */

import { migrateQuickBooksTokens, verifyMigration } from './migrate-quickbooks-tokens.js'
import { cleanupOldTokens, validateCleanTransition } from './cleanup-old-quickbooks-tokens.js'

interface MigrationOptions {
  dryRun?: boolean
  skipCleanup?: boolean
  force?: boolean
}

async function runFullMigration(options: MigrationOptions = {}) {
  console.log('🚀 QuickBooks Migration Master Script')
  console.log('=====================================')
  
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }

  try {
    // Phase 1: Migration
    console.log('\n📋 Phase 1: Token Migration')
    console.log('---------------------------')
    
    if (options.dryRun) {
      console.log('🔍 Would migrate tokens from QuickbooksToken to QuickBooksIntegration')
      console.log('🔍 Would preserve connection history where possible')
      console.log('🔍 Would select most recent valid token per company')
    } else {
      const migrationStats = await migrateQuickBooksTokens()
      
      if (migrationStats.errors.length > 0) {
        console.log('⚠️  Migration completed with errors. Review before proceeding.')
        if (!options.force) {
          console.log('Use --force to proceed with cleanup despite errors.')
          return
        }
      }
    }

    // Phase 2: Verification
    console.log('\n🔍 Phase 2: Migration Verification')
    console.log('----------------------------------')
    
    if (options.dryRun) {
      console.log('🔍 Would verify migration completed successfully')
      console.log('🔍 Would check that new integrations are active')
    } else {
      const isValid = await verifyMigration()
      if (!isValid) {
        console.error('💥 Migration verification failed! Stopping before cleanup.')
        return
      }
    }

    // Phase 3: Cleanup (optional)
    if (!options.skipCleanup) {
      console.log('\n🧹 Phase 3: Old System Cleanup')
      console.log('------------------------------')
      
      if (options.dryRun) {
        console.log('🔍 Would remove obsolete QuickbooksToken records')
        console.log('🔍 Would update remaining references to old system')
        console.log('🔍 Would validate clean transition')
      } else {
        const cleanupStats = await cleanupOldTokens()
        
        const transitionValid = await validateCleanTransition()
        if (!transitionValid) {
          console.error('💥 Clean transition validation failed!')
          return
        }
        
        console.log(`✅ Cleanup completed: ${cleanupStats.oldTokensRemoved} old tokens removed`)
      }
    }

    // Summary
    console.log('\n🎉 Migration Summary')
    console.log('===================')
    
    if (options.dryRun) {
      console.log('✅ Dry run completed successfully')
      console.log('   Run without --dry-run to perform actual migration')
    } else {
      console.log('✅ QuickBooks migration completed successfully!')
      console.log('   - Old per-user tokens migrated to company-wide system')
      if (!options.skipCleanup) {
        console.log('   - Old token system cleaned up')
      }
      console.log('   - System ready for new QuickBooks integration')
    }

  } catch (error) {
    console.error('💥 Migration failed:', error)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    skipCleanup: args.includes('--skip-cleanup'),
    force: args.includes('--force')
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('QuickBooks Migration Script')
    console.log('')
    console.log('Usage:')
    console.log('  tsx scripts/quickbooks-migration.ts [options]')
    console.log('')
    console.log('Options:')
    console.log('  --dry-run       Preview migration without making changes')
    console.log('  --skip-cleanup  Skip cleanup phase (migration only)')
    console.log('  --force         Proceed with cleanup even if migration had errors')
    console.log('  --help, -h      Show this help message')
    console.log('')
    console.log('Examples:')
    console.log('  tsx scripts/quickbooks-migration.ts --dry-run')
    console.log('  tsx scripts/quickbooks-migration.ts')
    console.log('  tsx scripts/quickbooks-migration.ts --skip-cleanup')
    return
  }

  await runFullMigration(options)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}

export { runFullMigration }