# Implementation Plan

- [x] 1. Create timezone handling utility service





  - Create `utils/timezoneService.ts` with date conversion functions
  - Implement proper local-to-UTC date range conversion for database queries
  - Add timezone validation and error handling functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Fix unique item counting in productivity calculations





  - [x] 2.1 Update productivity API endpoint to count unique items


    - Modify `server/api/reports/productivity.get.ts` to use DISTINCT orderItemId in aggregation
    - Update grouping logic to count unique items per employee instead of total scans
    - Write unit tests for unique item counting logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Update MetricsService productivity calculations


    - Modify `utils/metricsService.ts` getProductivityByEmployee method
    - Ensure consistent unique item counting across all productivity metrics
    - Update summary statistics to reflect unique item counts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement proper lead time calculation with business day rounding




  - [x] 3.1 Create LeadTimeCalculator utility class


    - Create `utils/leadTimeCalculator.ts` with business day conversion functions
    - Implement 8-hour business day calculation with proper rounding
    - Add minimum 1-day rule for any production time
    - Write unit tests for lead time calculation edge cases
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Update lead time API endpoint calculations


    - Modify `server/api/reports/lead-time.get.ts` to use LeadTimeCalculator
    - Apply business day rounding to all time calculations
    - Update "Days in Production" to use consistent rounding logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Fix "Total Items Ready" calculation





  - Update dashboard and reports metrics to properly count ready items
  - Modify queries to count items with status READY or PRODUCT_FINISHED
  - Ensure only production items (isProduct: true) are included in counts
  - Test with various order states to verify accuracy
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Fix "Items Not Started" calculation





  - Update KPI calculation logic in orders metrics
  - Implement proper filtering for production items with NOT_STARTED_PRODUCTION status
  - Exclude non-production items from production metrics entirely
  - Verify calculation accuracy with test data
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Implement employee productivity drill-down feature





  - [x] 6.1 Create employee item details API endpoint


    - Create `server/api/reports/employee-items.get.ts` for detailed item lists
    - Implement filtering by employee, date range, and station
    - Include item name, order number, processing time, and order link data
    - Add proper authentication and validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Add drill-down modal to frontend


    - Create modal component for displaying employee item details
    - Add click handlers to "Items Processed" numbers in productivity table
    - Implement navigation to order pages from item list
    - Add loading states and error handling for modal data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Apply timezone fixes to all date filter operations





  - [x] 7.1 Update reports page date filtering


    - Modify `pages/admin/reports/index.vue` to use TimezoneService for date conversion
    - Ensure date filters properly convert local dates to UTC for API calls
    - Update date display to show local timezone dates to users
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 Update all report API endpoints for timezone handling


    - Apply TimezoneService to `server/api/reports/productivity.get.ts`
    - Apply TimezoneService to `server/api/reports/lead-time.get.ts`
    - Apply TimezoneService to `server/api/metrics/reports.get.ts`
    - Ensure consistent timezone handling across all endpoints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8. Enhance data validation and error handling





  - [x] 8.1 Add robust data validation to all report endpoints


    - Implement comprehensive date range validation with clear error messages
    - Add handling for missing or null processing logs
    - Implement graceful fallbacks for incomplete data scenarios
    - Add validation for edge cases like division by zero
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Improve error messaging and user feedback


    - Update frontend error handling to show specific error messages
    - Add loading states for all report generation operations
    - Implement proper error boundaries for report components
    - Add user-friendly messages for common error scenarios
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
-

- [x] 9. Optimize query performance for large datasets



  - [x] 9.1 Optimize database queries in MetricsService


    - Review and optimize all productivity calculation queries
    - Add proper database indexes for frequently queried fields
    - Implement query result caching for expensive calculations
    - Add query performance monitoring and logging
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.2 Add performance safeguards for large date ranges


    - Implement query timeouts for long-running report generation
    - Add pagination support for large result sets
    - Implement progressive loading for complex reports
    - Add user warnings for potentially slow operations
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 10. Update CSV export functionality





  - Modify `server/api/reports/export-csv.get.ts` to use corrected calculations
  - Ensure exported data matches displayed report data exactly
  - Apply all timezone and calculation fixes to export functionality
  - Test export with various filters and date ranges
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 11. Add comprehensive testing for all fixes
  - [ ] 11.1 Write unit tests for utility classes
    - Create tests for TimezoneService date conversion functions
    - Create tests for LeadTimeCalculator business day calculations
    - Create tests for unique item counting logic
    - Test edge cases and error scenarios for all utilities
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 11.2 Write integration tests for API endpoints
    - Test all report endpoints with various filter combinations
    - Test timezone handling with different user timezones
    - Test performance with large datasets and date ranges
    - Test error handling and validation scenarios
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Verify and validate all fixes with real data
  - Test all calculations with actual production data
  - Verify timezone handling works correctly for user's timezone
  - Confirm unique item counting produces accurate results
  - Validate lead time calculations match business requirements
  - Test drill-down functionality with various employee data scenarios
  - _Requirements: All requirements validation_