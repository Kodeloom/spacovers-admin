/**
 * PO Validation Error Handling Utilities
 * Provides comprehensive error handling, validation, and recovery mechanisms
 * for the Purchase Order validation system
 */

import type { POValidationResult } from '~/server/lib/POValidationService'

// PO Validation specific error types
export interface POValidationError {
  type: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'NETWORK_ERROR' | 'INVALID_INPUT' | 'PERMISSION_ERROR' | 'TIMEOUT_ERROR' | 'CACHE_ERROR'
  code: string
  message: string
  userMessage: string
  suggestions: string[]
  retryable: boolean
  details?: any
  context?: POValidationErrorContext
}

// Error context for better debugging and user support
export interface POValidationErrorContext {
  operation: string
  timestamp: Date
  poNumber: string
  customerId: string
  level: 'order' | 'item'
  excludeId?: string
  networkStatus: 'online' | 'offline' | 'unknown'
  cacheStatus: 'hit' | 'miss' | 'error'
}

// Error recovery strategies
export interface POValidationRecoveryStrategy {
  canRecover: boolean
  recoveryAction?: () => Promise<boolean>
  userAction?: string
  preventRetry?: boolean
  fallbackResult?: POValidationResult
}

/**
 * PO Validation Error Codes and their details
 */
export const PO_VALIDATION_ERROR_CODES = {
  // Input validation errors
  INVALID_PO_NUMBER: {
    type: 'INVALID_INPUT' as const,
    code: 'INVALID_PO_NUMBER',
    message: 'Invalid PO number format',
    userMessage: 'Please enter a valid PO number.',
    suggestions: ['PO number cannot be empty', 'Check for special characters or formatting issues'],
    retryable: false
  },

  INVALID_CUSTOMER_ID: {
    type: 'INVALID_INPUT' as const,
    code: 'INVALID_CUSTOMER_ID',
    message: 'Invalid customer ID format',
    userMessage: 'Customer information is invalid.',
    suggestions: ['Refresh the page and try again', 'Contact support if the problem persists'],
    retryable: false
  },

  MISSING_REQUIRED_FIELDS: {
    type: 'INVALID_INPUT' as const,
    code: 'MISSING_REQUIRED_FIELDS',
    message: 'Required fields are missing',
    userMessage: 'Please fill in all required fields.',
    suggestions: ['Ensure PO number and customer are selected', 'Check that all form fields are completed'],
    retryable: false
  },

  // Database operation errors
  DATABASE_CONNECTION_ERROR: {
    type: 'DATABASE_ERROR' as const,
    code: 'DATABASE_CONNECTION_ERROR',
    message: 'Unable to connect to database',
    userMessage: 'Unable to validate PO number due to a system error.',
    suggestions: ['Try again in a few moments', 'Contact IT support if the problem persists'],
    retryable: true
  },

  DATABASE_QUERY_ERROR: {
    type: 'DATABASE_ERROR' as const,
    code: 'DATABASE_QUERY_ERROR',
    message: 'Database query failed',
    userMessage: 'Unable to check for duplicate PO numbers.',
    suggestions: ['Try the validation again', 'Contact support if the error continues'],
    retryable: true
  },

  DATABASE_TIMEOUT: {
    type: 'TIMEOUT_ERROR' as const,
    code: 'DATABASE_TIMEOUT',
    message: 'Database query timed out',
    userMessage: 'PO validation is taking longer than expected.',
    suggestions: ['Try again - the system may be busy', 'Contact support if timeouts continue'],
    retryable: true
  },

  // Network and connectivity errors
  NETWORK_CONNECTION_ERROR: {
    type: 'NETWORK_ERROR' as const,
    code: 'NETWORK_CONNECTION_ERROR',
    message: 'Network connection failed',
    userMessage: 'Unable to connect to the validation service.',
    suggestions: ['Check your internet connection', 'Try again in a few moments'],
    retryable: true
  },

  API_ENDPOINT_UNAVAILABLE: {
    type: 'NETWORK_ERROR' as const,
    code: 'API_ENDPOINT_UNAVAILABLE',
    message: 'Validation service is unavailable',
    userMessage: 'PO validation service is temporarily unavailable.',
    suggestions: ['Try again in a few minutes', 'Contact IT support if the service remains unavailable'],
    retryable: true
  },

  // Permission and authorization errors
  INSUFFICIENT_PERMISSIONS: {
    type: 'PERMISSION_ERROR' as const,
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'User lacks permission to validate PO numbers',
    userMessage: 'You do not have permission to validate PO numbers.',
    suggestions: ['Contact your supervisor for access', 'Ensure you are logged in with the correct account'],
    retryable: false
  },

  SESSION_EXPIRED: {
    type: 'PERMISSION_ERROR' as const,
    code: 'SESSION_EXPIRED',
    message: 'User session has expired',
    userMessage: 'Your session has expired. Please log in again.',
    suggestions: ['Log out and log back in', 'Refresh the page to restore your session'],
    retryable: false
  },

  // Cache and performance errors
  CACHE_ERROR: {
    type: 'CACHE_ERROR' as const,
    code: 'CACHE_ERROR',
    message: 'Cache operation failed',
    userMessage: 'Validation may be slower than usual.',
    suggestions: ['The validation will still work but may take longer', 'Contact support if performance issues persist'],
    retryable: true
  },

  CACHE_CORRUPTION: {
    type: 'CACHE_ERROR' as const,
    code: 'CACHE_CORRUPTION',
    message: 'Cached validation data is corrupted',
    userMessage: 'Validation cache has been reset.',
    suggestions: ['The next validation may take a bit longer', 'This is a one-time issue that has been resolved'],
    retryable: true
  },

  // Validation logic errors
  DUPLICATE_VALIDATION_FAILED: {
    type: 'VALIDATION_ERROR' as const,
    code: 'DUPLICATE_VALIDATION_FAILED',
    message: 'Unable to complete duplicate validation',
    userMessage: 'Cannot verify if this PO number is already in use.',
    suggestions: ['Manually check existing orders for this PO number', 'Contact support for assistance'],
    retryable: true
  },

  VALIDATION_SERVICE_ERROR: {
    type: 'VALIDATION_ERROR' as const,
    code: 'VALIDATION_SERVICE_ERROR',
    message: 'Validation service encountered an error',
    userMessage: 'PO validation service is experiencing issues.',
    suggestions: ['Try the validation again', 'Proceed with caution and verify manually'],
    retryable: true
  }
} as const

/**
 * Get error details from error code
 */
export function getPOValidationErrorDetails(code: string): POValidationError {
  const errorDetails = PO_VALIDATION_ERROR_CODES[code as keyof typeof PO_VALIDATION_ERROR_CODES]
  
  if (!errorDetails) {
    return {
      type: 'VALIDATION_ERROR',
      code: 'UNKNOWN_ERROR',
      message: 'Unknown validation error occurred',
      userMessage: 'An unexpected error occurred during PO validation.',
      suggestions: ['Try the validation again', 'Contact support if the problem persists'],
      retryable: true
    }
  }

  return {
    type: errorDetails.type,
    code: errorDetails.code,
    message: errorDetails.message,
    userMessage: errorDetails.userMessage,
    suggestions: errorDetails.suggestions,
    retryable: errorDetails.retryable
  }
}

/**
 * Create error context for PO validation operations
 */
export function createPOValidationContext(
  operation: string,
  poNumber: string,
  customerId: string,
  level: 'order' | 'item',
  excludeId?: string
): POValidationErrorContext {
  return {
    operation,
    timestamp: new Date(),
    poNumber,
    customerId,
    level,
    excludeId,
    networkStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'unknown',
    cacheStatus: 'miss' // Will be updated by cache operations
  }
}

/**
 * Determine recovery strategy for PO validation errors
 */
export function getPOValidationRecoveryStrategy(
  error: POValidationError,
  context: POValidationErrorContext
): POValidationRecoveryStrategy {
  switch (error.type) {
    case 'INVALID_INPUT':
      return {
        canRecover: false,
        userAction: 'Correct the input and try again',
        preventRetry: true
      }

    case 'DATABASE_ERROR':
      return {
        canRecover: true,
        userAction: 'Wait a moment and try again',
        fallbackResult: {
          isDuplicate: false,
          warningMessage: 'Unable to validate PO number. Please verify manually that this PO is not already in use.'
        }
      }

    case 'NETWORK_ERROR':
      return {
        canRecover: context.networkStatus === 'online',
        userAction: 'Check your internet connection and try again',
        fallbackResult: {
          isDuplicate: false,
          warningMessage: 'Network error prevented PO validation. Please verify manually that this PO is not already in use.'
        }
      }

    case 'PERMISSION_ERROR':
      return {
        canRecover: false,
        userAction: error.code === 'SESSION_EXPIRED' ? 'Please log in again' : 'Contact your supervisor for access',
        preventRetry: true
      }

    case 'TIMEOUT_ERROR':
      return {
        canRecover: true,
        userAction: 'The system may be busy. Try again in a few moments.',
        fallbackResult: {
          isDuplicate: false,
          warningMessage: 'Validation timed out. Please verify manually that this PO is not already in use.'
        }
      }

    case 'CACHE_ERROR':
      return {
        canRecover: true,
        recoveryAction: async () => {
          try {
            // Clear corrupted cache data
            if (typeof window !== 'undefined' && window.localStorage) {
              const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('po_validation'))
              cacheKeys.forEach(key => localStorage.removeItem(key))
            }
            return true
          } catch (err) {
            return false
          }
        },
        userAction: 'Cache has been cleared. Try the validation again.'
      }

    case 'VALIDATION_ERROR':
    default:
      return {
        canRecover: true,
        userAction: 'Try the validation again or proceed with manual verification',
        fallbackResult: {
          isDuplicate: false,
          warningMessage: 'Unable to complete automatic validation. Please verify manually that this PO is not already in use.'
        }
      }
  }
}

/**
 * Enhanced error logging for PO validation with privacy protection
 */
export function logPOValidationError(
  error: POValidationError,
  context: POValidationErrorContext,
  userId?: string
): void {
  // Create sanitized log entry (remove sensitive data)
  const logEntry = {
    timestamp: context.timestamp.toISOString(),
    operation: context.operation,
    errorType: error.type,
    errorCode: error.code,
    errorMessage: error.message,
    level: context.level,
    networkStatus: context.networkStatus,
    cacheStatus: context.cacheStatus,
    userId: userId ? 'user_' + userId.substring(0, 8) : 'anonymous', // Partial ID only
    retryable: error.retryable,
    hasDetails: !!error.details,
    // Don't log actual PO numbers or customer IDs for privacy
    hasPONumber: !!context.poNumber,
    hasCustomerId: !!context.customerId
  }

  console.error('PO Validation Error:', JSON.stringify(logEntry, null, 2))

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.logError('po_validation_error', logEntry)
  }
}

/**
 * Create user-friendly error messages for PO validation
 */
export function formatPOValidationError(
  error: POValidationError,
  context: POValidationErrorContext
): {
  title: string
  message: string
  suggestions: string[]
  canRetry: boolean
  severity: 'low' | 'medium' | 'high'
  showFallback: boolean
  fallbackResult?: POValidationResult
} {
  const recovery = getPOValidationRecoveryStrategy(error, context)
  
  let severity: 'low' | 'medium' | 'high' = 'medium'
  
  // Determine severity based on error type and impact
  if (error.type === 'PERMISSION_ERROR' || error.type === 'INVALID_INPUT') {
    severity = 'high'
  } else if (error.type === 'CACHE_ERROR') {
    severity = 'low'
  }

  return {
    title: getPOValidationErrorTitle(error.type),
    message: error.userMessage,
    suggestions: [
      ...error.suggestions,
      ...(recovery.userAction ? [recovery.userAction] : []),
      'Contact support if the problem continues'
    ],
    canRetry: error.retryable && !recovery.preventRetry,
    severity,
    showFallback: !!recovery.fallbackResult,
    fallbackResult: recovery.fallbackResult
  }
}

/**
 * Get appropriate error title based on error type
 */
function getPOValidationErrorTitle(errorType: POValidationError['type']): string {
  switch (errorType) {
    case 'INVALID_INPUT':
      return 'Input Validation Error'
    case 'DATABASE_ERROR':
      return 'Database Error'
    case 'NETWORK_ERROR':
      return 'Network Connection Error'
    case 'PERMISSION_ERROR':
      return 'Permission Error'
    case 'TIMEOUT_ERROR':
      return 'Request Timeout'
    case 'CACHE_ERROR':
      return 'Cache Error'
    case 'VALIDATION_ERROR':
      return 'Validation Error'
    default:
      return 'System Error'
  }
}

/**
 * Validate PO validation input parameters
 */
export function validatePOValidationInput(
  poNumber: string,
  customerId: string,
  level: 'order' | 'item'
): POValidationError | null {
  if (!poNumber || typeof poNumber !== 'string' || poNumber.trim().length === 0) {
    return getPOValidationErrorDetails('INVALID_PO_NUMBER')
  }

  if (!customerId || typeof customerId !== 'string' || customerId.trim().length === 0) {
    return getPOValidationErrorDetails('INVALID_CUSTOMER_ID')
  }

  if (!level || !['order', 'item'].includes(level)) {
    return {
      type: 'INVALID_INPUT',
      code: 'INVALID_VALIDATION_LEVEL',
      message: 'Invalid validation level',
      userMessage: 'System error: Invalid validation level specified.',
      suggestions: ['Refresh the page and try again', 'Contact support if the problem persists'],
      retryable: false
    }
  }

  // Additional PO number format validation
  if (poNumber.length > 100) {
    return {
      type: 'INVALID_INPUT',
      code: 'PO_NUMBER_TOO_LONG',
      message: 'PO number is too long',
      userMessage: 'PO number cannot exceed 100 characters.',
      suggestions: ['Enter a shorter PO number', 'Check for extra characters or spaces'],
      retryable: false
    }
  }

  return null
}

/**
 * Handle Prisma/database specific errors for PO validation
 */
export function handlePOValidationDatabaseError(error: any, context: POValidationErrorContext): POValidationError {
  // Handle specific Prisma error codes
  if (error.code === 'P2002') {
    return {
      type: 'DATABASE_ERROR',
      code: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'Unique constraint violation',
      userMessage: 'A database constraint was violated during validation.',
      suggestions: ['Try the validation again', 'Contact support if the error persists'],
      retryable: true,
      context
    }
  }

  if (error.code === 'P2025') {
    return {
      type: 'DATABASE_ERROR',
      code: 'RECORD_NOT_FOUND',
      message: 'Record not found during validation',
      userMessage: 'Unable to find related records for validation.',
      suggestions: ['Ensure the customer and order data exists', 'Try refreshing the page'],
      retryable: true,
      context
    }
  }

  if (error.code === 'P2024') {
    return getPOValidationErrorDetails('DATABASE_TIMEOUT')
  }

  // Handle connection errors
  if (error.message && error.message.includes('connect')) {
    return getPOValidationErrorDetails('DATABASE_CONNECTION_ERROR')
  }

  // Generic database error
  return {
    ...getPOValidationErrorDetails('DATABASE_QUERY_ERROR'),
    context,
    details: error.message
  }
}

/**
 * Retry PO validation with exponential backoff
 */
export async function retryPOValidation<T>(
  validationFn: () => Promise<T>,
  context: POValidationErrorContext,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await validationFn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries) {
        break // Don't wait after the last attempt
      }

      // Check if error is retryable
      const poError = error.retryable !== undefined ? error : getPOValidationErrorDetails('VALIDATION_SERVICE_ERROR')
      
      if (!poError.retryable) {
        throw error // Don't retry non-retryable errors
      }

      // Log retry attempt
      console.warn(`PO validation attempt ${attempt + 1} failed, retrying in ${baseDelay * Math.pow(2, attempt)}ms`, {
        operation: context.operation,
        poNumber: context.poNumber ? 'present' : 'missing',
        customerId: context.customerId ? 'present' : 'missing',
        error: error.message
      })

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Check system health for PO validation functionality
 */
export function checkPOValidationSystemHealth(): {
  healthy: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check network connectivity
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    issues.push('No network connection detected')
    recommendations.push('Check your internet connection')
  }

  // Check localStorage for caching
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = 'po_validation_health_check_' + Date.now()
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
    }
  } catch (err) {
    recommendations.push('Browser storage is limited - validation caching may not work optimally')
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendations
  }
}