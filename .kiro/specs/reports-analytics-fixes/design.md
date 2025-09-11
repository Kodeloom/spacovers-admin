# Reports & Analytics Fixes - Design Document

## Overview

This design document outlines the technical approach to fix critical issues in the Reports & Analytics system. The current implementation has several calculation errors, timezone handling problems, and incorrect metrics that need to be addressed through targeted fixes to the existing API endpoints and frontend components.

## Architecture

The Reports & Analytics system consists of three main layers:

1. **Frontend Layer** (`pages/admin/reports/index.vue`) - Vue.js component handling UI, filters, and data display
2. **API Layer** (`server/api/reports/*`, `server/api/metrics/*`) - Nitro API endpoints for data processing
3. **Service Layer** (`utils/metricsService.ts`) - Business logic and database queries

The fixes will primarily target the API and Service layers while making minimal changes to the frontend for the new drill-down functionality.

## Components and Interfaces

### 1. Timezone Handling Component

**Location**: `server/api/reports/*` and `utils/metricsService.ts`

**Current Issue**: Date filters are not properly handling timezone conversion between local dates and UTC database timestamps.

**Solution**: 
- Create a `TimezoneService` utility class to handle date conversions
- Modify all date range queries to properly convert local dates to UTC boundaries
- Ensure consistent timezone handling across all report endpoints

```typescript
class TimezoneService {
  static convertLocalDateToUTCRange(localDate: string): { start: Date; end: Date }
  static convertUTCToLocalDisplay(utcDate: Date): string
}
```

### 2. Unique Item Counting Component

**Location**: `server/api/reports/productivity.get.ts` and `utils/metricsService.ts`

**Current Issue**: Counting total scans instead of unique items processed per employee.

**Solution**:
- Modify productivity calculations to use `DISTINCT orderItemId` in queries
- Update aggregation logic to count unique items rather than processing log entries
- Ensure consistent unique counting across all metrics

### 3. Lead Time Calculation Component

**Location**: `server/api/reports/lead-time.get.ts` and `utils/metricsService.ts`

**Current Issue**: Lead times not properly rounded to business days with 8-hour minimums.

**Solution**:
- Create `LeadTimeCalculator` utility class
- Implement proper business day calculation (8 hours = 1 day)
- Apply minimum 1-day rule and proper rounding logic

```typescript
class LeadTimeCalculator {
  static convertHoursToBusinessDays(hours: number): number
  static calculateProductionTime(startTime: Date, endTime: Date): number
}
```

### 4. Employee Productivity Drill-Down Component

**Location**: New API endpoint `server/api/reports/employee-items.get.ts` and frontend modal

**Current Issue**: No way to see detailed item list for employee productivity.

**Solution**:
- Create new API endpoint to fetch detailed item list for specific employee and date range
- Add modal component to frontend for displaying item details
- Implement click handlers on productivity numbers

### 5. Items Ready Calculation Component

**Location**: `server/api/metrics/reports.get.ts` and dashboard metrics

**Current Issue**: "Total Items Ready" showing 0 when items are actually ready.

**Solution**:
- Fix the query to properly count items with status `READY` or `PRODUCT_FINISHED`
- Ensure only production items (`isProduct: true`) are counted
- Update both dashboard and reports metrics

## Data Models

### Enhanced Productivity Data Model

```typescript
interface EnhancedProductivityData {
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  uniqueItemsProcessed: number; // Changed from total scans
  totalDuration: number;
  avgDuration: number;
  efficiency: number;
  totalCost: number;
}
```

### Employee Item Details Model

```typescript
interface EmployeeItemDetail {
  orderItemId: string;
  itemName: string;
  orderNumber: string;
  orderId: string;
  processingTime: number;
  processedAt: Date;
  stationName: string;
}
```

### Lead Time Calculation Model

```typescript
interface LeadTimeData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderStatus: string;
  createdAt: Date;
  daysInProduction: number; // Properly rounded business days
  completionPercentage: number;
  bottlenecks: string[];
}
```

## Error Handling

### 1. Timezone Error Handling

- Validate date inputs before processing
- Provide clear error messages for invalid date ranges
- Handle edge cases like daylight saving time transitions
- Fallback to UTC if timezone detection fails

### 2. Data Consistency Error Handling

- Handle missing or null processing logs gracefully
- Provide appropriate fallbacks for incomplete data
- Log data inconsistencies for debugging
- Show clear indicators when data is incomplete

### 3. Performance Error Handling

- Implement query timeouts for large date ranges
- Add pagination for large result sets
- Cache frequently accessed calculations
- Provide loading states and progress indicators

## Testing Strategy

### 1. Unit Tests

**Timezone Handling Tests**:
- Test date conversion with various timezones
- Test edge cases like DST transitions
- Test invalid date input handling

**Calculation Tests**:
- Test unique item counting logic
- Test lead time rounding calculations
- Test business day conversion accuracy

**Data Integrity Tests**:
- Test handling of missing data
- Test null/undefined value handling
- Test edge cases with zero values

### 2. Integration Tests

**API Endpoint Tests**:
- Test all report endpoints with various filters
- Test date range validation
- Test error response handling

**Database Query Tests**:
- Test query performance with large datasets
- Test data consistency across different queries
- Test concurrent access scenarios

### 3. End-to-End Tests

**User Workflow Tests**:
- Test complete report generation workflow
- Test filter application and data refresh
- Test CSV export functionality
- Test drill-down modal functionality

## Implementation Plan

### Phase 1: Core Calculation Fixes

1. **Timezone Service Implementation**
   - Create `TimezoneService` utility class
   - Update all date range queries to use proper timezone conversion
   - Test with various timezone scenarios

2. **Unique Item Counting Fix**
   - Modify productivity queries to count unique items
   - Update aggregation logic in `MetricsService`
   - Ensure consistency across all endpoints

3. **Lead Time Calculation Fix**
   - Create `LeadTimeCalculator` utility class
   - Implement business day conversion with proper rounding
   - Apply minimum 1-day rule consistently

### Phase 2: Data Accuracy Improvements

1. **Items Ready Calculation Fix**
   - Fix query logic for counting ready items
   - Ensure proper filtering for production items only
   - Update both dashboard and reports metrics

2. **Items Not Started Calculation Fix**
   - Correct filtering logic for `NOT_STARTED_PRODUCTION` status
   - Ensure only production items are counted
   - Test with various order states

### Phase 3: User Experience Enhancements

1. **Employee Productivity Drill-Down**
   - Create new API endpoint for employee item details
   - Implement frontend modal component
   - Add click handlers and navigation

2. **Enhanced Error Messages**
   - Improve error handling and user feedback
   - Add loading states and progress indicators
   - Implement graceful degradation for missing data

### Phase 4: Performance and Reliability

1. **Query Optimization**
   - Optimize database queries for large datasets
   - Implement proper indexing strategies
   - Add query performance monitoring

2. **Caching Strategy**
   - Implement intelligent caching for frequently accessed data
   - Add cache invalidation for real-time updates
   - Monitor cache hit rates and effectiveness

## Database Schema Considerations

### Current Schema Analysis

The existing schema supports the required functionality:

- `ItemProcessingLog` table contains all necessary fields for productivity calculations
- `Order` and `OrderItem` tables have proper status tracking
- Timestamp fields are properly typed as `DateTime`

### Required Schema Changes

**None required** - All fixes can be implemented using the existing schema. The current structure already supports:

- Unique item counting via `orderItemId` relationships
- Proper timezone handling via `DateTime` fields
- Production status tracking via `itemStatus` enum
- Lead time calculation via order timestamp fields

## Security Considerations

### Data Access Control

- Maintain existing authentication requirements for all report endpoints
- Ensure user session validation for all new endpoints
- Implement proper role-based access control for sensitive metrics

### Data Privacy

- Ensure employee productivity data is only accessible to authorized users
- Implement audit logging for report access
- Consider data anonymization for exported reports if required

### Performance Security

- Implement rate limiting for report generation endpoints
- Add query complexity limits to prevent resource exhaustion
- Monitor for potential DoS attacks via large date ranges

## Monitoring and Observability

### Performance Monitoring

- Track query execution times for all report endpoints
- Monitor memory usage during large report generation
- Set up alerts for slow or failing queries

### Data Quality Monitoring

- Monitor for data inconsistencies in processing logs
- Track completion rates for production workflows
- Alert on unusual patterns in productivity metrics

### User Experience Monitoring

- Track report generation success rates
- Monitor user interaction patterns with drill-down features
- Measure time-to-insight for common report scenarios