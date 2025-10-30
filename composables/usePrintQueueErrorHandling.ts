/**
 * Print Queue Error Handling Composable
 * Provides comprehensive error handling for print queue operations on the frontend
 */

import { ref, computed } from 'vue'
import type { PrintQueueItem } from '~/server/lib/PrintQueueRepository'

// Error state interface
interface PrintQueueErrorState {
  hasError: boolean
  errorType: 'validation' | 'network' | 'permission' | 'timeout' | 'concurrency' | 'unknown'
  errorMessage: string
  suggestions: string[]
  canRetry: boolean
  operation: string
  affectedItems?: string[]
}

// Operation context for better error handling
interface OperationContext {
  operation: string
  itemIds: string[]
  userId?: string
  batchSize?: number
}

export function usePrintQueueErrorHandling() {
  // Error state
  const errorState = ref<PrintQueueErrorState>({
    hasError: false,
    errorType: 'unknown',
    errorMessage: '',
    suggestions: [],
    canRetry: false,
    operation: ''
  })

  // Loading state for retry operations
  const isRetrying = ref(false)

  // Computed properties
  const hasError = computed(() => errorState.value.hasError)
  const canRetry = computed(() => errorState.value.canRetry && !isRetrying.value)
  const errorTitle = computed(() => {
    switch (errorState.value.errorType) {
      case 'validation':
        return 'Data Validation Error'
      case 'network':
        return 'Connection Error'
      case 'permission':
        return 'Permission Error'
      case 'timeout':
        return 'Request Timeout'
      case 'concurrency':
        return 'Concurrent Access Error'
      default:
        return 'Print Queue Error'
    }
  })

  /**
   * Handle print queue errors and set appropriate error state
   */
  const handlePrintQueueError = (error: any, context: OperationContext) => {
    console.error('Print Queue Error:', error, context)

    let errorType: PrintQueueErrorState['errorType'] = 'unknown'
    let errorMessage = 'An unexpected error occurred with the print queue.'
    let suggestions: string[] = ['Try again', 'Contact support if the problem persists']
    let canRetry = true

    // Analyze error to determine type and appropriate response
    if (error.statusCode) {
      // API error response
      switch (error.statusCode) {
        case 400:
          errorType = 'validation'
          errorMessage = error.statusMessage || 'Invalid request data.'
          suggestions = [
            'Check that all items are valid',
            'Refresh the page and try again',
            'Ensure the request format is correct'
          ]
          canRetry = false
          break

        case 401:
        case 403:
          errorType = 'permission'
          errorMessage = error.statusMessage || 'You do not have permission for this operation.'
          suggestions = [
            'Log in again if your session expired',
            'Contact your supervisor for access',
            'Ensure you have the correct permissions'
          ]
          canRetry = false
          break

        case 404:
          errorType = 'validation'
          errorMessage = error.statusMessage || 'Items not found.'
          if (context.operation === 'addToQueue') {
            errorMessage = 'One or more order items could not be found.'
            suggestions = [
              'Refresh the page to get the latest data',
              'Check if the order items were deleted',
              'Verify the order items still exist'
            ]
          } else if (context.operation === 'markPrinted') {
            errorMessage = 'Items not found in print queue.'
            suggestions = [
              'Refresh the print queue view',
              'Items may have already been processed',
              'Check if another user processed these items'
            ]
          }
          canRetry = true
          break

        case 409:
          errorType = 'concurrency'
          errorMessage = error.statusMessage || 'Items have already been processed.'
          if (context.operation === 'addToQueue') {
            suggestions = [
              'Items are already in the print queue',
              'Check the current print queue status',
              'Refresh the page to see current state'
            ]
          } else if (context.operation === 'markPrinted') {
            suggestions = [
              'Items have already been marked as printed',
              'Refresh the print queue to see current status',
              'Another user may have processed these items'
            ]
          }
          canRetry = false
          break

        case 504:
          errorType = 'timeout'
          errorMessage = error.statusMessage || 'The operation timed out.'
          suggestions = [
            'Try the operation again',
            'The system may be busy',
            'Contact support if timeouts continue'
          ]
          canRetry = true
          break

        case 500:
        default:
          errorType = 'unknown'
          errorMessage = error.statusMessage || 'A system error occurred.'
          suggestions = [
            'Try the operation again',
            'Contact support if the problem persists'
          ]
          canRetry = true
          break
      }

      // Use additional suggestions from API response if available
      if (error.data?.suggestions && Array.isArray(error.data.suggestions)) {
        suggestions = [...error.data.suggestions, ...suggestions.slice(-1)] // Keep "contact support" at the end
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error
      errorType = 'network'
      errorMessage = 'Unable to connect to the print queue service.'
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact IT support if the problem persists'
      ]
      canRetry = true
    } else if (error.message) {
      // Generic error with message
      errorMessage = error.message
      
      // Try to determine error type from message content
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        errorType = 'validation'
        canRetry = false
      } else if (error.message.includes('timeout')) {
        errorType = 'timeout'
      } else if (error.message.includes('already') || error.message.includes('concurrent')) {
        errorType = 'concurrency'
        canRetry = false
      }
    }

    // Set error state
    errorState.value = {
      hasError: true,
      errorType,
      errorMessage,
      suggestions,
      canRetry,
      operation: context.operation,
      affectedItems: context.itemIds
    }
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    errorState.value = {
      hasError: false,
      errorType: 'unknown',
      errorMessage: '',
      suggestions: [],
      canRetry: false,
      operation: ''
    }
  }

  /**
   * Retry operation with the same parameters
   */
  const retryOperation = async (
    operationFn: () => Promise<any>,
    context: OperationContext
  ): Promise<any> => {
    if (!canRetry.value) {
      return null
    }

    isRetrying.value = true
    clearError()

    try {
      const result = await operationFn()
      return result
    } catch (error) {
      handlePrintQueueError(error, context)
      return null
    } finally {
      isRetrying.value = false
    }
  }

  /**
   * Add items to print queue with error handling
   */
  const addToQueueWithErrorHandling = async (
    orderItemIds: string[]
  ): Promise<PrintQueueItem[] | null> => {
    const context: OperationContext = {
      operation: 'addToQueue',
      itemIds: orderItemIds
    }

    clearError()

    try {
      // Input validation
      if (!orderItemIds || !Array.isArray(orderItemIds) || orderItemIds.length === 0) {
        throw new Error('No items selected to add to print queue')
      }

      const invalidIds = orderItemIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0)
      if (invalidIds.length > 0) {
        throw new Error(`${invalidIds.length} invalid item IDs provided`)
      }

      // Make API call
      const response = await $fetch('/api/print-queue/add', {
        method: 'POST',
        body: {
          orderItemIds
        }
      })

      return response.data
    } catch (error) {
      handlePrintQueueError(error, context)
      return null
    }
  }

  /**
   * Mark items as printed with error handling
   */
  const markAsPrintedWithErrorHandling = async (
    queueItemIds: string[]
  ): Promise<boolean> => {
    const context: OperationContext = {
      operation: 'markPrinted',
      itemIds: queueItemIds
    }

    clearError()

    try {
      // Input validation
      if (!queueItemIds || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
        throw new Error('No items selected to mark as printed')
      }

      const invalidIds = queueItemIds.filter(id => !id || typeof id !== 'string' || id.trim().length === 0)
      if (invalidIds.length > 0) {
        throw new Error(`${invalidIds.length} invalid queue item IDs provided`)
      }

      // Make API call
      await $fetch('/api/print-queue/mark-printed', {
        method: 'POST',
        body: {
          queueItemIds
        }
      })

      return true
    } catch (error) {
      handlePrintQueueError(error, context)
      return false
    }
  }

  /**
   * Remove items from queue with error handling
   */
  const removeFromQueueWithErrorHandling = async (
    queueItemIds: string[]
  ): Promise<boolean> => {
    const context: OperationContext = {
      operation: 'removeFromQueue',
      itemIds: queueItemIds
    }

    clearError()

    try {
      // Input validation
      if (!queueItemIds || !Array.isArray(queueItemIds) || queueItemIds.length === 0) {
        throw new Error('No items selected to remove from queue')
      }

      // Make API call
      await $fetch('/api/print-queue/remove', {
        method: 'DELETE',
        body: {
          queueItemIds
        }
      })

      return true
    } catch (error) {
      handlePrintQueueError(error, context)
      return false
    }
  }

  /**
   * Get user-friendly error message for display
   */
  const getErrorDisplayMessage = () => {
    if (!hasError.value) return null

    return {
      title: errorTitle.value,
      message: errorState.value.errorMessage,
      suggestions: errorState.value.suggestions,
      canRetry: canRetry.value,
      operation: errorState.value.operation,
      affectedItemCount: errorState.value.affectedItems?.length || 0
    }
  }

  /**
   * Check if a specific error type is active
   */
  const isErrorType = (type: PrintQueueErrorState['errorType']) => {
    return hasError.value && errorState.value.errorType === type
  }

  /**
   * Check if error is related to a specific operation
   */
  const isOperationError = (operation: string) => {
    return hasError.value && errorState.value.operation === operation
  }

  /**
   * Get operation-specific error guidance
   */
  const getOperationGuidance = () => {
    if (!hasError.value) return null

    const operation = errorState.value.operation
    const errorType = errorState.value.errorType

    if (operation === 'addToQueue') {
      if (errorType === 'validation') {
        return 'Check that the order items are valid and still exist.'
      } else if (errorType === 'concurrency') {
        return 'These items may already be in the print queue.'
      }
    } else if (operation === 'markPrinted') {
      if (errorType === 'validation') {
        return 'The items may no longer be in the print queue.'
      } else if (errorType === 'concurrency') {
        return 'Another user may have already processed these items.'
      }
    }

    return null
  }

  return {
    // State
    hasError,
    canRetry,
    isRetrying: readonly(isRetrying),
    errorTitle,

    // Methods
    handlePrintQueueError,
    clearError,
    retryOperation,
    addToQueueWithErrorHandling,
    markAsPrintedWithErrorHandling,
    removeFromQueueWithErrorHandling,
    getErrorDisplayMessage,
    isErrorType,
    isOperationError,
    getOperationGuidance,

    // Direct access to error state for advanced usage
    errorState: readonly(errorState)
  }
}