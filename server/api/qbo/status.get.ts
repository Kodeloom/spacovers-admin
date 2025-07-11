import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

interface QboToken {
    token_type: 'Bearer';
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    realmId?: string;
    iat?: number;
}

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const prisma = await getEnhancedPrismaClient(event);
    const config = useRuntimeConfig(event);

    const tokenRecord = await prisma.quickbooksToken.findUnique({
        where: { userId: session.user.id },
    });

    if (!tokenRecord) {
        return { connected: false, message: 'No QuickBooks token found for this user.' };
    }

    const oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment as 'sandbox' | 'production',
        redirectUri: '', // Not needed for refresh
    });

    // Reconstruct the token object for the client
    const tokenForClient: QboToken = {
        token_type: tokenRecord.tokenType as 'Bearer',
        access_token: tokenRecord.accessToken,
        refresh_token: tokenRecord.refreshToken,
        expires_in: tokenRecord.expiresIn,
        x_refresh_token_expires_in: tokenRecord.xRefreshTokenExpiresIn,
        realmId: tokenRecord.realmId,
        // The 'lat' (issued at time) is needed for the isTokenExpired() check
        // We use our 'updatedAt' field as the source of truth for when the token was last set
        iat: Math.floor(new Date(tokenRecord.updatedAt).getTime() / 1000),
    };

    oauthClient.setToken(tokenForClient);

    // Manual token expiration check, as isTokenExpired() is unreliable.
    const now = new Date();
    const tokenCreationTime = new Date(tokenRecord.updatedAt); 
    const expirationTime = new Date(tokenCreationTime.getTime() + (tokenRecord.expiresIn * 1000));
    
    // Check if the token expires in the next 60 seconds to be safe.
    const isTokenNearingExpiration = expirationTime.getTime() - now.getTime() < 60 * 1000;

    if (isTokenNearingExpiration) {
        console.log('QuickBooks token is expired or nearing expiration, attempting to refresh...');
        try {
            const authResponse = await oauthClient.refresh();
            const newToken = authResponse.getJson();

            await prisma.quickbooksToken.update({
                where: { id: tokenRecord.id },
                data: {
                    accessToken: newToken.access_token,
                    refreshToken: newToken.refresh_token,
                    expiresIn: newToken.expires_in,
                    xRefreshTokenExpiresIn: newToken.x_refresh_token_expires_in,
                },
            });

            // Update the client with the new token for the subsequent API call
            oauthClient.setToken(newToken);

        } catch (e) {
            console.error('Failed to refresh QuickBooks token:', e);
            // If refresh fails, it's likely the user needs to re-auth
            await prisma.quickbooksToken.delete({ where: { id: tokenRecord.id }});
            return { connected: false, message: 'Failed to refresh expired token. Please reconnect.' };
        }
    }

    // Use the oauth client to make a direct API call, bypassing node-quickbooks
    try {
        const companyInfoUrl = oauthClient.environment === 'sandbox' 
            ? OAuthClient.environment.sandbox 
            : OAuthClient.environment.production;
        
        const apiResponse = await oauthClient.makeApiCall({
            url: `${companyInfoUrl}v3/company/${oauthClient.token.realmId}/companyinfo/${oauthClient.token.realmId}`
        });

        const companyInfo = apiResponse.json;
        return { connected: true, companyName: companyInfo.CompanyInfo.CompanyName };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Failed to connect to QuickBooks with stored token:', errorMessage);
        return { connected: false, error: 'Failed to fetch company info.' };
    }
}); 