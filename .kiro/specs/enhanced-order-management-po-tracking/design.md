# Design Document

## Overview

This design document outlines the implementation approach for enhancing the order management system with Purchase Order (PO) tracking, additional product attributes, a shared print queue system, and priority system enhancements. The solution will extend the existing database schema, create new API endpoints, modify existing components, and implement a robust shared print queue with database persistence.

## Architecture

### Database Schema Changes

#### ProductAttribute Model Extensions
- Add `tieDownLength: String?` field for tie down length specifications
- Add `poNumber: String?` field for purchase order tracking at item level

#### Order Model Extensions  
- Add `poNumber: String?` field for purchase order tracking at order level

#### New PrintQueue Model
```prisma
model PrintQueue {
  id          String   @id @default(cuid())
  orderItemId String   @unique
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  isPrinted   Boolean  @default(false)
  addedAt     DateTime @default(now())
  printedAt   DateTime?
  addedBy     String?  // User ID who added to queue
  printedBy   String?  // User ID who marked as printed
  
  @@index([isPrinted, addedAt])
  @@map("print_queue")
}
```

#### OrderPriority Enum Extension
- Add `NO_PRIORITY` option to existing enum values (LOW, MEDIUM, HIGH)

### API Layer Design

#### New API Endpoints

**Print Queue Management**
- `GET /api/print-queue` - Retrieve current print queue items
- `POST /api/print-queue/add` - Add items to print queue (triggered on order approval)
- `POST /api/print-queue/mark-printed` - Mark batch as printed and remove from queue
- `DELETE /api/print-queue/remove` - Remove specific items from queue

**PO Validation**
- `POST /api/validation/check-po-duplicate` - Check for duplicate PO numbers
- `GET /api/orders/by-po/:poNumber/:customerId` - Get existing order by PO and customer

#### Modified API Endpoints

**Product Attributes**
- Update `POST /api/admin/product-attributes` to include new fields
- Update validation schema to include `tieDownLength` and `poNumber`
- Add PO duplicate validation logic

**Orders**
- Update order creation/update endpoints to include `poNumber` field
- Add PO duplicate validation on order save

### Component Architecture

#### Print Queue Components
- `PrintQueueManager.vue` - Main print queue interface
- `PrintQueueItem.vue` - Individual queue item display
- `PrintConfirmationModal.vue` - Print success confirmation dialog
- `PrintBatchWarning.vue` - Warning for incomplete batches

#### PO Validation Components
- `PODuplicateWarning.vue` - Reusable warning component for PO duplicates
- `POValidationMixin.js` - Shared validation logic

#### Enhanced Existing Components
- Update order forms to include PO number field
- Update product attribute forms to include new fields
- Update packing slip generation to include tie down length

## Components and Interfaces

### Print Queue System

#### PrintQueue Service
```typescript
interface PrintQueueService {
  // Queue management
  addToQueue(orderItemIds: string[]): Promise<void>
  removeFromQueue(queueItemIds: string[]): Promise<void>
  getQueue(): Promise<PrintQueueItem[]>
  
  // Batch processing
  getNextBatch(): Promise<PrintQueueItem[]>
  markBatchPrinted(queueItemIds: string[]): Promise<void>
  
  // Status checking
  canPrintBatch(): Promise<boolean>
  getQueueStatus(): Promise<QueueStatus>
}

interface PrintQueueItem {
  id: string
  orderItemId: string
  orderItem: OrderItemWithRelations
  isPrinted: boolean
  addedAt: Date
  printedAt?: Date
}

interface QueueStatus {
  totalItems: number
  readyToPrint: number
  requiresWarning: boolean
}
```

#### PO Validation Service
```typescript
interface POValidationService {
  checkOrderLevelDuplicate(poNumber: string, customerId: string, excludeOrderId?: string): Promise<POValidationResult>
  checkItemLevelDuplicate(poNumber: string, customerId: string, excludeOrderItemId?: string): Promise<POValidationResult>
}

interface POValidationResult {
  isDuplicate: boolean
  existingOrders?: Order[]
  existingItems?: OrderItemWithProduct[]
  warningMessage?: string
}
```

### Database Access Layer

#### Print Queue Repository
```typescript
interface PrintQueueRepository {
  addItems(orderItemIds: string[], addedBy?: string): Promise<PrintQueueItem[]>
  removeItems(queueItemIds: string[]): Promise<void>
  getUnprintedItems(): Promise<PrintQueueItem[]>
  markAsPrinted(queueItemIds: string[], printedBy?: string): Promise<void>
  getOldestBatch(batchSize: number): Promise<PrintQueueItem[]>
}
```

#### PO Validation Repository
```typescript
interface POValidationRepository {
  findOrdersByPO(poNumber: string, customerId: string): Promise<Order[]>
  findItemsByPO(poNumber: string, customerId: string): Promise<OrderItemWithProduct[]>
}
```

## Data Models

### Extended ProductAttribute Model
```typescript
interface ProductAttribute {
  // Existing fields...
  tieDownLength?: string
  poNumber?: string
  // Rest of existing fields...
}
```

### Extended Order Model
```typescript
interface Order {
  // Existing fields...
  poNumber?: string
  // Rest of existing fields...
}
```

### Print Queue Models
```typescript
interface PrintQueueItem {
  id: string
  orderItemId: string
  orderItem: OrderItemWithRelations
  isPrinted: boolean
  addedAt: Date
  printedAt?: Date
  addedBy?: string
  printedBy?: string
}

interface PrintBatch {
  items: PrintQueueItem[]
  canPrintWithoutWarning: boolean
  warningMessage?: string
}
```

## Error Handling

### PO Validation Errors
- **Duplicate PO at Order Level**: Show warning with link to existing order
- **Duplicate PO at Item Level**: Show warning with list of existing items
- **Validation Service Errors**: Graceful fallback with user notification

### Print Queue Errors
- **Database Connection Issues**: Retry mechanism with user feedback
- **Concurrent Access**: Optimistic locking and conflict resolution
- **Print Failures**: Keep items in queue for retry
- **Batch Size Validation**: Clear warnings for incomplete batches

### Data Integrity
- **Orphaned Queue Items**: Cleanup job for items with deleted order items
- **Stale Print Status**: Timeout mechanism for stuck "printing" states
- **Schema Migration**: Safe migration scripts for new fields

## Testing Strategy

### Unit Tests
- PO validation logic for both order and item levels
- Print queue service methods
- Database repository operations
- Component validation logic

### Integration Tests
- End-to-end PO duplicate detection workflow
- Print queue batch processing
- Order approval to print queue flow
- Cross-user print queue sharing

### API Tests
- PO validation endpoints
- Print queue CRUD operations
- Error handling scenarios
- Concurrent access patterns

### UI Tests
- PO duplicate warning displays
- Print queue interface interactions
- Batch printing workflow
- Print confirmation modal behavior

## Implementation Phases

### Phase 1: Database Schema Updates
1. Add new fields to ProductAttribute and Order models
2. Create PrintQueue model
3. Update OrderPriority enum
4. Run database migrations

### Phase 2: PO Validation System
1. Implement PO validation repositories
2. Create validation API endpoints
3. Build validation service layer
4. Add validation to order and item forms

### Phase 3: Print Queue Backend
1. Implement PrintQueue repository
2. Create print queue API endpoints
3. Add automatic queue population on order approval
4. Implement batch processing logic

### Phase 4: Print Queue Frontend
1. Build print queue management interface
2. Create print confirmation workflow
3. Update order approval to trigger queue addition
4. Implement batch printing with warnings

### Phase 5: Integration and Testing
1. End-to-end testing of all features
2. Performance optimization
3. Error handling refinement
4. User acceptance testing

## Security Considerations

### Access Control
- Print queue access limited to office employees, admins, and super admins
- PO validation respects customer data isolation
- Audit logging for all print queue operations

### Data Validation
- Sanitize PO number inputs to prevent injection
- Validate queue item ownership before operations
- Rate limiting on validation endpoints

### Concurrency
- Optimistic locking for print queue modifications
- Transaction isolation for batch operations
- Conflict resolution for concurrent print attempts

## Performance Considerations

### Database Optimization
- Index on PrintQueue (isPrinted, addedAt) for efficient querying
- Index on Order and ProductAttribute poNumber fields
- Efficient joins for queue item retrieval with order data

### Caching Strategy
- Cache PO validation results for short periods
- Cache queue status for real-time updates
- Invalidate caches on relevant data changes

### Scalability
- Pagination for large print queues
- Batch processing limits to prevent memory issues
- Background cleanup jobs for old queue items