# Design Document

## Overview

This design document outlines the technical approach for implementing a split-label printing system with a print queue for order items. The system will replace the current single 4"x6" packing slip format with a two-part label system where each label consists of a 3"x3" top section and a 2"x3" bottom section. The system includes a print queue that batches labels for efficient printing on standard 8.5"x11" sheets containing 4 labels each.

## Architecture

### System Components

1. **Split Label Generator**
   - Generates two-part labels with identical information on both parts
   - Optimizes information display for smaller dimensions
   - Maintains barcode scannability at reduced size

2. **Print Queue Management**
   - Stores labels in a queue for batch printing
   - Manages queue state and persistence
   - Handles queue operations (add, remove, reorder, clear)

3. **Print Layout Engine**
   - Arranges 4 labels on 8.5"x11" page with proper margins
   - Handles partial batch printing with warnings
   - Generates print-optimized HTML/CSS

4. **Label Information Optimizer**
   - Efficiently displays essential information in compact format
   - Handles upgrade information condensation
   - Manages text truncation and abbreviation

## Components and Interfaces

### 1. Split Label Component

**Component:** `components/admin/SplitLabel.vue`

```typescript
interface SplitLabelData {
  orderItem: OrderItem;
  customer: string;
  thickness: string;
  size: string;
  type: string;
  color: string;
  date: string;
  barcode: string;
  upgrades: string[];
}

interface LabelDimensions {
  topPart: { width: 3, height: 3 }; // inches
  bottomPart: { width: 2, height: 3 }; // inches
}
```

**Features:**
- Renders both 3x3 and 2x3 label parts
- Optimizes text size and layout for readability
- Generates appropriately sized barcodes
- Handles upgrade information efficiently

### 2. Print Queue Service

**Service:** `composables/usePrintQueue.ts`

```typescript
interface QueuedLabel {
  id: string;
  orderItemId: string;
  orderNumber: string;
  labelData: SplitLabelData;
  createdAt: Date;
}

interface PrintQueue {
  labels: QueuedLabel[];
  maxSize: number; // 4 labels per sheet
}

class PrintQueueService {
  addToQueue(orderItem: OrderItem): void
  removeFromQueue(labelId: string): void
  clearQueue(): void
  reorderQueue(fromIndex: number, toIndex: number): void
  getQueueStatus(): { count: number, canPrintWithoutWarning: boolean }
  printQueue(forcePartial?: boolean): Promise<void>
}
```

### 3. Print Layout Generator

**Component:** `components/admin/PrintLayout.vue`

```typescript
interface PrintLayoutConfig {
  pageSize: { width: 8.5, height: 11 }; // inches
  margins: {
    top: 0.5,
    bottom: 0.5,
    left: 1.25,
    right: 1.25
  }; // inches
  labelGrid: { rows: 2, cols: 2 };
}

interface PrintableLabel {
  topPart: HTMLElement;
  bottomPart: HTMLElement;
  position: { row: number, col: number };
}
```

### 4. Label Information Optimizer

**Utility:** `utils/labelOptimizer.ts`

```typescript
interface OptimizedLabelInfo {
  customer: string;
  thickness: string;
  size: string;
  type: string;
  color: string;
  date: string;
  upgrades: string;
  barcode: string;
}

class LabelOptimizer {
  optimizeForSize(orderItem: OrderItem, maxLength: number): OptimizedLabelInfo
  abbreviateUpgrades(upgrades: string[]): string
  truncateText(text: string, maxLength: number): string
  formatDate(date: Date): string
}
```

## Data Models

### Enhanced Print Queue Schema

```typescript
// Add to existing schema or create new table
interface PrintQueueItem {
  id: string;
  orderItemId: string;
  orderNumber: string;
  customerName: string;
  itemName: string;
  labelData: JSON; // Serialized SplitLabelData
  position?: number; // Queue position
  createdAt: Date;
  userId: string; // Who added it to queue
}
```

### Label Configuration

```typescript
interface LabelConfig {
  topPart: {
    width: 216, // 3 inches * 72 DPI
    height: 216, // 3 inches * 72 DPI
    fontSize: {
      title: 12,
      content: 10,
      barcode: 8
    }
  };
  bottomPart: {
    width: 144, // 2 inches * 72 DPI
    height: 216, // 3 inches * 72 DPI
    fontSize: {
      title: 10,
      content: 9,
      barcode: 8
    }
  };
}
```

## Print Layout Design

### Page Layout (8.5" x 11")

```
┌─────────────────────────────────────────────────────────────┐
│  0.5" margin                                                │
│ ┌─1.25"─┐ ┌─────────────┐ ┌─────────────┐ ┌─1.25"─┐        │
│ │       │ │   Label 1   │ │   Label 2   │ │       │        │
│ │       │ │ ┌─────────┐ │ │ ┌─────────┐ │ │       │        │
│ │       │ │ │  3x3    │ │ │ │  3x3    │ │ │       │        │
│ │       │ │ │  Top    │ │ │ │  Top    │ │ │       │        │
│ │       │ │ └─────────┘ │ │ └─────────┘ │ │       │        │
│ │       │ │ ┌───────┐   │ │ ┌───────┐   │ │       │        │
│ │       │ │ │ 2x3   │   │ │ │ 2x3   │   │ │       │        │
│ │       │ │ │Bottom │   │ │ │Bottom │   │ │       │        │
│ │       │ └─┴───────┴───┘ └─┴───────┴───┘ │       │        │
│ │       │ ┌─────────────┐ ┌─────────────┐ │       │        │
│ │       │ │   Label 3   │ │   Label 4   │ │       │        │
│ │       │ │ ┌─────────┐ │ │ ┌─────────┐ │ │       │        │
│ │       │ │ │  3x3    │ │ │ │  3x3    │ │ │       │        │
│ │       │ │ │  Top    │ │ │ │  Top    │ │ │       │        │
│ │       │ │ └─────────┘ │ │ └─────────┘ │ │       │        │
│ │       │ │ ┌───────┐   │ │ ┌───────┐   │ │       │        │
│ │       │ │ │ 2x3   │   │ │ │ 2x3   │   │ │       │        │
│ │       │ │ │Bottom │   │ │ │Bottom │   │ │       │        │
│ │       │ └─┴───────┴───┘ └─┴───────┴───┘ │       │        │
│ └─────────────────────────────────────────────────┘        │
│  0.5" margin                                                │
└─────────────────────────────────────────────────────────────┘
```

## Information Layout Strategy

### Essential Information (Both Parts)
- **Customer Name** (abbreviated if needed)
- **Thickness** (e.g., "1/4", "1/2")
- **Size** (abbreviated format)
- **Type** (abbreviated)
- **Color** (abbreviated)
- **Date** (MM/DD format)
- **Barcode** (scaled appropriately)

### Upgrade Information Optimization
- Combine multiple upgrades into abbreviated format
- Use symbols/codes for common upgrades
- Prioritize most important upgrades if space limited

### Text Optimization Rules
1. **Customer names**: Truncate at 15 characters, add "..."
2. **Upgrades**: Use abbreviations (e.g., "Reinforced" → "Reinf")
3. **Colors**: Use standard abbreviations (e.g., "Forest Green" → "F.Green")
4. **Dates**: Use MM/DD format instead of full date

## Error Handling

### Print Queue Errors
- Queue storage failures (localStorage/database)
- Invalid label data validation
- Print generation failures
- Browser print dialog cancellation

### Label Generation Errors
- Missing order item data
- Barcode generation failures
- Text overflow handling
- Image rendering issues

### Print Layout Errors
- Page size validation
- Margin calculation errors
- Label positioning failures
- CSS print media issues

## Testing Strategy

### Unit Tests
- Label information optimization functions
- Print queue management operations
- Barcode generation at smaller sizes
- Text truncation and abbreviation logic

### Integration Tests
- End-to-end print queue workflow
- Label generation with real order data
- Print layout rendering accuracy
- Cross-browser print compatibility

### Visual Tests
- Label readability at actual print size
- Barcode scannability verification
- Print alignment accuracy
- Text clarity and sizing

## Performance Considerations

### Label Generation
- Optimize barcode rendering for smaller sizes
- Cache generated label components
- Minimize DOM manipulations during batch operations
- Use efficient text measurement for truncation

### Print Queue Management
- Implement efficient queue operations
- Use local storage for queue persistence
- Batch DOM updates for queue UI
- Optimize print preview generation

### Memory Management
- Clean up canvas elements after printing
- Limit queue size to prevent memory issues
- Dispose of unused label components
- Optimize image generation and caching

## Security Considerations

### Access Control
- Restrict print queue access to authorized roles (office, admin, super admin)
- Validate user permissions before queue operations
- Audit trail for print queue activities
- Secure label data transmission

### Data Protection
- Sanitize label content before rendering
- Validate order item data integrity
- Prevent XSS in label text content
- Secure print queue storage

## Browser Compatibility

### Print Support
- Chrome/Edge: Full CSS print media support
- Firefox: Print layout compatibility
- Safari: Print scaling considerations
- Mobile browsers: Limited print functionality

### Canvas Rendering
- High-DPI display support
- Cross-browser barcode rendering
- Print resolution optimization
- Font rendering consistency

## Migration Strategy

### Existing System Integration
1. **Phase 1**: Implement split label generation alongside existing system
2. **Phase 2**: Add print queue functionality
3. **Phase 3**: Update existing packing slip workflows
4. **Phase 4**: Replace old system with new split label system

### Data Migration
- No database schema changes required initially
- Gradual rollout to different user roles
- Fallback to existing system if needed
- User training and documentation updates