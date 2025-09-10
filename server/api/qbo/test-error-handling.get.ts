import { auth } from '~/server/lib/auth';
import { QuickBooksErrorHandler, QuickBooksErrorType } from '~/server/lib/quickbooksErrorHandler';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

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
            statusMessage: 'Forbidden: Only administrators can test error handling' 
        });
    }

    const query = getQuery(event);
    const testType = query.type as string || 'all';

    try {
        const testResults: any = {};

        // Test different error types
        if (testType === 'all' || testType === 'token_expired') {
            try {
                throw new Error('invalid_grant: Token has expired');
            } catch (error) {
                const qbError = QuickBooksErrorHandler.createError(error, 'test-token-expired');
                testResults.tokenExpired = {
                    type: qbError.type,
                    userMessage: qbError.userMessage,
                    recoverable: qbError.recoverable,
                    retryable: qbError.retryable,
                    requiresReconnection: qbError.requiresReconnection,
                    suggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type)
                };
            }
        }

        if (testType === 'all' || testType === 'network_error') {
            try {
                const networkError = new Error('Network timeout');
                (networkError as any).code = 'ETIMEDOUT';
                throw networkError;
            } catch (error) {
                const qbError = QuickBooksErrorHandler.createError(error, 'test-network-error');
                testResults.networkError = {
                    type: qbError.type,
                    userMessage: qbError.userMessage,
                    recoverable: qbError.recoverable,
                    retryable: qbError.retryable,
                    requiresReconnection: qbError.requiresReconnection,
                    suggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type)
                };
            }
        }

        if (testType === 'all' || testType === 'refresh_expired') {
            try {
                throw new Error('Refresh token has expired after 101 days');
            } catch (error) {
                const qbError = QuickBooksErrorHandler.createError(error, 'test-refresh-expired');
                qbError.type = QuickBooksErrorType.REFRESH_TOKEN_EXPIRED;
                testResults.refreshExpired = {
                    type: qbError.type,
                    userMessage: qbError.userMessage,
                    recoverable: qbError.recoverable,
                    retryable: qbError.retryable,
                    requiresReconnection: qbError.requiresReconnection,
                    suggestions: QuickBooksErrorHandler.getRecoverySuggestions(qbError.type)
                };
            }
        }

        // Test logging
        QuickBooksLogger.info('ErrorHandlingTest', 'Error handling test completed successfully', testResults, session.user.id);

        // Get recent logs for verification
        const recentLogs = QuickBooksLogger.getRecentLogs(10);
        const errorStats = QuickBooksLogger.getErrorStats(5);

        return {
            success: true,
            message: 'Error handling test completed successfully',
            testResults,
            recentLogs,
            errorStats,
            testedBy: session.user.id,
            timestamp: new Date()
        };

    } catch (error) {
        const qbError = QuickBooksErrorHandler.createError(error, 'error-handling-test');
        QuickBooksLogger.error('ErrorHandlingTest', 'Error handling test failed', error, session.user.id);
        
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