/**
 * Print Queue Error Handling Utilities
 * Provides comprehensive error handling, validation, and recovery mechanisms
 * for the split label print queue system
 */

import type { QueueValidationError } from '~/composables/usePrintQueue'

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover: boolean
  recoveryAction?: () => Promise<boolean>
  userAction?: string
  preventRetry?: boolean
}

// Enhanced error context for better debugging and user support
export interface PrintQueueErrorContext {
  operation: string
  timestamp: Date
  queueState: {
    size: number
    labels: string[]
  }
  browserInfo: {
    userAgent: string
    localStorage: boolean
    popupBlocked: boolean
  }
  networkStatus: 'online' | 'offline' | 'unknown'
}

/**
 * Validate browser capabilities for print queue functionality
 */
export function validateBrowserCapabilities(): {
  supported: boolean
  issues: string[]
  warnings: string[]
} {
  const issues: string[] = []
  const warnings: string[] = []

  // Check localStorage support
  try {
    const testKey = 'print_queue_test_' + Date.now()
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
  } catch (err) {
    issues.push('Browser does not support localStorage - queue persistence will not work')
  }

  // Check window.open support
  if (!window.open) {
    issues.push('Browser does not support opening new windows - printing will not work')
  }

  // Check for popup blockers (basic detection)
  try {
    const testWindow = window.open('', '_blank', 'width=1,height=1')
    if (testWindow) {
      testWindow.close()
    } else {
      warnings.push('Popup blocker may be enabled - printing may be blocked')
    }
  } catch (err) {
    warnings.push('Cannot test popup functionality - printing may be blocked')
  }

  // Check for print support
  if (!window.print) {
    issues.push('Browser does not support printing functionality')
  }

  return {
    supported: issues.length === 0,
    issues,
    warnings
  }
}

/**
 * Get current browser and network context for error reporting
 */
export function getErrorContext(operation: string, queueLabels: string[] = []): PrintQueueErrorContext {
  return {
    operation,
    timestamp: new Date(),
    queueState: {
      size: queueLabels.length,
      labels: queueLabels
    },
    browserInfo: {
      userAgent: navigator.userAgent,
      localStorage: typeof Storage !== 'undefined',
      popupBlocked: false // Will be updated by specific error handlers
    },
    networkStatus: navigator.onLine ? 'online' : 'offline'
  }
}

/**
 * Determine recovery strategy for different error types
 */
export function getRecoveryStrategy(error: QueueValidationError, context: PrintQueueErrorContext): ErrorRecoveryStrategy {
  switch (error.type) {
    case 'STORAGE_ERROR':
      return {
        canRecover: true,
        recoveryAction: async () => {
          try {
            // Try to clear corrupted data and reinitialize
            localStorage.removeItem('spacovers_print_queue')
            return true
          } catch (err) {
            return false
          }
        },
        userAction: 'Clear browser data and refresh the page'
      }

    case 'BROWSER_ERROR':
      return {
        canRecover: true,
        userAction: 'Allow popups for this site and try again',
        preventRetry: false
      }

    case 'NETWORK_ERROR':
      return {
        canRecover: context.networkStatus === 'online',
        userAction: 'Check your internet connection and try again'
      }

    case 'PRINT_ERROR':
      return {
        canRecover: true,
        userAction: 'Try printing again or use a different browser'
      }

    case 'INVALID_DATA':
      return {
        canRecover: false,
        userAction: 'Refresh the page and re-add the labels',
        preventRetry: true
      }

    case 'DUPLICATE_ITEM':
      return {
        canRecover: false,
        userAction: 'Remove the existing label first or print the current queue',
        preventRetry: true
      }

    case 'MAX_SIZE_EXCEEDED':
      return {
        canRecover: false,
        userAction: 'Print the current batch or remove some labels',
        preventRetry: true
      }

    default:
      return {
        canRecover: false,
        userAction: 'Contact support for assistance'
      }
  }
}

/**
 * Enhanced error logging with context and user privacy protection
 */
export function logPrintQueueError(
  error: QueueValidationError,
  context: PrintQueueErrorContext,
  userId?: string
): void {
  // Create sanitized log entry (remove sensitive data)
  const logEntry = {
    timestamp: context.timestamp.toISOString(),
    operation: context.operation,
    errorType: error.type,
    errorMessage: error.message,
    queueSize: context.queueState.size,
    browserSupported: validateBrowserCapabilities().supported,
    networkStatus: context.networkStatus,
    userId: userId ? 'user_' + userId.substring(0, 8) : 'anonymous', // Partial ID only
    retryable: error.retryable,
    hasDetails: !!error.details
  }

  console.error('Print Queue Error:', JSON.stringify(logEntry, null, 2))

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoringService.logError('print_queue_error', logEntry)
  }
}

/**
 * Create user-friendly error messages with actionable guidance
 */
export function formatPrintQueueError(
  error: QueueValidationError,
  context: PrintQueueErrorContext
): {
  title: string
  message: string
  suggestions: string[]
  canRetry: boolean
  severity: 'low' | 'medium' | 'high'
} {
  const recovery = getRecoveryStrategy(error, context)
  
  let severity: 'low' | 'medium' | 'high' = 'medium'
  
  // Determine severity based on error type and impact
  if (error.type === 'STORAGE_ERROR' || error.type === 'BROWSER_ERROR') {
    severity = 'high'
  } else if (error.type === 'DUPLICATE_ITEM' || error.type === 'MAX_SIZE_EXCEEDED') {
    severity = 'low'
  }

  return {
    title: getErrorTitle(error.type),
    message: error.userMessage || error.message,
    suggestions: [
      ...(error.suggestions || []),
      ...(recovery.userAction ? [recovery.userAction] : []),
      'Contact support if the problem continues'
    ],
    canRetry: error.retryable && !recovery.preventRetry,
    severity
  }
}

/**
 * Get appropriate error title based on error type
 */
function getErrorTitle(errorType: QueueValidationError['type']): string {
  switch (errorType) {
    case 'STORAGE_ERROR':
      return 'Storage Error'
    case 'BROWSER_ERROR':
      return 'Browser Compatibility Issue'
    case 'NETWORK_ERROR':
      return 'Network Connection Error'
    case 'PRINT_ERROR':
      return 'Print System Error'
    case 'INVALID_DATA':
      return 'Data Validation Error'
    case 'DUPLICATE_ITEM':
      return 'Duplicate Label'
    case 'MAX_SIZE_EXCEEDED':
      return 'Queue Full'
    default:
      return 'System Error'
  }
}

/**
 * Validate print queue data integrity
 */
export function validateQueueIntegrity(queue: any[]): {
  isValid: boolean
  issues: string[]
  corruptedItems: number[]
} {
  const issues: string[] = []
  const corruptedItems: number[] = []

  if (!Array.isArray(queue)) {
    return {
      isValid: false,
      issues: ['Queue is not an array'],
      corruptedItems: []
    }
  }

  queue.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      issues.push(`Item ${index + 1} is not a valid object`)
      corruptedItems.push(index)
      return
    }

    const requiredFields = ['id', 'orderItemId', 'labelData', 'createdAt']
    for (const field of requiredFields) {
      if (!item[field]) {
        issues.push(`Item ${index + 1} is missing required field: ${field}`)
        corruptedItems.push(index)
        break
      }
    }

    // Validate labelData structure
    if (item.labelData && typeof item.labelData === 'object') {
      const requiredLabelFields = ['customer', 'type', 'barcode']
      for (const field of requiredLabelFields) {
        if (!item.labelData[field]) {
          issues.push(`Item ${index + 1} labelData is missing required field: ${field}`)
          corruptedItems.push(index)
          break
        }
      }
    }
  })

  return {
    isValid: issues.length === 0,
    issues,
    corruptedItems: [...new Set(corruptedItems)] // Remove duplicates
  }
}

/**
 * Attempt to repair corrupted queue data
 */
export function repairQueueData(queue: any[]): {
  repairedQueue: any[]
  removedItems: number
  repairLog: string[]
} {
  const repairLog: string[] = []
  let removedItems = 0

  if (!Array.isArray(queue)) {
    repairLog.push('Queue was not an array - reset to empty array')
    return {
      repairedQueue: [],
      removedItems: queue ? 1 : 0,
      repairLog
    }
  }

  const repairedQueue = queue.filter((item, index) => {
    if (!item || typeof item !== 'object') {
      repairLog.push(`Removed invalid item at index ${index}`)
      removedItems++
      return false
    }

    // Try to repair missing fields with defaults
    if (!item.id) {
      item.id = `repaired_${Date.now()}_${index}`
      repairLog.push(`Generated missing ID for item at index ${index}`)
    }

    if (!item.createdAt) {
      item.createdAt = new Date()
      repairLog.push(`Set missing createdAt for item at index ${index}`)
    }

    // Check if item is still valid after repair attempts
    if (!item.orderItemId || !item.labelData) {
      repairLog.push(`Removed unrepairable item at index ${index}`)
      removedItems++
      return false
    }

    return true
  })

  // Update positions after filtering
  repairedQueue.forEach((item, index) => {
    item.position = index
  })

  return {
    repairedQueue,
    removedItems,
    repairLog
  }
}

/**
 * Check system health for print queue functionality
 */
export function checkSystemHealth(): {
  healthy: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check browser capabilities
  const browserCheck = validateBrowserCapabilities()
  if (!browserCheck.supported) {
    issues.push(...browserCheck.issues)
  }
  if (browserCheck.warnings.length > 0) {
    recommendations.push(...browserCheck.warnings)
  }

  // Check localStorage quota
  try {
    const testData = 'x'.repeat(1024 * 1024) // 1MB test
    localStorage.setItem('quota_test', testData)
    localStorage.removeItem('quota_test')
  } catch (err) {
    issues.push('localStorage quota may be exceeded')
    recommendations.push('Clear browser data to free up storage space')
  }

  // Check network connectivity
  if (!navigator.onLine) {
    issues.push('No network connection detected')
    recommendations.push('Check your internet connection')
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendations
  }
}