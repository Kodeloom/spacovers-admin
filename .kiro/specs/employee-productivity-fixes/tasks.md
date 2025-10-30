# Implementation Plan

- [x] 1. Fix Productivity API Calculations




  - Update the productivity API to correctly calculate items processed and remove labor cost features
  - Fix the core logic for counting unique items per employee per station
  - Remove all labor cost calculations and related code
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.1 Update items processed calculation logic


  - Modify `server/api/reports/productivity.get.ts` to count unique items per employee per station correctly
  - Ensure only completed processing logs (with both startTime and endTime) are counted
  - Fix the aggregation logic to use Set for unique orderItemIds per employee-station combination
  - Add validation to ensure only production items (isProduct: true) are counted
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 Remove all labor cost calculations


  - Remove hourlyRate usage and totalCost calculations from productivity API
  - Remove calculateStationLaborCost and related cost calculation functions
  - Update response interface to exclude all cost-related fields
  - Remove totalLaborCost from summary statistics
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.3 Enhance data validation and error handling


  - Improve processing log validation to exclude invalid records
  - Add proper error handling for database queries and timeouts
  - Implement comprehensive warnings for data quality issues
  - Add validation for reasonable duration limits (not more than 24 hours per session)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.4 Optimize database queries and performance


  - Review and optimize the ItemProcessingLog query for better performance
  - Add proper indexing considerations for date range and station filtering
  - Implement query timeout handling and performance monitoring
  - Add caching strategies for frequently accessed data
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_


- [x] 2. Update Frontend Reports Page




  - Remove all labor cost display elements from the productivity report UI
  - Update table columns and summary statistics to exclude cost information
  - Ensure proper formatting and display of productivity metrics
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.1 Remove labor cost UI elements


  - Remove "Total Cost" column from productivity table in `pages/admin/reports/index.vue`
  - Remove "Total Labor Cost" summary card from KPI section
  - Update table headers and data display to exclude all cost-related information
  - Remove cost calculation functions from frontend component
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2.2 Update summary statistics display


  - Replace labor cost summary card with efficiency or other relevant production metrics
  - Update summary calculations to exclude cost-related data
  - Ensure summary statistics show total employees, items processed, and production time
  - Add overall efficiency calculation (items per hour across all employees)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.3 Fix table display and formatting


  - Ensure productivity table shows Employee, Station, Items Processed, Total Time, Avg Time/Item, Efficiency
  - Update formatDuration function to properly display time in hours and minutes
  - Ensure items processed column is clickable for drill-down functionality
  - Add proper sorting and filtering capabilities for the table
  - _Requirements: 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Verify Employee Items Modal Integration





  - Ensure the employee items modal works correctly with the updated productivity data
  - Test the drill-down functionality from items processed count to detailed item list
  - Verify modal displays correct information and respects filters
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3.1 Test employee items modal functionality


  - Verify clicking on items processed count opens the modal with correct employee data
  - Ensure modal shows item details including name, order number, processing time, and completion date
  - Test that modal respects the same date range and station filters as main report
  - Verify order number links in modal navigate to correct order details page
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3.2 Validate modal data accuracy


  - Ensure modal data matches the items counted in the main productivity report
  - Verify processing times and completion dates are displayed correctly
  - Test modal with different filter combinations (date range, station, employee)
  - Ensure modal handles empty data states appropriately
  - _Requirements: 8.2, 8.3, 8.4_
-

- [x] 4. Update CSV Export Functionality




  - Remove labor cost columns from CSV export
  - Ensure exported data matches the displayed productivity report data
  - Update CSV headers and formatting for time values
  - _Requirements: 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.1 Fix CSV export data structure


  - Update CSV export logic to exclude all labor cost columns
  - Ensure CSV includes Employee, Station, Items Processed, Total Time, Avg Time/Item, Efficiency
  - Format time values in CSV to be readable (e.g., "2h 30m" instead of seconds)
  - Add proper CSV headers that match the table display
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.2 Test CSV export with filters


  - Verify CSV export respects date range, station, and employee filters
  - Test CSV generation with different data scenarios (empty data, large datasets)
  - Ensure CSV file naming includes relevant filter information
  - Test CSV opens correctly in Excel and other spreadsheet applications
  - _Requirements: 9.3, 9.4, 9.5_

- [x] 5. Enhance Filtering and Date Range Handling




  - Improve date range validation and error handling
  - Ensure station and employee filters work correctly with updated calculations
  - Add proper default date range (last 30 days) and validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5.1 Improve date range validation


  - Enhance date range validation in both frontend and backend
  - Add proper error messages for invalid date ranges
  - Implement warnings for large date ranges that may impact performance
  - Ensure date range filtering works correctly with timezone handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5.2 Fix station and employee filtering


  - Ensure station filter shows only employees who worked at that station
  - Verify employee filter shows only that employee's data across all their stations
  - Test combination of filters (date + station + employee)
  - Add proper handling for filters that return no data
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Testing and Validation
  - Comprehensive testing of all productivity calculations and UI changes
  - Verify labor cost removal is complete throughout the system
  - Test all filtering combinations and edge cases
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 6.1 Test productivity calculation accuracy
  - Verify items processed counts are correct for various employee-station combinations
  - Test that duplicate processing logs for same item are counted only once
  - Verify production time calculations sum correctly across all processing sessions
  - Test efficiency calculations (items per hour) are accurate
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6.2 Verify labor cost removal is complete
  - Confirm no labor cost information appears in UI, API responses, or CSV exports
  - Test that all cost-related functions and calculations have been removed
  - Verify summary statistics no longer include labor cost metrics
  - Ensure no cost-related errors occur during report generation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6.3 Test filtering and error handling
  - Test all filter combinations (date range, station, employee)
  - Verify proper error handling for invalid inputs and database errors
  - Test performance with large date ranges and datasets
  - Ensure proper messaging for empty data states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 6.4 Validate backward compatibility
  - Ensure existing API endpoints maintain their structure (minus labor cost fields)
  - Verify other reports and analytics features are not affected
  - Test that existing database queries and performance are maintained
  - Confirm UI layout and navigation patterns are preserved
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 6.5 Performance and load testing
  - Test report generation with large datasets and date ranges
  - Verify database query performance and optimization
  - Test concurrent user access to productivity reports
  - Monitor memory usage and query execution times
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_