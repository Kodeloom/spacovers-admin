import { getEnhancedPrismaClient } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
    console.log('QuickBooks disconnect webhook received.');

    // TODO: Implement webhook verification to ensure the request is from Intuit.
    // This is critical for security in a production environment.
    // It typically involves checking a signature in the request headers.
    // For now, we will proceed with the understanding that this is a trusted request.
    
    const body = await readBody(event);
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
        
        const token = await prisma.quickbooksToken.findFirst({
            where: { realmId: realmId }
        });

        if (!token) {
            console.log(`No QuickBooks token found for realmId: ${realmId}. Nothing to delete.`);
            // Return a 200 OK even if not found, as the end state (no token) is achieved.
            return { success: true, message: 'Token not found, no action needed.' };
        }

        await prisma.quickbooksToken.delete({
            where: { id: token.id }
        });

        console.log(`Successfully deleted QuickBooks token for realmId: ${realmId}`);
        return { success: true, message: 'QuickBooks token successfully disconnected.' };

    } catch (error: unknown) {
        console.error(`Error processing disconnect webhook for realmId ${realmId}:`, error instanceof Error ? error.message : error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error while processing disconnect event.',
        });
    }
}); 