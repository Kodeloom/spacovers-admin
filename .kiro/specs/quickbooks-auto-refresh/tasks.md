# Implementation Plan

- [x] 1. Update database schema for company-wide token storage






  - Create new QuickBooksIntegration model with company-level tokens
  - Add fields for automatic refresh tracking (lastRefreshedAt, disconnectedAt)
  - Generate and run database migration
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 2. Create centralized QuickBooks token manager



  - [x] 2.1 Implement QuickBooksTokenManager class with core token operations


    - Write getValidAccessToken method with automatic refresh logic
    - Implement refreshAccessToken method with error handling
    - Create storeTokens method for OAuth callback integration
    - Add isConnected and getConnectionStatus methods
    - _Requirements: 1.2, 1.3, 2.1, 3.2_

  - [x] 2.2 Add API request wrapper with automatic token management

    - Implement makeAPIRequest method that ensures valid tokens
    - Add proper error handling for token refresh failures
    - Include retry logic for network errors
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.3 Implement disconnect and cleanup functionality

    - Create disconnect method to safely deactivate integration
    - Add proper cleanup of stored tokens
    - Implement graceful error handling
    - _Requirements: 4.3_

- [x] 3. Create background token refresh scheduler




  - [x] 3.1 Implement server plugin for scheduler initialization


    - Create server plugin that starts on application boot
    - Implement startTokenRefreshScheduler method
    - Add proper error handling and logging
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Add proactive token refresh logic


    - Implement scheduled check every 30 minutes
    - Add logic to refresh tokens 10 minutes before expiry
    - Include comprehensive error handling and logging
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 4. Update OAuth callback endpoint









  - Modify existing callback to use new token manager
  - Update token storage to use company-wide approach
  - Add proper error handling and user feedback
  - Ensure backward compatibility during transition
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 5. Create enhanced status and management endpoints









  - [x] 5.1 Update status endpoint with detailed connection information


    - Modify existing status endpoint to show token health
    - Add token expiry times and refresh status
    - Include automatic refresh indicators
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 5.2 Create disconnect endpoint for company-wide disconnection


    - Implement POST endpoint for safe disconnection
    - Add proper authentication and authorization
    - Include comprehensive error handling
    - _Requirements: 4.3_

- [x] 6. Update existing QuickBooks API endpoints






  - [x] 6.1 Migrate existing QBO client to use new token manager


    - Update getQboClient function to use centralized token management
    - Replace per-user token logic with company-wide approach
    - Maintain existing API compatibility
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 6.2 Update sync endpoints to use new token system


    - Modify existing sync endpoints to use token manager
    - Ensure seamless operation with new token system
    - Add proper error handling for token issues
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 7. Enhance settings page UI








  - [x] 7.1 Update QuickBooks section with detailed status display


    - Show connection status with token health information
    - Display token expiry times and last refresh date
    - Add automatic refresh indicator
    - Include company ID and connection details
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 7.2 Add enhanced connection management controls


    - Update connect button with loading states
    - Add refresh status button for manual updates
    - Implement disconnect button with confirmation
    - Include proper error handling and user feedback
    - _Requirements: 3.5, 4.3_

- [x] 8. Implement comprehensive error handling





  - Add graceful handling of expired refresh tokens
  - Implement proper error messages for connection issues
  - Create fallback mechanisms for scheduler failures
  - Add user-friendly error reporting
  - _Requirements: 1.5, 2.5, 3.5_

- [x] 9. Add logging and monitoring








  - Implement comprehensive logging for token refresh events
  - Add monitoring for scheduler health and performance
  - Create audit trail for connection/disconnection events
  - Include error tracking and alerting capabilities
  - _Requirements: 3.2, 5.4, 5.5_
-

- [x] 10. Create data migration script







  - [x] 10.1 Implement migration from per-user to company-wide tokens


    - Create script to identify active company tokens
    - Migrate most recent valid token per company
    - Preserve connection history where possible
    - _Requirements: 4.1, 4.2_

  - [x] 10.2 Add cleanup of old token system

    - Remove obsolete per-user token records after migration
    - Update any remaining references to old system
    - Ensure clean transition to new system
    - _Requirements: 6.3, 6.4_
-


- [x] 11. Write comprehensive tests






  - [x] 11.1 Create unit tests for token manager


    - Test automatic token refresh logic
    - Verify error handling for various scenarios
    - Test API request wrapper functionality
    - _Requirements: 1.2, 1.3, 2.1, 2.2_

  - [x] 11.2 Add integration tests for OAuth flow


    - Test complete connection process
    - Verify token storage and retrieval
    - Test API access after connection
    - _Requirements: 1.1, 4.1, 4.2_

  - [x] 11.3 Create scheduler and background process tests


    - Test scheduler initialization and operation
    - Verify proactive token refresh functionality
    - Test error handling and recovery
    - _Requirements: 5.1, 5.2, 5.3_