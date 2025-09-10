# Warehouse Scanning System Enhancements - Design Document

## Overview

This design document outlines the technical approach for implementing dashboard metrics fixes and database schema updates for office scanners. The scanning enhancements are already implemented and working correctly - this design focuses on the new requirements while documenting the existing architecture.

## Architecture

### Current System Architecture (Already Implemented)
- **Frontend**: Vue.js components with Nuxt.js framework
- **Backend**: Nuxt server API routes with Prisma ORM
- **Database**: PostgreSQL with ZenStack enhancements
- **Barcode Generation**: JsBarcode library for Code 128 barcodes
- **Scanner Integration**: Hardware barcode scanners with prefix-based identification

### New Components to Implement
- **Metrics Service**: Centralized service for calculating dashboard and report metrics
- **Database Migration**: Schema update for nullable stationId in BarcodeScanner model
- **Data Aggregation**: Efficient queries for real-time metrics calculation

## Components and Interfaces

### 1. Metrics Service (`utils/metricsService.ts`)

```typescript
interface DashboardMetrics {
  totalOrders: number;
  revenueThisMonth: number;
  ordersThisWeek: number;
  pendingOrders: number;
  inProduction: number;
  readyToShip: number;
}

interface OrdersPageMetrics {
  statusCounts: Record<string, number>;
  totalValue: number;
  averageOrderValue: number;
}

interface ReportsMetrics {
  productivityByEmployee: EmployeeProductivity[];
  averageLeadTime: number;
  revenueByPeriod: RevenuePeriod[];
}

class MetricsService {
  static async getDashboardMetrics(): Promise<DashboardMetrics>
  static async getOrdersPageMetrics(filters?: OrderFilters): Promise<OrdersPageMetrics>
  static async getReportsMetrics(dateRange: DateRange): Promise<ReportsMetrics>
}
```

### 2. Database Schema Updates

#### BarcodeScanner Model Update
```prisma
model BarcodeScanner {
  id           String    @id @default(cuid())
  prefix       String    @unique
  stationId    String?   // Made nullable for office scanners
  userId       String
  model        String?
  serialNumber String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  station Station? @relation(fields: [stationId], references: [id])
  user    User     @relation(fields: [userId], references: [id])

  @@map("barcode_scanners")
}
```

### 3. Enhanced API Endpoints

#### Dashboard Metrics API (`server/api/metrics/dashboard.get.ts`)
```typescript
export default defineEventHandler(async (event) => {
  const metrics = await MetricsService.getDashboardMetrics();
  return { success: true, data: metrics };
});
```

#### Orders Metrics API (`server/api/metrics/orders.get.ts`)
```typescript
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const filters = parseOrderFilters(query);
  const metrics = await MetricsService.getOrdersPageMetrics(filters);
  return { success: true, data: metrics };
});
```

## Data Models

### 1. Metrics Calculation Models

```typescript
interface EmployeeProductivity {
  userId: string;
  userName: string;
  totalHours: number;
  itemsProcessed: number;
  averageTimePerItem: number;
  stationBreakdown: StationProductivity[];
}

interface StationProductivity {
  stationName: string;
  hoursWorked: number;
  itemsProcessed: number;
}

interface RevenuePeriod {
  period: string; // 'YYYY-MM' or 'YYYY-WW'
  revenue: number;
  orderCount: number;
}

interface OrderFilters {
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
}
```

### 2. Database Query Optimization

#### Efficient Metrics Queries
```sql
-- Dashboard total orders
SELECT COUNT(*) FROM orders;

-- Revenue this month
SELECT SUM(total_amount) FROM orders 
WHERE created_at >= date_trunc('month', CURRENT_DATE);

-- Orders by status
SELECT order_status, COUNT(*) FROM orders 
GROUP BY order_status;

-- Production metrics from processing logs
SELECT 
  s.name as station_name,
  COUNT(ipl.id) as items_processed,
  AVG(ipl.duration_in_seconds) as avg_duration
FROM item_processing_logs ipl
JOIN stations s ON ipl.station_id = s.id
WHERE ipl.end_time IS NOT NULL
GROUP BY s.name;
```

## Error Handling

### 1. Metrics Calculation Error Handling

```typescript
class MetricsService {
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [totalOrders, revenueThisMonth, ordersThisWeek] = await Promise.allSettled([
        this.getTotalOrders(),
        this.getRevenueThisMonth(),
        this.getOrdersThisWeek()
      ]);

      return {
        totalOrders: this.extractValue(totalOrders, 0),
        revenueThisMonth: this.extractValue(revenueThisMonth, 0),
        ordersThisWeek: this.extractValue(ordersThisWeek, 0),
        // ... other metrics with fallbacks
      };
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  private static extractValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === 'fulfilled' ? result.value : fallback;
  }
}
```

### 2. Database Migration Error Handling

```typescript
// Migration script with rollback capability
export async function up(prisma: PrismaClient) {
  try {
    // Make stationId nullable
    await prisma.$executeRaw`
      ALTER TABLE barcode_scanners 
      ALTER COLUMN station_id DROP NOT NULL;
    `;
    
    console.log('Successfully made stationId nullable');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down(prisma: PrismaClient) {
  // Rollback: make stationId required again (only if no null values exist)
  await prisma.$executeRaw`
    ALTER TABLE barcode_scanners 
    ALTER COLUMN station_id SET NOT NULL;
  `;
}
```

## Testing Strategy

### 1. Metrics Testing

```typescript
describe('MetricsService', () => {
  describe('getDashboardMetrics', () => {
    it('should return correct total orders count', async () => {
      // Create test orders
      await createTestOrders(5);
      
      const metrics = await MetricsService.getDashboardMetrics();
      expect(metrics.totalOrders).toBe(5);
    });

    it('should handle empty database gracefully', async () => {
      const metrics = await MetricsService.getDashboardMetrics();
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.revenueThisMonth).toBe(0);
    });

    it('should calculate revenue correctly for current month', async () => {
      await createTestOrdersWithRevenue([100, 200, 300]);
      
      const metrics = await MetricsService.getDashboardMetrics();
      expect(metrics.revenueThisMonth).toBe(600);
    });
  });
});
```

### 2. Office Scanner Testing

```typescript
describe('Office Scanner Support', () => {
  it('should create scanner with null stationId', async () => {
    const scanner = await createBarcodeScanner({
      prefix: 'O1A',
      stationId: null,
      userId: 'test-user-id'
    });
    
    expect(scanner.stationId).toBeNull();
  });

  it('should default to Office station in lookup', async () => {
    const response = await scannerLookup('O1A');
    
    expect(response.scanner.station).toEqual({
      id: null,
      name: 'Office'
    });
  });
});
```

## Implementation Phases

### Phase 1: Database Schema Update
1. Create migration for nullable stationId
2. Update Prisma schema
3. Test existing scanner functionality
4. Update scanner creation API

### Phase 2: Metrics Service Implementation
1. Create MetricsService utility class
2. Implement dashboard metrics calculations
3. Add error handling and fallbacks
4. Create API endpoints for metrics

### Phase 3: Frontend Integration
1. Update dashboard components to use new metrics API
2. Update orders page with real-time metrics
3. Enhance reports page with accurate calculations
4. Add loading states and error handling

### Phase 4: Testing and Optimization
1. Add comprehensive unit tests
2. Performance testing for large datasets
3. Integration testing with real data
4. Optimize database queries if needed

## Performance Considerations

### 1. Database Query Optimization
- Use database indexes on frequently queried fields (created_at, order_status)
- Implement query result caching for expensive calculations
- Use database aggregation functions instead of application-level calculations

### 2. Real-time Updates
- Consider WebSocket connections for real-time dashboard updates
- Implement efficient cache invalidation strategies
- Use database triggers for automatic metric updates

### 3. Scalability
- Design metrics service to handle large datasets efficiently
- Consider pagination for detailed reports
- Implement background jobs for complex calculations

## Security Considerations

### 1. Data Access Control
- Ensure metrics APIs respect user permissions
- Validate date ranges to prevent excessive data queries
- Implement rate limiting for metrics endpoints

### 2. Data Integrity
- Validate all input parameters for metrics calculations
- Use database transactions for consistent data reads
- Implement audit logging for metrics access

This design provides a robust foundation for implementing the remaining requirements while preserving all existing functionality.