// Comprehensive error handling utilities for the warehouse system

export interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  suggestions?: string[];
  retryable: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Common error codes and their user-friendly messages
export const ERROR_CODES = {
  // Barcode errors
  INVALID_BARCODE_FORMAT: {
    code: 'INVALID_BARCODE_FORMAT',
    message: 'Invalid barcode format',
    userMessage: 'The scanned barcode format is invalid. Please scan a valid packing slip barcode.',
    suggestions: ['Ensure you are scanning a packing slip barcode', 'Check that the barcode is not damaged'],
    retryable: true
  },

  BARCODE_NOT_FOUND: {
    code: 'BARCODE_NOT_FOUND',
    message: 'Barcode not found in system',
    userMessage: 'This barcode is not recognized in our system.',
    suggestions: ['Verify you are scanning the correct barcode', 'Contact your supervisor if this is a new order'],
    retryable: true
  },

  // Scanner errors
  SCANNER_NOT_AUTHORIZED: {
    code: 'SCANNER_NOT_AUTHORIZED',
    message: 'Scanner not authorized for user',
    userMessage: 'This scanner is not assigned to you. Please use your assigned scanner.',
    suggestions: ['Use your assigned scanner', 'Contact your supervisor to reassign scanners'],
    retryable: false
  },

  SCANNER_WRONG_STATION: {
    code: 'SCANNER_WRONG_STATION',
    message: 'Scanner assigned to different station',
    userMessage: 'This scanner is assigned to a different station.',
    suggestions: ['Use the correct scanner for this station', 'Move to the station assigned to your scanner'],
    retryable: false
  },

  // Workflow errors
  INVALID_STATUS_TRANSITION: {
    code: 'INVALID_STATUS_TRANSITION',
    message: 'Invalid status transition',
    userMessage: 'This item cannot be processed at this station in its current state.',
    suggestions: ['Check the item\'s current status', 'Ensure the item has completed the previous station'],
    retryable: false
  },

  USER_HAS_ACTIVE_WORK: {
    code: 'USER_HAS_ACTIVE_WORK',
    message: 'User already has active work',
    userMessage: 'You are already working on another item. Please complete your current work first.',
    suggestions: ['Complete your current work item', 'Use the "Complete Work" button if you\'ve finished'],
    retryable: false
  },

  ITEM_BEING_PROCESSED: {
    code: 'ITEM_BEING_PROCESSED',
    message: 'Item is being processed by another user',
    userMessage: 'Another worker is currently processing this item.',
    suggestions: ['Wait for the other worker to complete their task', 'Check with your supervisor if needed'],
    retryable: true
  },

  // Order errors
  ORDER_NOT_APPROVED: {
    code: 'ORDER_NOT_APPROVED',
    message: 'Order not approved for production',
    userMessage: 'This order has not been approved for production yet.',
    suggestions: ['Contact the office to approve the order', 'Check with your supervisor'],
    retryable: true
  },

  ORDER_ARCHIVED: {
    code: 'ORDER_ARCHIVED',
    message: 'Order is archived or cancelled',
    userMessage: 'This order has been archived or cancelled and cannot be processed.',
    suggestions: ['Contact the office for clarification', 'Check with your supervisor'],
    retryable: false
  },

  // Network and system errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    suggestions: ['Check your internet connection', 'Try again in a few moments', 'Contact IT support if the problem persists'],
    retryable: true
  },

  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    userMessage: 'A system error occurred. Please try again.',
    suggestions: ['Try the operation again', 'Contact IT support if the problem persists'],
    retryable: true
  },

  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    message: 'Database operation failed',
    userMessage: 'Unable to save your changes. Please try again.',
    suggestions: ['Try the operation again', 'Contact IT support if the problem persists'],
    retryable: true
  }
} as const;

/**
 * Get error details from error code
 */
export function getErrorDetails(code: string): ErrorDetails {
  return ERROR_CODES[code as keyof typeof ERROR_CODES] || {
    code: 'UNKNOWN_ERROR',
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    suggestions: ['Try the operation again', 'Contact support if the problem persists'],
    retryable: true
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  details?: string,
  statusCode: number = 400
) {
  const errorDetails = getErrorDetails(code);

  return {
    statusCode,
    statusMessage: errorDetails.userMessage,
    data: {
      code: errorDetails.code,
      message: errorDetails.message,
      userMessage: errorDetails.userMessage,
      suggestions: errorDetails.suggestions,
      retryable: errorDetails.retryable,
      details: details || null,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handlePrismaError(error: any): ErrorDetails {
  if (error.code === 'P2002') {
    // Unique constraint violation
    const field = error.meta?.target?.[0] || 'field';
    return {
      code: 'DUPLICATE_VALUE',
      message: `Duplicate value for ${field}`,
      userMessage: `This ${field} already exists. Please use a different value.`,
      suggestions: [`Choose a different ${field}`, 'Check if this record already exists'],
      retryable: false
    };
  }

  if (error.code === 'P2025') {
    // Record not found
    return {
      code: 'RECORD_NOT_FOUND',
      message: 'Record not found',
      userMessage: 'The requested item was not found.',
      suggestions: ['Check that the item exists', 'Refresh the page and try again'],
      retryable: true
    };
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return {
      code: 'INVALID_REFERENCE',
      message: 'Invalid reference to related record',
      userMessage: 'Cannot complete this operation due to related data constraints.',
      suggestions: ['Check that all required related items exist', 'Contact support for assistance'],
      retryable: false
    };
  }

  // Default database error
  return getErrorDetails('DATABASE_ERROR');
}

/**
 * Validate barcode format and return detailed error if invalid
 */
export function validateBarcodeFormat(barcode: string): ValidationError | null {
  if (!barcode || typeof barcode !== 'string') {
    return {
      field: 'barcode',
      message: 'Barcode is required',
      code: 'BARCODE_REQUIRED'
    };
  }

  if (barcode.trim().length === 0) {
    return {
      field: 'barcode',
      message: 'Barcode cannot be empty',
      code: 'BARCODE_EMPTY'
    };
  }

  // Check format: PREFIX-ORDER-ITEM
  const parts = barcode.split('-');
  if (parts.length !== 3) {
    return {
      field: 'barcode',
      message: 'Invalid barcode format. Expected: PREFIX-ORDER-ITEM',
      code: 'INVALID_BARCODE_FORMAT'
    };
  }

  const [prefix, orderNumber, itemId] = parts;

  if (prefix.length !== 3) {
    return {
      field: 'barcode',
      message: 'Invalid prefix format. Expected 3 characters.',
      code: 'INVALID_PREFIX_FORMAT'
    };
  }

  if (!orderNumber.trim()) {
    return {
      field: 'barcode',
      message: 'Order number cannot be empty',
      code: 'EMPTY_ORDER_NUMBER'
    };
  }

  if (!itemId.trim()) {
    return {
      field: 'barcode',
      message: 'Item ID cannot be empty',
      code: 'EMPTY_ITEM_ID'
    };
  }

  return null; // Valid
}

/**
 * Log error for debugging and monitoring
 */
export function logError(
  error: any,
  context: string,
  userId?: string,
  additionalData?: Record<string, any>
) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    userId: userId || 'anonymous',
    error: {
      message: error.message || 'Unknown error',
      stack: error.stack || null,
      code: error.code || null,
      statusCode: error.statusCode || null
    },
    additionalData: additionalData || {}
  };

  console.error('System Error:', JSON.stringify(errorLog, null, 2));

  // In production, you might want to send this to a logging service
  // like Sentry, LogRocket, or CloudWatch
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break; // Don't wait after the last attempt
      }

      // Check if error is retryable
      const errorDetails = error.statusCode ?
        getErrorDetails(error.data?.code || 'UNKNOWN_ERROR') :
        getErrorDetails('NETWORK_ERROR');

      if (!errorDetails.retryable) {
        throw error; // Don't retry non-retryable errors
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Format error for display in UI
 */
export function formatErrorForUI(error: any): {
  title: string;
  message: string;
  suggestions: string[];
  retryable: boolean;
} {
  console.log('formatErrorForUI received:', error);
  console.log('Error message:', error.message);
  console.log('Error code:', error.code);

  // Check for statusMessage first (API errors)
  if (error.statusMessage) {
    return {
      title: 'Error',
      message: error.statusMessage,
      suggestions: ['Try again', 'Contact your supervisor if the problem persists'],
      retryable: true
    };
  }

  let errorDetails: ErrorDetails;

  if (error.data?.code) {
    // Structured error from our API
    errorDetails = {
      code: error.data.code,
      message: error.data.message,
      userMessage: error.data.userMessage,
      suggestions: error.data.suggestions || [],
      retryable: error.data.retryable || false
    };
  } else if (error.code && ERROR_CODES[error.code as keyof typeof ERROR_CODES]) {
    // Error with known code - but use custom message if available
    errorDetails = getErrorDetails(error.code);
    if (error.message && error.code === 'INVALID_STATUS_TRANSITION') {
      // Use the custom workflow error message instead of the generic one
      errorDetails.userMessage = error.message;
    }
  } else if (error.statusCode) {
    // HTTP error
    errorDetails = getErrorDetails('SERVER_ERROR');
  } else if (error.message && (error.message.includes('cannot be processed at') || error.message.includes('Cannot transition from'))) {
    // Custom workflow error with enhanced suggestions
    const suggestions = ['Check the item\'s current status', 'Ensure the item has completed the previous station'];

    if (error.itemStatus === 'NOT_STARTED_PRODUCTION') {
      suggestions.push('This item needs to start at the Cutting station first');
    } else if (error.itemStatus === 'CUTTING') {
      suggestions.push('This item is currently being processed at Cutting station');
    } else if (error.itemStatus === 'SEWING') {
      suggestions.push('This item is currently being processed at Sewing station');
    } else if (error.itemStatus === 'FOAM_CUTTING') {
      suggestions.push('This item is currently being processed at Foam Cutting station');
    } else if (error.itemStatus === 'PACKAGING') {
      suggestions.push('This item is currently being processed at Packaging station');
    } else if (error.itemStatus === 'PRODUCT_FINISHED') {
      suggestions.push('This item is done and ready for final processing');
    } else if (error.itemStatus === 'READY') {
      suggestions.push('This item is ready for shipping');
    }

    suggestions.push('Contact your supervisor if unsure');

    return {
      title: 'Workflow Error',
      message: error.message,
      suggestions,
      retryable: false
    };
  } else if (error.message) {
    // Use the actual error message if available
    return {
      title: 'Error',
      message: error.message,
      suggestions: ['Try again', 'Contact your supervisor if the problem persists'],
      retryable: true
    };
  } else {
    // Generic error
    errorDetails = getErrorDetails('UNKNOWN_ERROR');
  }

  return {
    title: errorDetails.code === 'INVALID_STATUS_TRANSITION' ? 'Workflow Error' : 'Error',
    message: errorDetails.userMessage,
    suggestions: errorDetails.suggestions || [],
    retryable: errorDetails.retryable
  };
}