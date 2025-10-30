# Implementation Plan

- [x] 1. Enhance Backend Metrics API





  - Fix and enhance the orders metrics API to provide accurate KPI calculations
  - Add new KPI metrics for approved orders and fix production item calculations
  - Ensure proper filtering for production items only (isProduct: true)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 10.2, 10.6_

- [x] 1.1 Update orders metrics API endpoint







  - Modify `server/api/metrics/orders.get.ts` to add new KPI calculations
  - Add ordersPending, ordersApproved, ordersInProgress, ordersReadyToShip, ordersCompleted metrics
  - Fix itemsInProduction calculation to exclude NOT_STARTED_PRODUCTION, PRODUCT_FINISHED, READY
  - Remove totalOrders metric as per requirements
  - Ensure all production item calculations only count items with isProduct: true
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.2 Update MetricsService for new KPI calculations







  - Enhance `utils/metricsService.ts` to include new order status KPI methods
  - Fix production item counting logic to properly filter by isProduct: true
  - Add proper error handling and fallback values for new metrics
  - Ensure lead time calculation uses last 60 days and tracks from CUTTING to completion
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 1.3 Add unit tests for new KPI calculations
  - Create tests for new order status KPI calculations
  - Test production item filtering logic (isProduct: true only)
  - Test lead time calculation with 60-day window
  - Test error handling and fallback values
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
-

- [x] 2. Create Production Items API




  - Create new API endpoint to fetch production items by status for modal displays
  - Support filtering by in_production, not_started, completed status types
  - Include related order, customer, and product attribute data
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2.1 Create production items API endpoint







  - Create `server/api/admin/order-items/production.get.ts`
  - Implement filtering by status: in_production (CUTTING, SEWING, FOAM_CUTTING, PACKAGING), not_started (NOT_STARTED_PRODUCTION), completed (PRODUCT_FINISHED, READY)
  - Include related data: order info, customer name, item details, product attributes
  - Only return items with isProduct: true
  - Add proper authentication and error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 2.2 Add integration tests for production items API
  - Test API response structure and data accuracy
  - Test filtering by different status types
  - Test authentication and error handling
  - Test data relationships and includes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
-

- [x] 3. Update Orders Page KPI Cards




  - Replace existing KPI cards with new interactive design
  - Add click handlers for order status filtering and production item modals
  - Maintain existing layout and styling while adding new functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_

- [x] 3.1 Replace KPI cards section in orders page







  - Update `pages/admin/orders/index.vue` KPI cards section
  - Remove "Total Orders" KPI card
  - Add new order status KPI cards: Orders Pending, Orders Approved, Orders In Progress, Orders Ready To Ship, Orders Completed
  - Update production item KPI cards: Items in Production, Items Not Started, Items Completed
  - Keep Average Lead Time KPI (non-clickable)
  - Add proper icons and hover effects for clickable cards
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3.2 Add KPI card click handlers







  - Implement click handlers for order status KPI cards to filter the orders list
  - Add click handlers for production item KPI cards to open modals
  - Update reactive state management for filters and modal visibility
  - Ensure proper loading states during KPI interactions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5_


- [x] 3.3 Update metrics fetching logic











  - Modify the fetchMetrics function to handle new KPI structure
  - Update metrics reactive state to include new KPI values
  - Ensure proper error handling and fallback values
  - Maintain existing time filter functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.4_
-

- [x] 4. Implement Expandable Order Rows




  - Add expandable functionality to order table rows
  - Show production item details when rows are expanded
  - Only show expand option for orders containing production items
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.7_

- [x] 4.1 Add row expansion state management







  - Add reactive state for tracking expanded rows
  - Implement toggle functions for row expansion/collapse
  - Add chevron icons that show/hide based on production item presence
  - Ensure independent expansion state for each order row
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
-

- [x] 4.2 Enhance orders query to include production items






  - Update the orders query to include order items with production details
  - Include product attributes, verification status, and item status
  - Filter to only include items with isProduct: true in expanded view
  - Maintain existing query performance and pagination
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.4_

- [x] 4.3 Create expandable row template







  - Add expandable row template to the orders table
  - Create nested table for production item details
  - Show item name, status, verification status, and product attributes
  - Add proper styling and visual separation for expanded content
  - Use color-coded status badges for item statuses
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 9.3, 9.4_

- [x] 5. Create Production Items Modal





  - Implement full-screen modal for detailed production item listings
  - Support different modal types for in_production, not_started, and completed items
  - Include sortable table with order navigation capabilities
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.1 Add modal state management


  - Add reactive state for modal visibility, title, and data
  - Implement functions to open modal with different production item types
  - Add proper loading and error states for modal data fetching
  - Ensure modal can be closed via button or overlay click
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.2 Create modal template and styling

  - Add full-screen modal template to orders page
  - Create sortable table for production items display
  - Include columns: Order, Customer, Item, Status, Verified, Attributes
  - Add proper modal styling with scrollable content
  - Implement responsive design for different screen sizes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5.3 Implement modal data fetching

  - Add API calls to fetch production items by status type
  - Implement proper error handling and retry mechanisms
  - Add loading states during data fetching
  - Ensure data is properly formatted for display
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.4 Add order navigation from modal

  - Make order numbers clickable in the modal table
  - Implement navigation to order details page
  - Ensure proper route handling and state management
  - Close modal when navigating to order details
  - _Requirements: 5.2, 5.5_

- [x] 6. Add Status Badge Helper Functions




  - Create helper functions for consistent status badge styling
  - Support both order status and item status badges
  - Ensure consistent color coding across all components
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6.1 Create item status badge helper function


  - Add getItemStatusBadgeClass function to orders page
  - Map item statuses to appropriate CSS classes and colors
  - Ensure consistent styling with existing order status badges
  - Support all production item statuses: NOT_STARTED_PRODUCTION, CUTTING, SEWING, FOAM_CUTTING, PACKAGING, PRODUCT_FINISHED, READY
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6.2 Update status display formatting


  - Add helper function to format status names (replace underscores with spaces)
  - Ensure consistent status name display across all components
  - Apply formatting to both expandable rows and modal displays
  - _Requirements: 7.4, 9.4_

- [-] 7. Testing and Validation



  - Verify all KPI calculations are accurate
  - Test all interactive features and error handling
  - Ensure backward compatibility with existing functionality
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [x] 7.1 Test KPI accuracy and interactions


  - Verify all KPI calculations match expected values
  - Test KPI card click interactions (filtering and modal opening)
  - Verify lead time calculation uses correct 60-day window
  - Test production item filtering (isProduct: true only)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.2 Test expandable rows functionality






  - Verify row expansion only shows for orders with production items
  - Test expansion/collapse toggle functionality
  - Verify production item details display correctly
  - Test status badges and verification indicators
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7.3 Test production items modal
  - Verify modal opens with correct data for each KPI type
  - Test modal table sorting and navigation
  - Test order number links and navigation
  - Verify modal close functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7.4 Verify backward compatibility
  - Test all existing order list functionality (search, sort, pagination)
  - Verify existing filters and buttons still work
  - Test archive and sync functionality
  - Ensure no existing API endpoints are broken
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ]* 7.5 Performance testing and optimization
  - Test KPI loading performance with large datasets
  - Verify modal loading times are acceptable
  - Test responsive design on different screen sizes
  - Optimize database queries if needed
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.5_