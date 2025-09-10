# Design Document

## Overview

This design transforms the existing per-user QuickBooks token system into a company-wide automatic token refresh system. The solution provides seamless background token management, eliminating the need for users to manually reconnect every hour while maintaining security and reliability.

## Architecture

### Current System Issues
- Per-user token storage requiring individual connections
- Manual token refresh triggered only during API calls
- No proactive token management
- Poor user experience with frequent reconnections

### New System Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Request  │───▶│ Token Manager    │───▶│ QuickBooks API  │
│                 │    │ (Auto-refresh)   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Background       │
                       │ Scheduler        │
                       │ (Every 30min)    │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ Company-wide     │
                       │ Token Storage    │
                       └──────────────────┘
```

## Components and Interfaces

### 1. QuickBooksTokenManager Class

**Location:** `server/lib/quickbooksTokenManager.ts`

**Purpose:** Centralized token management with automatic refresh capabilities

**Key Methods:**
```typescript
class QuickBooksTokenManager {
  // Get valid access token (refresh if needed)
  static async getValidAccessToken(): Promise<string | null>
  
  // Refresh access token using refresh token
  static async refreshAccessToken(integration: any): Promise<string | null>
  
  // Store initial tokens after OAuth flow
  static async storeTokens(tokens: TokenData): Promise<void>
  
  // Check if QuickBooks is connected
  static async isConnected(): Promise<boolean>
  
  // Get detailed connection status
  static async getConnectionStatus(): Promise<ConnectionStatus>
  
  // Make authenticated API request
  static async makeAPIRequest(endpoint: string, method?: string, body?: any): Promise<any>
  
  // Start background refresh scheduler
  static startTokenRefreshScheduler(): void
  
  // Disconnect integration
  static async disconnect(): Promise<void>
}
```

### 2. Database Schema Updates

**New Model:** `QuickBooksIntegration` (replaces per-user `QuickbooksToken`)

```typescript
model QuickBooksIntegration {
  id                       String    @id @default(cuid())
  companyId                String    @unique  // QuickBooks company ID
  accessToken              String    @db.Text
  refreshToken             String    @db.Text
  accessTokenExpiresAt     DateTime
  refreshTokenExpiresAt    DateTime
  isActive                 Boolean   @default(true)
  connectedAt              DateTime  @default(now())
  disconnectedAt           DateTime?
  lastRefreshedAt          DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}
```

### 3. Background Scheduler

**Location:** `server/plugins/quickbooks-scheduler.ts`

**Purpose:** Proactive token refresh before expiration

**Configuration:**
- Check interval: 30 minutes
- Refresh trigger: 10 minutes before expiry
- Error handling: Log and continue monitoring

### 4. Updated API Endpoints

**Status Endpoint:** `GET /api/qbo/status`
- Returns detailed connection information
- Shows token expiry and refresh status
- Indicates automatic refresh capability

**Disconnect Endpoint:** `POST /api/qbo/disconnect`
- Safely disconnects company-wide integration
- Marks integration as inactive
- Clears stored tokens

**Callback Endpoint:** `GET /api/qbo/callback` (Updated)
- Uses new token manager for storage
- Stores company-wide tokens
- Deactivates any existing integrations

## Data Models

### Token Lifecycle Management

```typescript
interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  realmId: string;
}

interface ConnectionStatus {
  connected: boolean;
  companyId?: string;
  connectedAt?: Date;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  lastRefreshedAt?: Date;
}
```

### Token Expiry Timeline

```
QuickBooks Token Lifecycle:
├── Access Token: 1 hour (3600 seconds)
├── Refresh Token: 101 days (8,726,400 seconds)
├── Auto-refresh trigger: 5-10 minutes before expiry
├── Background check: Every 30 minutes
└── Proactive refresh: 10 minutes before expiry
```

## Error Handling

### Token Refresh Failures

1. **Expired Refresh Token (101 days)**
   - Mark integration as inactive
   - Require user to reconnect via OAuth
   - Clear stored tokens
   - Display clear reconnection message

2. **Network/API Errors**
   - Log error details
   - Retry on next scheduled check
   - Continue with existing token if still valid
   - Alert administrators if persistent

3. **Invalid Token Response**
   - Log malformed response
   - Mark integration as inactive
   - Require reconnection
   - Provide troubleshooting guidance

### Graceful Degradation

1. **Connection Lost**
   - Continue with cached data where possible
   - Queue operations for retry when connection returns
   - Display connection status to users

2. **Scheduler Failures**
   - Log scheduler errors
   - Continue manual refresh on API calls
   - Restart scheduler on next server restart

3. **Database Errors**
   - Log database connection issues
   - Fail gracefully with user-friendly messages
   - Provide manual reconnection option

## Testing Strategy

### Unit Tests

1. **Token Manager Tests**
   ```typescript
   describe('QuickBooksTokenManager', () => {
     test('should refresh token before expiry')
     test('should handle expired refresh token')
     test('should make authenticated API calls')
     test('should store tokens correctly')
   })
   ```

2. **Scheduler Tests**
   ```typescript
   describe('Token Refresh Scheduler', () => {
     test('should start on server initialization')
     test('should check tokens every 30 minutes')
     test('should refresh tokens proactively')
   })
   ```

### Integration Tests

1. **OAuth Flow Testing**
   - Test complete connection process
   - Verify token storage
   - Validate API access after connection

2. **Automatic Refresh Testing**
   - Mock token expiry scenarios
   - Verify automatic refresh triggers
   - Test API continuity during refresh

3. **Error Scenario Testing**
   - Test expired refresh token handling
   - Verify network error recovery
   - Test scheduler failure scenarios

### Manual Testing Checklist

1. **Initial Connection**
   - [ ] Connect via OAuth flow
   - [ ] Verify tokens stored correctly
   - [ ] Test API access immediately after connection

2. **Automatic Refresh**
   - [ ] Wait for token to near expiry
   - [ ] Verify automatic refresh occurs
   - [ ] Confirm API calls continue working

3. **Error Handling**
   - [ ] Test with expired refresh token
   - [ ] Verify graceful error messages
   - [ ] Test reconnection process

4. **User Interface**
   - [ ] Verify status display accuracy
   - [ ] Test manual refresh button
   - [ ] Confirm disconnect functionality

## Security Considerations

### Token Storage Security

1. **Database Encryption**
   - Store tokens in encrypted database fields
   - Use environment-specific encryption keys
   - Implement secure token rotation

2. **Access Control**
   - Restrict token access to authenticated admin users
   - Log all token access attempts
   - Implement role-based permissions

3. **Network Security**
   - Use HTTPS for all QuickBooks API calls
   - Validate SSL certificates
   - Implement request signing where required

### Token Lifecycle Security

1. **Automatic Rotation**
   - Refresh tokens before expiry
   - Invalidate old tokens after refresh
   - Monitor for suspicious token usage

2. **Audit Trail**
   - Log all token refresh events
   - Track connection/disconnection events
   - Monitor API usage patterns

3. **Error Handling Security**
   - Don't expose sensitive token data in logs
   - Sanitize error messages for users
   - Implement secure error reporting

## Performance Considerations

### Optimization Strategies

1. **Token Caching**
   - Cache valid tokens in memory
   - Implement cache invalidation on refresh
   - Use distributed cache for multi-instance deployments

2. **API Rate Limiting**
   - Respect QuickBooks API rate limits
   - Implement exponential backoff for retries
   - Queue requests during high usage

3. **Background Processing**
   - Use efficient scheduler implementation
   - Minimize database queries during checks
   - Implement health monitoring

### Scalability Considerations

1. **Multi-Instance Support**
   - Ensure scheduler runs on single instance
   - Use database locks for token refresh
   - Implement leader election if needed

2. **Load Distribution**
   - Distribute API calls across time
   - Implement request queuing
   - Monitor system resource usage

## Migration Strategy

### Database Migration

1. **Schema Updates**
   ```sql
   -- Create new QuickBooksIntegration table
   -- Migrate data from existing QuickbooksToken table
   -- Update foreign key references
   -- Drop old table after verification
   ```

2. **Data Migration**
   - Identify most recent active token per company
   - Migrate to new company-wide structure
   - Preserve connection history where possible

### Code Migration

1. **Gradual Replacement**
   - Update API endpoints one by one
   - Maintain backward compatibility during transition
   - Test each endpoint after migration

2. **Rollback Plan**
   - Keep old token system available
   - Implement feature flags for new system
   - Plan rollback procedures if issues arise

## Monitoring and Alerting

### Health Monitoring

1. **Token Health Metrics**
   - Track token refresh success rate
   - Monitor token expiry times
   - Alert on refresh failures

2. **API Performance Metrics**
   - Track API response times
   - Monitor error rates
   - Alert on service degradation

3. **System Health Indicators**
   - Scheduler uptime monitoring
   - Database connection health
   - Background job success rates

### Alerting Strategy

1. **Critical Alerts**
   - Refresh token expiry (7 days before)
   - Multiple refresh failures
   - Complete service outage

2. **Warning Alerts**
   - High API error rates
   - Scheduler delays
   - Performance degradation

3. **Informational Alerts**
   - Successful token refreshes
   - New connections established
   - Scheduled maintenance events