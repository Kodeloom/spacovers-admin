import OAuthClient from 'intuit-oauth';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

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

    const prisma = await getEnhancedPrismaClient(event);

    try {
        const authResponse = await oauthClient.createToken(event.node.req.url);
        const tokenResponse = authResponse.getJson();
        const realmId = authResponse.token.realmId;

        if (!realmId) {
            throw new Error("Realm ID not found in token response.");
        }

        const tokenData = {
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
            update: tokenData,
            create: {
                userId: session.user.id,
                ...tokenData,
            },
        });

        return sendRedirect(event, '/admin/settings?qbo=success');

    } catch (e: unknown) {
        const error = e as { originalMessage?: string; message: string };
        console.error('QBO Callback Error:', error.originalMessage || error.message);
        const errorMessage = error.originalMessage || 'An unknown error occurred during QuickBooks authorization.';
        return sendRedirect(event, `/admin/settings?qbo=error&message=${encodeURIComponent(errorMessage)}`);
    }
}); 