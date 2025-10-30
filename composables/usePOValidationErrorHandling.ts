/**
 * PO Validation Error Handling Composable
 * Provides comprehensive error handling for PO validation operations on the frontend
 */

import { ref, computed } from 'vue'
import type { POValidationResult } from '~/server/lib/POValidationService'

// Error state interface
interface POValidationErrorState {
  hasError: boolean
  errorType: 'validation' | 'network' | 'permission' | 'timeout' | 'unknown'
  errorMessage: string
  suggestions: string[]
  canRetry: boolean
  showFallback: boolean
  fallbackResult?: POValidationResult
}

// Validation context for better error handling
interface ValidationContext {
  poNumber: string
  customerId: string
  level: 'order' | 'item'
  operation: string
}

export function usePOValidationErrorHandling() {
  // Error state
  const errorState = ref<POValidationErrorState>({
    hasError: false,
    errorType: 'unknown',
    errorMessage: '',
    suggestions: [],
    canRetry: false,
    showFallback: false
  })

  // Loading state for retry operations
  const isRetrying = ref(false)

  // Computed properties
  const hasError = computed(() => errorState.value.hasError)
  const canRetry = computed(() => errorState.value.canRetry && !isRetrying.value)
  const errorTitle = computed(() => {
    switch (errorState.value.errorType) {
      case 'validation':
        return 'Validation Error'
      case 'network':
        return 'Connection Error'
      case 'permission':
        return 'Permission Error'
      case 'timeout':
        return 'Request Timeout'
      default:
        return 'System Error'
    }
  })

  /**
   * Handle PO validation errors and set appropriate error state
   */
  const handleValidationError = (error: any, context: ValidationContext) => {
    console.error('PO Validation Error:', error, context)

    let errorType: POValidationErrorState['errorType'] = 'unknown'
    let errorMessage = 'An unexpected error occurred during PO validation.'
    let suggestions: string[] = ['Try again', 'Contact support if the problem persists']
    let canRetry = true
    let showFallback = false
    let fallbackResult: POValidationResult | undefined

    // Analyze error to determine type and appropriate response
    if (error.statusCode) {
      // API error response
      switch (error.statusCode) {
        case 400:
          errorType = 'validation'
          errorMessage = error.statusMessage || 'Invalid validation request.'
          suggestions = [
            'Check that the PO number is valid',
            'Ensure a customer is selected',
            'Verify all required fields are filled'
          ]
          canRetry = false
          break

        case 401:
        case 403:
          errorType = 'permission'
          errorMessage = error.statusMessage || 'You do not have permission to validate PO numbers.'
          suggestions = [
            'Log in again if your session expired',
            'Contact your supervisor for access',
            'Ensure you have the correct permissions'
          ]
          canRetry = false
          break

        case 404:
          errorType = 'validation'
          errorMessage = error.statusMessage || 'Customer or related data not found.'
          suggestions = [
            'Verify the customer exists',
            'Refresh the page and try again',
            'Check that the order data is valid'
          ]
          canRetry = true
          break

        case 504:
          errorType = 'timeout'
          errorMessage = error.statusMessage || 'PO validation timed out.'
          suggestions = [
            'Try the validation again',
            'The system may be busy',
            'Contact support if timeouts continue'
          ]
          canRetry = true
          showFallback = true
          fallbackResult = {
            isDuplicate: false,
            warningMessage: 'Validation timed out. Please verify manually that this PO is not already in use.'
          }
          break

        case 500:
        default:
          errorType = 'unknown'
          errorMessage = error.statusMessage || 'A system error occurred during validation.'
          suggestions = [
            'Try the validation again',
            'Contact support if the problem persists'
          ]
          canRetry = true
          showFallback = true
          fallbackResult = {
            isDuplicate: false,
            warningMessage: 'Unable to validate PO number. Please verify manually that this PO is not already in use.'
          }
          break
      }

      // Use additional suggestions from API response if available
      if (error.data?.suggestions && Array.isArray(error.data.suggestions)) {
        suggestions = [...error.data.suggestions, ...suggestions.slice(-1)] // Keep "contact support" at the end
      }

      // Use fallback advice from API response if available
      if (error.data?.fallbackAdvice) {
        if (!fallbackResult) {
          fallbackResult = {
            isDuplicate: false,
            warningMessage: error.data.fallbackAdvice
          }
        }
        showFallback = true
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error
      errorType = 'network'
      errorMessage = 'Unable to connect to the validation service.'
      suggestions = [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact IT support if the problem persists'
      ]
      canRetry = true
      showFallback = true
      fallbackResult = {
        isDuplicate: false,
        warningMessage: 'Network error prevented PO validation. Please verify manually that this PO is not already in use.'
      }
    } else if (error.message) {
      // Generic error with message
      errorMessage = error.message
      canRetry = true
    }

    // Set error state
    errorState.value = {
      hasError: true,
      errorType,
      errorMessage,
      suggestions,
      canRetry,
      showFallback,
      fallbackResult
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
      showFallback: false
    }
  }

  /**
   * Retry validation with the same parameters
   */
  const retryValidation = async (
    validationFn: () => Promise<POValidationResult>,
    context: ValidationContext
  ): Promise<POValidationResult | null> => {
    if (!canRetry.value) {
      return null
    }

    isRetrying.value = true
    clearError()

    try {
      const result = await validationFn()
      return result
    } catch (error) {
      handleValidationError(error, context)
      return null
    } finally {
      isRetrying.value = false
    }
  }

  /**
   * Use fallback result when validation fails
   */
  const useFallbackResult = (): POValidationResult | null => {
    if (!errorState.value.showFallback || !errorState.value.fallbackResult) {
      return null
    }

    clearError()
    return errorState.value.fallbackResult
  }

  /**
   * Validate PO with comprehensive error handling
   */
  const validatePOWithErrorHandling = async (
    poNumber: string,
    customerId: string,
    level: 'order' | 'item',
    excludeId?: string
  ): Promise<POValidationResult | null> => {
    const context: ValidationContext = {
      poNumber,
      customerId,
      level,
      operation: `validate${level}PO`
    }

    clearError()

    try {
      // Input validation
      if (!poNumber || !poNumber.trim()) {
        throw new Error('PO number is required')
      }

      if (!customerId || !customerId.trim()) {
        throw new Error('Customer selection is required')
      }

      // Make API call
      const response = await $fetch('/api/validation/check-po-duplicate', {
        method: 'POST',
        body: {
          poNumber: poNumber.trim(),
          customerId,
          level,
          ...(level === 'order' && excludeId ? { excludeOrderId: excludeId } : {}),
          ...(level === 'item' && excludeId ? { excludeOrderItemId: excludeId } : {})
        }
      })

      return response.data
    } catch (error) {
      handleValidationError(error, context)
      return null
    }
  }

  /**
   * Get user-friendly error message for display
   */
  const getErrorDisplayMessage = () => {
    if (!hasError.value) return ''

    return {
      title: errorTitle.value,
      message: errorState.value.errorMessage,
      suggestions: errorState.value.suggestions,
      canRetry: canRetry.value,
      showFallback: errorState.value.showFallback
    }
  }

  /**
   * Check if a specific error type is active
   */
  const isErrorType = (type: POValidationErrorState['errorType']) => {
    return hasError.value && errorState.value.errorType === type
  }

  return {
    // State
    hasError,
    canRetry,
    isRetrying: readonly(isRetrying),
    errorTitle,

    // Methods
    handleValidationError,
    clearError,
    retryValidation,
    useFallbackResult,
    validatePOWithErrorHandling,
    getErrorDisplayMessage,
    isErrorType,

    // Direct access to error state for advanced usage
    errorState: readonly(errorState)
  }
}