import { auth } from '~/server/lib/auth';
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { QuickBooksErrorHandler, safeQuickBooksOperation } from '~/server/lib/quickbooksErrorHandler';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    
    // Check if this is a webhook from Intuit (has eventNotifications)
    const isWebhook = body?.eventNotifications && Array.isArray(body.eventNotifications);
    
    if (isWebhook) {
        // Handle webhook disconnection from Intuit
        console.log('QuickBooks disconnect webhook received.');

        // TODO: Implement webhook verification to ensure the request is from Intuit.
        // This is critical for security in a production environment.
        // It typically involves checking a signature in the request headers.
        
        const realmId = body?.eventNotifications?.[0]?.realmId;

        if (!realmId) {
            console.warn('Disconnect webhook received without a realmId.');
            throw createError({ 
                statusCode: 400, 
                statusMessage: 'Bad Request: realmId not found in webhook payload.' 
            });
        }

        try {
            const prisma = await getEnhancedPrismaClient(event);
            
            // Find and deactivate the integration for this realmId
            const integration = await prisma.quickBooksIntegration?.findFirst({
                where: { 
                    companyId: realmId,
                    isActive: true 
                }
            });

            if (!integration) {
                console.log(`No active QuickBooks integration found for realmId: ${realmId}. Nothing to disconnect.`);
                return { success: true, message: 'Integration not found, no action needed.' };
            }

            await prisma.quickBooksIntegration?.update({
                where: { id: integration.id },
                data: {
                    isActive: false,
                    disconnectedAt: new Date(),
                },
            });

            console.log(`Successfully disconnected QuickBooks integration for realmId: ${realmId} via webhook`);
            return { success: true, message: 'QuickBooks integration successfully disconnected via webhook.' };

        } catch (error: unknown) {
            const qbError = QuickBooksErrorHandler.createError(error, `disconnect-webhook-${realmId}`);
            console.error(`Error processing disconnect webhook for realmId ${realmId}:`, qbError.message);
            
            throw createError({
                statusCode: 500,
                statusMessage: qbError.userMessage,
                data: {
                    errorType: qbError.type,
                    requiresReconnection: qbError.requiresReconnection
                }
            });
        }
    } else {
        // Handle manual disconnection request from user
        console.log('Manual QuickBooks disconnect request received.');

        // Verify user authentication and authorization
        const session = await auth.api.getSession({ headers: event.headers });
        if (!session?.user) {
            throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
        }

        // Check if user has admin role (assuming admin-only access for company-wide disconnection)
        // Allow both ADMIN and SUPER_ADMIN roles
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
        if (!session.user.role || !allowedRoles.includes(session.user.role)) {
            throw createError({ 
                statusCode: 403, 
                statusMessage: 'Forbidden: Only administrators can disconnect QuickBooks integration' 
            });
        }

        try {
            // Check if there's an active connection
            const isConnected = await QuickBooksTokenManager.isConnected(event);
            
            if (!isConnected) {
                return { 
                    success: true, 
                    message: 'No active QuickBooks integration found. Already disconnected.',
                    connected: false 
                };
            }

            // Get connection status before disconnecting for logging
            const connectionStatus = await QuickBooksTokenManager.getConnectionStatus(event);
            
            // Perform the disconnection
            await QuickBooksTokenManager.disconnect(event);

            console.log(`Successfully disconnected QuickBooks integration for company ${connectionStatus.companyId} by user ${session.user.id}`);
            
            return { 
                success: true, 
                message: 'QuickBooks integration has been successfully disconnected for your company.',
                connected: false,
                disconnectedAt: new Date(),
                companyId: connectionStatus.companyId
            };

        } catch (error: unknown) {
            const qbError = QuickBooksErrorHandler.createError(error, `manual-disconnect-${session.user.id}`);
            console.error(`Error processing manual disconnect request by user ${session.user.id}:`, qbError.message);
            
            throw createError({
                statusCode: 500,
                statusMessage: qbError.userMessage,
                data: {
                    errorType: qbError.type,
                    requiresReconnection: qbError.requiresReconnection,
                    recoverySuggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type)
                }
            });
        }
    }
}); 