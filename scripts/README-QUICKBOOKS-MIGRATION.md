# QuickBooks Token Migration Guide

This guide explains how to migrate from the old per-user QuickBooks token system to the new company-wide QuickBooksIntegration system.

## Overview

The migration process transforms individual user QuickBooks tokens into company-wide integrations, providing:

- **Automatic token refresh** - No more manual reconnections every hour
- **Company-wide access** - All users share the same QuickBooks connection
- **Better reliability** - Background scheduler maintains token health
- **Simplified management** - Single connection per company instead of per-user

## Migration Process

### Phase 1: Token Migration
- Identifies all existing QuickBooks tokens
- Groups tokens by company (realmId)
- Selects the most recent valid token per company
- Creates new QuickBooksIntegration records
- Preserves connection history

### Phase 2: System Cleanup
- Removes obsolete QuickbooksToken records
- Updates references to old system
- Validates clean transition

## Running the Migration

### Prerequisites

1. **Backup your database** before running migration
2. Ensure the new QuickBooksIntegration table exists in your schema
3. Stop any running QuickBooks sync processes

### Commands

```bash
# Preview migration (recommended first step)
npm run quickbooks:migrate:dry-run

# Run full migration with cleanup
npm run quickbooks:migrate

# Run migration only (skip cleanup)
npm run quickbooks:migrate -- --skip-cleanup

# Run cleanup separately (after migration)
npm run quickbooks:cleanup
```

### Command Options

- `--dry-run` - Preview changes without making them
- `--skip-cleanup` - Run migration only, skip cleanup phase
- `--force` - Proceed with cleanup even if migration had errors

## Migration Scenarios

### Scenario 1: Single Company
If you have one QuickBooks company:
- Migration will create one QuickBooksIntegration record
- All users will use the shared company connection

### Scenario 2: Multiple Companies
If you have multiple QuickBooks companies:
- Migration creates one QuickBooksIntegration per company
- Each company gets its own integration record
- Users access the appropriate company integration

### Scenario 3: Multiple Users per Company
If multiple users had tokens for the same company:
- Migration selects the most recent valid token
- All users will use the shared company connection
- Old individual tokens are cleaned up

## Verification Steps

After migration, verify:

1. **Check integration status**:
   ```sql
   SELECT companyId, isActive, connectedAt, lastRefreshedAt 
   FROM QuickBooksIntegration;
   ```

2. **Test API access**:
   - Visit QuickBooks settings page
   - Verify connection status shows as active
   - Test a QuickBooks sync operation

3. **Check audit logs**:
   ```sql
   SELECT action, timestamp, newValue 
   FROM AuditLog 
   WHERE action LIKE 'QUICKBOOKS%' 
   ORDER BY timestamp DESC;
   ```

## Rollback Plan

If you need to rollback:

1. **Before cleanup**: Old tokens are preserved during migration
2. **After cleanup**: Use audit log backup to restore old tokens
3. **Emergency**: Reconnect via OAuth flow

## Troubleshooting

### Migration Fails
- Check database connectivity
- Verify schema is up to date
- Review error messages in console
- Check audit logs for details

### No Tokens Found
- Verify QuickbooksToken table exists
- Check if tokens were already migrated
- Look for existing QuickBooksIntegration records

### Integration Not Working
- Check token expiry dates
- Verify companyId matches QuickBooks realmId
- Test OAuth flow to get fresh tokens
- Check background scheduler is running

### Multiple Companies Issue
- Verify each company has separate integration
- Check companyId uniqueness
- Ensure users access correct company integration

## Post-Migration Tasks

1. **Update application code** to use new QuickBooksTokenManager
2. **Test all QuickBooks features** with new system
3. **Monitor token refresh** in background scheduler
4. **Update documentation** for new integration flow
5. **Train users** on new connection process (if needed)

## Files Created

- `scripts/migrate-quickbooks-tokens.ts` - Main migration logic
- `scripts/cleanup-old-quickbooks-tokens.ts` - Cleanup logic
- `scripts/quickbooks-migration.ts` - Master orchestration script
- `scripts/README-QUICKBOOKS-MIGRATION.md` - This documentation

## Support

If you encounter issues:

1. Check the audit logs for detailed error information
2. Review the migration statistics in console output
3. Verify database schema matches expected structure
4. Test with a single company first before migrating all

## Security Notes

- Tokens are preserved during migration for safety
- All operations are logged in audit trail
- Cleanup can be run separately after verification
- Database backup is strongly recommended

---

**Important**: Always test the migration in a development environment first!