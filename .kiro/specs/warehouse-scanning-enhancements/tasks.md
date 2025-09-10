# Implementation Plan

- [ ] 1. Database Schema Update for Office Scanners
  - Create Prisma migration to make BarcodeScanner.stationId nullable
  - Update schema.zmodel to reflect nullable stationId field
  - Test migration with existing scanner data
  - _Requirements: 14.1, 14.2, 14.6_

- [ ] 2. Update Scanner Creation API for Office Support
  - Modify barcode scanner creation validation to accept null stationId
  - Update scanner lookup API to handle null station gracefully
  - Test office scanner creation and lookup functionality
  - _Requirements: 14.2, 14.3, 14.4_

- [ ] 3. Create Core Metrics Service Utility
  - Implement MetricsService class with dashboard metrics calculations
  - Add methods for getTotalOrders, getRevenueThisMonth, getOrdersThisWeek
  - Implement error handling with fallback values for failed calculations
  - _Requirements: 11.1, 11.2, 11.3, 15.1, 15.2_

- [ ] 4. Implement Dashboard Metrics Calculations
  - Add getPendingOrders, getInProduction, getReadyToShip methods
  - Create efficient database queries using Prisma aggregations
  - Implement proper date range filtering for time-based metrics
  - _Requirements: 11.4, 11.5, 11.6, 15.5_

- [ ] 5. Create Dashboard Metrics API Endpoint
  - Implement /api/metrics/dashboard.get.ts endpoint
  - Add proper error handling and response formatting
  - Test API endpoint with various data scenarios
  - _Requirements: 11.7, 11.8, 15.3_

- [ ] 6. Update Dashboard Components with Real Metrics
  - Modify dashboard components to fetch from new metrics API
  - Replace hardcoded values with real-time calculated metrics
  - Add loading states and error handling for metrics display
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 7. Implement Orders Page Metrics Service
  - Add getOrdersPageMetrics method with filtering support
  - Implement status count aggregations and total value calculations
  - Create efficient queries for filtered order statistics
  - _Requirements: 12.1, 12.2, 12.4_

- [ ] 8. Create Orders Metrics API Endpoint
  - Implement /api/metrics/orders.get.ts with query parameter support
  - Add proper validation for filter parameters
  - Test endpoint with various filter combinations
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 9. Update Orders Page with Dynamic Metrics
  - Integrate orders page with new metrics API
  - Implement automatic refresh when orders are updated
  - Add proper error states for failed metric calculations
  - _Requirements: 12.1, 12.2, 12.3_

- [ ] 10. Implement Reports Metrics Calculations
  - Add productivity metrics using ItemProcessingLog data
  - Implement employee performance calculations with time aggregation
  - Create lead time calculations using order timestamps
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 11. Create Reports Metrics API Endpoint
  - Implement /api/metrics/reports.get.ts with date range filtering
  - Add proper validation for date parameters
  - Implement efficient queries for large dataset processing
  - _Requirements: 13.4, 13.5, 15.5_

- [ ] 12. Update Reports Page with Accurate Calculations
  - Replace existing report calculations with new metrics service
  - Add proper date range filtering functionality
  - Implement revenue report calculations using actual order data
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 13. Add Comprehensive Error Handling
  - Implement fallback values for all metric calculations
  - Add proper null/undefined value handling in calculations
  - Create meaningful error messages for invalid date ranges
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 14. Create Unit Tests for Metrics Service
  - Write tests for all MetricsService methods
  - Test edge cases like empty database and null values
  - Add performance tests for large dataset calculations
  - _Requirements: 15.1, 15.2, 15.5_

- [ ] 15. Create Integration Tests for Office Scanners
  - Test office scanner creation with null stationId
  - Test scanner lookup returning proper Office station default
  - Verify office scanner functionality in kiosk interface
  - _Requirements: 14.3, 14.4, 14.5_

- [ ] 16. Performance Optimization and Caching
  - Add database indexes for frequently queried fields (created_at, order_status)
  - Implement query result caching for expensive calculations
  - Optimize database queries using proper aggregation functions
  - _Requirements: 15.5_

- [ ] 17. Final Integration Testing
  - Test all dashboard metrics with real production-like data
  - Verify orders page metrics update correctly with filters
  - Test reports page calculations with various date ranges
  - _Requirements: 11.8, 12.3, 13.6_