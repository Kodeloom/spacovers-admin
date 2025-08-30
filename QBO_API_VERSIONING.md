# QuickBooks Online API Versioning Guide

## Overview

This document explains how to manage QuickBooks Online API versions in the Spacovers Admin application to ensure stability and prevent breaking changes.

## Current Configuration

The API version is centrally configured in `server/lib/qbo-client.ts`:

```typescript
export const QBO_API_CONFIG = {
    VERSION: 'v3', // Change this to pin to a specific API version
    USER_AGENT: 'Spacovers-Admin/1.0',
    TIMEOUT: 30000, // 30 seconds
} as const;
```

## How to Change API Version

### 1. **Pin to a Specific Version (Recommended for Production)**

To pin to a specific API version (e.g., v4), change the `VERSION` field:

```typescript
export const QBO_API_CONFIG = {
    VERSION: 'v4', // Pinned to v4
    USER_AGENT: 'Spacovers-Admin/1.0',
    TIMEOUT: 30000,
} as const;
```

### 2. **Use Latest Version (Development/Testing)**

To always use the latest version:

```typescript
export const QBO_API_CONFIG = {
    VERSION: 'v3', // Keep as v3 for latest
    USER_AGENT: 'Spacovers-Admin/1.0',
    TIMEOUT: 30000,
} as const;
```

## Available API Versions

- **v3**: Current stable version (recommended for production)
- **v4**: Latest version (may have breaking changes)
- **v2**: Legacy version (deprecated)

## Benefits of Version Pinning

1. **Stability**: No unexpected breaking changes
2. **Predictable Behavior**: Consistent API responses
3. **Easier Testing**: Known API behavior
4. **Production Safety**: Reduced risk of outages

## When to Update API Version

### **Update When:**
- New features are needed that aren't in current version
- Security updates are required
- Performance improvements are available
- Testing shows new version is stable

### **Don't Update When:**
- Current version is working fine
- New version has breaking changes
- Production is stable
- No new features are needed

## Testing New Versions

1. **Create a test branch** with new API version
2. **Test thoroughly** in development environment
3. **Verify all sync operations** work correctly
4. **Check line item fetching** specifically
5. **Monitor for any breaking changes**

## Rollback Plan

If a new API version causes issues:

1. **Revert the version** in `QBO_API_CONFIG.VERSION`
2. **Deploy the change** immediately
3. **Investigate the issue** in development
4. **Fix compatibility issues** before trying again

## Current Implementation

The application now uses the centralized configuration in all sync operations:

- **Orders/Invoices**: `server/api/qbo/sync/all.post.ts`
- **Items**: `server/api/qbo/sync/items.post.ts`
- **Webhooks**: `server/api/qbo/webhook.post.ts`

## Monitoring

Watch for these indicators that an API version change might be needed:

1. **Line items not syncing** (current issue)
2. **Authentication errors** increasing
3. **Rate limiting** becoming more frequent
4. **New QBO features** not available

## Support

For API version issues:
1. Check [QuickBooks Developer Documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)
2. Review [QBO API Release Notes](https://developer.intuit.com/app/developer/qbo/docs/support/release-notes)
3. Test in [QBO Sandbox](https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes) first

---

**Last Updated**: Current Date
**Current Version**: v3
**Next Review**: When QBO releases v4 or when issues arise
