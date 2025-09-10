import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager'
import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor'

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
    critical: vi.fn(),
    logTokenRefresh: vi.fn(),
    logConnectionEvent: vi.fn(),
    logAPIRequest: vi.fn(),
    logSchedulerEvent: vi.fn(),
    logSchedulerHealth: vi.fn(),
    logPerformanceMetrics: vi.fn(),
    getSchedulerHealthStats: vi.fn(() => ({
      isHealthy: true,
      uptime: 3600000,
      totalChecks: 10,
      successfulChecks: 10,
      failedChecks: 0,
      averageCheckDuration: 500,
      lastCheckTime: new Date(),
      tokensRefreshed: 2,
      tokensExpired: 0,
      errorRate: 0
    })),
    getErrorStats: vi.fn(() => ({
      totalErrors: 0,
      errorsByType: {},
      errorsByComponent: {},
      criticalErrors: 0
    }))
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

describe('QuickBooks Scheduler and Background Processes', () => {
  let mockPrisma: any
  let mockOAuthClient: any
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Setup mock Prisma client
    mockPrisma = {
      quickBooksIntegration: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      $queryRaw: vi.fn()
    }
    
    // Setup mock OAuth client
    const OAuthClient = vi.mocked(await import('intuit-oauth')).default
    mockOAuthClient = new OAuthClient()
    
    // Mock getEnhancedPrismaClient
    const { getEnhancedPrismaClient } = await import('~/server/lib/db')
    vi.mocked(getEnhancedPrismaClient).mockResolvedValue(mockPrisma)
  })

  afterEach(() => {
    vi.useRealTimers()
    // Stop any running schedulers
    QuickBooksTokenManager.stopTokenRefreshScheduler()
    QuickBooksMonitor.getInstance().stop()
  })

  describe('Scheduler Initialization', () => {
    it('should start scheduler successfully', () => {
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(false)
      
      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })

    it('should stop existing scheduler before starting new one', () => {
      // Start first scheduler
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      
      // Start second scheduler (should stop first one)
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })

    it('should handle scheduler startup errors gracefully', () => {
      // Mock console methods to capture logs
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      expect(() => QuickBooksTokenManager.startTokenRefreshScheduler()).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    it('should run initial token check after startup', async () => {
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])
      
      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past the initial 1-second delay
      await vi.advanceTimersByTimeAsync(1100)
      
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      })
    })
  })

  describe('Scheduler Operation', () => {
    it('should check tokens every 30 minutes', async () => {
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])
      
      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check
      await vi.advanceTimersByTimeAsync(1100)
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledTimes(1)
      
      // Fast-forward 30 minutes
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledTimes(2)
      
      // Fast-forward another 30 minutes
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledTimes(3)
    })

    it('should refresh tokens that are close to expiry', async () => {
      const soonToExpire = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      const integration = {
        id: 'test-id',
        companyId: 'company-123',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: soonToExpire,
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        connectedAt: new Date(),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([integration])
      
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

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check
      await vi.advanceTimersByTimeAsync(1100)
      
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

    it('should skip tokens that are still valid', async () => {
      const validToken = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      const integration = {
        id: 'test-id',
        companyId: 'company-123',
        accessToken: 'valid-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: validToken,
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([integration])

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check
      await vi.advanceTimersByTimeAsync(1100)
      
      expect(mockOAuthClient.refresh).not.toHaveBeenCalled()
      expect(mockPrisma.quickBooksIntegration.update).not.toHaveBeenCalled()
    })

    it('should mark integrations inactive when refresh tokens expire', async () => {
      const expiredRefreshToken = new Date(Date.now() - 1000) // 1 second ago
      const integration = {
        id: 'test-id',
        companyId: 'company-123',
        accessToken: 'token',
        refreshToken: 'expired-refresh',
        accessTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        refreshTokenExpiresAt: expiredRefreshToken,
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([integration])
      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check
      await vi.advanceTimersByTimeAsync(1100)
      
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })

    it('should handle token refresh failures gracefully', async () => {
      const soonToExpire = new Date(Date.now() + 5 * 60 * 1000)
      const integration = {
        id: 'test-id',
        companyId: 'company-123',
        accessToken: 'expiring-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: soonToExpire,
        refreshTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        connectedAt: new Date(),
        isActive: true
      }

      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([integration])
      mockOAuthClient.refresh.mockRejectedValue(new Error('Refresh failed'))
      mockPrisma.quickBooksIntegration.update.mockResolvedValue({})

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check
      await vi.advanceTimersByTimeAsync(1100)
      
      // Should mark integration as inactive after refresh failure
      expect(mockPrisma.quickBooksIntegration.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          isActive: false,
          disconnectedAt: expect.any(Date)
        }
      })
    })

    it('should continue running after errors', async () => {
      // First call fails, second succeeds
      mockPrisma.quickBooksIntegration.findMany
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce([])

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check (should fail)
      await vi.advanceTimersByTimeAsync(1100)
      
      // Fast-forward 30 minutes (should succeed)
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledTimes(2)
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })
  })

  describe('Scheduler Control', () => {
    it('should stop scheduler successfully', () => {
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      
      QuickBooksTokenManager.stopTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(false)
    })

    it('should handle stopping scheduler when not running', () => {
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(false)
      expect(() => QuickBooksTokenManager.stopTokenRefreshScheduler()).not.toThrow()
    })

    it('should restart scheduler successfully', () => {
      QuickBooksTokenManager.startTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      
      QuickBooksTokenManager.restartTokenRefreshScheduler()
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
    })
  })

  describe('Monitoring Integration', () => {
    it('should start monitoring services', () => {
      const monitor = QuickBooksMonitor.getInstance()
      
      expect(() => monitor.start()).not.toThrow()
      
      const stats = monitor.getMonitoringStats()
      expect(stats.uptime).toBeGreaterThan(0)
      expect(stats.healthCheckInterval).toBe(5 * 60 * 1000) // 5 minutes
      expect(stats.alertCheckInterval).toBe(2 * 60 * 1000) // 2 minutes
    })

    it('should stop monitoring services', () => {
      const monitor = QuickBooksMonitor.getInstance()
      monitor.start()
      
      expect(() => monitor.stop()).not.toThrow()
    })

    it('should perform health checks', async () => {
      const monitor = QuickBooksMonitor.getInstance()
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])
      
      const health = await monitor.performHealthCheck()
      
      expect(health).toMatchObject({
        overall: expect.stringMatching(/healthy|degraded|failed/),
        components: expect.arrayContaining([
          expect.objectContaining({
            component: 'Database',
            status: expect.stringMatching(/healthy|degraded|failed/)
          }),
          expect.objectContaining({
            component: 'Scheduler',
            status: expect.stringMatching(/healthy|degraded|failed/)
          }),
          expect.objectContaining({
            component: 'Tokens',
            status: expect.stringMatching(/healthy|degraded|failed/)
          }),
          expect.objectContaining({
            component: 'ErrorRates',
            status: expect.stringMatching(/healthy|degraded|failed/)
          })
        ]),
        uptime: expect.any(Number),
        lastUpdated: expect.any(Date)
      })
    })

    it('should detect unhealthy scheduler', async () => {
      const monitor = QuickBooksMonitor.getInstance()
      
      // Mock unhealthy scheduler stats
      const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger')
      vi.mocked(QuickBooksLogger.getSchedulerHealthStats).mockReturnValue({
        isHealthy: false,
        uptime: 3600000,
        totalChecks: 10,
        successfulChecks: 5,
        failedChecks: 5,
        averageCheckDuration: 1000,
        lastCheckTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        tokensRefreshed: 0,
        tokensExpired: 2,
        errorRate: 50
      })
      
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])
      
      const health = await monitor.performHealthCheck()
      
      const schedulerComponent = health.components.find(c => c.component === 'Scheduler')
      expect(schedulerComponent?.status).toBe('failed')
    })

    it('should detect expired tokens', async () => {
      const monitor = QuickBooksMonitor.getInstance()
      
      const expiredIntegration = {
        id: 'expired-id',
        companyId: 'company-123',
        accessToken: 'token',
        refreshToken: 'refresh',
        accessTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        refreshTokenExpiresAt: new Date(Date.now() - 1000), // Expired
        isActive: true
      }
      
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([expiredIntegration])
      
      const health = await monitor.performHealthCheck()
      
      const tokenComponent = health.components.find(c => c.component === 'Tokens')
      expect(tokenComponent?.status).toBe('failed')
      expect(tokenComponent?.message).toContain('expired refresh tokens')
    })

    it('should manage alert rules', () => {
      const monitor = QuickBooksMonitor.getInstance()
      
      const customRule = {
        id: 'custom-rule',
        name: 'Custom Test Rule',
        condition: (metrics: any) => metrics.testValue > 100,
        severity: 'warning' as const,
        message: 'Test condition exceeded',
        enabled: true
      }
      
      monitor.addAlertRule(customRule)
      
      const rules = monitor.getAlertRules()
      expect(rules).toContainEqual(customRule)
      
      // Toggle rule
      monitor.toggleAlertRule('custom-rule', false)
      const updatedRules = monitor.getAlertRules()
      const updatedRule = updatedRules.find(r => r.id === 'custom-rule')
      expect(updatedRule?.enabled).toBe(false)
      
      // Remove rule
      const removed = monitor.removeAlertRule('custom-rule')
      expect(removed).toBe(true)
      
      const finalRules = monitor.getAlertRules()
      expect(finalRules.find(r => r.id === 'custom-rule')).toBeUndefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures in health checks', async () => {
      const monitor = QuickBooksMonitor.getInstance()
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'))
      
      const health = await monitor.performHealthCheck()
      
      const dbComponent = health.components.find(c => c.component === 'Database')
      expect(dbComponent?.status).toBe('failed')
      expect(dbComponent?.message).toContain('Database connection failed')
    })

    it('should continue monitoring after health check failures', async () => {
      const monitor = QuickBooksMonitor.getInstance()
      
      // First health check fails
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Temporary failure'))
      
      let health = await monitor.performHealthCheck()
      expect(health.overall).toBe('failed')
      
      // Second health check succeeds
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }])
      mockPrisma.quickBooksIntegration.findMany.mockResolvedValue([])
      
      health = await monitor.performHealthCheck()
      expect(health.overall).toBe('healthy')
    })

    it('should handle scheduler errors without stopping', async () => {
      // Mock scheduler error on first check, success on second
      mockPrisma.quickBooksIntegration.findMany
        .mockRejectedValueOnce(new Error('Scheduler error'))
        .mockResolvedValueOnce([])

      QuickBooksTokenManager.startTokenRefreshScheduler()
      
      // Fast-forward past initial check (should fail but continue)
      await vi.advanceTimersByTimeAsync(1100)
      
      // Fast-forward 30 minutes (should succeed)
      await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
      
      expect(QuickBooksTokenManager.isSchedulerRunning()).toBe(true)
      expect(mockPrisma.quickBooksIntegration.findMany).toHaveBeenCalledTimes(2)
    })
  })
})