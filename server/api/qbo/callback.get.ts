import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';
import { QuickBooksErrorHandler, safeQuickBooksOperation } from '~/server/lib/quickbooksErrorHandler';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    const session = await auth.api.getSession({ headers: event.headers });

    if (!session?.user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    const oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment,
        redirectUri: `${config.public.authOrigin}/api/qbo/callback`,
    });

    try {
        const authResponse = await oauthClient.createToken(event.node.req.url);
        const tokenResponse = authResponse.getJson();
        const realmId = authResponse.token.realmId;

        if (!realmId) {
            throw new Error("Realm ID not found in token response.");
        }

        // Prepare token data for the new token manager
        const tokenData = {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            expires_in: tokenResponse.expires_in,
            x_refresh_token_expires_in: tokenResponse.x_refresh_token_expires_in,
            realmId: realmId,
        };

        // Use the new QuickBooksTokenManager to store tokens company-wide
        await QuickBooksTokenManager.storeTokens(tokenData, event);

        // For backward compatibility during transition, also update the old per-user token system
        // This ensures existing functionality continues to work while we migrate
        try {
            const prisma = await getEnhancedPrismaClient(event);
            
            const legacyTokenData = {
                realmId: realmId,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                tokenType: tokenResponse.token_type,
                expiresIn: tokenResponse.expires_in,
                xRefreshTokenExpiresIn: tokenResponse.x_refresh_token_expires_in,
                ...(authResponse.token.iat && !isNaN(authResponse.token.iat) && { createdAt: new Date(authResponse.token.iat * 1000) }),
            };

            await prisma.quickbooksToken.upsert({
                where: { userId: session.user.id },
                update: legacyTokenData,
                create: {
                    userId: session.user.id,
                    ...legacyTokenData,
                },
            });
        } catch (legacyError) {
            // Log but don't fail the callback if legacy token storage fails
            console.warn('Failed to store legacy tokens (non-critical):', legacyError);
        }

        console.log('Successfully connected QuickBooks for company:', realmId);
        return sendRedirect(event, '/admin/settings?qbo=success');

    } catch (e: unknown) {
        const qbError = QuickBooksErrorHandler.createError(e, 'oauth-callback');
        console.error('QBO Callback Error:', qbError.message);
        
        // Create user-friendly error message with recovery suggestions
        const errorParams = new URLSearchParams({
            qbo: 'error',
            message: qbError.userMessage,
            errorType: qbError.type,
            requiresReconnection: qbError.requiresReconnection.toString()
        });

        // Add recovery suggestions as separate parameters
        const suggestions = QuickBooksErrorHandler.getRecoverySuggestions(qbError.type);
        suggestions.forEach((suggestion, index) => {
            errorParams.append(`suggestion${index + 1}`, suggestion);
        });
        
        return sendRedirect(event, `/admin/settings?${errorParams.toString()}`);
    }
}); 