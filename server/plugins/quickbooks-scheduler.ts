import { QuickBooksTokenManager } from '~/server/lib/quickbooksTokenManager';
import { QuickBooksErrorHandler } from '~/server/lib/quickbooksErrorHandler';
import { QuickBooksMonitor } from '~/server/lib/quickbooksMonitor';
import { QuickBooksLogger } from '~/server/lib/quickbooksLogger';

/**
 * Nitro server plugin that initializes the QuickBooks token refresh scheduler and monitoring
 * This plugin runs when the server starts and sets up automatic token refresh and health monitoring
 */
export default async function () {
  const startTime = new Date();
  QuickBooksLogger.info('SchedulerPlugin', 'Initializing QuickBooks services...');
  
  try {
    // Start the token refresh scheduler with error handling
    await QuickBooksTokenManager.startTokenRefreshScheduler();
    QuickBooksLogger.info('SchedulerPlugin', 'QuickBooks token refresh scheduler started successfully');
    
    // Start monitoring services
    const monitor = QuickBooksMonitor.getInstance();
    monitor.start();
    QuickBooksLogger.info('SchedulerPlugin', 'QuickBooks monitoring services started successfully');
    
  } catch (error) {
    const qbError = QuickBooksErrorHandler.createError(error, 'scheduler-plugin-startup');
    QuickBooksLogger.error('SchedulerPlugin', `Failed to start QuickBooks services: ${qbError.userMessage}`, qbError);
    
    // Log recovery suggestions
    const suggestions = QuickBooksErrorHandler.getRecoverySuggestions(qbError.type);
    QuickBooksLogger.warn('SchedulerPlugin', 'Recovery suggestions available', { suggestions });
    
    // Don't throw the error to prevent server startup failure
    // The scheduler can be manually restarted if needed
    QuickBooksLogger.warn('SchedulerPlugin', 'Server will continue with limited QuickBooks functionality. Manual intervention may be required.');
  }

  // Set up graceful shutdown handler
  const gracefulShutdown = (signal: string) => {
    QuickBooksLogger.info('SchedulerPlugin', `Received ${signal}, shutting down QuickBooks services...`);
    
    try {
      // Stop monitoring first
      const monitor = QuickBooksMonitor.getInstance();
      monitor.stop();
      QuickBooksLogger.info('SchedulerPlugin', 'QuickBooks monitoring services stopped');
      
      // Stop scheduler
      QuickBooksTokenManager.stopTokenRefreshScheduler();
      QuickBooksLogger.info('SchedulerPlugin', 'QuickBooks token refresh scheduler stopped');
      
    } catch (error) {
      QuickBooksLogger.error('SchedulerPlugin', `Error during ${signal} shutdown`, error);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}