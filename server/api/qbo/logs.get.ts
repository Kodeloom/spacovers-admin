import { auth } from '~/server/lib/auth';
import { QuickBooksLogger, LogLevel } from '~/server/lib/quickbooksLogger';

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
            statusMessage: 'Forbidden: Only administrators can view logs' 
        });
    }

    const query = getQuery(event);
    const count = parseInt(query.count as string) || 50;
    const level = query.level as LogLevel;
    const component = query.component as string;

    try {
        const logs = QuickBooksLogger.getRecentLogs(count, level, component);
        const errorStats = QuickBooksLogger.getErrorStats(60); // Last 60 minutes

        return {
            logs,
            errorStats,
            totalLogs: logs.length,
            filters: {
                count,
                level: level || 'all',
                component: component || 'all'
            }
        };
    } catch (error) {
        console.error('Failed to retrieve QuickBooks logs:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to retrieve logs'
        });
    }
});