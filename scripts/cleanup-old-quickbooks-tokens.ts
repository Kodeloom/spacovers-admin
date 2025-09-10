#!/usr/bin/env tsx

/**
 * QuickBooks Old Token Cleanup Script
 * 
 * This script removes obsolete per-user token records after successful migration
 * to the new company-wide QuickBooksIntegration system.
 * 
 * Cleanup Process:
 * 1. Verify that migration was successful
 * 2. Remove obsolete QuickbooksToken records
 * 3. Update any remaining references to old system
 * 4. Ensure clean transition to new system
 */

import { PrismaClient } from '@prisma-app/client'

const prisma = new PrismaClient()

interface CleanupStats {
  oldTokensRemoved: number
  referencesUpdated: number
  errors: string[]
}

async function verifyMigrationComplete(): Promise<boolean> {
  console.log('🔍 Verifying migration is complete before cleanup...')

  try {
    // Check that we have active QuickBooksIntegration records
    const activeIntegrations = await prisma.quickBooksIntegration.count({
      where: { isActive: true }
    })

    if (activeIntegrations === 0) {
      console.log('❌ No active QuickBooks integrations found. Migration may not be complete.')
      return false
    }

    // Check migration audit log
    const migrationLog = await prisma.auditLog.findFirst({
      where: {
        action: 'QUICKBOOKS_TOKEN_MIGRATION',
        entityName: 'QuickBooksIntegration'
      },
      orderBy: { timestamp: 'desc' }
    })

    if (!migrationLog) {
      console.log('❌ No migration audit log found. Please run migration first.')
      return false
    }

    console.log(`✅ Found ${activeIntegrations} active integrations`)
    console.log(`✅ Migration completed at: ${migrationLog.timestamp}`)
    
    return true

  } catch (error) {
    console.error('❌ Migration verification failed:', error)
    return false
  }
}

async function cleanupOldTokens(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    oldTokensRemoved: 0,
    referencesUpdated: 0,
    errors: []
  }

  console.log('🧹 Starting cleanup of old QuickbooksToken records...')

  try {
    // Get count before deletion
    const oldTokenCount = await prisma.quickbooksToken.count()
    stats.oldTokensRemoved = oldTokenCount

    if (oldTokenCount === 0) {
      console.log('✅ No old tokens to clean up')
      return stats
    }

    console.log(`📊 Found ${oldTokenCount} old tokens to remove`)

    // Create backup audit log before deletion
    const oldTokens = await prisma.quickbooksToken.findMany()
    
    await prisma.auditLog.create({
      data: {
        action: 'QUICKBOOKS_TOKEN_CLEANUP_BACKUP',
        entityName: 'QuickbooksToken',
        oldValue: {
          deletedTokens: oldTokens.map(token => ({
            id: token.id,
            realmId: token.realmId,
            userId: token.userId,
            createdAt: token.createdAt,
            updatedAt: token.updatedAt
          })),
          deletedAt: new Date().toISOString(),
          count: oldTokenCount
        },
        timestamp: new Date()
      }
    })

    // Delete old QuickbooksToken records
    const deleteResult = await prisma.quickbooksToken.deleteMany({})
    
    console.log(`✅ Removed ${deleteResult.count} old QuickbooksToken records`)

  } catch (error) {
    const errorMsg = `Failed to cleanup old tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
  }

  return stats
}

async function updateRemainingReferences(): Promise<number> {
  console.log('🔄 Checking for remaining references to old token system...')

  let updatedReferences = 0

  try {
    // Note: Since we can't modify the User model to remove the quickbooksToken relation
    // without a schema change, we'll just log what would need to be updated
    
    // Check if there are any users that had QuickBooks tokens
    const usersWithTokens = await prisma.user.findMany({
      where: {
        quickbooksToken: {
          isNot: null
        }
      },
      select: {
        id: true,
        email: true
      }
    })

    if (usersWithTokens.length > 0) {
      console.log(`⚠️  Found ${usersWithTokens.length} users that previously had QuickBooks tokens`)
      console.log('   These users can now use the company-wide integration')
      
      // Log this information for reference
      await prisma.auditLog.create({
        data: {
          action: 'QUICKBOOKS_TOKEN_CLEANUP_USER_REFERENCES',
          entityName: 'User',
          newValue: {
            usersWithPreviousTokens: usersWithTokens.map(user => ({
              id: user.id,
              email: user.email
            })),
            note: 'These users previously had individual QuickBooks tokens and can now use company-wide integration',
            cleanupAt: new Date().toISOString()
          },
          timestamp: new Date()
        }
      })
    }

    console.log('✅ Reference cleanup completed')

  } catch (error) {
    console.error('❌ Failed to update references:', error)
  }

  return updatedReferences
}

async function validateCleanTransition(): Promise<boolean> {
  console.log('🔍 Validating clean transition to new system...')

  try {
    // Verify no old tokens remain
    const remainingTokens = await prisma.quickbooksToken.count()
    if (remainingTokens > 0) {
      console.log(`❌ ${remainingTokens} old tokens still exist`)
      return false
    }

    // Verify new integrations are active
    const activeIntegrations = await prisma.quickBooksIntegration.count({
      where: { isActive: true }
    })

    if (activeIntegrations === 0) {
      console.log('❌ No active integrations found')
      return false
    }

    // Check that integrations have valid tokens
    const integrationsWithTokens = await prisma.quickBooksIntegration.count({
      where: {
        AND: [
          { accessToken: { not: '' } },
          { refreshToken: { not: '' } },
          { isActive: true }
        ]
      }
    })

    if (integrationsWithTokens !== activeIntegrations) {
      console.log('❌ Some integrations are missing tokens')
      return false
    }

    console.log(`✅ Clean transition validated`)
    console.log(`   - Old tokens removed: ✓`)
    console.log(`   - Active integrations: ${activeIntegrations}`)
    console.log(`   - Integrations with tokens: ${integrationsWithTokens}`)

    return true

  } catch (error) {
    console.error('❌ Transition validation failed:', error)
    return false
  }
}

async function main() {
  try {
    console.log('🧹 QuickBooks Old Token Cleanup Script')
    console.log('======================================')

    // Step 1: Verify migration is complete
    const migrationComplete = await verifyMigrationComplete()
    if (!migrationComplete) {
      console.error('💥 Migration not complete. Please run migration script first.')
      process.exit(1)
    }

    // Step 2: Cleanup old tokens
    const cleanupStats = await cleanupOldTokens()

    // Step 3: Update remaining references
    const updatedReferences = await updateRemainingReferences()
    cleanupStats.referencesUpdated = updatedReferences

    // Step 4: Validate clean transition
    const transitionValid = await validateCleanTransition()
    if (!transitionValid) {
      console.error('💥 Clean transition validation failed!')
      process.exit(1)
    }

    // Step 5: Record cleanup completion
    await prisma.auditLog.create({
      data: {
        action: 'QUICKBOOKS_TOKEN_CLEANUP_COMPLETED',
        entityName: 'QuickBooksIntegration',
        newValue: {
          cleanupStats,
          completedAt: new Date().toISOString(),
          success: true
        },
        timestamp: new Date()
      }
    })

    console.log('🎉 Cleanup completed successfully!')
    console.log('')
    console.log('📊 Cleanup Statistics:')
    console.log(`   - Old tokens removed: ${cleanupStats.oldTokensRemoved}`)
    console.log(`   - References updated: ${cleanupStats.referencesUpdated}`)
    console.log(`   - Errors: ${cleanupStats.errors.length}`)
    
    if (cleanupStats.errors.length > 0) {
      console.log('❌ Errors encountered:')
      cleanupStats.errors.forEach(error => console.log(`   - ${error}`))
    }

    console.log('')
    console.log('✅ QuickBooks integration has been successfully migrated to company-wide tokens!')
    console.log('   The old per-user token system has been completely removed.')

  } catch (error) {
    console.error('💥 Cleanup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { cleanupOldTokens, updateRemainingReferences, validateCleanTransition }