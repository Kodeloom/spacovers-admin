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
    // Check if QuickBooks is connected at the company level
    const isConnected = await QuickBooksTokenManager.isConnected(event);
    if (!isConnected) {
        throw createError({ 
            statusCode: 404, 
            statusMessage: 'No QuickBooks connection found for webhook operations.' 
        });
    }

    // Get valid access token (automatically refreshed if needed)
    const accessToken = await QuickBooksTokenManager.getValidAccessToken(event);
    if (!accessToken) {
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'Failed to obtain valid QuickBooks access token for webhook operations.' 
        });
    }

    // Get connection status to retrieve company ID
    const connectionStatus = await QuickBooksTokenManager.getConnectionStatus(event);
    if (!connectionStatus.connected || !connectionStatus.companyId) {
        throw createError({ 
            statusCode: 500, 
            statusMessage: 'QuickBooks connection status is invalid for webhook operations.' 
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