# QuickBooks Auto-Refresh Tests

This directory contains comprehensive tests for the QuickBooks automatic token refresh functionality.

## Test Structure

```
tests/
├── setup.ts                           # Test setup and global mocks
├── unit/
│   ├── quickbooksTokenManager.test.ts  # Unit tests for token manager
│   └── quickbooksScheduler.test.ts     # Unit tests for scheduler and monitoring
├── integration/
│   └── quickbooksOAuth.test.ts         # Integration tests for OAuth flow
└── README.md                          # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage Report
```bash
npm run test:coverage
```

## Test Categories

### Unit Tests

#### Token Manager Tests (`quickbooksTokenManager.test.ts`)
- **getValidAccessToken**: Tests automatic token refresh logic
- **refreshAccessToken**: Tests token refresh functionality and error handling
- **storeTokens**: Tests token storage and validation
- **isConnected**: Tests connection status checking
- **getConnectionStatus**: Tests detailed status reporting
- **makeAPIRequest**: Tests API request wrapper with automatic token management
- **disconnect**: Tests integration disconnection and cleanup

#### Scheduler Tests (`quickbooksScheduler.test.ts`)
- **Scheduler Initialization**: Tests scheduler startup and configuration
- **Scheduler Operation**: Tests periodic token checking and refresh
- **Scheduler Control**: Tests start/stop/restart functionality
- **Monitoring Integration**: Tests health monitoring and alerting
- **Error Handling**: Tests error recovery and resilience

### Integration Tests

#### OAuth Flow Tests (`quickbooksOAuth.test.ts`)
- **OAuth Callback Flow**: Tests complete OAuth authorization process
- **Token Storage and Retrieval**: Tests end-to-end token management
- **API Access After Connection**: Tests API functionality after successful connection
- **Connection Status**: Tests status endpoint functionality

## Test Requirements

The tests verify the following requirements from the specification:

### Requirement 1.2 & 1.3 (Automatic Token Refresh)
- ✅ Tokens are automatically refreshed before expiry
- ✅ Refresh failures are handled gracefully
- ✅ Invalid tokens trigger appropriate error responses

### Requirement 2.1 & 2.2 (API Request Management)
- ✅ API requests automatically ensure valid tokens
- ✅ Token refresh occurs transparently during API calls
- ✅ API failures are handled with proper error messages

### Requirement 4.1 & 4.2 (Company-wide Token Storage)
- ✅ Tokens are stored at company level, not per user
- ✅ Multiple users share the same company connection
- ✅ Token storage deactivates previous integrations

### Requirement 5.1, 5.2 & 5.3 (Background Scheduler)
- ✅ Scheduler initializes on server startup
- ✅ Scheduler runs every 30 minutes
- ✅ Tokens are proactively refreshed 10 minutes before expiry

## Mock Strategy

The tests use comprehensive mocking to isolate functionality:

- **intuit-oauth**: Mocked OAuth client for token operations
- **Database**: Mocked Prisma client for data operations
- **Authentication**: Mocked auth service for session management
- **Logging**: Mocked logging service to capture events
- **Monitoring**: Mocked monitoring service for health checks

## Test Data

Tests use realistic test data that mirrors production scenarios:

- **Valid Tokens**: Tokens with 30+ minutes remaining
- **Expiring Tokens**: Tokens with 2-5 minutes remaining (trigger refresh)
- **Expired Refresh Tokens**: Tokens past 101-day expiry (require reconnection)
- **Invalid Responses**: Malformed API responses for error testing

## Coverage Goals

The tests aim for comprehensive coverage of:

- ✅ **Happy Path**: Normal operation with valid tokens
- ✅ **Error Scenarios**: Network failures, expired tokens, invalid responses
- ✅ **Edge Cases**: Boundary conditions, race conditions, startup/shutdown
- ✅ **Integration Points**: OAuth flow, API calls, database operations

## Running Tests in CI/CD

For continuous integration, use:

```bash
# Run tests with coverage and exit codes
npm test

# Generate coverage report for CI
npm run test:coverage
```

## Debugging Tests

To debug failing tests:

1. **Use watch mode**: `npm run test:watch`
2. **Focus on specific test**: Add `.only` to the test case
3. **Check mock calls**: Use `expect(mockFunction).toHaveBeenCalledWith(...)`
4. **Enable console output**: Remove console mocks in test setup

## Test Environment

Tests run in a controlled environment with:

- **Fixed Time**: `2024-01-01T12:00:00Z` for consistent date calculations
- **Mocked External Services**: No real API calls or database connections
- **Isolated State**: Each test starts with clean mocks and state
- **Fast Execution**: No real timers or network delays

## Adding New Tests

When adding new functionality:

1. **Add unit tests** for individual functions/methods
2. **Add integration tests** for end-to-end workflows
3. **Mock external dependencies** to maintain test isolation
4. **Test error scenarios** in addition to happy paths
5. **Update this README** with new test descriptions

## Troubleshooting

### Common Issues

**Tests timeout**: Check for unmocked async operations or infinite loops
**Mock not working**: Ensure mock is defined before importing the module
**Database errors**: Verify Prisma client is properly mocked
**Timer issues**: Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()`

### Getting Help

If tests are failing:

1. Check the test output for specific error messages
2. Verify all mocks are properly configured
3. Ensure test environment variables are set
4. Review the test setup in `tests/setup.ts`