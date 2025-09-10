#!/usr/bin/env tsx

/**
 * QuickBooks Token Migration Script
 * 
 * This script migrates from the old per-user QuickbooksToken system
 * to the new company-wide QuickBooksIntegration system.
 * 
 * Migration Process:
 * 1. Identify active company tokens from QuickbooksToken table
 * 2. For each unique realmId (company), select the most recent valid token
 * 3. Create QuickBooksIntegration records with company-wide tokens
 * 4. Preserve connection history where possible
 * 5. Mark old tokens for cleanup (but don't delete immediately for safety)
 */

import { PrismaClient } from '@prisma-app/client'

const prisma = new PrismaClient()

interface TokenMigrationData {
  realmId: string
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  xRefreshTokenExpiresIn: number
  createdAt: Date
  updatedAt: Date
  userId: string
}

interface MigrationStats {
  totalOldTokens: number
  uniqueCompanies: number
  migratedIntegrations: number
  skippedDuplicates: number
  errors: string[]
}

async function migrateQuickBooksTokens(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalOldTokens: 0,
    uniqueCompanies: 0,
    migratedIntegrations: 0,
    skippedDuplicates: 0,
    errors: []
  }

  console.log('🚀 Starting QuickBooks token migration...')

  try {
    // Step 1: Get all existing QuickbooksToken records
    const oldTokens = await prisma.quickbooksToken.findMany({
      orderBy: {
        updatedAt: 'desc' // Most recent first
      }
    })

    stats.totalOldTokens = oldTokens.length
    console.log(`📊 Found ${stats.totalOldTokens} existing QuickBooks tokens`)

    if (stats.totalOldTokens === 0) {
      console.log('✅ No tokens to migrate')
      return stats
    }

    // Step 2: Group tokens by realmId (company) and select the most recent valid token per company
    const tokensByCompany = new Map<string, TokenMigrationData>()
    
    for (const token of oldTokens) {
      const realmId = token.realmId
      
      // Check if we already have a token for this company
      const existingToken = tokensByCompany.get(realmId)
      
      // Use the most recent token (tokens are already ordered by updatedAt desc)
      if (!existingToken) {
        tokensByCompany.set(realmId, {
          realmId: token.realmId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          tokenType: token.tokenType,
          expiresIn: token.expiresIn,
          xRefreshTokenExpiresIn: token.xRefreshTokenExpiresIn,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
          userId: token.userId
        })
      }
    }

    stats.uniqueCompanies = tokensByCompany.size
    console.log(`🏢 Found ${stats.uniqueCompanies} unique companies`)

    // Step 3: Create QuickBooksIntegration records for each company
    for (const [realmId, tokenData] of tokensByCompany) {
      try {
        console.log(`🔄 Migrating company ${realmId}...`)

        // Check if integration already exists
        const existingIntegration = await prisma.quickBooksIntegration.findUnique({
          where: { companyId: realmId }
        })

        if (existingIntegration) {
          console.log(`⚠️  Integration for company ${realmId} already exists, skipping`)
          stats.skippedDuplicates++
          continue
        }

        // Calculate token expiry times
        const now = new Date()
        const accessTokenExpiresAt = new Date(now.getTime() + (tokenData.expiresIn * 1000))
        const refreshTokenExpiresAt = new Date(now.getTime() + (tokenData.xRefreshTokenExpiresIn * 1000))

        // Create new QuickBooksIntegration record
        await prisma.quickBooksIntegration.create({
          data: {
            companyId: realmId,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            isActive: true,
            connectedAt: tokenData.createdAt,
            lastRefreshedAt: tokenData.updatedAt,
            createdAt: tokenData.createdAt,
            updatedAt: tokenData.updatedAt
          }
        })

        stats.migratedIntegrations++
        console.log(`✅ Successfully migrated company ${realmId}`)

      } catch (error) {
        const errorMsg = `Failed to migrate company ${realmId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }

    console.log('🎉 Migration completed!')
    console.log(`📈 Migration Statistics:`)
    console.log(`   - Total old tokens: ${stats.totalOldTokens}`)
    console.log(`   - Unique companies: ${stats.uniqueCompanies}`)
    console.log(`   - Migrated integrations: ${stats.migratedIntegrations}`)
    console.log(`   - Skipped duplicates: ${stats.skippedDuplicates}`)
    console.log(`   - Errors: ${stats.errors.length}`)

    if (stats.errors.length > 0) {
      console.log('❌ Errors encountered:')
      stats.errors.forEach(error => console.log(`   - ${error}`))
    }

    // Step 4: Add migration metadata to track what was migrated
    console.log('📝 Recording migration metadata...')
    
    try {
      // Create an audit log entry for the migration
      await prisma.auditLog.create({
        data: {
          action: 'QUICKBOOKS_TOKEN_MIGRATION',
          entityName: 'QuickBooksIntegration',
          newValue: {
            migrationStats: stats,
            migratedAt: new Date().toISOString(),
            migratedCompanies: Array.from(tokensByCompany.keys())
          },
          timestamp: new Date()
        }
      })
      console.log('✅ Migration metadata recorded')
    } catch (error) {
      console.warn('⚠️  Could not record migration metadata:', error)
    }

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`💥 ${errorMsg}`)
    stats.errors.push(errorMsg)
    throw error
  }

  return stats
}

async function cleanupOldTokenSystem(): Promise<void> {
  console.log('🧹 Starting cleanup of old token system...')

  try {
    // Get count of old tokens before cleanup
    const oldTokenCount = await prisma.quickbooksToken.count()
    
    if (oldTokenCount === 0) {
      console.log('✅ No old tokens to clean up')
      return
    }

    console.log(`📊 Found ${oldTokenCount} old tokens to clean up`)

    // For safety, we'll mark tokens as migrated rather than deleting them immediately
    // This allows for rollback if needed
    
    // Add a comment field to track migration status (if the field exists)
    // Since we can't modify the schema here, we'll create an audit log instead
    
    await prisma.auditLog.create({
      data: {
        action: 'QUICKBOOKS_TOKEN_CLEANUP_READY',
        entityName: 'QuickbooksToken',
        newValue: {
          oldTokenCount,
          cleanupReadyAt: new Date().toISOString(),
          note: 'Old QuickbooksToken records are ready for cleanup after successful migration verification'
        },
        timestamp: new Date()
      }
    })

    console.log('✅ Old token system marked for cleanup')
    console.log('⚠️  Note: Old QuickbooksToken records are preserved for safety.')
    console.log('   Run the cleanup script separately after verifying the migration.')

  } catch (error) {
    console.error('❌ Cleanup preparation failed:', error)
    throw error
  }
}

async function verifyMigration(): Promise<boolean> {
  console.log('🔍 Verifying migration...')

  try {
    const oldTokenCount = await prisma.quickbooksToken.count()
    const newIntegrationCount = await prisma.quickBooksIntegration.count()
    
    console.log(`📊 Verification results:`)
    console.log(`   - Old tokens: ${oldTokenCount}`)
    console.log(`   - New integrations: ${newIntegrationCount}`)

    if (newIntegrationCount === 0) {
      console.log('❌ No integrations were created')
      return false
    }

    // Check that we have at least one active integration
    const activeIntegrations = await prisma.quickBooksIntegration.count({
      where: { isActive: true }
    })

    console.log(`   - Active integrations: ${activeIntegrations}`)

    if (activeIntegrations === 0) {
      console.log('⚠️  No active integrations found')
      return false
    }

    console.log('✅ Migration verification passed')
    return true

  } catch (error) {
    console.error('❌ Migration verification failed:', error)
    return false
  }
}

async function main() {
  try {
    console.log('🎯 QuickBooks Token Migration Script')
    console.log('=====================================')

    // Step 1: Migrate tokens
    const stats = await migrateQuickBooksTokens()

    // Step 2: Verify migration
    const isValid = await verifyMigration()

    if (!isValid) {
      console.error('💥 Migration verification failed!')
      process.exit(1)
    }

    // Step 3: Prepare cleanup
    await cleanupOldTokenSystem()

    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Test the new QuickBooks integration functionality')
    console.log('2. Verify that API calls work with the new token system')
    console.log('3. Run the cleanup script to remove old tokens (optional)')
    console.log('')

  } catch (error) {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { migrateQuickBooksTokens, cleanupOldTokenSystem, verifyMigration }