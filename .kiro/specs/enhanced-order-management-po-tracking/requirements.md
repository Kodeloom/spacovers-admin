# Requirements Document

## Introduction

This document outlines the requirements for enhancing the order management system with Purchase Order (PO) tracking, additional product attributes, improved print queue functionality, and priority system enhancements. The system will add PO # tracking at both order and item levels, implement duplicate PO validation, enhance the print queue to be shared across users with print status tracking, and expand the priority options.

## Requirements

### Requirement 1: Product Attributes Enhancement

**User Story:** As a warehouse worker, I want additional product attributes including "Tie Down Length" and "PO #" so that I can have complete product specifications for manufacturing.

#### Acceptance Criteria

1. WHEN a ProductAttribute record is created THEN it SHALL include a "Tie Down Length" field
2. WHEN a ProductAttribute record is created THEN it SHALL include a "PO #" field  
3. WHEN product attributes are displayed THEN both new fields SHALL be available for input
4. WHEN product attributes are saved THEN the new fields SHALL be persisted to the database
5. WHEN packing slips are generated THEN "Tie Down Length" SHALL be included in the output
6. WHEN packing slips are generated THEN "PO #" SHALL NOT be included in the packing slip output

### Requirement 2: Order-Level PO # Tracking

**User Story:** As an office employee, I want to assign a PO # to entire orders so that I can track purchase orders at the order level for better organization.

#### Acceptance Criteria

1. WHEN creating a new order THEN the system SHALL provide a "PO #" field at the order level
2. WHEN editing an existing order THEN the "PO #" field SHALL be editable
3. WHEN viewing order details THEN the order-level "PO #" SHALL be prominently displayed
4. WHEN orders are listed THEN the "PO #" SHALL be visible in order summaries
5. WHEN the order "PO #" is saved THEN it SHALL be persisted to the database

### Requirement 3: PO # Duplicate Validation at Order Level

**User Story:** As an office employee, I want to be warned when creating orders with duplicate PO #s within the same customer so that I can avoid duplicate purchase orders.

#### Acceptance Criteria

1. WHEN creating a new order with a PO # THEN the system SHALL check for existing orders with the same PO # for the same customer
2. WHEN a duplicate PO # is found at order level THEN the system SHALL display a warning message
3. WHEN a duplicate PO # warning is shown THEN it SHALL include a link to the existing order with that PO #
4. WHEN the duplicate warning is displayed THEN the user SHALL be able to proceed with creation or cancel
5. WHEN checking for duplicates THEN the system SHALL only compare within the same customer's orders

### Requirement 4: PO # Duplicate Validation at Item Level

**User Story:** As a warehouse worker, I want to be warned when entering PO #s in product attributes that already exist for the same customer so that I can verify if I'm adding duplicate products.

#### Acceptance Criteria

1. WHEN entering a PO # in ProductAttribute THEN the system SHALL check for existing PO #s in other ProductAttributes for the same customer
2. WHEN a duplicate PO # is found at item level THEN the system SHALL display a warning message
3. WHEN a duplicate PO # warning is shown THEN it SHALL list which products already use that PO #
4. WHEN the duplicate warning is displayed THEN the user SHALL be able to proceed with saving or cancel
5. WHEN checking for duplicates THEN the system SHALL only compare within the same customer's items

### Requirement 5: Shared Print Queue System

**User Story:** As an office employee, I want a shared print queue that all users can access so that any employee can print approved orders without needing to access individual orders.

#### Acceptance Criteria

1. WHEN an order is approved THEN all packing slips in the order SHALL be automatically added to the shared print queue
2. WHEN users access the print queue THEN they SHALL see the same queue regardless of which computer they use
3. WHEN packing slips are added to the queue THEN they SHALL be marked with a "not printed" status
4. WHEN viewing the print queue THEN users SHALL see the oldest items first (FIFO ordering)
5. WHEN the print queue is accessed THEN it SHALL be shared across all users, not per-computer

### Requirement 6: Print Queue Batch Processing

**User Story:** As an office employee, I want to print packing slips in batches of 4 so that I can efficiently use standard paper sheets.

#### Acceptance Criteria

1. WHEN printing from the queue THEN the system SHALL only allow printing in batches of exactly 4 items
2. WHEN there are fewer than 4 items in the queue THEN the system SHALL display a warning message
3. WHEN the print batch is prepared THEN it SHALL show the 4 oldest items in the queue
4. WHEN items are selected for printing THEN they SHALL be sorted by the oldest added date first
5. WHEN there are exactly 4 or more items THEN printing SHALL be allowed without warnings

### Requirement 7: Print Status Confirmation

**User Story:** As an office employee, I want to confirm whether packing slips were successfully printed so that the system can track print status accurately.

#### Acceptance Criteria

1. WHEN the print dialog is triggered THEN the system SHALL NOT immediately mark items as printed
2. WHEN the print dialog is closed or print is clicked THEN a confirmation modal SHALL appear
3. WHEN the confirmation modal appears THEN it SHALL ask "Did the slips print successfully?"
4. WHEN the user confirms successful printing THEN the items SHALL be marked as printed and removed from the queue
5. WHEN the user indicates printing failed THEN the items SHALL remain in the queue with "not printed" status

### Requirement 8: Print Queue Database Tracking

**User Story:** As a system administrator, I want print queue items stored in the database so that print status is persistent and shared across all users.

#### Acceptance Criteria

1. WHEN packing slips are added to the queue THEN they SHALL be stored in a database table
2. WHEN items are marked as printed THEN their status SHALL be updated in the database
3. WHEN users access the print queue THEN data SHALL be retrieved from the database, not local storage
4. WHEN the system starts up THEN the print queue SHALL be populated from the database
5. WHEN items are removed from the queue THEN they SHALL be deleted from the database

### Requirement 9: Priority System Enhancement

**User Story:** As an office employee, I want a "No priority" option in the priority list so that I can indicate orders that don't require special priority handling.

#### Acceptance Criteria

1. WHEN creating or editing orders THEN "No priority" SHALL be available as a priority option
2. WHEN "No priority" is selected THEN it SHALL be saved and displayed consistently
3. WHEN orders are sorted by priority THEN "No priority" SHALL have appropriate sorting behavior
4. WHEN priority filters are applied THEN "No priority" SHALL be included in filter options
5. WHEN the priority enum is updated THEN existing code SHALL continue to function with the new option