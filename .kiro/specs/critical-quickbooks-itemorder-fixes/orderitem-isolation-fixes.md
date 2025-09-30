# OrderItem Isolation Fixes Implementation

## Summary of Issues Found

After thorough investigation, I've identified the following potential sources of cross-order contamination:

1. **QuickBooks Sync Operations**: The sync process may create conflicts when QuickBooks reuses line IDs
2. **Missing Order Context Validation**: Some operations may not properly validate order context
3. **Insufficient Logging**: Lack of comprehensive logging makes debugging difficult

## Recommended Fixes

### 1. Add Compound Unique Constraint for QuickBooks Line IDs

**Problem**: The current schema only has a unique constraint on `quickbooksOrderLineId`, but QuickBooks might reuse line IDs across different orders.

**Solution**: Add a compound constraint that includes both order and line ID.

```prisma
model OrderItem {
  // ... existing fields
  quickbooksOrderLineId    String?
  
  // Add compound unique constraint
  @@unique([orderId, quickbooksOrderLineId])
}
```

### 2. Enhance OrderItem Query Validation

**Problem**: Need to ensure all OrderItem queries are properly scoped to orders.

**Solution**: Add validation middleware and helper functions.

### 3. Improve Sync Operation Safety

**Problem**: Sync operations may not properly handle order isolation.

**Solution**: Modify sync logic to always include order context.

### 4. Add Comprehensive Logging

**Problem**: Insufficient logging makes debugging cross-order issues difficult.

**Solution**: Add detailed logging for all OrderItem operations.

## Implementation Plan

### Phase 1: Database Schema Updates
1. Add compound unique constraint for QuickBooks line IDs
2. Add database migration

### Phase 2: Query Validation
1. Create OrderItem query helper functions
2. Add validation for order context in all operations
3. Update existing queries to use helpers

### Phase 3: Sync Operation Improvements
1. Modify QuickBooks sync to handle order isolation
2. Add proper error handling for line ID conflicts
3. Implement retry logic for sync operations

### Phase 4: Monitoring and Logging
1. Add comprehensive logging for OrderItem operations
2. Create monitoring for cross-order contamination
3. Add audit trails for debugging

## Specific Code Changes Needed

### 1. Schema Migration
```sql
-- Add compound unique constraint
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_quickbooksOrderLineId_key";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_quickbooksOrderLineId_key" 
  UNIQUE ("orderId", "quickbooksOrderLineId");
```

### 2. OrderItem Helper Functions
```typescript
// utils/orderItemHelpers.ts
export class OrderItemValidator {
  static validateOrderContext(orderItemId: string, expectedOrderId: string) {
    // Validation logic
  }
  
  static async findOrderItemsForOrder(orderId: string, filters?: any) {
    // Safe query with order scoping
  }
  
  static async updateOrderItemStatus(orderItemId: string, status: string, orderId: string) {
    // Safe update with validation
  }
}
```

### 3. Enhanced Sync Logic
```typescript
// Modify sync operations to handle order isolation
async function processInvoiceLineItems(qboInvoice: QboInvoice, orderId: string) {
  for (const line of qboInvoice.Line) {
    const orderItemData = {
      orderId: orderId, // Always include order context
      itemId: localItem.id,
      quickbooksOrderLineId: line.Id,
      // ... other fields
    };
    
    // Use compound key for upsert
    const orderItem = await prisma.orderItem.upsert({
      where: { 
        orderId_quickbooksOrderLineId: {
          orderId: orderId,
          quickbooksOrderLineId: line.Id
        }
      },
      update: orderItemData,
      create: orderItemData
    });
  }
}
```

### 4. Logging Enhancement
```typescript
// Add to all OrderItem operations
await logOrderItemOperation({
  operation: 'UPDATE_STATUS',
  orderItemId,
  orderId,
  oldStatus,
  newStatus,
  userId,
  context: 'warehouse_scan'
});
```

## Testing Strategy

### 1. Cross-Order Isolation Tests
- Create multiple orders with identical item types
- Verify status changes don't affect other orders
- Test sync operations with duplicate item scenarios

### 2. QuickBooks Integration Tests
- Test sync with various QuickBooks line ID patterns
- Verify proper handling of duplicate line IDs
- Test error scenarios and recovery

### 3. Performance Tests
- Ensure new constraints don't impact performance
- Test query performance with order scoping
- Validate logging overhead is acceptable

## Rollback Plan

1. Database changes can be rolled back with reverse migration
2. Code changes are backward compatible
3. Logging can be disabled via configuration
4. Monitoring can be removed without affecting functionality

## Success Criteria

1. No cross-order status contamination in test scenarios
2. Proper error handling for QuickBooks line ID conflicts
3. Comprehensive audit trail for all OrderItem operations
4. Performance impact < 5% for typical operations
5. Zero data loss during migration