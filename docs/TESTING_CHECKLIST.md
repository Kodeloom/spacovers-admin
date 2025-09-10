# Warehouse System Testing Checklist

This document provides a comprehensive testing checklist for the warehouse management system to ensure all features work correctly before production deployment.

## Prerequisites

Before starting testing, ensure:

1. **Database Migration**: Run `npx prisma db push` to ensure the database schema is up to date
2. **Environment Variables**: Set up the following environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_SES_REGION=us-east-1
   FROM_EMAIL=noreply@yourdomain.com
   ```
3. **Test Data**: Create test users, customers, items, and orders for testing

## 1. Barcode Generation Testing

### Test Cases:
- [ ] **Packing Slip Generation**
  - Create an order with production items
  - Generate packing slips
  - Verify barcodes are crisp and scannable
  - Test print functionality (4"x6" labels)

- [ ] **Barcode Format Validation**
  - Verify barcode format: `PREFIX-ORDER_NUMBER-ITEM_ID`
  - Test with different prefixes (C1A, S2B, F3C, P1A, O1A)
  - Ensure barcodes are unique per item

### Expected Results:
- ✅ Barcodes generate without errors
- ✅ Barcodes are high-resolution and scannable
- ✅ Print layout fits 4"x6" labels properly
- ✅ Barcode format follows PREFIX-ORDER-ITEM pattern

## 2. 6-Step Warehouse Workflow Testing

### Test Scenario: Complete Production Flow

**Setup:**
1. Create a test order with 2-3 production items
2. Approve the order (status: APPROVED)
3. Generate packing slips
4. Set up test barcode scanners for each station

**Step 1: Office Confirmation (NOT_STARTED_PRODUCTION → CUTTING)**
- [ ] Scan item barcode at Office station
- [ ] Verify item status changes to CUTTING
- [ ] Verify order status changes to ORDER_PROCESSING
- [ ] Verify production started email is sent (if configured)
- [ ] Verify ItemProcessingLog entry is created

**Step 2: Cutting Station (CUTTING → SEWING)**
- [ ] Scan item barcode at Cutting station
- [ ] Verify item status changes to SEWING
- [ ] Verify previous ItemProcessingLog is closed with endTime
- [ ] Verify new ItemProcessingLog entry is created

**Step 3: Sewing Station (SEWING → FOAM_CUTTING)**
- [ ] Scan item barcode at Sewing station
- [ ] Verify item status changes to FOAM_CUTTING
- [ ] Verify time tracking continues correctly

**Step 4: Foam Cutting Station (FOAM_CUTTING → PACKAGING)**
- [ ] Scan item barcode at Foam Cutting station
- [ ] Verify item status changes to PACKAGING
- [ ] Verify time tracking continues correctly

**Step 5: Packaging Station (PACKAGING → PRODUCT_FINISHED)**
- [ ] Scan item barcode at Packaging station
- [ ] Verify item status changes to PRODUCT_FINISHED
- [ ] Verify time tracking continues correctly

**Step 6: Office Final Scan (PRODUCT_FINISHED → READY)**
- [ ] Scan item barcode at Office station
- [ ] Verify item status changes to READY
- [ ] Verify ItemProcessingLog is completed
- [ ] When all items are READY, verify order status changes to READY_TO_SHIP
- [ ] Verify order ready email is sent (if configured)

### Expected Results:
- ✅ All status transitions work correctly
- ✅ Time tracking records start/end times accurately
- ✅ Order status updates appropriately
- ✅ Email notifications are sent at correct times
- ✅ No errors occur during the complete workflow

## 3. Time Tracking and Activity Logging Testing

### Test Cases:
- [ ] **Active Work Management**
  - Start work on an item
  - Verify user cannot start work on another item (single task focus)
  - Complete work and verify user can start new work
  - Test work completion via API

- [ ] **Time Calculation**
  - Start and complete work on multiple items
  - Verify durationInSeconds is calculated correctly
  - Test time tracking across different stations
  - Verify production timer starts when first item begins

- [ ] **User Attribution**
  - Test with multiple users and scanners
  - Verify work is attributed to correct user based on scanner prefix
  - Test scanner validation (user/station assignment)

### Expected Results:
- ✅ Single task focus prevents concurrent work
- ✅ Time calculations are accurate
- ✅ Work is properly attributed to users
- ✅ Scanner validation works correctly

## 4. Multi-Scanner System Testing

### Test Cases:
- [ ] **Scanner Management**
  - Create barcode scanners with different prefixes
  - Assign scanners to users and stations
  - Test scanner prefix validation

- [ ] **Concurrent Scanning**
  - Test multiple users scanning simultaneously
  - Verify no conflicts occur
  - Test scanner authorization (user must use assigned scanner)
  - Test station validation (scanner must match station)

- [ ] **Scanner Prefix Validation**
  - Test valid prefixes (C1A, S2B, etc.)
  - Test invalid prefixes
  - Test scanner not found scenarios

### Expected Results:
- ✅ Scanner management interface works correctly
- ✅ Concurrent scanning works without conflicts
- ✅ Scanner authorization prevents unauthorized use
- ✅ Proper error messages for invalid scanners

## 5. Email Notification Testing

### Test Cases:
- [ ] **Order Status Emails**
  - Test order approved email
  - Test production started email
  - Test order ready email
  - Test order shipped email

- [ ] **Email Content**
  - Verify email templates render correctly
  - Test both HTML and text versions
  - Verify order details are included correctly
  - Test with different order types and customers

- [ ] **Email Delivery**
  - Test with valid email addresses
  - Test error handling for invalid emails
  - Verify email notification logging
  - Test retry mechanism for failed emails

### Expected Results:
- ✅ All email types send successfully
- ✅ Email content is accurate and well-formatted
- ✅ Email delivery errors are handled gracefully
- ✅ Email notifications are logged properly

## 6. Reporting System Testing

### Test Cases:
- [ ] **Productivity Reports**
  - Generate reports with various date ranges
  - Test filtering by station and employee
  - Verify calculations (time, cost, efficiency)
  - Test CSV export functionality

- [ ] **Lead Time Reports**
  - Generate reports for different order statuses
  - Test filtering by customer and date range
  - Verify lead time calculations
  - Test bottleneck identification

- [ ] **Report Data Accuracy**
  - Compare report data with database records
  - Verify summary statistics are correct
  - Test with edge cases (no data, single record)

### Expected Results:
- ✅ Reports generate without errors
- ✅ Filtering works correctly
- ✅ Calculations are accurate
- ✅ CSV export works properly
- ✅ Report data matches database records

## 7. Error Handling Testing

### Test Cases:
- [ ] **Invalid Barcode Scenarios**
  - Scan invalid barcode format
  - Scan non-existent barcode
  - Scan barcode for wrong order/item

- [ ] **Workflow Violations**
  - Try to scan item at wrong station
  - Try to scan completed item
  - Try to scan pending order item

- [ ] **Concurrent Access**
  - Two users try to work on same item
  - User tries to start new work while having active work
  - Scanner authorization failures

- [ ] **Network and System Errors**
  - Test with network disconnection
  - Test with database connection issues
  - Test API timeout scenarios

### Expected Results:
- ✅ Clear, user-friendly error messages
- ✅ Helpful suggestions provided
- ✅ Errors are logged for debugging
- ✅ System remains stable during errors
- ✅ Retryable operations work correctly

## 8. Performance Testing

### Test Cases:
- [ ] **High Volume Scanning**
  - Test rapid consecutive scans
  - Test with large number of orders/items
  - Monitor response times

- [ ] **Database Performance**
  - Test report generation with large datasets
  - Monitor query performance
  - Test concurrent user scenarios

- [ ] **Memory and Resource Usage**
  - Monitor memory usage during extended use
  - Test for memory leaks
  - Monitor CPU usage during peak operations

### Expected Results:
- ✅ Scanning operations complete within 2 seconds
- ✅ Reports generate within reasonable time
- ✅ System handles concurrent users without degradation
- ✅ No memory leaks or excessive resource usage

## 9. User Interface Testing

### Test Cases:
- [ ] **Kiosk Interface**
  - Test on different screen sizes
  - Verify touch-friendly interface
  - Test keyboard navigation
  - Test auto-focus on barcode input

- [ ] **Admin Interface**
  - Test all CRUD operations
  - Verify responsive design
  - Test form validation
  - Test modal dialogs and notifications

- [ ] **Navigation and Routing**
  - Test role-based routing
  - Verify middleware protection
  - Test deep linking
  - Test browser back/forward buttons

### Expected Results:
- ✅ Interfaces are responsive and user-friendly
- ✅ All interactive elements work correctly
- ✅ Navigation is intuitive and secure
- ✅ Forms validate input properly

## 10. Security Testing

### Test Cases:
- [ ] **Authentication and Authorization**
  - Test login/logout functionality
  - Verify role-based access control
  - Test session management
  - Test unauthorized access attempts

- [ ] **Data Protection**
  - Verify sensitive data is protected
  - Test SQL injection prevention
  - Test XSS protection
  - Verify audit logging works

- [ ] **API Security**
  - Test API authentication
  - Verify input validation
  - Test rate limiting (if implemented)
  - Test CORS configuration

### Expected Results:
- ✅ Authentication works correctly
- ✅ Unauthorized access is prevented
- ✅ Data is properly protected
- ✅ APIs are secure and validated

## Test Environment Setup

### Required Test Data:

1. **Users:**
   - Admin user (Super Admin role)
   - Office user (Office Employee role)
   - Warehouse users (Cutting, Sewing, Foam Cutting, Packaging roles)

2. **Stations:**
   - Office
   - Cutting
   - Sewing
   - Foam Cutting
   - Packaging

3. **Barcode Scanners:**
   - O1A (Office, User 1, Scanner A)
   - C1A (Cutting, User 1, Scanner A)
   - S1A (Sewing, User 1, Scanner A)
   - F1A (Foam Cutting, User 1, Scanner A)
   - P1A (Packaging, User 1, Scanner A)

4. **Test Orders:**
   - Orders with different statuses
   - Orders with multiple production items
   - Orders with different customers

### Test Commands:

```bash
# Run database migration
npx prisma db push

# Generate ZenStack hooks
npm run zenstack:generate

# Start development server
npm run dev

# Run any additional tests
npm test
```

## Sign-off Checklist

Before marking testing complete, ensure:

- [ ] All test cases have been executed
- [ ] All critical bugs have been fixed
- [ ] Performance meets requirements
- [ ] Security vulnerabilities have been addressed
- [ ] Documentation is up to date
- [ ] Production environment is configured
- [ ] Backup and recovery procedures are tested
- [ ] User training materials are prepared

## Notes

- Record any issues found during testing
- Document workarounds for known limitations
- Note any configuration requirements for production
- Identify areas for future improvement