# Reports & Analytics Fixes - Requirements Document

## Introduction

This document outlines the requirements for fixing critical issues in the Reports & Analytics system. The current implementation has several calculation errors, timezone issues, and incorrect metrics that need to be addressed to provide accurate business intelligence and operational insights.

## Requirements

### Requirement 1: Correct Timezone Handling for Date Filters

**User Story:** As a business manager, I want date filters to work correctly with my local timezone so that I can see accurate data for the dates I specify.

#### Acceptance Criteria

1. WHEN I select a date range THEN the system SHALL convert local dates to UTC for database queries
2. WHEN timestamps are stored as UTC THEN date comparisons SHALL account for timezone offset
3. WHEN I filter by 9/10/2025 THEN scans made on 9/10 in my timezone SHALL appear in results
4. WHEN date filters are applied THEN the system SHALL use proper date range boundaries (start of day to end of day in local timezone)
5. WHEN displaying dates in reports THEN they SHALL be converted back to local timezone for user display

### Requirement 2: Accurate Unique Item Count Metrics

**User Story:** As a production manager, I want to see the actual number of unique items processed, not the total number of scans, so that I can accurately track productivity.

#### Acceptance Criteria

1. WHEN calculating "Items Processed" THEN the system SHALL count unique items per employee, not total scans
2. WHEN an employee scans the same item multiple times THEN it SHALL count as only 1 item processed
3. WHEN displaying KPI cards THEN "Items Produced" SHALL show unique items completed across all employees
4. WHEN showing employee productivity THEN each employee's item count SHALL be unique items they processed
5. WHEN multiple scans occur for status changes THEN only completed items SHALL count toward production metrics

### Requirement 3: Proper Lead Time Calculation with Rounding

**User Story:** As a business analyst, I want lead times calculated in business days with proper rounding so that I can accurately assess production efficiency.

#### Acceptance Criteria

1. WHEN calculating lead times THEN the system SHALL convert hours to days using 8-hour business days
2. WHEN lead time is less than 8 hours THEN it SHALL always round up to 1 day minimum
3. WHEN lead time is 60 hours THEN it SHALL show as 8 days (60/8 = 7.5, rounded up)
4. WHEN lead time is exactly divisible by 8 THEN it SHALL show the exact number of days
5. WHEN displaying "Days in Production" THEN it SHALL use the same rounding logic (minimum 1 day)

### Requirement 4: Correct Total Items Ready Calculation

**User Story:** As a shipping manager, I want to see the accurate count of items ready to ship so that I can plan shipping operations effectively.

#### Acceptance Criteria

1. WHEN items have status "READY" or "PRODUCT_FINISHED" THEN they SHALL count toward "Total Items Ready"
2. WHEN an order shows "Ready to Ship" THEN all its completed items SHALL be included in the total
3. WHEN calculating ready items THEN the system SHALL count individual order items, not orders
4. WHEN items are shipped THEN they SHALL no longer count in the "ready" metrics
5. WHEN the KPI shows 0 but items are ready THEN the calculation logic SHALL be corrected

### Requirement 5: Employee Productivity Drill-Down Feature

**User Story:** As a production manager, I want to click on an employee's item count to see detailed information about what they produced so that I can review their work and access related orders.

#### Acceptance Criteria

1. WHEN I click on "Items Processed" number for an employee THEN a modal SHALL open showing detailed item list
2. WHEN viewing employee item details THEN it SHALL show item name, order number, processing time, and date
3. WHEN viewing the item list THEN it SHALL respect the same date filters as the main report
4. WHEN I click on an item in the detail list THEN it SHALL open the related order page
5. WHEN the modal is open THEN I SHALL be able to close it and return to the main report

### Requirement 6: Correct "Items Not Started" Calculation

**User Story:** As a production planner, I want to see the accurate count of items that haven't started production so that I can plan work assignments effectively.

#### Acceptance Criteria

1. WHEN calculating "Items Not Started" THEN the system SHALL only count items marked as production items
2. WHEN an item has "isProductionItem" = true AND status = "NOT_STARTED_PRODUCTION" THEN it SHALL count as not started
3. WHEN an item has started any production step THEN it SHALL not count in "not started" metrics
4. WHEN the KPI shows incorrect counts THEN the filtering logic SHALL be corrected to match these criteria
5. WHEN items are not production items THEN they SHALL be excluded from production metrics entirely

### Requirement 7: Consistent Production Time Tracking

**User Story:** As a cost analyst, I want production time to be accurately tracked and calculated so that I can determine true labor costs and efficiency metrics.

#### Acceptance Criteria

1. WHEN calculating total production time THEN it SHALL sum all time spent across all production stations for each item
2. WHEN an item moves between stations THEN the time at each station SHALL be properly recorded
3. WHEN displaying average lead time THEN it SHALL be the total time from production start to completion
4. WHEN items are still in production THEN partial time SHALL be calculated up to current moment
5. WHEN production logs are incomplete THEN the system SHALL handle missing data gracefully

### Requirement 8: Data Consistency and Validation

**User Story:** As a system administrator, I want the reporting system to handle edge cases and data inconsistencies gracefully so that reports remain reliable.

#### Acceptance Criteria

1. WHEN production logs are missing THEN the system SHALL not crash and SHALL show appropriate indicators
2. WHEN date ranges are invalid THEN the system SHALL show clear error messages
3. WHEN no data exists for a time period THEN metrics SHALL show 0 with appropriate messaging
4. WHEN database queries fail THEN the system SHALL show error states instead of incorrect data
5. WHEN calculations involve division by zero THEN the system SHALL handle it gracefully

### Requirement 9: Performance Optimization for Large Datasets

**User Story:** As a business user, I want reports to load quickly even with large amounts of historical data so that I can efficiently analyze business performance.

#### Acceptance Criteria

1. WHEN generating reports with large date ranges THEN queries SHALL complete within 5 seconds
2. WHEN filtering by specific employees or stations THEN the system SHALL use efficient database indexes
3. WHEN calculating aggregated metrics THEN the system SHALL use optimized SQL queries
4. WHEN multiple users access reports simultaneously THEN performance SHALL remain acceptable
5. WHEN reports are generated frequently THEN the system SHALL consider caching strategies for common queries

### Requirement 10: Export and Data Integrity

**User Story:** As a business analyst, I want to export accurate report data to CSV so that I can perform additional analysis in external tools.

#### Acceptance Criteria

1. WHEN exporting report data THEN all calculations SHALL match what's displayed on screen
2. WHEN CSV is generated THEN it SHALL include all relevant columns with proper headers
3. WHEN exporting filtered data THEN only the filtered results SHALL be included
4. WHEN large datasets are exported THEN the system SHALL handle memory efficiently
5. WHEN exported data is opened in Excel THEN formatting SHALL be preserved and readable