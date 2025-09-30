# Design Document

## Overview

This design addresses two critical production issues: broken QuickBooks webhook integration and incorrect item/itemOrder relationship handling. The QuickBooks webhook integration stopped working after recent token and connection changes, preventing automatic synchronization of invoices, estimates, and customers. Additionally, the current OrderItem model creates shared relationships between orders when they contain the same item type, causing status changes in one order to affect items in other orders.

## Architecture

### QuickBooks Webhook Integration Fix

The webhook integration uses a centralized `QuickBooksTokenManager` for token management and authentication. The current implementation in `server/api/qbo/webhook.post.ts` properly handles signature verification and entity processing, but fails during token retrieval and API calls.

**Current Flow:**
1. Webhook receives notification from QuickBooks
2. Signature verification using `QBO_WEBHOOK_VERIFIER_TOKEN`
3. Token retrieval via `getQboClientForWebhook()`
4. API calls to fetch full entity details
5. Database upsert operations

**Issue:** The `getQboClientForWebhook()` function relies on `QuickBooksTokenManager` which may not be properly handling the new token format or refresh logic.

### Item/OrderItem Relationship Fix

The current `OrderItem` model has a direct foreign key relationship to `Item` via `itemId`, which creates shared references when multiple orders contain the same item type. This causes the following problems:

**Current Problematic Structure:**
```
Order A -> OrderItem A -> Item (shared)
Order B -> OrderItem B -> Item (same shared item)
```

When `OrderItem A` status changes, it appears to affect `OrderItem B` because they reference the same `Item` record.

**Root Cause:** The issue is not in the database schema itself, but likely in the application logic that queries or updates OrderItems. The `OrderItem` records should be independent even when they reference the same `Item`.

## Components and Interfaces

### 1. QuickBooks Webhook Authentication Component

**File:** `server/lib/qbo-client.ts` (existing)
**Modifications needed:**
- Enhanced error logging in `getQboClientForWebhook()`
- Token validation before API calls
- Fallback mechanisms for token refresh failures

### 2. Webhook Processing Component

**File:** `server/api/qbo/webhook.post.ts` (existing)
**Modifications needed:**
- Improved error handling and logging
- Retry mechanisms for failed API calls
- Better validation of fetched data

### 3. OrderItem Query/Update Logic

**Files to investigate:**
- API endpoints that query OrderItems
- Frontend components that display order items
- Any shared state management for items

**Expected fixes:**
- Ensure queries always include `orderId` in WHERE clauses
- Verify updates target specific `OrderItem.id` rather than `Item.id`
- Add proper isolation in item status updates

### 4. Database Relationship Validation

**Current Schema (correct):**
```prisma
model OrderItem {
  id                    String @id @default(cuid())
  orderId               String
  order                 Order @relation(fields: [orderId], references: [id])
  itemId                String  
  item                  Item @relation(fields: [itemId], references: [id])
  itemStatus            OrderItemProcessingStatus @default(NOT_STARTED_PRODUCTION)
  // ... other fields
}
```

The schema is correct - each OrderItem has its own `id` and `itemStatus`. The issue is likely in application logic.

## Data Models

### QuickBooks Token Management

The existing `QuickBooksIntegration` model should handle company-wide tokens:

```prisma
model QuickBooksIntegration {
  id                       String    @id @default(cuid())
  companyId                String    @unique
  accessToken              String    @db.Text
  refreshToken             String    @db.Text
  accessTokenExpiresAt     DateTime
  refreshTokenExpiresAt    DateTime
  isActive                 Boolean   @default(true)
  // ... other fields
}
```

### OrderItem Isolation

Each OrderItem should maintain independent status tracking:

```prisma
model OrderItem {
  id          String @id @default(cuid())  // Unique identifier
  orderId     String                       // Links to specific order
  itemId      String                       // Links to item template
  itemStatus  OrderItemProcessingStatus    // Independent status per order
  // ... other fields
}
```

## Error Handling

### QuickBooks Webhook Errors

1. **Authentication Failures:**
   - Log detailed token information (masked)
   - Attempt token refresh automatically
   - Return appropriate HTTP status codes
   - Alert administrators of persistent failures

2. **API Call Failures:**
   - Implement exponential backoff for retries
   - Log full request/response details
   - Handle rate limiting gracefully
   - Validate response data before processing

3. **Database Operation Failures:**
   - Use database transactions for consistency
   - Log detailed error information
   - Implement rollback mechanisms
   - Continue processing other entities if one fails

### OrderItem Relationship Errors

1. **Query Isolation:**
   - Always include `orderId` in OrderItem queries
   - Validate that updates target correct records
   - Add database constraints to prevent cross-contamination

2. **Status Update Validation:**
   - Verify OrderItem belongs to expected Order before updates
   - Log all status changes with order context
   - Implement audit trails for debugging

## Testing Strategy

### QuickBooks Integration Testing

1. **Token Management Testing:**
   - Test token refresh scenarios
   - Validate expired token handling
   - Test webhook authentication with various token states

2. **Webhook Processing Testing:**
   - Mock QuickBooks webhook payloads
   - Test signature verification
   - Validate entity processing for each type (Customer, Invoice, Item, Estimate)

3. **API Integration Testing:**
   - Test API calls with valid/invalid tokens
   - Validate response parsing
   - Test error handling for various API failure scenarios

### OrderItem Isolation Testing

1. **Database Query Testing:**
   - Verify OrderItem queries are properly scoped to orders
   - Test that status updates affect only intended records
   - Validate that sync operations maintain proper relationships

2. **Cross-Order Independence Testing:**
   - Create multiple orders with same item types
   - Verify status changes in one order don't affect others
   - Test sync operations with multiple orders containing same items

3. **Data Integrity Testing:**
   - Verify OrderItem records maintain proper foreign key relationships
   - Test that item synchronization creates separate OrderItem records
   - Validate that "no items" scenarios are handled correctly

## Implementation Approach

### Phase 1: QuickBooks Webhook Diagnosis and Fix
1. Add comprehensive logging to token retrieval process
2. Implement token validation before API calls
3. Add retry mechanisms for failed operations
4. Test webhook processing in staging environment

### Phase 2: OrderItem Relationship Investigation and Fix
1. Identify specific queries/updates causing cross-order contamination
2. Add proper scoping to all OrderItem operations
3. Implement validation to ensure order isolation
4. Add logging for OrderItem status changes

### Phase 3: Validation and Monitoring
1. Deploy fixes to staging environment
2. Test both issues with real-world scenarios
3. Add monitoring for webhook success rates
4. Implement alerts for OrderItem relationship violations