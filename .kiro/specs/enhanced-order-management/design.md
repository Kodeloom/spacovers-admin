# Design Document

## Overview

This design document outlines the enhancements to the existing order management system to support direct product attribute creation, tie-down length tracking, Purchase Order (PO) number management, PO duplicate validation, and the addition of a "No Priority" option. The design maintains backward compatibility while extending the current architecture.

## Architecture

### Database Schema Changes

#### Order Model Enhancements
- No changes required to the Order model as it already has `purchaseOrderNumber` field
- The existing `priority` enum will be extended to include `NO_PRIORITY`

#### OrderItem Model Enhancements
- Add `purchaseOrderNumber` field (String, optional)
- Add `tieDownLength` field (String, optional) 
- Existing product attribute fields in OrderItem will be utilized for direct attribute creation

#### Enum Updates
```prisma
enum OrderPriority {
  NO_PRIORITY  // New option
  LOW
  MEDIUM
  HIGH
}
```

### API Layer Design

#### Enhanced Order Creation Endpoint
**Endpoint:** `POST /api/admin/orders`

**Request Payload Structure:**
```typescript
interface CreateOrderRequest {
  data: {
    customerId: string;
    contactEmail: string;
    contactPhoneNumber?: string;
    salesOrderNumber?: string;
    purchaseOrderNumber?: string; // Order-level PO
    transactionDate?: Date;
    priority: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH';
    totalAmount: number;
    orderStatus: 'PENDING';
    items: {
      create: OrderItemCreateInput[];
    };
  };
}

interface OrderItemCreateInput {
  itemId: string;
  quantity: number;
  pricePerItem: number;
  purchaseOrderNumber?: string; // Item-level PO
  tieDownLength?: string;
  productId?: string;
  // Direct product attributes
  size?: string;
  shape?: string;
  radiusSize?: string;
  skirtLength?: string;
  skirtType?: string;
  tieDownsQty?: string;
  tieDownPlacement?: string;
  distance?: string;
  foamUpgrade?: string;
  doublePlasticWrapUpgrade?: string;
  webbingUpgrade?: string;
  metalForLifterUpgrade?: string;
  steamStopperUpgrade?: string;
  fabricUpgrade?: string;
  extraHandleQty?: string;
  extraLongSkirt?: string;
  packaging?: boolean;
}
```

#### PO Number Validation Service
**Service:** `POValidationService`

**Methods:**
- `validatePONumber(customerId: string, poNumber: string, excludeOrderId?: string, excludeOrderItemId?: string): Promise<ValidationResult>`
- `checkDuplicatePO(customerId: string, poNumber: string): Promise<DuplicateCheckResult>`

**Validation Logic:**
1. Check for existing orders with the same PO number for the customer
2. Check for existing order items with the same PO number for the customer
3. Exclude archived/cancelled orders from validation
4. Return detailed information about existing usage

## Components and Interfaces

### Frontend Components

#### Enhanced Order Creation Form
**Component:** `pages/admin/orders/add.vue`

**New Form Sections:**
1. **Order-level PO Number Field**
   - Optional text input
   - Real-time duplicate validation
   - Warning display for duplicates

2. **Enhanced Priority Selection**
   - Updated dropdown with "No Priority" option
   - Proper sorting and display logic

3. **Enhanced Order Item Form**
   - Item-level PO number field
   - Tie-down length field
   - Expandable product attributes section
   - Direct attribute input fields

#### Product Attributes Component
**Component:** `components/admin/ProductAttributesForm.vue`

**Features:**
- Collapsible/expandable attribute section
- Validation for attribute combinations
- Auto-population from existing products
- Clear indication of required vs optional fields

#### PO Validation Component
**Component:** `components/admin/POValidationWarning.vue`

**Features:**
- Real-time validation feedback
- Display of existing PO usage
- Confirmation dialog for duplicates
- Clear warning messages

### Backend Services

#### Enhanced Order Service
**Service:** `server/utils/orderService.ts`

**Methods:**
- `createOrderWithAttributes(orderData: CreateOrderRequest): Promise<Order>`
- `validateOrderData(orderData: CreateOrderRequest): Promise<ValidationResult>`
- `processOrderItems(items: OrderItemCreateInput[], orderId: string): Promise<OrderItem[]>`

#### Product Attribute Service
**Service:** `server/utils/productAttributeService.ts`

**Methods:**
- `createAttributesFromOrderItem(orderItemData: OrderItemCreateInput, orderItemId: string): Promise<ProductAttribute>`
- `validateProductAttributes(attributes: ProductAttributeInput): Promise<ValidationResult>`
- `syncAttributesToOrderItem(attributes: ProductAttributeInput, orderItemId: string): Promise<void>`

## Data Models

### Enhanced Order Item Data Flow
```typescript
interface OrderItemWithAttributes {
  // Existing OrderItem fields
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  pricePerItem: number;
  
  // New fields
  purchaseOrderNumber?: string;
  tieDownLength?: string;
  
  // Direct product attributes (existing fields used directly)
  size?: string;
  shape?: string;
  radiusSize?: string;
  skirtLength?: string;
  skirtType?: string;
  tieDownsQty?: string;
  tieDownPlacement?: string;
  distance?: string;
  foamUpgrade?: string;
  doublePlasticWrapUpgrade?: string;
  webbingUpgrade?: string;
  metalForLifterUpgrade?: string;
  steamStopperUpgrade?: string;
  fabricUpgrade?: string;
  extraHandleQty?: string;
  extraLongSkirt?: string;
  packaging?: boolean;
}
```

### PO Validation Data Model
```typescript
interface POValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  existingUsage?: {
    orders: Array<{
      id: string;
      salesOrderNumber: string;
      createdAt: Date;
    }>;
    orderItems: Array<{
      id: string;
      orderId: string;
      orderSalesNumber: string;
      itemName: string;
    }>;
  };
  message: string;
}
```

## Error Handling

### Validation Errors
1. **PO Number Duplicates**
   - Warning level: Allow with confirmation
   - Error level: Block creation until resolved

2. **Product Attribute Validation**
   - Field-level validation for required combinations
   - Business rule validation (e.g., valid size/shape combinations)
   - Clear error messages with correction suggestions

3. **Order Creation Failures**
   - Rollback mechanism for partial failures
   - Detailed error reporting
   - Retry logic for transient failures

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      validationErrors?: ValidationError[];
      duplicateInfo?: PODuplicateInfo;
    };
  };
}
```

## Testing Strategy

### Unit Tests
1. **PO Validation Service Tests**
   - Test duplicate detection logic
   - Test validation across different customer contexts
   - Test edge cases (archived orders, cancelled items)

2. **Product Attribute Validation Tests**
   - Test attribute combination validation
   - Test required field validation
   - Test business rule enforcement

3. **Order Creation Service Tests**
   - Test complete order creation flow
   - Test rollback scenarios
   - Test attribute synchronization

### Integration Tests
1. **Order Creation API Tests**
   - Test full order creation with attributes
   - Test PO validation integration
   - Test error handling scenarios

2. **Database Integration Tests**
   - Test schema changes compatibility
   - Test data migration scenarios
   - Test constraint enforcement

### Frontend Tests
1. **Form Validation Tests**
   - Test real-time PO validation
   - Test attribute form interactions
   - Test error display and handling

2. **User Experience Tests**
   - Test form flow and usability
   - Test warning and confirmation dialogs
   - Test accessibility compliance

## Migration Strategy

### Database Migration
1. **Schema Updates**
   - Add `NO_PRIORITY` to OrderPriority enum
   - Add `purchaseOrderNumber` to OrderItem model
   - Add `tieDownLength` to OrderItem model
   - Create database indexes for PO number lookups

2. **Data Migration**
   - No data migration required for new fields (nullable)
   - Existing orders maintain current priority values
   - Existing order items get null values for new fields

### Deployment Strategy
1. **Backward Compatibility**
   - All new fields are optional
   - Existing API endpoints continue to work
   - Gradual rollout of new features

2. **Feature Flags**
   - Enable enhanced order creation gradually
   - Allow rollback if issues are discovered
   - Monitor performance impact

## Performance Considerations

### Database Performance
1. **Indexing Strategy**
   - Add composite index on (customerId, purchaseOrderNumber) for both Order and OrderItem
   - Optimize PO validation queries
   - Monitor query performance

2. **Query Optimization**
   - Efficient duplicate checking queries
   - Batch processing for multiple order items
   - Caching for frequently accessed data

### Frontend Performance
1. **Form Optimization**
   - Debounced PO validation
   - Lazy loading of product attributes
   - Efficient re-rendering strategies

2. **User Experience**
   - Progressive enhancement
   - Loading states for validation
   - Optimistic updates where appropriate