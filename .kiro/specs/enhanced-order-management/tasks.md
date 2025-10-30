# Implementation Plan

- [x] 1. Update database schema and enums





  - Add `NO_PRIORITY` to OrderPriority enum in schema.zmodel
  - Add `purchaseOrderNumber` field to OrderItem model
  - Add `tieDownLength` field to OrderItem model
  - Create database migration script
  - _Requirements: 2.1, 3.1, 4.1, 6.1_

- [ ] 2. Create PO validation service and utilities
  - [x] 2.1 Implement PO validation service





    - Create `server/utils/poValidationService.ts` with duplicate checking logic
    - Implement `validatePONumber` method for customer-scoped validation
    - Implement `checkDuplicatePO` method with detailed existing usage info
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.2 Write unit tests for PO validation service
    - Test duplicate detection across orders and order items
    - Test customer scoping of validation
    - Test exclusion of archived/cancelled records
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3. Enhance order creation API endpoint
  - [x] 3.1 Update order creation endpoint





    - Modify `server/api/admin/orders/index.post.ts` to handle new fields
    - Add PO validation integration before order creation
    - Implement order-level PO number handling
    - Add proper error handling for PO validation failures
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

  - [x] 3.2 Enhance order item creation logic





    - Update order item creation to handle item-level PO numbers
    - Add tie-down length field processing
    - Implement direct product attribute creation from order item data
    - Add validation for product attribute combinations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 4.3_

  - [ ]* 3.3 Write integration tests for enhanced order creation
    - Test complete order creation flow with new fields
    - Test PO validation integration
    - Test error scenarios and rollback behavior
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 5.1, 5.2_

- [ ] 4. Create product attributes management utilities
  - [x] 4.1 Implement product attribute service





    - Create `server/utils/productAttributeService.ts`
    - Implement `createAttributesFromOrderItem` method
    - Implement `validateProductAttributes` method
    - Add business rule validation for attribute combinations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 4.2 Write unit tests for product attribute service
    - Test attribute validation logic
    - Test business rule enforcement
    - Test attribute creation from order item data
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 5. Update frontend order creation form
  - [x] 5.1 Enhance main order form component





    - Update `pages/admin/orders/add.vue` to include order-level PO number field
    - Add "No Priority" option to priority dropdown
    - Implement real-time PO validation with debouncing
    - Add warning display for duplicate PO numbers
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [x] 5.2 Enhance order item form section





    - Add item-level PO number field to order item rows
    - Add tie-down length field to order item rows
    - Implement expandable product attributes section
    - Add direct attribute input fields for product configuration
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

  - [x] 5.3 Create PO validation warning component





    - Create `components/admin/POValidationWarning.vue`
    - Implement warning display with existing usage details
    - Add confirmation dialog for duplicate PO numbers
    - Integrate with form validation flow
    - _Requirements: 5.3, 5.4_

- [ ] 6. Create product attributes form component
  - [x] 6.1 Implement product attributes form





    - Create `components/admin/ProductAttributesForm.vue`
    - Add collapsible/expandable attribute section
    - Implement all product attribute input fields
    - Add validation for required attribute combinations
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 6.2 Add attribute validation and feedback





    - Implement real-time validation for attribute combinations
    - Add clear error messages and correction suggestions
    - Integrate with parent form validation
    - Add visual indicators for required vs optional fields
    - _Requirements: 1.4, 1.5_

- [ ] 7. Update order display and management pages
  - [x] 7.1 Update order details display





    - Modify order detail pages to show order-level PO numbers
    - Update order item displays to show item-level PO numbers and tie-down length
    - Add "No Priority" display handling in order lists
    - Update priority sorting logic to handle "No Priority"
    - _Requirements: 2.3, 3.3, 4.3, 6.3, 6.4_

  - [x] 7.2 Update order filtering and search





    - Add "No Priority" to priority filter options
    - Update order search to include PO number fields
    - Ensure proper sorting behavior with new priority option
    - _Requirements: 6.4, 6.5_

- [ ] 8. Update order editing functionality
  - [x] 8.1 Enhance order edit form












    - Update `pages/admin/orders/edit/[id].vue` to support new fields
    - Add PO validation for edit scenarios
    - Implement proper handling of existing vs new PO numbers
    - Add tie-down length editing capability
    - _Requirements: 2.4, 3.4, 4.4, 5.1, 5.2_

  - [x] 8.2 Add backward compatibility handling





    - Ensure existing orders display correctly with new fields
    - Handle null/undefined values gracefully
    - Maintain existing workflow compatibility
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Database migration and deployment preparation
  - [x] 9.1 Create and test database migration





    - Generate Prisma migration for schema changes
    - Test migration on development database
    - Verify data integrity after migration
    - Create rollback procedures if needed
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 9.2 Write deployment verification tests
    - Create tests to verify migration success
    - Test backward compatibility with existing data
    - Verify new functionality works with migrated data
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_