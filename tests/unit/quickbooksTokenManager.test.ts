import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager'
import { QuickBooksErrorType } from '~/server/lib/quickbooksErrorHandler'

// Mock dependencies
vi.mock('intuit-oauth', () => {
  const mockOAuthClient = {
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
    logPerformanceMetrics: vi.fn()
  }
}))

// Mock runtime config
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    qboClientId: 'test-client-id',
    qboClientSecret: 'test-client-secret',
    qboEnvironment: 'sandbox'
  }))
}))

describe('QuickBooksTokenManager', () => {
  let mockPrisma: any
  let mockOAuthClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mock Prisma client
    mockPrisma = {
      quickBooksIntegration: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      }
    }
    
    // Setup mock OAuth client
    const OAuthClient = vi.mocked(await import('intuit-oauth')).default
    mockOAuthClient = new OAuthClient()
    
    // Mock getEnhancedPrismaClient
    const { getEnhancedPrismaClient } = await import('~/server/lib/db')
    vi.mocked(getEnhancedPrismaClient).mockResolvedValue(mockPrisma)
  })

  afterEach(() => {
    // Stop any running schedulers
    QuickBooksTokenManager.stopTokenRefreshScheduler()
  })

  describe('getValidAccessToken', () => {
    it('should return valid access token when not expired', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      const integration = {
        id: 'test-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: futureDate,
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        companyId: 'test-company',
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)

      const token = await QuickBooksTokenManager.getValidAccessToken()
      
      expect(token).toBe('valid-token')
      expect(mockPrisma.quickBooksIntegration.findFirst).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { connectedAt: 'desc' }
      })
    })

    it('should refresh token when close to expiry', async () => {
      const soonToExpire = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now
      const integration = {
        id: 'test-id',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: soonToExpire,
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'test-company',
        connectedAt: new Date(),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)
      
      // Mock successful refresh
      mockOAuthClient.refresh.mockResolvedValue({
        getJson: () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400
        })
      })

      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      const token = await QuickBooksTokenManager.getValidAccessToken()
      
      expect(token).toBe('new-token')
      expect(mockOAuthClient.setToken).toHaveBeenCalled()
      expect(mockOAuthClient.refresh).toHaveBeenCalled()
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
          lastRefreshedAt: expect.any(Date)
        })
      })
    })

    it('should throw error when no active integration found', async () => {
      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      await expect(QuickBooksTokenManager.getValidAccessToken()).rejects.toThrow()
    })

    it('should mark integration inactive when refresh token expired', async () => {
      const expiredRefreshToken = new Date(Date.now() - 1000) // 1 second ago
      const integration = {
        id: 'test-id',
        accessToken: 'token',
        refreshToken: 'expired-refresh',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: expiredRefreshToken,
        companyId: 'test-company',
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)
      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      await expect(QuickBooksTokenManager.getValidAccessToken()).rejects.toThrow()
      
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })
  })

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'test-company',
        connectedAt: new Date()
      }

      mockOAuthClient.refresh.mockResolvedValue({
        getJson: () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          x_refresh_token_expires_in: 8726400
        })
      })

      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      const newToken = await QuickBooksTokenManager.refreshAccessToken(integration)
      
      expect(newToken).toBe('new-token')
      expect(mockOAuthClient.setToken).toHaveBeenCalled()
      expect(mockOAuthClient.refresh).toHaveBeenCalled()
    })

    it('should handle refresh token expiry', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'token',
        refreshToken: 'expired-refresh',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        companyId: 'test-company'
      }

      const result = await QuickBooksTokenManager.refreshAccessToken(integration)
      
      expect(result).toBeNull()
      expect(mockOAuthClient.refresh).not.toHaveBeenCalled()
    })

    it('should handle invalid token response', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'test-company',
        connectedAt: new Date()
      }

      mockOAuthClient.refresh.mockResolvedValue({
        getJson: () => ({
          // Missing required fields
          invalid: 'response'
        })
      })

      const result = await QuickBooksTokenManager.refreshAccessToken(integration)
      
      expect(result).toBeNull()
    })
  })

  describe('storeTokens', () => {
    it('should store valid tokens successfully', async () => {
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      mockPrisma.quickBooksIntegration.updateMany.mockResolvedValue({})
      mockPrisma.quickBooksIntegration.create.mockResolvedValue({})

      await QuickBooksTokenManager.storeTokens(tokens)

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

      expect(mockPrisma.quickBooksIntegration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-123',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          isActive: true,
          connectedAt: expect.any(Date)
        })
      })
    })

    it('should reject invalid token data', async () => {
      const invalidTokens = {
        access_token: '',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      await expect(QuickBooksTokenManager.storeTokens(invalidTokens)).rejects.toThrow()
    })

    it('should reject tokens with invalid expiry times', async () => {
      const tokens = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: -1, // Invalid expiry
        x_refresh_token_expires_in: 8726400,
        realmId: 'company-123'
      }

      await expect(QuickBooksTokenManager.storeTokens(tokens)).rejects.toThrow()
    })
  })

  describe('isConnected', () => {
    it('should return true when valid integration exists', async () => {
      const integration = {
        id: 'test-id',
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)

      const connected = await QuickBooksTokenManager.isConnected()
      
      expect(connected).toBe(true)
    })

    it('should return false when no integration exists', async () => {
      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      const connected = await QuickBooksTokenManager.isConnected()
      
      expect(connected).toBe(false)
    })

    it('should mark integration inactive and return false when refresh token expired', async () => {
      const integration = {
        id: 'test-id',
        refreshTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)
      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      const connected = await QuickBooksTokenManager.isConnected()
      
      expect(connected).toBe(false)
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })
  })

  describe('getConnectionStatus', () => {
    it('should return detailed status for active connection', async () => {
      const integration = {
        id: 'test-id',
        companyId: 'company-123',
        connectedAt: new Date('2024-01-01T10:00:00Z'),
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastRefreshedAt: new Date('2024-01-01T11:00:00Z'),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)

      const status = await QuickBooksTokenManager.getConnectionStatus()
      
      expect(status).toEqual({
        connected: true,
        companyId: 'company-123',
        connectedAt: integration.connectedAt,
        accessTokenExpiresAt: integration.accessTokenExpiresAt,
        refreshTokenExpiresAt: integration.refreshTokenExpiresAt,
        lastRefreshedAt: integration.lastRefreshedAt
      })
    })

    it('should return disconnected status when no integration exists', async () => {
      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      const status = await QuickBooksTokenManager.getConnectionStatus()
      
      expect(status).toEqual({ connected: false })
    })

    it('should return error status when refresh token expired', async () => {
      const integration = {
        id: 'test-id',
        refreshTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(integration)
      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      const status = await QuickBooksTokenManager.getConnectionStatus()
      
      expect(status).toEqual({
        connected: false,
        error: 'Refresh token expired. Please reconnect to QuickBooks.'
      })
    })
  })

  describe('makeAPIRequest', () => {
    it('should make successful API request with valid token', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'company-123',
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst
        .mockResolvedValueOnce(integration) // For getValidAccessToken
        .mockResolvedValueOnce(integration) // For makeAPIRequest

      const mockResponse = { json: { data: 'test-data' } }
      mockOAuthClient.makeApiCall.mockResolvedValue(mockResponse)

      const result = await QuickBooksTokenManager.makeAPIRequest('items')
      
      expect(result).toEqual({ data: 'test-data' })
      expect(mockOAuthClient.setToken).toHaveBeenCalled()
      expect(mockOAuthClient.makeApiCall).toHaveBeenCalledWith({
        url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/company-123/items'
      })
    })

    it('should handle API request with POST method and body', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'company-123',
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst
        .mockResolvedValueOnce(integration)
        .mockResolvedValueOnce(integration)

      const mockResponse = { json: { success: true } }
      mockOAuthClient.makeApiCall.mockResolvedValue(mockResponse)

      const requestBody = { name: 'Test Item' }
      const result = await QuickBooksTokenManager.makeAPIRequest('items', 'POST', requestBody)
      
      expect(result).toEqual({ success: true })
      expect(mockOAuthClient.makeApiCall).toHaveBeenCalledWith({
        url: 'https://sandbox-quickbooks.api.intuit.com/v3/company/company-123/items',
        body: requestBody
      })
    })

    it('should throw error when no valid token available', async () => {
      mockPrisma.quickBooksIntegration.findFirst.mockResolvedValue(null)

      await expect(QuickBooksTokenManager.makeAPIRequest('items')).rejects.toThrow()
    })

    it('should handle invalid API response', async () => {
      const integration = {
        id: 'test-id',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        companyId: 'company-123',
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findFirst
        .mockResolvedValueOnce(integration)
        .mockResolvedValueOnce(integration)

      // Mock invalid response (no json property)
      mockOAuthClient.makeApiCall.mockResolvedValue(null)

      await expect(QuickBooksTokenManager.makeAPIRequest('items')).rejects.toThrow()
    })
  })

  describe('disconnect', () => {
    it('should disconnect all active integrations', async () => {
      const activeIntegrations = [
        { id: 'integration-1', companyId: 'company-1', isActive: true },
        { id: 'integration-2', companyId: 'company-2', isActive: true }
      ]

      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue(activeIntegrations)
      mockPrisma.quickBooksIntegration.updateMany.mockResolvedValue({})

      await QuickBooksTokenManager.disconnect()

      expect(mockPrisma.quickBooksIntegration.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })

    it('should handle case when no active integrations exist', async () => {
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])

      await expect(QuickBooksTokenManager.disconnect()).resolves.not.toThrow()
    })
  })

  describe('scheduler functionality', () => {
    it('should start scheduler successfully', () => {
      expect(() => QuickBooksTokenManager.startTokenRefreshScheduler()).not.toThrow()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })

    it('should stop scheduler successfully', () => {
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      
      QuickBooksTokenManager.stopTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(false)
    })

    it('should restart scheduler successfully', () => {
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      
      QuickBooksTokenManager.restartTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })

    it('should handle stopping scheduler when not running', () => {
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(false)
      expect(() => QuickBooksTokenManager.stopTokenRefreshScheduler()).not.toThrow()
    })
  })
})