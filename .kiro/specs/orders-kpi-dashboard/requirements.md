# Orders KPI Dashboard - Requirements Document

## Introduction

This feature enhances the Orders list view with a comprehensive KPI dashboard that provides real-time metrics about order statuses, production items, and lead times. The system includes clickable KPI cards for filtering, expandable order rows to show production details, and modal views for detailed item listings.

## Glossary

- **Order_Management_System**: The system that manages customer orders and their lifecycle
- **Production_Item**: An order item marked with isProduct = true that goes through production stages
- **Lead_Time**: The total time from when an item starts production (CUTTING) until completion (READY/PRODUCT_FINISHED)
- **KPI_Card**: A visual metric display that shows key performance indicators and allows user interaction
- **Order_Item**: Individual items within an order that can be either products or non-production items

## Requirements

### Requirement 1: Average Lead Time KPI

**User Story:** As a production manager, I want to see the average lead time for completed items so that I can monitor production efficiency and identify bottlenecks.

#### Acceptance Criteria

1. WHEN calculating average lead time THEN the Order_Management_System SHALL consider only items that completed the full production cycle in the last 60 days
2. WHEN an item reaches READY or PRODUCT_FINISHED status THEN the Order_Management_System SHALL calculate lead time from first CUTTING timestamp to completion timestamp
3. WHEN displaying average lead time THEN the Order_Management_System SHALL show the result in hours with proper rounding
4. WHEN no items have completed the cycle in 60 days THEN the Order_Management_System SHALL display 0 hours
5. WHEN calculating lead time THEN the Order_Management_System SHALL only include Production_Items in the calculation

### Requirement 2: Order Status KPI Cards

**User Story:** As an office manager, I want to see counts of orders by status so that I can quickly understand the current order pipeline and workload distribution.

#### Acceptance Criteria

1. WHEN displaying order status KPIs THEN the Order_Management_System SHALL show separate counts for PENDING, APPROVED, ORDER_PROCESSING, READY_TO_SHIP, and COMPLETED orders
2. WHEN counting orders by status THEN the Order_Management_System SHALL include all orders regardless of their items
3. WHEN order status changes THEN the Order_Management_System SHALL update the corresponding KPI counts in real-time
4. WHEN displaying KPI cards THEN the Order_Management_System SHALL NOT include a "Total Orders" metric
5. WHEN orders are in CANCELLED or ARCHIVED status THEN the Order_Management_System SHALL exclude them from active status counts

### Requirement 3: Production Items KPI Cards

**User Story:** As a production supervisor, I want to see counts of production items by their status so that I can monitor production workflow and capacity.

#### Acceptance Criteria

1. WHEN calculating items in production THEN the Order_Management_System SHALL count Production_Items with status other than NOT_STARTED_PRODUCTION, PRODUCT_FINISHED, and READY
2. WHEN calculating items not started THEN the Order_Management_System SHALL count Production_Items with status NOT_STARTED_PRODUCTION
3. WHEN calculating items completed THEN the Order_Management_System SHALL count Production_Items with status PRODUCT_FINISHED or READY
4. WHEN counting production items THEN the Order_Management_System SHALL only include items where isProduct = true
5. WHEN production item status changes THEN the Order_Management_System SHALL update the corresponding KPI counts immediately

### Requirement 4: Clickable KPI Card Filtering

**User Story:** As a user, I want to click on KPI cards to filter the orders list so that I can quickly focus on specific order statuses or production states.

#### Acceptance Criteria

1. WHEN I click on an order status KPI_Card THEN the Order_Management_System SHALL filter the orders list to show only orders with that status
2. WHEN I click on "Items in Production" KPI_Card THEN the Order_Management_System SHALL display a modal showing all Production_Items currently in production
3. WHEN I click on "Items Not Started" KPI_Card THEN the Order_Management_System SHALL display a modal showing all Production_Items with NOT_STARTED_PRODUCTION status
4. WHEN I click on "Items Completed" KPI_Card THEN the Order_Management_System SHALL display a modal showing all Production_Items with PRODUCT_FINISHED or READY status
5. WHEN a filter is applied THEN the Order_Management_System SHALL provide a clear way to remove the filter and return to the full list

### Requirement 5: Production Items Modal View

**User Story:** As a production manager, I want to see detailed lists of production items when clicking on item KPIs so that I can review specific items and access their related orders.

#### Acceptance Criteria

1. WHEN displaying production items modal THEN the Order_Management_System SHALL show item name, order number, customer name, current status, and verification status
2. WHEN showing item attributes THEN the Order_Management_System SHALL display size, shape, color, and other relevant product attributes
3. WHEN an order number is displayed in the modal THEN the Order_Management_System SHALL make it clickable to navigate to the order details
4. WHEN the modal contains many items THEN the Order_Management_System SHALL provide proper scrolling and table formatting
5. WHEN I close the modal THEN the Order_Management_System SHALL return me to the orders list without losing current filters

### Requirement 6: Expandable Order Rows

**User Story:** As an order reviewer, I want to expand order rows to see production item details so that I can quickly review production status without navigating away from the orders list.

#### Acceptance Criteria

1. WHEN an order contains Production_Items THEN the Order_Management_System SHALL display an expand/collapse chevron icon
2. WHEN I click the expand icon THEN the Order_Management_System SHALL show a nested table with all Production_Items for that order
3. WHEN displaying expanded production items THEN the Order_Management_System SHALL show item name, status, verification status, and product attributes
4. WHEN an order has no Production_Items THEN the Order_Management_System SHALL not display an expand option
5. WHEN multiple rows are expanded THEN the Order_Management_System SHALL maintain the expanded state independently for each row

### Requirement 7: Production Item Status Display

**User Story:** As a production worker, I want to see clear visual indicators for production item statuses so that I can quickly identify item states and verification requirements.

#### Acceptance Criteria

1. WHEN displaying item status THEN the Order_Management_System SHALL use color-coded badges for different production stages
2. WHEN an item is verified THEN the Order_Management_System SHALL show a green "Verified" badge
3. WHEN an item is not verified THEN the Order_Management_System SHALL show a red "Not Verified" badge
4. WHEN displaying status names THEN the Order_Management_System SHALL format them in a user-friendly way (replacing underscores with spaces)
5. WHEN items have product attributes THEN the Order_Management_System SHALL display them in a compact, readable format

### Requirement 8: KPI Data Accuracy and Performance

**User Story:** As a system administrator, I want KPI calculations to be accurate and performant so that users can rely on the metrics for business decisions.

#### Acceptance Criteria

1. WHEN calculating KPIs THEN the Order_Management_System SHALL use efficient database queries to minimize load time
2. WHEN production data changes THEN the Order_Management_System SHALL reflect updates in KPIs within reasonable time
3. WHEN multiple users access the dashboard THEN the Order_Management_System SHALL maintain consistent performance
4. WHEN KPI calculations involve complex queries THEN the Order_Management_System SHALL optimize them to complete within 3 seconds
5. WHEN database errors occur THEN the Order_Management_System SHALL display appropriate error messages instead of incorrect data

### Requirement 9: Visual Design and User Experience

**User Story:** As a user, I want the KPI dashboard to be visually appealing and intuitive so that I can efficiently navigate and understand the information.

#### Acceptance Criteria

1. WHEN displaying KPI cards THEN the Order_Management_System SHALL use consistent styling, icons, and hover effects
2. WHEN KPI cards are clickable THEN the Order_Management_System SHALL provide visual feedback on hover and click
3. WHEN showing expanded rows THEN the Order_Management_System SHALL use proper indentation and visual separation
4. WHEN displaying modals THEN the Order_Management_System SHALL use appropriate sizing and scrolling for different screen sizes
5. WHEN the layout is responsive THEN the Order_Management_System SHALL adapt KPI card arrangement for different screen widths

### Requirement 10: Backward Compatibility and Existing Functionality Preservation

**User Story:** As a system administrator, I want all existing functionality to remain intact when implementing the KPI dashboard so that current workflows and features continue to work without disruption.

#### Acceptance Criteria

1. WHEN implementing KPI features THEN the Order_Management_System SHALL preserve all existing order list functionality including search, sorting, and pagination
2. WHEN adding new API endpoints THEN the Order_Management_System SHALL not modify or break existing API endpoints that other parts of the system depend on
3. WHEN updating the orders page layout THEN the Order_Management_System SHALL maintain all existing buttons, links, and navigation elements
4. WHEN modifying database queries THEN the Order_Management_System SHALL ensure existing order filtering and display logic continues to work
5. WHEN adding new components THEN the Order_Management_System SHALL integrate them without removing or breaking existing UI components
6. WHEN fixing KPI calculations THEN the Order_Management_System SHALL only modify the specific calculation logic, not replace entire working solutions
7. WHEN implementing expandable rows THEN the Order_Management_System SHALL preserve the existing table structure and styling
8. WHEN adding modal views THEN the Order_Management_System SHALL not interfere with existing modal functionality elsewhere in the system

### Requirement 11: Data Integrity and Error Handling

**User Story:** As a business user, I want the KPI system to handle edge cases gracefully so that I always see reliable information or clear error states.

#### Acceptance Criteria

1. WHEN production logs are incomplete THEN the Order_Management_System SHALL handle missing data without breaking KPI calculations
2. WHEN no data exists for a KPI THEN the Order_Management_System SHALL display 0 with appropriate context
3. WHEN API calls fail THEN the Order_Management_System SHALL show error states instead of stale or incorrect data
4. WHEN filtering produces no results THEN the Order_Management_System SHALL display appropriate "no results" messaging
5. WHEN concurrent users modify data THEN the Order_Management_System SHALL maintain data consistency in KPI displays