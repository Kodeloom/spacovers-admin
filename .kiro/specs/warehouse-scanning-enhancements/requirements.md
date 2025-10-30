# Warehouse Scanning System Enhancements - Requirements Document

## Introduction

This document outlines the requirements for the warehouse scanning system enhancements that have been recently implemented, plus additional requirements for fixing dashboard metrics and ensuring data accuracy. The scanning enhancements are already complete and working - this spec serves as documentation and includes new requirements for metrics fixes.

## Status: Scanning Enhancements (COMPLETED)
The following requirements have been implemented and are working correctly. DO NOT re-implement these features.

## Requirements

### Requirement 1: Professional Barcode Generation with JsBarcode

**User Story:** As a warehouse worker, I want to scan high-quality, reliable barcodes that work consistently with hardware scanners so that I can process items efficiently without scanning failures.

#### Acceptance Criteria

1. WHEN a packing slip is generated THEN the barcode SHALL use JsBarcode library for Code 128 generation
2. WHEN a barcode is displayed on screen THEN it SHALL be 280x70 pixels with proper scaling for clarity
3. WHEN a barcode is printed THEN it SHALL be 600x120 pixels with high resolution for reliable scanning
4. WHEN a barcode contains the full CUID THEN it SHALL use format "ORDER_NUMBER-FULL_CUID" for maximum uniqueness
5. WHEN hardware scanners read the barcode THEN it SHALL decode correctly without multiple scan attempts

### Requirement 2: Intelligent Duplicate Scan Prevention

**User Story:** As a warehouse worker, I want the system to prevent duplicate scans when my scanner sends the same barcode multiple times so that I don't accidentally process the same item repeatedly.

#### Acceptance Criteria

1. WHEN the same barcode is scanned within 2 seconds THEN the system SHALL ignore duplicate scans
2. WHEN a scan is in progress THEN additional scans SHALL be blocked until processing completes
3. WHEN duplicate scans are detected THEN the system SHALL log the prevention for debugging
4. WHEN the barcode input receives rapid input THEN it SHALL debounce with 150ms delay
5. WHEN processing is active THEN the UI SHALL show clear processing indicators

### Requirement 3: Enhanced Error Messages with Status Context

**User Story:** As a warehouse worker, I want clear, specific error messages that tell me exactly what's wrong and what I should do next so that I can resolve issues quickly without supervisor assistance.

#### Acceptance Criteria

1. WHEN an item cannot be processed at a station THEN the error SHALL show current item status (e.g., "Not Started Production")
2. WHEN workflow validation fails THEN the error SHALL specify which station the item should go to next
3. WHEN an item is at the wrong station THEN the error SHALL provide specific guidance based on current status
4. WHEN API errors occur THEN the system SHALL use statusMessage for user-friendly error display
5. WHEN workflow errors happen THEN the title SHALL be "Workflow Error" instead of generic "Error"

### Requirement 4: Flexible Office Scanner Support

**User Story:** As an office administrator, I want to use a scanner that's not tied to a specific production station so that I can check item status and perform administrative tasks without being restricted to production workflows.

#### Acceptance Criteria

1. WHEN creating a barcode scanner THEN stationId SHALL be optional for office scanners
2. WHEN an office scanner is used THEN it SHALL default to "Office" station designation
3. WHEN office scanners scan items THEN they SHALL display current status without processing workflow transitions
4. WHEN office scanners check status THEN the activity log SHALL show "Status Check: [Current Status]"
5. WHEN office scanners are used THEN they SHALL provide read-only access to item information

### Requirement 5: Improved Status Display Names

**User Story:** As a warehouse worker, I want to see clear, consistent status names that are easy to understand so that I know exactly where each item is in the production process.

#### Acceptance Criteria

1. WHEN item status is NOT_STARTED_PRODUCTION THEN display SHALL show "Not Started Production"
2. WHEN item status is CUTTING/SEWING/FOAM_CUTTING/PACKAGING THEN display SHALL show "Item being processed at [Station Name]"
3. WHEN item status is PRODUCT_FINISHED THEN display SHALL show "Item Done"
4. WHEN item status is READY THEN display SHALL show "Item Ready"
5. WHEN status is displayed in errors THEN it SHALL use the same consistent naming convention

### Requirement 6: Always-Focused Kiosk Input

**User Story:** As a warehouse worker, I want the barcode input to always be ready for scanning so that I don't have to click or interact with the screen between scans.

#### Acceptance Criteria

1. WHEN the kiosk loads THEN the barcode input SHALL be automatically focused
2. WHEN a scan completes THEN the input SHALL automatically refocus for the next scan
3. WHEN clicking anywhere on the kiosk THEN the input SHALL regain focus (except logout button)
4. WHEN the input loses focus THEN it SHALL automatically refocus within 500ms
5. WHEN processing is complete THEN the input SHALL be cleared and ready for next scan

### Requirement 7: Comprehensive Activity Tracking

**User Story:** As a warehouse manager, I want to see detailed recent activity with proper item names and user information so that I can monitor what's happening in real-time.

#### Acceptance Criteria

1. WHEN items are scanned THEN recent activity SHALL show actual item names instead of "Unknown Item"
2. WHEN errors occur THEN recent activity SHALL capture the error type and user information
3. WHEN office scanners check status THEN activity SHALL show "Status Check: [Status]"
4. WHEN activity is logged THEN it SHALL include order number, item name, user, station, and timestamp
5. WHEN activity list grows THEN it SHALL maintain only the most recent 10 entries

### Requirement 8: Robust Scanner Prefix Validation

**User Story:** As a system administrator, I want the system to properly validate scanner prefixes and provide clear feedback when scanners are not found or configured incorrectly.

#### Acceptance Criteria

1. WHEN a scanner prefix is not found THEN error SHALL specify the exact prefix that was not found
2. WHEN scanner lookup fails THEN error SHALL indicate if scanner is inactive or doesn't exist
3. WHEN scanner validation occurs THEN it SHALL include user and station information in response
4. WHEN office scanners are looked up THEN they SHALL return valid station information defaulting to "Office"
5. WHEN scanner errors occur THEN they SHALL provide actionable guidance for resolution

### Requirement 9: Enhanced Print Barcode Quality

**User Story:** As a warehouse worker, I want printed barcodes to be large and clear enough for reliable scanning so that I don't have scanning issues with printed packing slips.

#### Acceptance Criteria

1. WHEN packing slips are printed THEN barcodes SHALL be minimum 400px wide for visibility
2. WHEN print barcodes are generated THEN they SHALL use high-resolution canvas rendering
3. WHEN multiple slips are printed THEN each barcode SHALL maintain consistent quality
4. WHEN barcodes are converted for printing THEN they SHALL use PNG format with maximum quality
5. WHEN print preview is shown THEN barcodes SHALL be clearly visible and properly sized

### Requirement 10: Station Code Mapping Consistency

**User Story:** As a system administrator, I want consistent station code mapping throughout the system so that scanner prefixes work reliably across all components.

#### Acceptance Criteria

1. WHEN station codes are used THEN they SHALL follow the mapping: O=Office, C=Cutting, S=Sewing, F=Foam Cutting, T=Stuffing, P=Packaging
2. WHEN scanner prefixes are decoded THEN they SHALL use the centralized STATION_CODES constant
3. WHEN new stations are added THEN they SHALL be added to the central constants file
4. WHEN station names are displayed THEN they SHALL be consistent across all UI components
5. WHEN barcode validation occurs THEN it SHALL use the same station code mapping

## NEW REQUIREMENTS: Dashboard and Metrics Fixes

### Requirement 11: Accurate Dashboard Metrics

**User Story:** As a business manager, I want the dashboard to show accurate, real-time metrics about orders, revenue, and production so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN viewing the dashboard THEN "Total Orders" SHALL show the correct count of all orders in the system
2. WHEN viewing the dashboard THEN "Revenue This Month" SHALL calculate the sum of all order totals for the current month
3. WHEN viewing the dashboard THEN "Orders This Week" SHALL show the count of orders created in the current week
4. WHEN viewing the dashboard THEN "Pending Orders" SHALL show the count of orders with status PENDING
5. WHEN viewing the dashboard THEN "In Production" SHALL show the count of orders with status ORDER_PROCESSING
6. WHEN viewing the dashboard THEN "Ready to Ship" SHALL show the count of orders with status READY_TO_SHIP
7. WHEN new orders are created THEN dashboard metrics SHALL update automatically
8. WHEN order statuses change THEN dashboard metrics SHALL reflect the changes immediately

### Requirement 12: Accurate Orders Page Metrics

**User Story:** As an order manager, I want the orders page to show correct summary statistics so that I can quickly understand the current order pipeline status.

#### Acceptance Criteria

1. WHEN viewing the orders page THEN summary stats SHALL show accurate counts for each order status
2. WHEN filtering orders THEN summary stats SHALL update to reflect the filtered results
3. WHEN orders are updated THEN the page metrics SHALL refresh automatically
4. WHEN viewing order totals THEN they SHALL match the actual sum of order values
5. WHEN viewing production metrics THEN they SHALL accurately reflect items in each production stage

### Requirement 13: Accurate Reports Page Metrics

**User Story:** As a business analyst, I want the reports page to show accurate productivity and performance metrics so that I can analyze business performance correctly.

#### Acceptance Criteria

1. WHEN generating productivity reports THEN metrics SHALL be calculated from actual ItemProcessingLog data
2. WHEN viewing employee performance THEN time calculations SHALL be accurate and properly aggregated
3. WHEN viewing order lead times THEN calculations SHALL use actual order timestamps
4. WHEN filtering reports by date range THEN metrics SHALL only include data from the specified period
5. WHEN viewing revenue reports THEN calculations SHALL use actual order totals and payment data
6. WHEN reports show zero values THEN it SHALL be because no data exists for that metric, not calculation errors

### Requirement 14: Database Schema Fix for Office Scanners

**User Story:** As a system administrator, I want to create office scanners without assigning them to a production station so that office staff can use scanners for administrative tasks.

#### Acceptance Criteria

1. WHEN creating a barcode scanner THEN stationId field SHALL be nullable in the database schema
2. WHEN saving an office scanner with null/empty stationId THEN it SHALL accept the value without foreign key constraint errors
3. WHEN office scanners have null stationId THEN they SHALL default to "Office" station behavior
4. WHEN scanner lookup occurs for null stationId THEN it SHALL return station: { id: null, name: 'Office' }
5. WHEN office scanners are used THEN they SHALL function properly for status checking without workflow processing
6. WHEN migrating the database THEN existing scanners SHALL remain unaffected
7. WHEN the schema is updated THEN all scanner-related functionality SHALL continue working

### Requirement 15: Data Validation and Error Prevention

**User Story:** As a system administrator, I want to ensure all metrics calculations are robust and handle edge cases properly so that the system remains reliable with real production data.

#### Acceptance Criteria

1. WHEN calculating metrics with no data THEN system SHALL return 0 instead of errors
2. WHEN handling null or undefined values THEN calculations SHALL use proper fallbacks
3. WHEN date ranges are invalid THEN system SHALL provide meaningful error messages
4. WHEN database queries fail THEN metrics SHALL show appropriate error states
5. WHEN large datasets are processed THEN metrics calculations SHALL remain performant
### Re
quirement 16: Production Deployment Compatibility

**User Story:** As a system administrator, I want the application to deploy successfully to production environments (like Coolify) without breaking existing deployment processes.

#### Acceptance Criteria

1. WHEN deploying to production THEN the application SHALL work with existing Dockerfile configurations
2. WHEN docker-compose files exist THEN they SHALL be optional and not required for production deployment
3. WHEN deploying to Coolify THEN the build process SHALL complete successfully without docker-compose dependencies
4. WHEN production deployment occurs THEN all environment variables SHALL be properly configured
5. WHEN the application starts in production THEN all database connections and services SHALL initialize correctly
6. WHEN deployment configuration changes THEN clear migration instructions SHALL be provided
7. WHEN using single-container deployment THEN the application SHALL not require docker-compose orchestration