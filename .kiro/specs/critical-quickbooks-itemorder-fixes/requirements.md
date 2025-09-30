# Requirements Document

## Introduction

This feature addresses two critical issues affecting the production system: broken QuickBooks webhook integration and incorrect item/itemOrder relationship handling that causes data corruption between orders. The QuickBooks webhook integration stopped working after recent token and connection changes, preventing automatic synchronization of invoices, estimates, and customers. Additionally, the current item/itemOrder relationship logic incorrectly links items across different orders, causing status changes in one order to affect items in other orders and creating data integrity issues.

## Requirements

### Requirement 1: Fix QuickBooks Webhook Integration

**User Story:** As a system administrator, I want QuickBooks webhooks to automatically sync invoices, estimates, and customers when they are created in QuickBooks, so that our application data stays synchronized without manual intervention.

#### Acceptance Criteria

1. WHEN a new invoice is created in QuickBooks THEN the system SHALL automatically create the corresponding invoice record in the application
2. WHEN a new estimate is created in QuickBooks THEN the system SHALL automatically create the corresponding estimate record in the application  
3. WHEN a new customer is created in QuickBooks THEN the system SHALL automatically create the corresponding customer record in the application
4. WHEN the webhook endpoint receives a valid QuickBooks notification THEN the system SHALL authenticate the request using the current token configuration
5. WHEN the webhook processing fails due to authentication THEN the system SHALL log detailed error information for debugging
6. WHEN the webhook integration is restored THEN it SHALL work consistently across staging and production environments

### Requirement 2: Fix Item and ItemOrder Relationship Issues

**User Story:** As a production manager, I want each order's items to be independent and isolated from other orders, so that changing the status of an item in one order does not affect the same item type in other orders.

#### Acceptance Criteria

1. WHEN multiple orders contain the same item type THEN each order SHALL have its own independent itemOrder record
2. WHEN I change the production status of an item in one order THEN the status SHALL NOT change for the same item type in other orders
3. WHEN I sync items for an order THEN the system SHALL maintain the correct itemOrder associations for that specific order
4. WHEN an itemOrder is created THEN it SHALL be uniquely linked to both the specific item and the specific order
5. WHEN displaying order items THEN the system SHALL show only the items and statuses specific to that order
6. WHEN an order shows "no items" after sync THEN the system SHALL correctly restore the itemOrder relationships without affecting other orders
7. WHEN the system processes item attributes THEN it SHALL create separate itemOrder records even for items with the same base type but different attributes

### Requirement 3: Data Integrity and Debugging

**User Story:** As a developer, I want comprehensive logging and data validation for both QuickBooks integration and item relationships, so that I can quickly identify and resolve issues when they occur.

#### Acceptance Criteria

1. WHEN webhook processing occurs THEN the system SHALL log all authentication attempts and their results
2. WHEN itemOrder relationships are created or modified THEN the system SHALL validate the uniqueness constraints
3. WHEN data synchronization fails THEN the system SHALL provide detailed error messages indicating the specific failure point
4. WHEN debugging relationship issues THEN the system SHALL provide clear audit trails showing how itemOrders are linked to orders and items
5. WHEN testing the fixes THEN the system SHALL include automated tests that verify webhook functionality and itemOrder isolation