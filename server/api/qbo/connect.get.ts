import OAuthClient from 'intuit-oauth';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);

    const oauthClient = new OAuthClient({
        clientId: config.qboClientId,
        clientSecret: config.qboClientSecret,
        environment: config.qboEnvironment,
        redirectUri: `${config.public.authOrigin}/api/qbo/callback`,
    });

    const authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: 'test-state', // a csrf token
    });

    await sendRedirect(event, authUri);
}); 