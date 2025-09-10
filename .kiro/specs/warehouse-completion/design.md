# Design Document

## Overview

This design document outlines the technical approach for completing the Warehouse Administrator system. The focus is on fixing critical barcode generation issues, completing the 6-step warehouse workflow, implementing proper time tracking, adding email notifications, and finalizing the reporting system.

## Architecture

### System Components

1. **Barcode Generation System**
   - Canvas-based barcode rendering with proper Code 128 encoding
   - High-resolution output optimized for 4"x6" labels
   - Server-side barcode validation and decoding utilities

2. **Warehouse Workflow Engine**
   - State machine for 6-step production process
   - Automatic status transitions based on station scans
   - Single kiosk interface with multi-scanner support

3. **Time Tracking System**
   - ItemProcessingLog management with precise timing
   - Automatic log closure when items move between stations
   - Production timer calculation for orders

4. **Email Notification Service**
   - AWS SES integration for reliable email delivery
   - Template-based email system with order status triggers
   - Retry mechanism for failed email deliveries

5. **Reporting Engine**
   - Real-time productivity calculations
   - Lead time analytics with filtering capabilities
   - CSV export functionality for data analysis

## Components and Interfaces

### 1. Enhanced Barcode Generation

**Component:** `utils/barcodeGenerator.ts`
```typescript
interface BarcodeConfig {
  width: number;
  height: number;
  fontSize: number;
  margin: number;
  format: 'CODE128' | 'QR';
}

class BarcodeGenerator {
  generateCode128(data: string, config: BarcodeConfig): Canvas
  generateQRCode(data: string, config: BarcodeConfig): Canvas
  validateBarcode(barcode: string): boolean
}
```

**Component:** `components/PackingSlip.vue`
- Enhanced canvas rendering with proper DPI settings
- Improved barcode positioning and sizing
- Print-optimized CSS for crisp output

### 2. Warehouse Workflow State Machine

**Component:** `server/lib/workflowEngine.ts`
```typescript
interface WorkflowStep {
  station: string;
  fromStatus: OrderItemProcessingStatus;
  toStatus: OrderItemProcessingStatus;
  requiresOfficeConfirmation?: boolean;
}

class WorkflowEngine {
  validateTransition(currentStatus: string, stationCode: string): boolean
  getNextStatus(currentStatus: string, stationCode: string): string
  processItemScan(scanData: ScanData): Promise<ProcessingResult>
}
```

**Updated Status Flow:**
1. NOT_STARTED_PRODUCTION → CUTTING (Office scan)
2. CUTTING → SEWING (Cutting station scan)
3. SEWING → FOAM_CUTTING (Sewing station scan)
4. FOAM_CUTTING → PACKAGING (Foam Cutting station scan)
5. PACKAGING → PRODUCT_FINISHED (Packaging station scan)
6. PRODUCT_FINISHED → READY (Office scan)

### 3. Enhanced Time Tracking

**Component:** `server/lib/timeTracker.ts`
```typescript
interface TimeTrackingSession {
  orderItemId: string;
  stationId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  durationInSeconds?: number;
}

class TimeTracker {
  startSession(orderItemId: string, stationId: string, userId: string): Promise<string>
  endSession(sessionId: string): Promise<TimeTrackingSession>
  getActiveSession(userId: string): Promise<TimeTrackingSession | null>
  calculateProductionTime(orderId: string): Promise<number>
}
```

### 4. Email Notification System

**Component:** `server/lib/emailService.ts`
```typescript
interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

interface NotificationTrigger {
  orderStatus?: OrderSystemStatus;
  itemStatus?: OrderItemProcessingStatus;
  template: string;
}

class EmailService {
  sendOrderStatusEmail(orderId: string, template: string): Promise<void>
  sendTrackingEmail(orderId: string, trackingNumber: string): Promise<void>
  retryFailedEmails(): Promise<void>
}
```

**Email Templates:**
- Order Approved: Welcome message with production timeline
- Production Started: Notification that work has begun
- Order Ready: Pickup/shipping instructions with order details
- Tracking Information: Shipping details and tracking number

### 5. Enhanced Reporting System

**Component:** `server/api/reports/productivity.get.ts`
```typescript
interface ProductivityMetrics {
  employeeId: string;
  employeeName: string;
  stationId: string;
  stationName: string;
  itemsProcessed: number;
  totalTimeSeconds: number;
  averageTimePerItem: number;
  laborCost: number;
  efficiency: number;
}
```

**Component:** `server/api/reports/lead-time.get.ts`
```typescript
interface LeadTimeMetrics {
  orderId: string;
  customerName: string;
  approvedDate: Date;
  readyDate?: Date;
  totalLeadTimeDays: number;
  stationBreakdown: StationTime[];
  bottlenecks: string[];
}
```

## Data Models

### Enhanced Database Schema Updates

```prisma
// Add new status to existing enum
enum OrderItemProcessingStatus {
  NOT_STARTED_PRODUCTION
  CUTTING
  SEWING
  FOAM_CUTTING
  PACKAGING
  PRODUCT_FINISHED  // NEW STATUS
  READY
}

// Enhanced ItemProcessingLog with better tracking
model ItemProcessingLog {
  id                String    @id @default(cuid())
  orderItemId       String
  stationId         String
  userId            String
  startTime         DateTime
  endTime           DateTime?
  durationInSeconds Int?
  scannerPrefix     String?   // NEW: Track which scanner was used
  notes             String?
  
  // Relations remain the same
  orderItem         OrderItem @relation(fields: [orderItemId], references: [id])
  station           Station   @relation(fields: [stationId], references: [id])
  user              User      @relation(fields: [userId], references: [id])
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

// Email notification tracking
model EmailNotification {
  id            String   @id @default(cuid())
  orderId       String
  emailType     String   // 'order_approved', 'production_started', etc.
  recipientEmail String
  subject       String
  sentAt        DateTime?
  failedAt      DateTime?
  retryCount    Int      @default(0)
  errorMessage  String?
  
  order         Order    @relation(fields: [orderId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Error Handling

### Barcode Scanning Errors
- Invalid barcode format validation
- Scanner authorization checks
- Duplicate scan prevention
- Network timeout handling

### Workflow Errors
- Invalid status transition prevention
- Concurrent scan conflict resolution
- Missing order/item validation
- Station authorization verification

### Email Delivery Errors
- AWS SES error handling and retry logic
- Template rendering error recovery
- Recipient validation
- Rate limiting compliance

## Testing Strategy

### Unit Tests
- Barcode generation and validation functions
- Workflow state machine transitions
- Time calculation accuracy
- Email template rendering

### Integration Tests
- End-to-end scanning workflow
- Database transaction integrity
- Email delivery confirmation
- Report generation accuracy

### Performance Tests
- Concurrent scanning load testing
- Database query optimization
- Email sending throughput
- Report generation speed

## Security Considerations

### Access Control
- Scanner prefix validation against user permissions
- Station authorization enforcement
- Admin-only report access
- Audit logging for all operations

### Data Protection
- Email content sanitization
- Barcode data encryption in transit
- User session validation
- SQL injection prevention

## Deployment Strategy

### Database Migrations
1. Add PRODUCT_FINISHED status to enum
2. Add scannerPrefix field to ItemProcessingLog
3. Create EmailNotification table
4. Update existing data if needed

### Configuration Updates
1. AWS SES credentials and region settings
2. Email template configuration
3. Barcode generation parameters
4. Report caching settings

### Monitoring and Logging
1. Email delivery success/failure tracking
2. Barcode scan frequency monitoring
3. Production bottleneck identification
4. System performance metrics