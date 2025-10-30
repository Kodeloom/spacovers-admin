/**
 * Print Queue Database Error Handling Utilities
 * Provides comprehensive error handling, validation, and recovery mechanisms
 * for the print queue database operations
 */

import type { PrintQueueItem } from '~/server/lib/PrintQueueRepository'

// Print Queue Database specific error types
export interface PrintQueueDatabaseError {
  type: 'DATABASE_ERROR' | 'VALIDATION_ERROR' | 'CONCURRENCY_ERROR' | 'INTEGRITY_ERROR' | 'TIMEOUT_ERROR'
  code: string
  message: string
  userMessage: string
  suggestions: string[]
  retryable: boolean
  details?: any
  context?: PrintQueueDatabaseErrorContext
}

// Error context for better debugging and user support
export interface PrintQueueDatabaseErrorContext {
  operation: string
  timestamp: Date
  userId?: string
  orderItemIds?: string[]
  queueItemIds?: string[]
  batchSize?: number
  queueStatus?: {
    totalItems: number
    unprintedItems: number
  }
}

// Error recovery strategies
export interface PrintQueueRecoveryStrategy {
  canRecover: boolean
  recoveryAction?: () => Promise<boolean>
  userAction?: string
  preventRetry?: boolean
  fallbackData?: any
}

/**
 * Print Queue Database Error Codes and their details
 */
export const PRINT_QUEUE_DATABASE_ERROR_CODES = {
  // Database connection and query errors
  CONNECTION_FAILED: {
    type: 'DATABASE_ERROR' as const,
    code: 'CONNECTION_FAILED',
    message: 'Database connection failed',
    userMessage: 'Unable to connect to the print queue database.',
    suggestions: ['Try again in a few moments', 'Contact IT support if the problem persists'],
    retryable: true
  },

  QUERY_TIMEOUT: {
    type: 'TIMEOUT_ERROR' as const,
    code: 'QUERY_TIMEOUT',
    message: 'Database query timed out',
    userMessage: 'The print queue operation is taking longer than expected.',
    suggestions: ['Try again - the system may be busy', 'Contact support if timeouts continue'],
    retryable: true
  },

  TRANSACTION_FAILED: {
    type: 'DATABASE_ERROR' as const,
    code: 'TRANSACTION_FAILED',
    message: 'Database transaction failed',
    userMessage: 'Unable to complete the print queue operation due to a database error.',
    suggestions: ['Try the operation again', 'Contact support if the error persists'],
    retryable: true
  },

  // Data validation and integrity errors
  INVALID_ORDER_ITEM_ID: {
    type: 'VALIDATION_ERROR' as const,
    code: 'INVALID_ORDER_ITEM_ID',
    message: 'Invalid order item ID provided',
    userMessage: 'One or more order items are invalid.',
    suggestions: ['Refresh the page and try again', 'Verify the order items still exist'],
    retryable: false
  },

  ORDER_ITEM_NOT_FOUND: {
    type: 'VALIDATION_ERROR' as const,
    code: 'ORDER_ITEM_NOT_FOUND',
    message: 'Order item not found in database',
    userMessage: 'One or more order items could not be found.',
    suggestions: ['Refresh the page to get the latest data', 'Check if the order items were deleted'],
    retryable: false
  },

  QUEUE_ITEM_NOT_FOUND: {
    type: 'VALIDATION_ERROR' as const,
    code: 'QUEUE_ITEM_NOT_FOUND',
    message: 'Print queue item not found',
    userMessage: 'The requested items are no longer in the print queue.',
    suggestions: ['Refresh the print queue view', 'Items may have already been processed'],
    retryable: false
  },

  DUPLICATE_QUEUE_ENTRY: {
    type: 'INTEGRITY_ERROR' as const,
    code: 'DUPLICATE_QUEUE_ENTRY',
    message: 'Item already exists in print queue',
    userMessage: 'One or more items are already in the print queue.',
    suggestions: ['Check the current print queue', 'Items may have been added by another user'],
    retryable: false
  },

  // Concurrency and state errors
  ITEM_ALREADY_PRINTED: {
    type: 'CONCURRENCY_ERROR' as const,
    code: 'ITEM_ALREADY_PRINTED',
    message: 'Item has already been marked as printed',
    userMessage: 'These items have already been marked as printed.',
    suggestions: ['Refresh the print queue to see current status', 'Items were processed by another user'],
    retryable: false
  },

  CONCURRENT_MODIFICATION: {
    type: 'CONCURRENCY_ERROR' as const,
    code: 'CONCURRENT_MODIFICATION',
    message: 'Item was modified by another process',
    userMessage: 'Another user modified these items while you were working.',
    suggestions: ['Refresh the page and try again', 'Check the current status of the items'],
    retryable: true
  },

  QUEUE_STATE_INCONSISTENT: {
    type: 'INTEGRITY_ERROR' as const,
    code: 'QUEUE_STATE_INCONSISTENT',
    message: 'Print queue state is inconsistent',
    userMessage: 'The print queue data is inconsistent.',
    suggestions: ['Refresh the print queue view', 'Contact support if the problem persists'],
    retryable: true
  },

  // Foreign key and relationship errors
  INVALID_ORDER_REFERENCE: {
    type: 'INTEGRITY_ERROR' as const,
    code: 'INVALID_ORDER_REFERENCE',
    message: 'Invalid order reference in queue item',
    userMessage: 'Print queue item references an invalid order.',
    suggestions: ['Refresh the page', 'Contact support if the error continues'],
    retryable: false
  },

  ORPHANED_QUEUE_ITEM: {
    type: 'INTEGRITY_ERROR' as const,
    code: 'ORPHANED_QUEUE_ITEM',
    message: 'Print queue item has no valid order item reference',
    userMessage: 'Print queue contains items with missing order data.',
    suggestions: ['Refresh the print queue', 'Contact support to clean up orphaned items'],
    retryable: false
  }
} as const

/**
 * Get error details from error code
 */
export function getPrintQueueDatabaseErrorDetails(code: string): PrintQueueDatabaseError {
  const errorDetails = PRINT_QUEUE_DATABASE_ERROR_CODES[code as keyof typeof PRINT_QUEUE_DATABASE_ERROR_CODES]
  
  if (!errorDetails) {
    return {
      type: 'DATABASE_ERROR',
      code: 'UNKNOWN_DATABASE_ERROR',
      message: 'Unknown database error occurred',
      userMessage: 'An unexpected database error occurred.',
      suggestions: ['Try the operation again', 'Contact support if the problem persists'],
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
 * Create error context for print queue database operations
 */
export function createPrintQueueErrorContext(
  operation: string,
  userId?: string,
  additionalData?: {
    orderItemIds?: string[]
    queueItemIds?: string[]
    batchSize?: number
    queueStatus?: { totalItems: number; unprintedItems: number }
  }
): PrintQueueDatabaseErrorContext {
  return {
    operation,
    timestamp: new Date(),
    userId,
    ...additionalData
  }
}

/**
 * Handle Prisma/database specific errors for print queue operations
 */
export function handlePrintQueueDatabaseError(
  error: any, 
  context: PrintQueueDatabaseErrorContext
): PrintQueueDatabaseError {
  // Handle specific Prisma error codes
  if (error.code === 'P2002') {
    // Unique constraint violation - likely duplicate queue entry
    return {
      ...getPrintQueueDatabaseErrorDetails('DUPLICATE_QUEUE_ENTRY'),
      context,
      details: error.meta
    }
  }

  if (error.code === 'P2025') {
    // Record not found
    const errorCode = context.operation.includes('queue') ? 'QUEUE_ITEM_NOT_FOUND' : 'ORDER_ITEM_NOT_FOUND'
    return {
      ...getPrintQueueDatabaseErrorDetails(errorCode),
      context,
      details: error.meta
    }
  }

  if (error.code === 'P2003') {
    // Foreign key constraint violation
    return {
      ...getPrintQueueDatabaseErrorDetails('INVALID_ORDER_REFERENCE'),
      context,
      details: error.meta
    }
  }

  if (error.code === 'P2024') {
    // Timeout
    return {
      ...getPrintQueueDatabaseErrorDetails('QUERY_TIMEOUT'),
      context,
      details: error.message
    }
  }

  if (error.code === 'P2034') {
    // Transaction failed
    return {
      ...getPrintQueueDatabaseErrorDetails('TRANSACTION_FAILED'),
      context,
      details: error.message
    }
  }

  // Handle connection errors
  if (error.message && (error.message.includes('connect') || error.message.includes('ECONNREFUSED'))) {
    return {
      ...getPrintQueueDatabaseErrorDetails('CONNECTION_FAILED'),
      context,
      details: error.message
    }
  }

  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
    return {
      ...getPrintQueueDatabaseErrorDetails('QUERY_TIMEOUT'),
      context,
      details: error.message
    }
  }

  // Generic database error
  return {
    ...getPrintQueueDatabaseErrorDetails('UNKNOWN_DATABASE_ERROR'),
    context,
    details: error.message || 'Unknown database error'
  }
}

/**
 * Determine recovery strategy for print queue database errors
 */
export function getPrintQueueRecoveryStrategy(
  error: PrintQueueDatabaseError,
  context: PrintQueueDatabaseErrorContext
): PrintQueueRecoveryStrategy {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return {
        canRecover: false,
        userAction: 'Refresh the page and verify the data',
        preventRetry: true
      }

    case 'DATABASE_ERROR':
      return {
        canRecover: true,
        userAction: 'Wait a moment and try again',
        recoveryAction: async () => {
          // Could implement database health check here
          return true
        }
      }

    case 'TIMEOUT_ERROR':
      return {
        canRecover: true,
        userAction: 'The system may be busy. Try again in a few moments.'
      }

    case 'CONCURRENCY_ERROR':
      return {
        canRecover: true,
        userAction: 'Refresh the page to get the latest data and try again',
        recoveryAction: async () => {
          // Could implement cache invalidation here
          return true
        }
      }

    case 'INTEGRITY_ERROR':
      return {
        canRecover: error.code === 'QUEUE_STATE_INCONSISTENT',
        userAction: error.code === 'DUPLICATE_QUEUE_ENTRY' 
          ? 'Items are already in the queue - check the current queue status'
          : 'Refresh the page and contact support if the problem persists',
        preventRetry: error.code === 'DUPLICATE_QUEUE_ENTRY' || error.code === 'ORPHANED_QUEUE_ITEM'
      }

    default:
      return {
        canRecover: true,
        userAction: 'Try the operation again or contact support'
      }
  }
}

/**
 * Validate print queue operation input
 */
export function validatePrintQueueInput(
  operation: string,
  data: {
    orderItemIds?: string[]
    queueItemIds?: string[]
    userId?: string
  }
): PrintQueueDatabaseError | null {
  if (operation === 'addToQueue') {
    if (!data.orderItemIds || !Array.isArray(data.orderItemIds) || data.orderItemIds.length === 0) {
      return {
        type: 'VALIDATION_ERROR',
        code: 'MISSING_ORDER_ITEMS',
        message: 'No order item IDs provided',
        userMessage: 'No items were selected to add to the print queue.',
        suggestions: ['Select items to add to the queue', 'Refresh the page if no items are available'],
        retryable: false
      }
    }

    const invalidIds = data.orderItemIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0)
    if (invalidIds.length > 0) {
      return getPrintQueueDatabaseErrorDetails('INVALID_ORDER_ITEM_ID')
    }
  }

  if (operation === 'markAsPrinted') {
    if (!data.queueItemIds || !Array.isArray(data.queueItemIds) || data.queueItemIds.length === 0) {
      return {
        type: 'VALIDATION_ERROR',
        code: 'MISSING_QUEUE_ITEMS',
        message: 'No queue item IDs provided',
        userMessage: 'No items were selected to mark as printed.',
        suggestions: ['Select items to mark as printed', 'Refresh the print queue if no items are available'],
        retryable: false
      }
    }

    const invalidIds = data.queueItemIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0)
    if (invalidIds.length > 0) {
      return {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_QUEUE_ITEM_ID',
        message: 'Invalid queue item ID provided',
        userMessage: 'One or more queue items are invalid.',
        suggestions: ['Refresh the print queue and try again', 'Contact support if the problem persists'],
        retryable: false
      }
    }
  }

  return null
}

/**
 * Enhanced error logging for print queue database operations
 */
export function logPrintQueueDatabaseError(
  error: PrintQueueDatabaseError,
  context: PrintQueueDatabaseErrorContext
): void {
  // Create sanitized log entry (remove sensitive data)
  const logEntry = {
    timestamp: context.timestamp.toISOString(),
    operation: context.operation,
    errorType: error.type,
    errorCode: error.code,
    errorMessage: error.message,
    userId: context.userId ? 'user_' + context.userId.substring(0, 8) : 'anonymous',
    retryable: error.retryable,
    hasDetails: !!error.details,
    // Don't log actual IDs for privacy, just counts
    orderItemCount: context.orderItemIds?.length || 0,
    queueItemCount: context.queueItemIds?.length || 0,
    batchSize: context.batchSize || 0,
    queueStatus: context.queueStatus || null
  }

  console.error('Print Queue Database Error:', JSON.stringify(logEntry, null, 2))

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.logError('print_queue_database_error', logEntry)
  }
}

/**
 * Create user-friendly error messages for print queue database errors
 */
export function formatPrintQueueDatabaseError(
  error: PrintQueueDatabaseError,
  context: PrintQueueDatabaseErrorContext
): {
  title: string
  message: string
  suggestions: string[]
  canRetry: boolean
  severity: 'low' | 'medium' | 'high'
  showFallback: boolean
} {
  const recovery = getPrintQueueRecoveryStrategy(error, context)
  
  let severity: 'low' | 'medium' | 'high' = 'medium'
  
  // Determine severity based on error type and impact
  if (error.type === 'DATABASE_ERROR' || error.type === 'TIMEOUT_ERROR') {
    severity = 'high'
  } else if (error.type === 'VALIDATION_ERROR') {
    severity = 'low'
  }

  return {
    title: getPrintQueueDatabaseErrorTitle(error.type),
    message: error.userMessage,
    suggestions: [
      ...error.suggestions,
      ...(recovery.userAction ? [recovery.userAction] : []),
      'Contact support if the problem continues'
    ],
    canRetry: error.retryable && !recovery.preventRetry,
    severity,
    showFallback: false // Print queue operations don't typically have fallback data
  }
}

/**
 * Get appropriate error title based on error type
 */
function getPrintQueueDatabaseErrorTitle(errorType: PrintQueueDatabaseError['type']): string {
  switch (errorType) {
    case 'DATABASE_ERROR':
      return 'Database Error'
    case 'VALIDATION_ERROR':
      return 'Data Validation Error'
    case 'CONCURRENCY_ERROR':
      return 'Concurrent Access Error'
    case 'INTEGRITY_ERROR':
      return 'Data Integrity Error'
    case 'TIMEOUT_ERROR':
      return 'Request Timeout'
    default:
      return 'System Error'
  }
}

/**
 * Check print queue database health
 */
export function checkPrintQueueDatabaseHealth(): {
  healthy: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Basic checks that can be performed without database access
  // In a real implementation, you might want to perform actual database health checks

  return {
    healthy: issues.length === 0,
    issues,
    recommendations
  }
}