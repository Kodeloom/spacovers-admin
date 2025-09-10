import { auth } from '~/server/lib/auth';
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';
import { QuickBooksErrorHandler, safeQuickBooksOperation } from '~/server/lib/quickbooksErrorHandler';

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    // Check if user has admin role
    const userRoles = session.user.roles || [];
    const isAdmin = userRoles.some((userRole: any) => userRole.role.name === 'ADMIN');
    
    if (!isAdmin) {
        throw createError({ 
            statusCode: 403, 
            statusMessage: 'Forbidden: Only administrators can restart the scheduler' 
        });
    }

    try {
        await safeQuickBooksOperation(async () => {
            const restartTime = new Date();
            console.log(`[${restartTime.toISOString()}] Manual scheduler restart requested by user ${session.user.id}`);
            
            // Restart the scheduler
            QuickBooksTokenManager.restartTokenRefreshScheduler();
            
            // Verify it's running
            const isRunning = QuickBooksTokenManager.isSchedulerRunning();
            
            if (!isRunning) {
                throw new Error('Failed to restart scheduler - scheduler is not running after restart attempt');
            }
            
            console.log(`[${new Date().toISOString()}] Scheduler successfully restarted by user ${session.user.id}`);
        }, 'manual-scheduler-restart');

        return {
            success: true,
            message: 'QuickBooks token refresh scheduler has been restarted successfully.',
            restartedAt: new Date(),
            schedulerRunning: QuickBooksTokenManager.isSchedulerRunning()
        };

    } catch (error: unknown) {
        const qbError = QuickBooksErrorHandler.createError(error, `scheduler-restart-${session.user.id}`);
        console.error(`Error restarting scheduler for user ${session.user.id}:`, qbError.message);
        
        throw createError({
            statusCode: 500,
            statusMessage: qbError.userMessage,
            data: {
                errorType: qbError.type,
                recoverySuggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type)
            }
        });
    }
});