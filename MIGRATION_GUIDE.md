# Database Migration Guide - PO Tracking and Print Queue

This guide covers the database migration for Task 2 of the Enhanced Order Management PO Tracking feature.

## Changes Made

### 1. ProductAttribute Model Extensions
- Added `tieDownLength: String?` field for tie down length specifications
- Added `poNumber: String?` field for purchase order tracking at item level

### 2. Order Model Extensions
- Added `poNumber: String?` field for purchase order tracking at order level

### 3. New PrintQueue Model
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

### 4. OrderPriority Enum Extension
- Added `NO_PRIORITY` option to existing enum values (LOW, MEDIUM, HIGH)

## Migration Steps

### Step 1: Generate Schema and Client
```bash
chmod +x generate-schema.sh
./generate-schema.sh
```

### Step 2: Create Database Migration
```bash
chmod +x create-migration.sh
./create-migration.sh
```

### Step 3: Test Migration (Development Only)
```bash
chmod +x test-migration.sh
./test-migration.sh
```

### Step 4: Verify Schema Changes
```bash
node verify-schema-changes.js
```

## Manual Commands (if scripts don't work)

### Generate Schema
```bash
npx zenstack generate
npx prisma generate
```

### Create Migration
```bash
npx prisma migrate dev --name "add-po-tracking-and-print-queue"
```

### Test Migration
```bash
npx prisma db push --accept-data-loss
npx prisma validate
npx prisma generate
```

## Verification Checklist

- [ ] ProductAttribute model has `tieDownLength` and `poNumber` fields
- [ ] Order model has `poNumber` field
- [ ] PrintQueue table exists with proper indexes
- [ ] OrderPriority enum includes `NO_PRIORITY`
- [ ] Existing functionality still works (orders, items, etc.)
- [ ] PrintQueue CRUD operations work correctly
- [ ] All foreign key relationships are intact

## Rollback Plan

If issues occur, you can rollback using:
```bash
npx prisma migrate reset
```

**Warning**: This will delete all data. Only use in development.

For production rollback, create a reverse migration:
```bash
npx prisma migrate dev --name "rollback-po-tracking-and-print-queue"
```

## Requirements Addressed

- **1.4**: Database persistence for new ProductAttribute fields
- **2.5**: Database persistence for Order poNumber field  
- **8.4**: Database table for PrintQueue with proper indexing
- **9.5**: OrderPriority enum extension with NO_PRIORITY option

## Next Steps

After successful migration:
1. Update API endpoints to use new fields
2. Implement PO validation services
3. Create print queue management services
4. Update UI components to display new fields