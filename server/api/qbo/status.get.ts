import { auth } from '~/server/lib/auth';
import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';
import { QuickBooksErrorHandler } from '~/server/lib/quickbooksErrorHandler';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';
import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';

export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({ headers: event.headers });
    if (!session?.user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    try {
        // Get detailed connection status from the token manager
        const connectionStatus = await QuickBooksTokenManager.getConnectionStatus(event);

        if (!connectionStatus.connected) {
            return {
                connected: false,
                message: connectionStatus.error || 'No active QuickBooks integration found.',
                automaticRefresh: false,
            };
        }

        // Calculate time until token expiry
        const now = new Date();
        const accessTokenExpiresAt = connectionStatus.accessTokenExpiresAt!;
        const refreshTokenExpiresAt = connectionStatus.refreshTokenExpiresAt!;
        
        const accessTokenMinutesRemaining = Math.max(0, Math.floor((accessTokenExpiresAt.getTime() - now.getTime()) / 60000));
        const refreshTokenDaysRemaining = Math.max(0, Math.floor((refreshTokenExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        // Try to fetch company information to verify the connection
        let companyName = 'Unknown';
        try {
            const companyInfo = await QuickBooksTokenManager.makeAPIRequest(
                `companyinfo/${connectionStatus.companyId}`,
                'GET',
                undefined,
                event
            );
            
            if (companyInfo?.QueryResponse?.CompanyInfo?.[0]?.Name) {
                companyName = companyInfo.QueryResponse.CompanyInfo[0].Name;
            }
        } catch (apiError) {
            console.warn('Failed to fetch company info for status check:', apiError);
            // Don't fail the status check if we can't fetch company info
        }

        // Determine if automatic refresh is active
        const automaticRefreshActive = accessTokenMinutesRemaining > 0 && refreshTokenDaysRemaining > 0;

        // Get monitoring information
        const monitor = QuickBooksMonitor.getInstance();
        const schedulerStats = QuickBooksLogger.getSchedulerHealthStats(60);
        const errorStats = QuickBooksLogger.getErrorStats(60);
        const monitoringStats = monitor.getMonitoringStats();

        return {
            connected: true,
            companyName,
            companyId: connectionStatus.companyId,
            connectedAt: connectionStatus.connectedAt,
            lastRefreshedAt: connectionStatus.lastRefreshedAt,
            tokenHealth: {
                accessToken: {
                    expiresAt: accessTokenExpiresAt,
                    minutesRemaining: accessTokenMinutesRemaining,
                    isExpired: accessTokenMinutesRemaining <= 0,
                    needsRefresh: accessTokenMinutesRemaining <= 10, // Refresh threshold
                },
                refreshToken: {
                    expiresAt: refreshTokenExpiresAt,
                    daysRemaining: refreshTokenDaysRemaining,
                    isExpired: refreshTokenDaysRemaining <= 0,
                    warningThreshold: refreshTokenDaysRemaining <= 7, // Warn when less than 7 days
                },
            },
            automaticRefresh: {
                enabled: automaticRefreshActive,
                schedulerRunning: QuickBooksTokenManager.isSchedulerRunning(),
                nextRefreshCheck: 'Every 30 minutes',
                refreshThreshold: '10 minutes before expiry',
                status: automaticRefreshActive ? 'Active' : 'Inactive - Token expired',
                lastCheck: schedulerStats.lastCheckTime,
                successRate: schedulerStats.totalChecks > 0 
                    ? Math.round((schedulerStats.successfulChecks / schedulerStats.totalChecks) * 100) 
                    : 0,
            },
            monitoring: {
                uptime: monitoringStats.uptime,
                lastHealthCheck: monitoringStats.lastHealthCheck,
                schedulerHealth: schedulerStats.isHealthy,
                errorCount: errorStats.totalErrors,
                criticalErrors: errorStats.criticalErrors,
                tokensRefreshed: schedulerStats.tokensRefreshed,
            },
            message: automaticRefreshActive 
                ? 'QuickBooks integration is active with automatic token refresh'
                : 'QuickBooks integration requires reconnection',
        };

    } catch (error: unknown) {
        const qbError = QuickBooksErrorHandler.createError(error, 'status-endpoint');
        
        return {
            connected: false,
            error: qbError.userMessage,
            automaticRefresh: false,
            message: qbError.userMessage,
            errorType: qbError.type,
            requiresReconnection: qbError.requiresReconnection,
            recoverySuggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type),
        };
    }
}); 