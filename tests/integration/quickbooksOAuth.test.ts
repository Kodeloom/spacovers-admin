import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager'

// Mock dependencies
vi.mock('intuit-oauth', () => {
  const mockOAuthClient = {
    createToken: vi.fn(),
    setToken: vi.fn(),
    refresh: vi.fn(),
    makeApiCall: vi.fn(),
    environment: {
      sandbox: 'https://sandbox-quickbooks.api.intuit.com',
      production: 'https://quickbooks.api.intuit.com'
    }
  }
  
  return {
    default: vi.fn(() => mockOAuthClient)
  }
})

vi.mock('~/server/lib/db', () => ({
  getEnhancedPrismaClient: vi.fn()
}))

vi.mock('~/server/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}))

vi.mock('~/server/lib/quickbooksLogger', () => ({
  QuickBooksLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    logTokenRefresh: vi.fn(),
    logConnectionEvent: vi.fn(),
    logAPIRequest: vi.fn(),
    logSchedulerEvent: vi.fn(),
    logPerformanceMetrics: vi.fn(),
    getSchedulerHealthStats: vi.fn(() => ({
      isHealthy: true,
      totalChecks: 10,
      successfulChecks: 10,
      lastCheckTime: new Date(),
      tokensRefreshed: 2
    })),
    getErrorStats: vi.fn(() => ({
      totalErrors: 0,
      criticalErrors: 0
    }))
  }
}))

vi.mock('~/server/lib/quickbooksMonitor', () => ({
  QuickBooksMonitor: {
    getInstance: vi.fn(() => ({
      getMonitoringStats: vi.fn(() => ({
        uptime: 3600000,
        lastHealthCheck: new Date()
      }))
    }))
  }
}))

describe('QuickBooks OAuth Integration', () => {
  let mockPrisma: any
  let mockOAuthClient: any
  let mockAuth: any

  beforeEach(async () => {
    await setup({
      // Configure test environment
    })

    vi.clearAllMocks()
    
    // Setup mock Prisma client
    mockPrisma = {
      quickBooksIntegration: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      quickbooksToken: {
        upsert: vi.fn()
      }
    }
    
    // Setup mock OAuth client
    const OAuthClient = vi.mocked(await import('intuit-oauth')).default
    mockOAuthClient = new OAuthClient()
    
    // Setup mock auth
    const { auth } = await import('~/server/lib/auth')
    mockAuth = auth
    
    // Mock getEnhancedPrismaClient
    const { getEnhancedPrismaClient } = await import('~/server/lib/db')
    vi.mocked(getEnhancedPrismaClient).mockResolvedValue(mockPrisma)
  })

  afterEach(() => {
    // Stop any running schedulers
    QuickBooksTokenManager.stopTokenRefreshScheduler()
  })

  describe('OAuth Callback Flow', () => {
    it('should complete OAuth callback successfully', async () => {
      // Mock authenticated user session
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      })

      // Mock successful OAuth token creation
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        token_type: 'Bearer'
      }

      const mockAuthResponse = {
        getJson: () => mockTokenResponse,
        token: {
          realmId: 'company-123',
          iat: Math.floor(Date.now() / 1000)
        }
      }

      mockOAuthClient.createToken.mockResolvedValue(mockAuthResponse)
      mockPrisma.quickBooksIntegration.updateMany.mockResolvedValue({})
      mockPrisma.quickBooksIntegration.create.mockResolvedValue({})
      mockPrisma.quickbooksToken.upsert.mockResolvedValue({})

      // Simulate OAuth callback with authorization code
      const callbackUrl = '/api/qbo/callback?code=auth-code-123&realmId=company-123&state=test-state'
      
      const response = await $fetch(callbackUrl, {
        method: 'GET',
        headers: {
          cookie: 'session=mock-session'
        }
      })

      // Should redirect to settings page with success
      expect(response).toContain('settings?qbo=success')
      
      // Verify token storage was called
      expect(mockPrisma.quickBooksIntegration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-123',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          isActive: true
        })
      })

      // Verify legacy token storage for backward compatibility
      expect(mockPrisma.quickbooksToken.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: expect.objectContaining({
          realmId: 'company-123',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123'
        }),
        create: expect.objectContaining({
          userId: 'user-123',
          realmId: 'company-123',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123'
        })
      })
    })

    it('should handle OAuth callback with missing realm ID', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      })

      const mockAuthResponse = {
        getJson: () => ({
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400
        }),
        token: {
          // Missing realmId
        }
      }

      mockOAuthClient.createToken.mockResolvedValue(mockAuthResponse)

      const callbackUrl = '/api/qbo/callback?code=auth-code-123&state=test-state'
      
      const response = await $fetch(callbackUrl, {
        method: 'GET',
        headers: {
          cookie: 'session=mock-session'
        }
      })

      // Should redirect to settings page with error
      expect(response).toContain('settings?qbo=error')
      expect(response).toContain('message=')
    })

    it('should handle OAuth callback without authentication', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      const callbackUrl = '/api/qbo/callback?code=auth-code-123&realmId=company-123'
      
      await expect($fetch(callbackUrl, {
        method: 'GET'
      })).rejects.toThrow('401')
    })

    it('should handle OAuth token creation failure', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      })

      mockOAuthClient.createToken.mockRejectedValue(new Error('OAuth token creation failed'))

      const callbackUrl = '/api/qbo/callback?code=invalid-code&realmId=company-123'
      
      const response = await $fetch(callbackUrl, {
        method: 'GET',
        headers: {
          cookie: 'session=mock-session'
        }
      })

      // Should redirect to settings page with error
      expect(response).toContain('settings?qbo=error')
      expect(response).toContain('errorType=')
    })
  })

  describe('Token Storage and Retrieval', () => {
    it('should store tokens and retrieve them successfully', async () => {
      const tokenData = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      mockPrisma.quickBooksIntegration.updateMany.mockResolvedValue({})
      mockPrisma.quickBooksIntegration.create.mockResolvedValue({})

      // Store tokens
      await QuickBooksTokenManager.storeTokens(tokenData)

      // Verify storage
      expect(mockPrisma.quickBooksIntegration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-123',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          isActive: true
        })
      })

      // Mock stored integration for retrieval
      const storedIntegration = {
        id: 'integration-123',
        companyId: 'company-123',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
        connectedAt: new Date(),
        lastRefreshedAt: null
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(storedIntegration)

      // Retrieve token
      const retrievedToken = await QuickBooksTokenManager.getValidAccessToken()
      expect(retrievedToken).toBe('access-token-123')
    })

    it('should handle token storage with invalid data', async () => {
      const invalidTokenData = {
        access_token: '', // Invalid empty token
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      await expect(QuickBooksTokenManager.storeTokens(invalidTokenData)).rejects.toThrow()
    })

    it('should deactivate existing integrations when storing new tokens', async () => {
      const tokenData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      mockPrisma.quickBooksIntegration.updateMany.mockResolvedValue({})
      mockPrisma.quickBooksIntegration.create.mockResolvedValue({})

      await QuickBooksTokenManager.storeTokens(tokenData)

      // Verify existing integrations are deactivated
      expect(mockPrisma.quickBooksIntegration.updateMany).toHaveBeenCalledWith({
        where: { 
          companyId: 'company-123',
          isActive: true 
        },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })
  })

  describe('API Access After Connection', () => {
    it('should make API calls successfully after connection', async () => {
      // Setup active integration
      const integration = {
        id: 'integration-123',
        companyId: 'company-123',
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token-123',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst
        .mockResolvedValueOnce(integration) // For getValidAccessToken
        .mockResolvedValueOnce(integration) // For makeAPIRequest

      // Mock successful API response
      const mockApiResponse = {
        json: {
          QueryResponse: {
            Item: [
              { Id: '1', Name: 'Test Item 1' },
              { Id: '2', Name: 'Test Item 2' }
            ]
          }
        }
      }

      mockOAuthClient.makeApiCall.mockResolvedValue(mockApiResponse)

      // Make API request
      const result = await QuickBooksTokenManager.makeAPIRequest('items')

      expect(result).toEqual(mockApiResponse.json)
      expect(mockOAuthClient.setToken).toHaveBeenCalled()
      expect(mockOAuthClient.makeApiCall).toHaveBeenCalledWith({
        url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/company-123/items'
      })
    })

    it('should refresh token automatically when making API calls with expired token', async () => {
      // Setup integration with soon-to-expire token
      const integration = {
        id: 'integration-123',
        companyId: 'company-123',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token-123',
        accessTokenExpiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        connectedAt: new Date(),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst
        .mockResolvedValueOnce(integration) // For getValidAccessToken
        .mockResolvedValueOnce(integration) // For makeAPIRequest

      // Mock successful token refresh
      mockOAuthClient.refresh.mockResolvedValue({
        getJson: () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400
        })
      })

      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      // Mock successful API response after refresh
      const mockApiResponse = {
        json: {
          QueryResponse: {
            CompanyInfo: [
              { Id: '1', Name: 'Test Company' }
            ]
          }
        }
      }

      mockOAuthClient.makeApiCall.mockResolvedValue(mockApiResponse)

      // Make API request (should trigger token refresh)
      const result = await QuickBooksTokenManager.makeAPIRequest('companyinfo/company-123')

      expect(result).toEqual(mockApiResponse.json)
      expect(mockOAuthClient.refresh).toHaveBeenCalled()
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'integration-123' },
        data: expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          lastRefreshedAt: expect.any(Date)
        })
      })
    })

    it('should handle API calls when no connection exists', async () => {
      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      await expect(QuickBooksTokenManager.makeAPIRequest('items')).rejects.toThrow()
    })
  })

  describe('Connection Status', () => {
    it('should return detailed status for active connection', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      })

      const integration = {
        id: 'integration-123',
        companyId: 'company-123',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        connectedAt: new Date('2024-01-01T10:00:00Z'),
        lastRefreshedAt: new Date('2024-01-01T11:00:00Z'),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)

      // Mock company info API call
      mockOAuthClient.makeApiCall.mockResolvedValue({
        json: {
          QueryResponse: {
            CompanyInfo: [
              { Name: 'Test Company Inc.' }
            ]
          }
        }
      })

      const response = await $fetch('/api/qbo/status', {
        headers: {
          cookie: 'session=mock-session'
        }
      })

      expect(response).toMatchObject({
        connected: true,
        companyName: 'Test Company Inc.',
        companyId: 'company-123',
        connectedAt: expect.any(String),
        lastRefreshedAt: expect.any(String),
        tokenHealth: {
          accessToken: {
            expiresAt: expect.any(String),
            minutesRemaining: expect.any(Number),
            isExpired: false,
            needsRefresh: false
          },
          refreshToken: {
            expiresAt: expect.any(String),
            daysRemaining: expect.any(Number),
            isExpired: false,
            warningThreshold: false
          }
        },
        automaticRefresh: {
          enabled: true,
          schedulerRunning: expect.any(Boolean),
          nextRefreshCheck: 'Every 30 minutes',
          refreshThreshold: '10 minutes before expiry',
          status: 'Active'
        }
      })
    })

    it('should return disconnected status when no integration exists', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      })

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      const response = await $fetch('/api/qbo/status', {
        headers: {
          cookie: 'session=mock-session'
        }
      })

      expect(response).toMatchObject({
        connected: false,
        message: 'No active QuickBooks integration found.',
        automaticRefresh: false
      })
    })

    it('should require authentication for status endpoint', async () => {
      mockAuth.api.getSession.mockResolvedValue(null)

      await expect($fetch('/api/qbo/status')).rejects.toThrow('401')
    })
  })
})