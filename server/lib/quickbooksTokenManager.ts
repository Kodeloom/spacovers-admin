import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import type { H3Event } from 'h3';
import { QuickBooksErrorHandler, QuickBooksErrorType, safeQuickBooksOperation } from './quickbooksErrorHandler';
import { QuickBooksLogger } from './quickbooksLogger';

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
  error?: string;
}

/**
 * Centralized QuickBooks token manager with automatic refresh capabilities
 * Manages company-wide tokens instead of per-user tokens
 */
export class QuickBooksTokenManager {
  private static oauthClient: InstanceType<typeof OAuthClient> | null = null;
  private static schedulerInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize OAuth client with configuration
   */
  private static getOAuthClient(event?: H3Event): InstanceType<typeof OAuthClient> {
    if (!this.oauthClient) {
      const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
      
      this.oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment as 'sandbox' | 'production',
        redirectUri: '',
      });
    }
    
    return this.oauthClient;
  }

  /**
   * Get valid access token, automatically refreshing if needed
   * @param event H3 event for database access
   * @returns Valid access token or null if not connected
   */
  static async getValidAccessToken(event?: H3Event): Promise<string | null> {
    return safeQuickBooksOperation(async () => {
      QuickBooksLogger.debug('TokenManager', 'Starting token retrieval process');
      
      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      // Find the active QuickBooks integration
      const integration = await prisma.quickBooksIntegration?.findFirst({
        where: { isActive: true },
        orderBy: { connectedAt: 'desc' }
      });

      if (!integration) {
        QuickBooksLogger.error('TokenManager', 'No active QuickBooks integration found in database');
        const error = QuickBooksErrorHandler.createError(
          new Error('No active QuickBooks integration found'),
          'getValidAccessToken'
        );
        throw error;
      }

      QuickBooksLogger.debug('TokenManager', 'Active integration found', {
        integrationId: integration.id,
        companyId: integration.companyId,
        connectedAt: integration.connectedAt,
        accessTokenExpiresAt: integration.accessTokenExpiresAt,
        refreshTokenExpiresAt: integration.refreshTokenExpiresAt,
        lastRefreshedAt: integration.lastRefreshedAt
      });

      const now = new Date();
      const tokenExpiresAt = integration.accessTokenExpiresAt;
      
      // Validate token format
      if (!integration.accessToken || typeof integration.accessToken !== 'string' || integration.accessToken.length < 10) {
        QuickBooksLogger.error('TokenManager', 'Invalid access token format in database', {
          hasToken: !!integration.accessToken,
          tokenType: typeof integration.accessToken,
          tokenLength: integration.accessToken?.length || 0
        });
        const error = QuickBooksErrorHandler.createError(
          new Error('Invalid access token format stored in database'),
          'getValidAccessToken'
        );
        throw error;
      }

      // Validate refresh token format
      if (!integration.refreshToken || typeof integration.refreshToken !== 'string' || integration.refreshToken.length < 10) {
        QuickBooksLogger.error('TokenManager', 'Invalid refresh token format in database', {
          hasRefreshToken: !!integration.refreshToken,
          refreshTokenType: typeof integration.refreshToken,
          refreshTokenLength: integration.refreshToken?.length || 0
        });
        const error = QuickBooksErrorHandler.createError(
          new Error('Invalid refresh token format stored in database'),
          'getValidAccessToken'
        );
        throw error;
      }
      
      // Check if refresh token is expired first
      if (integration.refreshTokenExpiresAt <= now) {
        const hoursExpired = Math.round((now.getTime() - integration.refreshTokenExpiresAt.getTime()) / 3600000);
        QuickBooksLogger.error('TokenManager', 'Refresh token has expired', {
          refreshTokenExpiresAt: integration.refreshTokenExpiresAt,
          currentTime: now,
          hoursExpired,
          companyId: integration.companyId
        });
        
        const error = QuickBooksErrorHandler.createError(
          new Error('Refresh token has expired'),
          'getValidAccessToken'
        );
        error.type = QuickBooksErrorType.REFRESH_TOKEN_EXPIRED;
        
        // Mark integration as inactive
        await this.markIntegrationInactive(integration.id, event);
        throw error;
      }
      
      // Check if token needs refresh (5 minutes before expiry)
      const refreshThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
      const timeUntilExpiry = tokenExpiresAt.getTime() - now.getTime();
      const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);
      const needsRefresh = timeUntilExpiry < refreshThreshold;

      QuickBooksLogger.debug('TokenManager', 'Token expiry check completed', {
        accessTokenExpiresAt: tokenExpiresAt,
        currentTime: now,
        minutesUntilExpiry,
        needsRefresh,
        refreshThresholdMinutes: refreshThreshold / 60000
      });

      if (needsRefresh) {
        QuickBooksLogger.info('TokenManager', `Access token expires in ${minutesUntilExpiry} minutes, refreshing now`, {
          companyId: integration.companyId,
          minutesUntilExpiry
        });
        
        const refreshedToken = await this.refreshAccessToken(integration);
        
        if (refreshedToken) {
          QuickBooksLogger.info('TokenManager', 'Token refresh completed successfully', {
            companyId: integration.companyId,
            newTokenLength: refreshedToken.length
          });
        }
        
        return refreshedToken;
      }

      QuickBooksLogger.debug('TokenManager', 'Returning existing valid token', {
        companyId: integration.companyId,
        tokenLength: integration.accessToken.length,
        minutesUntilExpiry
      });

      return integration.accessToken;
    }, 'getValidAccessToken', null);
  }

  /**
   * Refresh access token using refresh token
   * @param integration QuickBooks integration record
   * @returns New access token or null if refresh failed
   */
  static async refreshAccessToken(integration: any): Promise<string | null> {
    const result = await QuickBooksErrorHandler.handleErrorWithRecovery(
      async () => {
        const now = new Date();
        
        // Double-check refresh token hasn't expired
        if (integration.refreshTokenExpiresAt <= now) {
          const error = new Error('Refresh token has expired');
          const qbError = QuickBooksErrorHandler.createError(error, 'refreshAccessToken');
          qbError.type = QuickBooksErrorType.REFRESH_TOKEN_EXPIRED;
          throw qbError;
        }

        const oauthClient = this.getOAuthClient();
        
        // Set the current token for refresh
        const tokenForRefresh = {
          token_type: 'Bearer' as const,
          access_token: integration.accessToken,
          refresh_token: integration.refreshToken,
          expires_in: Math.floor((integration.accessTokenExpiresAt.getTime() - integration.connectedAt.getTime()) / 1000),
          x_refresh_token_expires_in: Math.floor((integration.refreshTokenExpiresAt.getTime() - integration.connectedAt.getTime()) / 1000),
          realmId: integration.companyId,
          iat: Math.floor(integration.connectedAt.getTime() / 1000),
        };

        oauthClient.setToken(tokenForRefresh);

        // Perform the refresh
        const authResponse = await oauthClient.refresh();
        const newTokenData = authResponse.getJson();

        if (!newTokenData.access_token || !newTokenData.refresh_token) {
          throw new Error('Invalid token response from QuickBooks');
        }

        const newAccessTokenExpiresAt = new Date(now.getTime() + (newTokenData.expires_in * 1000));
        const newRefreshTokenExpiresAt = new Date(now.getTime() + (newTokenData.x_refresh_token_expires_in * 1000));

        // Update the integration record with new tokens
        const { unenhancedPrisma: prisma } = await import('~/server/lib/db');
        await prisma.quickBooksIntegration?.update({
          where: { id: integration.id },
          data: {
            accessToken: newTokenData.access_token,
            refreshToken: newTokenData.refresh_token,
            accessTokenExpiresAt: newAccessTokenExpiresAt,
            refreshTokenExpiresAt: newRefreshTokenExpiresAt,
            lastRefreshedAt: now,
          },
        });

        const refreshDuration = Date.now() - now.getTime();
        QuickBooksLogger.logTokenRefresh(true, integration.companyId, refreshDuration, undefined, 'api-call');
        return newTokenData.access_token;
      },
      'refreshAccessToken',
      2, // Max 2 retries for token refresh
      2000 // 2 second delay
    );

    if (!result.success) {
      // Mark integration as inactive if refresh fails
      await this.markIntegrationInactive(integration.id);
      
      // Log the specific error for debugging
      const refreshDuration = Date.now() - Date.now(); // This will be 0, but we'll track it properly in the retry logic
      QuickBooksLogger.logTokenRefresh(false, integration.companyId, refreshDuration, result.error, 'api-call');
      
      return null;
    }

    return result.result || null;
  }

  /**
   * Store tokens after OAuth callback
   * @param tokens Token data from OAuth flow
   * @param event H3 event for database access
   */
  static async storeTokens(tokens: TokenData, event?: H3Event): Promise<void> {
    return safeQuickBooksOperation(async () => {
      if (!tokens.access_token || !tokens.refresh_token || !tokens.realmId) {
        throw new Error('Invalid token data: missing required fields');
      }

      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      const now = new Date();
      const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
      const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000));

      // Validate token expiry times
      if (accessTokenExpiresAt <= now || refreshTokenExpiresAt <= now) {
        throw new Error('Invalid token expiry times');
      }

      // Deactivate any existing integrations for this company
      await prisma.quickBooksIntegration?.updateMany({
        where: { 
          companyId: tokens.realmId,
          isActive: true 
        },
        data: {
          isActive: false,
          disconnectedAt: now,
        },
      });

      // Create new integration record
      await prisma.quickBooksIntegration?.create({
        data: {
          companyId: tokens.realmId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          isActive: true,
          connectedAt: now,
        },
      });

      // Log connection event for audit trail
      QuickBooksLogger.logConnectionEvent('connected', tokens.realmId, undefined, {
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        source: 'oauth-callback'
      });

      QuickBooksLogger.info('TokenStorage', `Successfully stored QuickBooks tokens for company: ${tokens.realmId}`, { 
        accessTokenExpiresAt, 
        refreshTokenExpiresAt 
      }, undefined, tokens.realmId);
    }, 'storeTokens');
  }

  /**
   * Mark an integration as inactive (helper method)
   * @param integrationId Integration ID to mark as inactive
   * @param event H3 event for database access
   */
  private static async markIntegrationInactive(integrationId: string, event?: H3Event): Promise<void> {
    return safeQuickBooksOperation(async () => {
      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      await prisma.quickBooksIntegration?.update({
        where: { id: integrationId },
        data: {
          isActive: false,
          disconnectedAt: new Date(),
        },
      });
    }, 'markIntegrationInactive');
  }

  /**
   * Check if QuickBooks is connected
   * @param event H3 event for database access
   * @returns True if connected and tokens are valid
   */
  static async isConnected(event?: H3Event): Promise<boolean> {
    return safeQuickBooksOperation(async () => {
      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      const integration = await prisma.quickBooksIntegration?.findFirst({
        where: { isActive: true },
      });

      if (!integration) {
        return false;
      }

      const now = new Date();
      
      // Check if refresh token is still valid
      if (integration.refreshTokenExpiresAt <= now) {
        // Mark as inactive if refresh token expired
        await this.markIntegrationInactive(integration.id, event);
        return false;
      }

      return true;
    }, 'isConnected', false);
  }

  /**
   * Get detailed connection status
   * @param event H3 event for database access
   * @returns Connection status with details
   */
  static async getConnectionStatus(event?: H3Event): Promise<ConnectionStatus> {
    return safeQuickBooksOperation(async () => {
      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      const integration = await prisma.quickBooksIntegration?.findFirst({
        where: { isActive: true },
        orderBy: { connectedAt: 'desc' }
      });

      if (!integration) {
        return { connected: false };
      }

      const now = new Date();
      
      // Check if refresh token is expired
      if (integration.refreshTokenExpiresAt <= now) {
        await this.markIntegrationInactive(integration.id, event);
        
        return { 
          connected: false, 
          error: 'Refresh token expired. Please reconnect to QuickBooks.' 
        };
      }

      return {
        connected: true,
        companyId: integration.companyId,
        connectedAt: integration.connectedAt,
        accessTokenExpiresAt: integration.accessTokenExpiresAt,
        refreshTokenExpiresAt: integration.refreshTokenExpiresAt,
        lastRefreshedAt: integration.lastRefreshedAt,
      };
    }, 'getConnectionStatus', { connected: false, error: 'Failed to check connection status' });
  }

  /**
   * Make authenticated API request to QuickBooks with automatic token management
   * @param endpoint API endpoint path
   * @param method HTTP method (default: GET)
   * @param body Request body for POST/PUT requests
   * @param event H3 event for database access
   * @returns API response data
   */
  static async makeAPIRequest(
    endpoint: string, 
    method: string = 'GET', 
    body?: any, 
    event?: H3Event
  ): Promise<any> {
    const startTime = Date.now();
    let companyId: string | undefined;

    const result = await QuickBooksErrorHandler.handleErrorWithRecovery(
      async () => {
        const accessToken = await this.getValidAccessToken(event);
        
        if (!accessToken) {
          const error = new Error('No valid access token available. Please reconnect to QuickBooks.');
          const qbError = QuickBooksErrorHandler.createError(error, 'makeAPIRequest');
          qbError.type = QuickBooksErrorType.AUTHENTICATION_ERROR;
          throw qbError;
        }

        const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
        const integration = await prisma.quickBooksIntegration?.findFirst({
          where: { isActive: true },
        });

        if (!integration) {
          const error = new Error('No active QuickBooks integration found.');
          const qbError = QuickBooksErrorHandler.createError(error, 'makeAPIRequest');
          qbError.type = QuickBooksErrorType.AUTHENTICATION_ERROR;
          throw qbError;
        }

        companyId = integration.companyId;

        const oauthClient = this.getOAuthClient(event);
        const config = event ? useRuntimeConfig(event) : useRuntimeConfig();
        
        const baseUrl = config.qboEnvironment === 'sandbox' 
          ? OAuthClient.environment.sandbox 
          : OAuthClient.environment.production;

        const url = `${baseUrl}v3/company/${integration.companyId}/${endpoint}`;

        // Set the current token
        oauthClient.setToken({
          token_type: 'Bearer',
          access_token: accessToken,
          refresh_token: integration.refreshToken,
          expires_in: Math.floor((integration.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
          x_refresh_token_expires_in: Math.floor((integration.refreshTokenExpiresAt.getTime() - Date.now()) / 1000),
          realmId: integration.companyId,
        });

        const requestOptions: any = { url };
        
        if (method !== 'GET' && body) {
          requestOptions.body = body;
        }

        const response = await oauthClient.makeApiCall(requestOptions);
        
        if (!response || !response.json) {
          throw new Error('Invalid response from QuickBooks API');
        }

        return response.json;
      },
      `makeAPIRequest(${endpoint})`,
      3, // Max retries
      1000 // Base delay
    );

    // Log API request performance
    const duration = Date.now() - startTime;
    QuickBooksLogger.logAPIRequest(endpoint, method, result.success, duration, companyId, result.error);

    // Log performance metrics
    QuickBooksLogger.logPerformanceMetrics('api-request', {
      duration,
      success: result.success,
      retryCount: result.success ? 0 : 3 // Assume max retries if failed
    }, companyId);

    if (!result.success) {
      throw result.error;
    }

    return result.result;
  }

  /**
   * Disconnect QuickBooks integration and cleanup tokens
   * @param event H3 event for database access
   */
  static async disconnect(event?: H3Event): Promise<void> {
    return safeQuickBooksOperation(async () => {
      const prisma = event ? await getEnhancedPrismaClient(event) : (await import('~/server/lib/db')).unenhancedPrisma;
      
      // Find and deactivate all active integrations
      const activeIntegrations = await prisma.quickBooksIntegration?.findMany({
        where: { isActive: true },
      });

      if (activeIntegrations && activeIntegrations.length > 0) {
        const now = new Date();
        
        // Mark all active integrations as inactive
        await prisma.quickBooksIntegration?.updateMany({
          where: { isActive: true },
          data: {
            isActive: false,
            disconnectedAt: now,
          },
        });

        // Log disconnection events for audit trail
        for (const integration of activeIntegrations) {
          QuickBooksLogger.logConnectionEvent('disconnected', integration.companyId, undefined, {
            disconnectedAt: now,
            source: 'manual-disconnect'
          });
        }

        QuickBooksLogger.info('Disconnect', `Successfully disconnected ${activeIntegrations.length} QuickBooks integration(s)`, {
          count: activeIntegrations.length,
          disconnectedAt: now
        });
      } else {
        QuickBooksLogger.info('Disconnect', 'No active QuickBooks integrations found to disconnect');
      }

      // Clear the OAuth client instance
      this.oauthClient = null;
    }, 'disconnect');
  }

  /**
   * Start the background token refresh scheduler
   * Checks for tokens that need refreshing every 30 minutes
   */
  static startTokenRefreshScheduler(): void {
    return safeQuickBooksOperation(() => {
      const startTime = new Date();
      
      // Clear any existing scheduler
      if (this.schedulerInterval) {
        console.log(`[${startTime.toISOString()}] Stopping existing token refresh scheduler before starting new one`);
        clearInterval(this.schedulerInterval);
        this.schedulerInterval = null;
      }

      // Set up scheduler to run every 30 minutes (1800000 milliseconds)
      const intervalMs = 30 * 60 * 1000; // 30 minutes
      
      this.schedulerInterval = setInterval(async () => {
        const result = await QuickBooksErrorHandler.handleErrorWithRecovery(
          () => this.checkAndRefreshTokens(),
          'scheduledTokenRefresh',
          1, // Only 1 retry for scheduled operations
          5000 // 5 second delay
        );

        if (!result.success) {
          const error = result.error!;
          QuickBooksLogger.logSchedulerEvent('error', `Scheduled token refresh failed: ${error.userMessage}`, error);
          
          // For scheduler errors, we continue running but may need manual intervention
          if (error.type === QuickBooksErrorType.REFRESH_TOKEN_EXPIRED) {
            QuickBooksLogger.warn('Scheduler', 'Refresh token expired - manual reconnection required', error);
          }
        } else {
          QuickBooksLogger.logSchedulerEvent('check-completed', 'Scheduled token refresh completed successfully');
        }
      }, intervalMs);

      QuickBooksLogger.logSchedulerEvent('started', `Token refresh scheduler started - checking every ${intervalMs / 60000} minutes`, { intervalMs });
      
      // Run an initial check immediately (but don't block startup)
      setTimeout(async () => {
        QuickBooksLogger.logSchedulerEvent('check-started', 'Running initial token refresh check...');
        const result = await QuickBooksErrorHandler.handleErrorWithRecovery(
          () => this.checkAndRefreshTokens(),
          'initialTokenRefresh',
          1,
          1000
        );

        if (!result.success) {
          QuickBooksLogger.logSchedulerEvent('error', `Initial token refresh check failed: ${result.error?.userMessage}`, result.error);
        } else {
          QuickBooksLogger.logSchedulerEvent('check-completed', 'Initial token refresh check completed successfully');
        }
      }, 1000); // Wait 1 second after startup to allow server to fully initialize

      return Promise.resolve();
    }, 'startTokenRefreshScheduler');
  }

  /**
   * Stop the background token refresh scheduler
   */
  static stopTokenRefreshScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      QuickBooksLogger.logSchedulerEvent('stopped', 'Token refresh scheduler stopped');
    } else {
      QuickBooksLogger.logSchedulerEvent('stopped', 'Token refresh scheduler was not running');
    }
  }

  /**
   * Check if the scheduler is currently running
   */
  static isSchedulerRunning(): boolean {
    return this.schedulerInterval !== null;
  }

  /**
   * Restart the scheduler (stop and start)
   */
  static restartTokenRefreshScheduler(): void {
    QuickBooksLogger.info('Scheduler', 'Restarting QuickBooks token refresh scheduler...');
    this.stopTokenRefreshScheduler();
    this.startTokenRefreshScheduler();
  }

  /**
   * Check all active integrations and refresh tokens that are close to expiry
   * This method is called by the scheduler every 30 minutes
   */
  private static async checkAndRefreshTokens(): Promise<void> {
    const startTime = new Date();
    
    return safeQuickBooksOperation(async () => {
      console.log(`[${startTime.toISOString()}] Running scheduled token refresh check...`);
      
      const { unenhancedPrisma: prisma } = await import('~/server/lib/db');
      
      // Find all active integrations
      const activeIntegrations = await prisma.quickBooksIntegration?.findMany({
        where: { isActive: true },
      });

      if (!activeIntegrations || activeIntegrations.length === 0) {
        console.log(`[${new Date().toISOString()}] No active QuickBooks integrations found`);
        return;
      }

      const now = new Date();
      const refreshThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
      let refreshedCount = 0;
      let errorCount = 0;
      let expiredCount = 0;

      console.log(`[${now.toISOString()}] Found ${activeIntegrations.length} active integration(s) to check`);

      for (const integration of activeIntegrations) {
        const result = await QuickBooksErrorHandler.handleErrorWithRecovery(
          async () => {
            const companyId = integration.companyId;
            const accessTokenExpiresAt = integration.accessTokenExpiresAt;
            const refreshTokenExpiresAt = integration.refreshTokenExpiresAt;

            // Check if refresh token is expired
            if (refreshTokenExpiresAt <= now) {
              const error = new Error(`Refresh token expired for company ${companyId}`);
              const qbError = QuickBooksErrorHandler.createError(error, 'checkAndRefreshTokens');
              qbError.type = QuickBooksErrorType.REFRESH_TOKEN_EXPIRED;
              
              await this.markIntegrationInactive(integration.id);
              throw qbError;
            }

            // Check if access token needs refresh (10 minutes before expiry)
            const timeUntilExpiry = accessTokenExpiresAt.getTime() - now.getTime();
            const minutesUntilExpiry = Math.round(timeUntilExpiry / 60000);
            
            if (timeUntilExpiry <= refreshThreshold) {
              console.log(`[${now.toISOString()}] Access token for company ${companyId} expires in ${minutesUntilExpiry} minutes (at ${accessTokenExpiresAt.toISOString()}), refreshing...`);
              
              const refreshStartTime = new Date();
              const refreshedToken = await this.refreshAccessToken(integration);
              const refreshDuration = new Date().getTime() - refreshStartTime.getTime();
              
              if (refreshedToken) {
                console.log(`[${new Date().toISOString()}] Successfully refreshed token for company ${companyId} (took ${refreshDuration}ms)`);
                return 'refreshed';
              } else {
                throw new Error(`Failed to refresh token for company ${companyId}`);
              }
            } else {
              console.log(`[${now.toISOString()}] Token for company ${companyId} is still valid (expires in ${minutesUntilExpiry} minutes at ${accessTokenExpiresAt.toISOString()})`);
              return 'valid';
            }
          },
          `checkIntegration(${integration.companyId})`,
          1, // Only 1 retry for scheduled checks
          2000 // 2 second delay
        );

        if (!result.success) {
          const error = result.error!;
          
          if (error.type === QuickBooksErrorType.REFRESH_TOKEN_EXPIRED) {
            expiredCount++;
            console.warn(`[${now.toISOString()}] ${error.userMessage}`);
          } else {
            errorCount++;
            console.error(`[${new Date().toISOString()}] Error processing integration for company ${integration.companyId}: ${error.userMessage}`);
          }
        } else if (result.result === 'refreshed') {
          refreshedCount++;
        }
      }

      const endTime = new Date();
      const totalDuration = endTime.getTime() - startTime.getTime();
      
      console.log(`[${endTime.toISOString()}] Token refresh check completed in ${totalDuration}ms: ${refreshedCount} refreshed, ${expiredCount} expired, ${errorCount} errors, ${activeIntegrations.length} total integrations`);

      // Log summary statistics with appropriate severity
      if (errorCount > 0) {
        console.warn(`[${endTime.toISOString()}] Token refresh check had ${errorCount} errors - manual intervention may be required`);
      }
      
      if (expiredCount > 0) {
        console.warn(`[${endTime.toISOString()}] ${expiredCount} integration(s) had expired refresh tokens and were marked inactive`);
      }

      if (refreshedCount === 0 && errorCount === 0 && expiredCount === 0) {
        console.log(`[${endTime.toISOString()}] All integrations are healthy - no action required`);
      }
    }, 'checkAndRefreshTokens');
  }
}