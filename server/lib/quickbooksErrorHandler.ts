/**
 * Comprehensive error handling utilities for QuickBooks integration
 * Provides standardized error handling, user-friendly messages, and fallback mechanisms
 */

export enum QuickBooksErrorType {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SCHEDULER_ERROR = 'SCHEDULER_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface QuickBooksError {
  type: QuickBooksErrorType;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryable: boolean;
  requiresReconnection: boolean;
}

export class QuickBooksErrorHandler {
  /**
   * Create a standardized QuickBooks error from various error sources
   */
  static createError(
    error: any, 
    context: string = 'Unknown context',
    additionalDetails?: any
  ): QuickBooksError {
    const timestamp = new Date();
    const errorMessage = error?.message || error?.originalMessage || String(error);
    
    // Determine error type based on error content
    const errorType = this.determineErrorType(error, errorMessage);
    
    // Generate user-friendly message
    const userMessage = this.generateUserMessage(errorType, errorMessage);
    
    // Determine error characteristics
    const { recoverable, retryable, requiresReconnection } = this.getErrorCharacteristics(errorType);
    
    const quickBooksError: QuickBooksError = {
      type: errorType,
      message: `[${context}] ${errorMessage}`,
      userMessage,
      details: {
        originalError: error,
        context,
        ...additionalDetails
      },
      timestamp,
      recoverable,
      retryable,
      requiresReconnection
    };

    // Log the error with appropriate level
    this.logError(quickBooksError);
    
    return quickBooksError;
  }

  /**
   * Determine the error type based on error content and patterns
   */
  private static determineErrorType(error: any, errorMessage: string): QuickBooksErrorType {
    const lowerMessage = errorMessage.toLowerCase();
    
    // Token-related errors
    if (lowerMessage.includes('access_denied') || lowerMessage.includes('unauthorized')) {
      return QuickBooksErrorType.AUTHENTICATION_ERROR;
    }
    
    if (lowerMessage.includes('invalid_grant') || lowerMessage.includes('token') && lowerMessage.includes('expired')) {
      return QuickBooksErrorType.TOKEN_EXPIRED;
    }
    
    if (lowerMessage.includes('refresh') && lowerMessage.includes('expired')) {
      return QuickBooksErrorType.REFRESH_TOKEN_EXPIRED;
    }
    
    // Network errors
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || 
        error?.code === 'ENOTFOUND' || lowerMessage.includes('network')) {
      return QuickBooksErrorType.NETWORK_ERROR;
    }
    
    // API errors
    if (error?.status || error?.statusCode || lowerMessage.includes('api')) {
      return QuickBooksErrorType.API_ERROR;
    }
    
    // Database errors
    if (lowerMessage.includes('database') || lowerMessage.includes('prisma') || 
        lowerMessage.includes('connection') && lowerMessage.includes('db')) {
      return QuickBooksErrorType.DATABASE_ERROR;
    }
    
    // Scheduler errors
    if (lowerMessage.includes('scheduler') || lowerMessage.includes('interval')) {
      return QuickBooksErrorType.SCHEDULER_ERROR;
    }
    
    // Configuration errors
    if (lowerMessage.includes('config') || lowerMessage.includes('environment') ||
        lowerMessage.includes('client_id') || lowerMessage.includes('client_secret')) {
      return QuickBooksErrorType.CONFIGURATION_ERROR;
    }
    
    return QuickBooksErrorType.UNKNOWN_ERROR;
  }

  /**
   * Generate user-friendly error messages
   */
  private static generateUserMessage(errorType: QuickBooksErrorType, originalMessage: string): string {
    switch (errorType) {
      case QuickBooksErrorType.TOKEN_EXPIRED:
        return 'Your QuickBooks session has expired. The system will automatically refresh your connection.';
      
      case QuickBooksErrorType.REFRESH_TOKEN_EXPIRED:
        return 'Your QuickBooks connection has expired and needs to be renewed. Please reconnect to QuickBooks to continue using the integration.';
      
      case QuickBooksErrorType.NETWORK_ERROR:
        return 'Unable to connect to QuickBooks due to a network issue. Please check your internet connection and try again.';
      
      case QuickBooksErrorType.API_ERROR:
        return 'QuickBooks is temporarily unavailable. Please try again in a few minutes.';
      
      case QuickBooksErrorType.DATABASE_ERROR:
        return 'A system error occurred while managing your QuickBooks connection. Please try again or contact support if the issue persists.';
      
      case QuickBooksErrorType.SCHEDULER_ERROR:
        return 'The automatic token refresh system encountered an issue. Your connection may require manual refresh.';
      
      case QuickBooksErrorType.AUTHENTICATION_ERROR:
        return 'QuickBooks authentication failed. Please try connecting again and ensure you grant the necessary permissions.';
      
      case QuickBooksErrorType.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this QuickBooks operation. Please contact your administrator.';
      
      case QuickBooksErrorType.CONFIGURATION_ERROR:
        return 'QuickBooks integration is not properly configured. Please contact your system administrator.';
      
      default:
        return 'An unexpected error occurred with the QuickBooks integration. Please try again or contact support if the issue persists.';
    }
  }

  /**
   * Determine error characteristics for handling logic
   */
  private static getErrorCharacteristics(errorType: QuickBooksErrorType): {
    recoverable: boolean;
    retryable: boolean;
    requiresReconnection: boolean;
  } {
    switch (errorType) {
      case QuickBooksErrorType.TOKEN_EXPIRED:
        return { recoverable: true, retryable: true, requiresReconnection: false };
      
      case QuickBooksErrorType.REFRESH_TOKEN_EXPIRED:
        return { recoverable: true, retryable: false, requiresReconnection: true };
      
      case QuickBooksErrorType.NETWORK_ERROR:
        return { recoverable: true, retryable: true, requiresReconnection: false };
      
      case QuickBooksErrorType.API_ERROR:
        return { recoverable: true, retryable: true, requiresReconnection: false };
      
      case QuickBooksErrorType.DATABASE_ERROR:
        return { recoverable: true, retryable: true, requiresReconnection: false };
      
      case QuickBooksErrorType.SCHEDULER_ERROR:
        return { recoverable: true, retryable: true, requiresReconnection: false };
      
      case QuickBooksErrorType.AUTHENTICATION_ERROR:
        return { recoverable: true, retryable: false, requiresReconnection: true };
      
      case QuickBooksErrorType.AUTHORIZATION_ERROR:
        return { recoverable: false, retryable: false, requiresReconnection: false };
      
      case QuickBooksErrorType.CONFIGURATION_ERROR:
        return { recoverable: false, retryable: false, requiresReconnection: false };
      
      default:
        return { recoverable: true, retryable: false, requiresReconnection: false };
    }
  }

  /**
   * Log errors with appropriate severity levels
   */
  private static logError(error: QuickBooksError): void {
    const logMessage = `[QuickBooks Error] ${error.type}: ${error.message}`;
    
    switch (error.type) {
      case QuickBooksErrorType.REFRESH_TOKEN_EXPIRED:
      case QuickBooksErrorType.AUTHENTICATION_ERROR:
        console.warn(logMessage, {
          type: error.type,
          userMessage: error.userMessage,
          timestamp: error.timestamp,
          requiresReconnection: error.requiresReconnection
        });
        break;
      
      case QuickBooksErrorType.CONFIGURATION_ERROR:
      case QuickBooksErrorType.AUTHORIZATION_ERROR:
        console.error(logMessage, {
          type: error.type,
          userMessage: error.userMessage,
          timestamp: error.timestamp,
          details: error.details
        });
        break;
      
      case QuickBooksErrorType.NETWORK_ERROR:
      case QuickBooksErrorType.API_ERROR:
      case QuickBooksErrorType.SCHEDULER_ERROR:
        console.warn(logMessage, {
          type: error.type,
          retryable: error.retryable,
          timestamp: error.timestamp
        });
        break;
      
      default:
        console.error(logMessage, {
          type: error.type,
          userMessage: error.userMessage,
          timestamp: error.timestamp,
          details: error.details
        });
    }
  }

  /**
   * Handle errors with automatic recovery attempts
   */
  static async handleErrorWithRecovery<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 3,
    retryDelayMs: number = 1000
  ): Promise<{ success: boolean; result?: T; error?: QuickBooksError }> {
    let lastError: QuickBooksError | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return { success: true, result };
      } catch (error) {
        lastError = this.createError(error, `${context} (attempt ${attempt}/${maxRetries})`);
        
        // Don't retry if error is not retryable
        if (!lastError.retryable) {
          break;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`[QuickBooks Recovery] Retrying ${context} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return { success: false, error: lastError! };
  }

  /**
   * Create a fallback response for when operations fail
   */
  static createFallbackResponse(error: QuickBooksError, fallbackData?: any): any {
    return {
      success: false,
      error: {
        type: error.type,
        message: error.userMessage,
        timestamp: error.timestamp,
        recoverable: error.recoverable,
        requiresReconnection: error.requiresReconnection
      },
      fallbackData: fallbackData || null
    };
  }

  /**
   * Check if an error indicates the need for reconnection
   */
  static requiresReconnection(error: any): boolean {
    const qbError = this.createError(error, 'Reconnection check');
    return qbError.requiresReconnection;
  }

  /**
   * Get recovery suggestions for different error types
   */
  static getRecoverySuggestions(errorType: QuickBooksErrorType): string[] {
    switch (errorType) {
      case QuickBooksErrorType.REFRESH_TOKEN_EXPIRED:
        return [
          'Click "Connect to QuickBooks" to reauthorize the integration',
          'Ensure you have admin permissions in QuickBooks',
          'Contact support if reconnection continues to fail'
        ];
      
      case QuickBooksErrorType.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try again in a few minutes',
          'Contact your network administrator if the issue persists'
        ];
      
      case QuickBooksErrorType.API_ERROR:
        return [
          'Wait a few minutes and try again',
          'Check QuickBooks service status',
          'Contact support if the issue continues'
        ];
      
      case QuickBooksErrorType.SCHEDULER_ERROR:
        return [
          'The system will automatically retry',
          'Manual refresh may be required temporarily',
          'Contact support if automatic refresh stops working'
        ];
      
      default:
        return [
          'Try refreshing the page',
          'Wait a few minutes and try again',
          'Contact support if the issue persists'
        ];
    }
  }
}

/**
 * Utility function to safely execute QuickBooks operations with error handling
 */
export async function safeQuickBooksOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const qbError = QuickBooksErrorHandler.createError(error, context);
    
    if (fallbackValue !== undefined) {
      console.warn(`[QuickBooks Fallback] Using fallback value for ${context}: ${qbError.userMessage}`);
      return fallbackValue;
    }
    
    throw qbError;
  }
}