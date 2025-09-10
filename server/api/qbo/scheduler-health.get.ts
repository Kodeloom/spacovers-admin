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
            statusMessage: 'Forbidden: Only administrators can check scheduler health' 
        });
    }

    return safeQuickBooksOperation(async () => {
        const now = new Date();
        
        // Check if scheduler is running (this is a simple check)
        const schedulerRunning = QuickBooksTokenManager.isSchedulerRunning();
        
        // Get basic health metrics
        const healthStatus = {
            schedulerRunning,
            lastHealthCheck: now,
            status: schedulerRunning ? 'healthy' : 'stopped',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
        };

        // If scheduler is not running, provide recovery options
        if (!schedulerRunning) {
            const error = QuickBooksErrorHandler.createError(
                new Error('Token refresh scheduler is not running'),
                'scheduler-health-check'
            );
            
            return {
                ...healthStatus,
                error: error.userMessage,
                errorType: error.type,
                recoverySuggestions: QuickBooksErrorHandler.getRecoverySuggestions(error.type),
                canRestart: true
            };
        }

        return healthStatus;
    }, 'scheduler-health-check', {
        schedulerRunning: false,
        status: 'unknown',
        error: 'Failed to check scheduler health',
        lastHealthCheck: new Date()
    });
});