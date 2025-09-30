import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import type { H3Event } from 'h3';
import { auth } from '~/server/lib/auth';
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';

// QuickBooks API Configuration
export const QBO_API_CONFIG = {
    VERSION: 'v3', // Change this to pin to a specific API version
    USER_AGENT: 'Spacovers-Admin/1.0',
    TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * Validates a QuickBooks access token format and basic properties
 * @param token The access token to validate
 * @returns Object with validation result and details
 */
export function validateAccessToken(token: string): { 
    isValid: boolean; 
    errors: string[]; 
    details: { length: number; format: string } 
} {
    const errors: string[] = [];
    
    if (!token) {
        errors.push('Token is null or undefined');
        return { isValid: false, errors, details: { length: 0, format: 'null' } };
    }
    
    if (typeof token !== 'string') {
        errors.push(`Token must be a string, got ${typeof token}`);
        return { isValid: false, errors, details: { length: 0, format: typeof token } };
    }
    
    if (token.length < 10) {
        errors.push(`Token too short: ${token.length} characters (minimum 10 expected)`);
    }
    
    if (token.length > 2000) {
        errors.push(`Token too long: ${token.length} characters (maximum 2000 expected)`);
    }
    
    // Check for basic token format (should not contain obviously invalid characters)
    if (/[\s<>{}[\]\\|`~!@#$%^&*()]+/.test(token)) {
        errors.push('Token contains invalid characters');
    }
    
    // Check if token looks like a JWT (has dots) or OAuth token (base64-like)
    const hasJwtFormat = token.split('.').length >= 2; // More permissive - at least 2 parts
    const hasBase64Format = /^[A-Za-z0-9+/._-]+=*$/.test(token); // Include dots, underscores, hyphens
    const hasQuickBooksFormat = token.length > 100 && /^[A-Za-z0-9+/._-]+$/.test(token); // QuickBooks tokens are typically long
    
    if (!hasJwtFormat && !hasBase64Format && !hasQuickBooksFormat) {
        errors.push('Token does not match expected JWT, base64, or QuickBooks format');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        details: {
            length: token.length,
            format: hasJwtFormat ? 'JWT' : hasBase64Format ? 'base64' : hasQuickBooksFormat ? 'quickbooks' : 'unknown'
        }
    };
}

type AuthenticatedQboClient = {
    oauthClient: InstanceType<typeof OAuthClient>;
    token: {
        access_token: string;
        realmId: string;
    };
}

/**
 * Retrieves a company-wide QuickBooks token using the centralized token manager,
 * and returns a fully authenticated Intuit OAuth client instance and the valid token.
 * 
 * @param event The H3 event object from the server route.
 * @returns A promise that resolves to an object containing the client and the valid token.
 * @throws An error if the user is not authenticated or if no valid token is available.
 */
export async function getQboClient(event: H3Event): Promise<AuthenticatedQboClient> {
    // Verify user authentication (required for accessing QuickBooks features)
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'User not authenticated' });
    }

    // Check if QuickBooks is connected at the company level
    const isConnected = await QuickBooksTokenManager.isConnected(event);
    if (!isConnected) {
        throw createError({ 
            statusCode: 404, 
            statusMessage: 'QuickBooks is not connected for this company. Please connect to QuickBooks first.' 
        });
    }

    // Get valid access token (automatically refreshed if needed)
    const accessToken = await QuickBooksTokenManager.getValidAccessToken(event);
    if (!accessToken) {
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Failed to obtain valid QuickBooks access token. Please reconnect to QuickBooks.' 
        });
    }

    // Get connection status to retrieve company ID
    const connectionStatus = await QuickBooksTokenManager.getConnectionStatus(event);
    if (!connectionStatus.connected || !connectionStatus.companyId) {
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'QuickBooks connection status is invalid. Please reconnect to QuickBooks.' 
        });
    }

    // Create OAuth client with current configuration
    const config = useRuntimeConfig(event);
    const oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment as 'sandbox' | 'production',
        redirectUri: '',
    });

    return { 
        oauthClient, 
        token: {
            access_token: accessToken,
            realmId: connectionStatus.companyId
        }
    };
} 

/**
 * Retrieves a QuickBooks client for webhook operations using the centralized token manager.
 * Webhooks don't have user authentication context, but they can use the company-wide token.
 * 
 * @param event The H3 event object from the server route.
 * @returns A promise that resolves to an object containing the client and the valid token.
 * @throws An error if no valid token is found.
 */
export async function getQboClientForWebhook(event: H3Event): Promise<AuthenticatedQboClient> {
    const startTime = Date.now();
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler, safeQuickBooksOperation } = await import('~/server/lib/quickbooksErrorHandler');
    
    return safeQuickBooksOperation(async () => {
        QuickBooksLogger.debug('WebhookAuth', 'Starting webhook authentication process');
        
        // Check if QuickBooks is connected at the company level
        QuickBooksLogger.debug('WebhookAuth', 'Checking QuickBooks connection status');
        const isConnected = await QuickBooksTokenManager.isConnected(event);
        
        if (!isConnected) {
            QuickBooksLogger.error('WebhookAuth', 'No QuickBooks connection found for webhook operations');
            throw createError({ 
                statusCode: 404, 
                statusMessage: 'No QuickBooks connection found for webhook operations.' 
            });
        }
        
        QuickBooksLogger.debug('WebhookAuth', 'QuickBooks connection confirmed, retrieving access token');

        // Get valid access token (automatically refreshed if needed)
        const accessToken = await QuickBooksTokenManager.getValidAccessToken(event);
        
        if (!accessToken) {
            QuickBooksLogger.error('WebhookAuth', 'Failed to obtain valid QuickBooks access token for webhook operations');
            throw createError({ 
                statusCode: 500, 
                statusMessage: 'Failed to obtain valid QuickBooks access token for webhook operations.' 
            });
        }

        // Validate token format and length
        if (typeof accessToken !== 'string' || accessToken.length < 10) {
            QuickBooksLogger.error('WebhookAuth', 'Invalid access token format received', {
                tokenType: typeof accessToken,
                tokenLength: accessToken?.length || 0,
                tokenPreview: accessToken ? accessToken.substring(0, 10) + '...' : 'null'
            });
            throw createError({ 
                statusCode: 500, 
                statusMessage: 'Invalid access token format received from token manager.' 
            });
        }

        QuickBooksLogger.debug('WebhookAuth', 'Valid access token obtained', {
            tokenLength: accessToken.length,
            tokenPreview: accessToken.substring(0, 20) + '...'
        });

        // Get connection status to retrieve company ID
        QuickBooksLogger.debug('WebhookAuth', 'Retrieving connection status for company ID');
        const connectionStatus = await QuickBooksTokenManager.getConnectionStatus(event);
        
        if (!connectionStatus.connected || !connectionStatus.companyId) {
            QuickBooksLogger.error('WebhookAuth', 'QuickBooks connection status is invalid for webhook operations', {
                connected: connectionStatus.connected,
                hasCompanyId: !!connectionStatus.companyId,
                error: connectionStatus.error
            });
            throw createError({ 
                statusCode: 500, 
                statusMessage: 'QuickBooks connection status is invalid for webhook operations.' 
            });
        }

        QuickBooksLogger.debug('WebhookAuth', 'Connection status retrieved successfully', {
            companyId: connectionStatus.companyId,
            connectedAt: connectionStatus.connectedAt,
            accessTokenExpiresAt: connectionStatus.accessTokenExpiresAt,
            refreshTokenExpiresAt: connectionStatus.refreshTokenExpiresAt
        });

        // Validate token expiry times
        const now = new Date();
        if (connectionStatus.accessTokenExpiresAt && connectionStatus.accessTokenExpiresAt <= now) {
            QuickBooksLogger.warn('WebhookAuth', 'Access token appears to be expired', {
                expiresAt: connectionStatus.accessTokenExpiresAt,
                currentTime: now,
                minutesExpired: Math.round((now.getTime() - connectionStatus.accessTokenExpiresAt.getTime()) / 60000)
            });
        }

        if (connectionStatus.refreshTokenExpiresAt && connectionStatus.refreshTokenExpiresAt <= now) {
            QuickBooksLogger.error('WebhookAuth', 'Refresh token is expired - reconnection required', {
                refreshTokenExpiresAt: connectionStatus.refreshTokenExpiresAt,
                currentTime: now,
                hoursExpired: Math.round((now.getTime() - connectionStatus.refreshTokenExpiresAt.getTime()) / 3600000)
            });
            throw createError({ 
                statusCode: 401, 
                statusMessage: 'QuickBooks refresh token expired. Please reconnect to QuickBooks.' 
            });
        }

        // Create OAuth client with current configuration
        QuickBooksLogger.debug('WebhookAuth', 'Creating OAuth client with runtime configuration');
        const config = useRuntimeConfig(event);
        
        // Validate configuration
        if (!config.qboClientId || !config.qboClientSecret || !config.qboEnvironment) {
            QuickBooksLogger.error('WebhookAuth', 'Missing QuickBooks configuration', {
                hasClientId: !!config.qboClientId,
                hasClientSecret: !!config.qboClientSecret,
                hasEnvironment: !!config.qboEnvironment,
                environment: config.qboEnvironment
            });
            throw createError({ 
                statusCode: 500, 
                statusMessage: 'QuickBooks configuration is incomplete.' 
            });
        }

        const oauthClient = new OAuthClient({
            clientId: config.qboClientId,
            clientSecret: config.qboClientSecret,
            environment: config.qboEnvironment as 'sandbox' | 'production',
            redirectUri: '',
        });

        const result = { 
            oauthClient, 
            token: {
                access_token: accessToken,
                realmId: connectionStatus.companyId
            }
        };

        const duration = Date.now() - startTime;
        QuickBooksLogger.info('WebhookAuth', 'Webhook authentication completed successfully', {
            companyId: connectionStatus.companyId,
            duration,
            environment: config.qboEnvironment
        }, undefined, connectionStatus.companyId);

        return result;
    }, 'getQboClientForWebhook');
} 