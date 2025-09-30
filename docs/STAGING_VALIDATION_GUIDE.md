# Staging Environment Validation Guide

This guide provides comprehensive instructions for validating the critical QuickBooks and OrderItem fixes in the staging environment.

## Overview

The validation process covers:
1. **QuickBooks Webhook Integration** - Testing real webhook notifications
2. **OrderItem Isolation** - Validating that orders maintain independent item relationships
3. **Data Integrity** - Ensuring status changes don't cross-contaminate between orders

## Prerequisites

Before running validation tests, ensure:

- [ ] Staging environment is deployed with the latest fixes
- [ ] Database migrations have been applied
- [ ] QuickBooks integration is configured (optional for some tests)
- [ ] Environment variables are properly set
- [ ] All dependencies are installed (`npm install`)

## Validation Methods

### Method 1: Automated Validation Script (Recommended)

Run the comprehensive validation script:

```bash
npm run validate:staging
```

This script will:
- ✅ Test database connectivity
- ✅ Validate QuickBooks integration setup
- ✅ Create test orders with same item types
- ✅ Verify OrderItem isolation
- ✅ Test status change isolation
- ✅ Validate compound unique constraints
- ✅ Check data integrity functions
- ✅ Clean up test data automatically

### Method 2: Individual Test Suites

Run specific test suites:

```bash
# Run staging validation tests
npm run test:staging

# Run webhook integration tests
npm run test:webhook

# Run all tests
npm test
```

### Method 3: Manual Validation

If automated tests are not available, follow these manual steps:

#### 3.1 QuickBooks Webhook Validation

1. **Check QuickBooks Connection Status**
   ```bash
   # Check if QuickBooks is connected
   curl -X GET https://your-staging-domain.com/api/qbo/status
   ```

2. **Test Webhook Endpoint**
   ```bash
   # Test webhook endpoint availability
   curl -X POST https://your-staging-domain.com/api/qbo/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   ```

3. **Simulate Webhook Notification**
   - Use QuickBooks Developer Dashboard to send test webhooks
   - Monitor application logs for processing results
   - Verify entities are created/updated correctly

#### 3.2 OrderItem Isolation Validation

1. **Create Test Data**
   - Create a test customer
   - Create a test item
   - Create multiple orders for the same customer

2. **Add Same Item to Multiple Orders**
   - Add the same item type to each order
   - Verify each order has its own OrderItem record
   - Check that OrderItem IDs are different

3. **Test Status Isolation**
   - Change the status of an item in Order 1
   - Verify the status change doesn't affect Order 2
   - Repeat for different status changes

4. **Test Query Scoping**
   - Query items for Order 1: should only return Order 1's items
   - Query items for Order 2: should only return Order 2's items
   - Verify no cross-contamination in results

## Expected Results

### ✅ Successful Validation

When validation passes, you should see:

```
✅ Database Connection: Successfully connected to database
✅ QuickBooks Modules: QuickBooks integration modules loaded successfully
✅ QuickBooks Connection: Connected to QuickBooks company: [COMPANY_ID]
✅ OrderItem Independence: Each order has independent OrderItem records
✅ Status Isolation: Status changes properly isolated between orders
✅ Query Scoping: OrderItem queries properly scoped by orderId
✅ Compound Unique Constraint: Same QuickBooks line ID allowed across different orders
✅ Duplicate Prevention: Duplicate QuickBooks line ID within same order correctly prevented
✅ Data Integrity: All test orders pass integrity validation
✅ Audit Logging: OrderItem sync operation logging working correctly

📈 Summary: 10 passed, 0 failed, 0 warnings, 0 skipped
✅ Staging validation PASSED. All critical fixes are working correctly.
```

### ❌ Failed Validation

If validation fails, you'll see specific error messages:

```
❌ Status Isolation: Status changes affected other orders
❌ Query Scoping: Order 2 has incorrect item scoping
❌ Data Integrity: Order TEST-ORDER-001 has integrity issues: shares QuickBooks line ID with other orders

📈 Summary: 7 passed, 3 failed, 0 warnings, 0 skipped
❌ Staging validation FAILED. Please review the failed tests above.
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Errors
```
❌ Database Connection: Database connection failed
```
**Solution:**
- Check database credentials in `.env`
- Verify database server is running
- Test connection manually: `npx prisma db pull`

#### 2. QuickBooks Not Connected
```
⚠️ QuickBooks Connection: QuickBooks not connected - webhook tests will be limited
```
**Solution:**
- Connect QuickBooks in the admin panel
- Verify QBO environment variables are set
- Check QuickBooks app permissions

#### 3. OrderItem Isolation Failures
```
❌ Status Isolation: Status changes affected other orders
```
**Solution:**
- Check if compound unique constraint is properly applied
- Verify OrderItem queries include `orderId` in WHERE clauses
- Review recent changes to OrderItem update logic

#### 4. Webhook Processing Errors
```
❌ Webhook Processing: Webhook signature verification failed
```
**Solution:**
- Verify `QBO_WEBHOOK_VERIFIER_TOKEN` environment variable
- Check webhook endpoint URL configuration in QuickBooks
- Review webhook processing logs

### Debug Mode

For detailed debugging, set environment variables:

```bash
export DEBUG=true
export LOG_LEVEL=debug
npm run validate:staging
```

## Manual Testing Scenarios

### Scenario 1: Multiple Orders with Same Items

1. Create Customer "Test Customer A"
2. Create Item "Test Item X"
3. Create Order 1 with Item X (quantity: 2)
4. Create Order 2 with Item X (quantity: 3)
5. Update Order 1's Item X status to "CUTTING"
6. Verify Order 2's Item X status remains "NOT_STARTED_PRODUCTION"

### Scenario 2: QuickBooks Webhook Processing

1. Create a new customer in QuickBooks
2. Verify webhook notification is received
3. Check that customer is created in the application
4. Update customer in QuickBooks
5. Verify webhook processes the update correctly

### Scenario 3: Compound Unique Constraint

1. Create two orders with the same item
2. Set both OrderItems to have the same QuickBooks line ID
3. Verify this is allowed (different orders)
4. Try to create another OrderItem in Order 1 with the same line ID
5. Verify this is prevented (same order)

## Performance Validation

### Load Testing

Test with multiple concurrent operations:

```bash
# Create multiple orders simultaneously
for i in {1..10}; do
  curl -X POST https://your-staging-domain.com/api/orders \
    -H "Content-Type: application/json" \
    -d "{\"customerId\": \"test-customer\", \"items\": [{\"itemId\": \"test-item\", \"quantity\": $i}]}" &
done
wait
```

### Database Performance

Monitor query performance:

```sql
-- Check for slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%OrderItem%' 
ORDER BY mean_exec_time DESC;
```

## Rollback Plan

If validation fails and issues cannot be resolved quickly:

1. **Immediate Rollback**
   ```bash
   # Rollback to previous deployment
   git checkout [PREVIOUS_COMMIT]
   npm run build
   # Deploy previous version
   ```

2. **Database Rollback**
   ```bash
   # Rollback database migrations if needed
   npx prisma migrate reset
   npx prisma db push
   ```

3. **QuickBooks Reconnection**
   - May need to reconnect QuickBooks after rollback
   - Verify webhook endpoint URLs are correct

## Success Criteria

Validation is considered successful when:

- [ ] All automated tests pass
- [ ] QuickBooks webhook integration works correctly
- [ ] OrderItem isolation is maintained across all test scenarios
- [ ] Status changes don't affect other orders
- [ ] Database queries are properly scoped
- [ ] Compound unique constraints work as expected
- [ ] No data integrity issues are detected
- [ ] Performance is acceptable under load

## Next Steps

After successful validation:

1. **Production Deployment**
   - Follow production deployment checklist
   - Apply same validation process in production
   - Monitor for any issues

2. **Monitoring Setup**
   - Set up alerts for webhook failures
   - Monitor OrderItem relationship integrity
   - Track performance metrics

3. **Documentation Update**
   - Update deployment documentation
   - Record any lessons learned
   - Update troubleshooting guides

## Support

If you encounter issues during validation:

1. Check the troubleshooting section above
2. Review application logs for detailed error messages
3. Run individual test suites to isolate the problem
4. Contact the development team with specific error details

---

**Requirements Satisfied:**
- 1.6: QuickBooks webhook integration testing
- 2.1: OrderItem isolation validation
- 2.2: Status change isolation verification
- 2.5: Cross-order independence testing