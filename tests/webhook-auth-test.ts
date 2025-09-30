/**
 * Test script to validate QuickBooks webhook authentication improvements
 * This script tests the enhanced logging and error handling in the webhook authentication flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the imports that would normally be available in the Nuxt environment
vi.mock('~/server/lib/quickbooksLogger', () => ({
  QuickBooksLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logPerformanceMetrics: vi.fn()
  }
}));

vi.mock('~/server/lib/quickbooksErrorHandler', () => ({
  QuickBooksErrorHandler: {
    createError: vi.fn((error, context) => ({
      type: 'AUTHENTICATION_ERROR',
      message: error.message,
      userMessage: 'Authentication failed',
      timestamp: new Date(),
      recoverable: true,
      retryable: true,
      requiresReconnection: false
    })),
    handleErrorWithRecovery: vi.fn(async (operation, context, maxRetries, delay) => {
      try {
        const result = await operation();
        return { success: true, result };
      } catch (error) {
        return { success: false, error };
      }
    })
  },
  safeQuickBooksOperation: vi.fn(async (operation, context, fallback) => {
    try {
      return await operation();
    } catch (error) {
      if (fallback !== undefined) return fallback;
      throw error;
    }
  })
}));

vi.mock('~/server/lib/quickbooksTokenManager', () => ({
  QuickBooksTokenManager: {
    isConnected: vi.fn(),
    getValidAccessToken: vi.fn(),
    getConnectionStatus: vi.fn()
  }
}));

// Mock Nuxt runtime config
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    qboClientId: 'test-client-id',
    qboClientSecret: 'test-client-secret',
    qboEnvironment: 'sandbox'
  })),
  createError: vi.fn((options) => {
    const error = new Error(options.statusMessage);
    (error as any).statusCode = options.statusCode;
    return error;
  })
}));

// Mock intuit-oauth
vi.mock('intuit-oauth', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      environment: 'sandbox'
    }))
  };
});

describe('QuickBooks Webhook Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Validation', () => {
    it('should validate access token format correctly', async () => {
      // Import the validation function
      const { validateAccessToken } = await import('../server/lib/qbo-client');
      
      // Test valid token
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const validResult = validateAccessToken(validToken);
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.details.format).toBe('JWT');
      
      // Test invalid token - too short
      const shortToken = 'abc123';
      const shortResult = validateAccessToken(shortToken);
      
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors).toContain('Token too short: 6 characters (minimum 10 expected)');
      
      // Test null token
      const nullResult = validateAccessToken(null as any);
      
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors).toContain('Token is null or undefined');
    });

    it('should handle different token formats', async () => {
      const { validateAccessToken } = await import('../server/lib/qbo-client');
      
      // Test base64-like token
      const base64Token = 'QWxhZGRpbjpvcGVuIHNlc2FtZQ==';
      const base64Result = validateAccessToken(base64Token);
      
      expect(base64Result.isValid).toBe(true);
      expect(base64Result.details.format).toBe('base64');
      
      // Test token with invalid characters
      const invalidToken = 'invalid-token-with-@#$%';
      const invalidResult = validateAccessToken(invalidToken);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Token contains invalid characters');
    });
  });

  describe('Webhook Authentication Flow', () => {
    it('should handle successful authentication', async () => {
      const { QuickBooksTokenManager } = await import('~/server/lib/quickbooksTokenManager');
      
      // Mock successful authentication flow
      vi.mocked(QuickBooksTokenManager.isConnected).mockResolvedValue(true);
      vi.mocked(QuickBooksTokenManager.getValidAccessToken).mockResolvedValue('valid-access-token-12345');
      vi.mocked(QuickBooksTokenManager.getConnectionStatus).mockResolvedValue({
        connected: true,
        companyId: 'test-company-123',
        connectedAt: new Date(),
        accessTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        refreshTokenExpiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      });

      // Import and test the function
      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      const mockEvent = {} as any;
      const result = await getQboClientForWebhook(mockEvent);
      
      expect(result).toBeDefined();
      expect(result.token.access_token).toBe('valid-access-token-12345');
      expect(result.token.realmId).toBe('test-company-123');
      expect(result.oauthClient).toBeDefined();
    });

    it('should handle authentication failures gracefully', async () => {
      const { QuickBooksTokenManager } = await import('~/server/lib/quickbooksTokenManager');
      
      // Mock authentication failure
      vi.mocked(QuickBooksTokenManager.isConnected).mockResolvedValue(false);
      
      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      const mockEvent = {} as any;
      
      await expect(getQboClientForWebhook(mockEvent)).rejects.toThrow();
    });

    it('should handle expired tokens', async () => {
      const { QuickBooksTokenManager } = await import('~/server/lib/quickbooksTokenManager');
      
      // Mock expired token scenario
      vi.mocked(QuickBooksTokenManager.isConnected).mockResolvedValue(true);
      vi.mocked(QuickBooksTokenManager.getValidAccessToken).mockResolvedValue('valid-token');
      vi.mocked(QuickBooksTokenManager.getConnectionStatus).mockResolvedValue({
        connected: true,
        companyId: 'test-company-123',
        connectedAt: new Date(),
        accessTokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        refreshTokenExpiresAt: new Date(Date.now() - 86400000) // 24 hours ago (expired)
      });

      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      const mockEvent = {} as any;
      
      await expect(getQboClientForWebhook(mockEvent)).rejects.toThrow();
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log authentication steps', async () => {
      const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
      const { QuickBooksTokenManager } = await import('~/server/lib/quickbooksTokenManager');
      
      // Mock successful flow
      vi.mocked(QuickBooksTokenManager.isConnected).mockResolvedValue(true);
      vi.mocked(QuickBooksTokenManager.getValidAccessToken).mockResolvedValue('valid-token');
      vi.mocked(QuickBooksTokenManager.getConnectionStatus).mockResolvedValue({
        connected: true,
        companyId: 'test-company-123',
        connectedAt: new Date(),
        accessTokenExpiresAt: new Date(Date.now() + 3600000),
        refreshTokenExpiresAt: new Date(Date.now() + 86400000)
      });

      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      const mockEvent = {} as any;
      await getQboClientForWebhook(mockEvent);
      
      // Verify logging calls were made
      expect(QuickBooksLogger.debug).toHaveBeenCalledWith('WebhookAuth', 'Starting webhook authentication process');
      expect(QuickBooksLogger.info).toHaveBeenCalledWith(
        'WebhookAuth', 
        'Webhook authentication completed successfully',
        expect.any(Object),
        undefined,
        'test-company-123'
      );
    });

    it('should handle configuration errors', async () => {
      const { useRuntimeConfig } = await import('#imports');
      
      // Mock missing configuration
      vi.mocked(useRuntimeConfig).mockReturnValue({
        qboClientId: '',
        qboClientSecret: '',
        qboEnvironment: ''
      } as any);

      const { QuickBooksTokenManager } = await import('~/server/lib/quickbooksTokenManager');
      
      vi.mocked(QuickBooksTokenManager.isConnected).mockResolvedValue(true);
      vi.mocked(QuickBooksTokenManager.getValidAccessToken).mockResolvedValue('valid-token');
      vi.mocked(QuickBooksTokenManager.getConnectionStatus).mockResolvedValue({
        connected: true,
        companyId: 'test-company-123',
        connectedAt: new Date(),
        accessTokenExpiresAt: new Date(Date.now() + 3600000),
        refreshTokenExpiresAt: new Date(Date.now() + 86400000)
      });

      const { getQboClientForWebhook } = await import('../server/lib/qbo-client');
      
      const mockEvent = {} as any;
      
      await expect(getQboClientForWebhook(mockEvent)).rejects.toThrow();
    });
  });
});

console.log('✅ QuickBooks webhook authentication test suite completed');