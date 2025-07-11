import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import type { H3Event } from 'h3';
import { auth } from '~/server/lib/auth';

type AuthenticatedQboClient = {
    oauthClient: InstanceType<typeof OAuthClient>;
    token: {
        access_token: string;
        realmId: string;
    };
}

/**
 * Retrieves a user's QuickBooks token from the database, refreshes it if necessary,
 * and returns a fully authenticated Intuit OAuth client instance and the valid token.
 * 
 * @param event The H3 event object from the server route.
 * @returns A promise that resolves to an object containing the client and the valid token.
 * @throws An error if the user is not authenticated or if the token cannot be refreshed.
 */
export async function getQboClient(event: H3Event): Promise<AuthenticatedQboClient> {
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user?.id) {
        throw createError({ statusCode: 401, statusMessage: 'User not authenticated' });
    }

    const prisma = await getEnhancedPrismaClient(event);
    const config = useRuntimeConfig(event);
    
    const tokenRecord = await prisma.quickbooksToken.findUnique({
        where: { userId: session.user.id },
    });

    if (!tokenRecord) {
        throw createError({ statusCode: 404, statusMessage: 'QuickBooks token not found for this user. Please connect to QuickBooks first.' });
    }

    const oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment as 'sandbox' | 'production',
        redirectUri: '',
    });

    // Create our own authoritative token object from the DB record
    // This is the source of truth for the token's state within this function.
    let authoritativeToken = {
        ...tokenRecord,
        token_type: 'Bearer' as const,
        access_token: tokenRecord.accessToken,
        refresh_token: tokenRecord.refreshToken,
        lat: Math.floor(new Date(tokenRecord.updatedAt).getTime() / 1000),
    };
    
    oauthClient.setToken(authoritativeToken);

    const now = new Date();
    const expirationTime = new Date(new Date(tokenRecord.updatedAt).getTime() + (tokenRecord.expiresIn * 1000));
    const isTokenNearingExpiration = expirationTime.getTime() - now.getTime() < 60 * 1000;

    if (isTokenNearingExpiration) {
        try {
            const authResponse = await oauthClient.refresh();
            const newTokenData = authResponse.getJson();

            // Update our authoritative token object, ensuring realmId is preserved.
            authoritativeToken = {
                ...authoritativeToken,
                ...newTokenData,
                realmId: tokenRecord.realmId, // Explicitly carry over the realmId
            };

            await prisma.quickbooksToken.update({
                where: { id: tokenRecord.id },
                data: {
                    accessToken: authoritativeToken.access_token,
                    refreshToken: authoritativeToken.refresh_token,
                    expiresIn: authoritativeToken.expires_in,
                    xRefreshTokenExpiresIn: authoritativeToken.x_refresh_token_expires_in,
                },
            });

            oauthClient.setToken(authoritativeToken);
        } catch (e) {
            console.error('Failed to refresh QuickBooks token:', e);
            await prisma.quickbooksToken.delete({ where: { id: tokenRecord.id }});
            throw createError({ statusCode: 500, statusMessage: 'Failed to refresh expired token. Please reconnect.' });
        }
    }
    
    if (!authoritativeToken.access_token || !authoritativeToken.realmId) {
        throw createError({ statusCode: 500, statusMessage: 'Could not retrieve a valid token after processing.' });
    }

    return { 
        oauthClient, 
        token: {
            access_token: authoritativeToken.access_token,
            realmId: authoritativeToken.realmId
        }
    };
} 