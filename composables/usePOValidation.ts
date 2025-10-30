import { ref, computed } from 'vue'

export interface POValidationResult {
  isDuplicate: boolean
  existingOrders?: any[]
  existingItems?: any[]
  warningMessage?: string
}

export interface POValidationState {
  isValidating: boolean
  showWarning: boolean
  validationResult: POValidationResult | null
  currentPONumber: string
  currentLevel: 'order' | 'item'
  currentCustomerId: string
}

export interface POValidationConfig {
  onConfirmProceed?: (poNumber: string, level: 'order' | 'item') => void
  onCancel?: () => void
  onViewOrder?: (orderId: string) => void
}

/**
 * Composable for managing PO number validation
 * Handles duplicate checking, warning display, and user confirmation workflow
 */
export const usePOValidation = (config: POValidationConfig = {}) => {
  // Reactive state
  const validationState = ref<POValidationState>({
    isValidating: false,
    showWarning: false,
    validationResult: null,
    currentPONumber: '',
    currentLevel: 'order',
    currentCustomerId: ''
  })

  // API call to check for PO duplicates
  const checkPODuplicate = async (
    poNumber: string,
    customerId: string,
    level: 'order' | 'item',
    excludeOrderId?: string,
    excludeOrderItemId?: string
  ): Promise<POValidationResult> => {
    try {
      const response = await $fetch('/api/validation/check-po-duplicate', {
        method: 'POST',
        body: {
          poNumber: poNumber.trim(),
          customerId,
          level,
          excludeOrderId,
          excludeOrderItemId
        }
      }) as { success: boolean; data: POValidationResult }

      return response.data
    } catch (error) {
      console.error('PO validation API error:', error)
      
      // Return a safe default result on API error
      return {
        isDuplicate: false,
        warningMessage: 'Unable to check for duplicates due to a system error. Please proceed with caution.'
      }
    }
  }

  // Validate PO number and show warning if duplicates found
  const validatePONumber = async (
    poNumber: string,
    customerId: string,
    level: 'order' | 'item' = 'order',
    excludeOrderId?: string,
    excludeOrderItemId?: string
  ): Promise<boolean> => {
    // Skip validation for empty PO numbers
    if (!poNumber || !poNumber.trim()) {
      return true
    }

    // Skip validation if no customer ID
    if (!customerId) {
      console.warn('Cannot validate PO number without customer ID')
      return true
    }

    validationState.value.isValidating = true
    validationState.value.currentPONumber = poNumber.trim()
    validationState.value.currentLevel = level
    validationState.value.currentCustomerId = customerId

    try {
      const result = await checkPODuplicate(
        poNumber,
        customerId,
        level,
        excludeOrderId,
        excludeOrderItemId
      )

      validationState.value.validationResult = result

      if (result.isDuplicate) {
        validationState.value.showWarning = true
        return false // Validation failed - user needs to confirm
      }

      return true // Validation passed - no duplicates found
    } catch (error) {
      console.error('Error during PO validation:', error)
      
      // On error, allow the operation to proceed but log the issue
      return true
    } finally {
      validationState.value.isValidating = false
    }
  }

  // Handle user confirmation to proceed with duplicate PO
  const handleConfirmProceed = () => {
    validationState.value.showWarning = false
    
    if (config.onConfirmProceed) {
      config.onConfirmProceed(
        validationState.value.currentPONumber,
        validationState.value.currentLevel
      )
    }
  }

  // Handle user cancellation
  const handleCancel = () => {
    validationState.value.showWarning = false
    validationState.value.validationResult = null
    
    if (config.onCancel) {
      config.onCancel()
    }
  }

  // Handle view order request
  const handleViewOrder = (orderId: string) => {
    if (config.onViewOrder) {
      config.onViewOrder(orderId)
    }
  }

  // Close warning dialog
  const closeWarning = () => {
    validationState.value.showWarning = false
    validationState.value.validationResult = null
  }

  // Get formatted duplicate data for the warning component
  const duplicateData = computed(() => {
    const result = validationState.value.validationResult
    if (!result) {
      return { orders: [], items: [] }
    }

    return {
      orders: result.existingOrders || [],
      items: result.existingItems || []
    }
  })

  // Check if validation is currently in progress
  const isValidating = computed(() => validationState.value.isValidating)

  // Check if warning dialog should be shown
  const showWarning = computed(() => validationState.value.showWarning)

  // Get current PO number being validated
  const currentPONumber = computed(() => validationState.value.currentPONumber)

  // Get current validation level
  const currentLevel = computed(() => validationState.value.currentLevel)

  // Utility function to validate PO format (optional - can be customized)
  const isValidPOFormat = (poNumber: string): boolean => {
    if (!poNumber || typeof poNumber !== 'string') {
      return false
    }

    const trimmed = poNumber.trim()
    
    // Basic validation - at least 1 character, no special characters that might cause issues
    if (trimmed.length === 0) {
      return false
    }

    // Allow alphanumeric, hyphens, underscores, and spaces
    const validPORegex = /^[a-zA-Z0-9\-_\s]+$/
    return validPORegex.test(trimmed)
  }

  // Debounced validation function for real-time input validation
  let validationTimeout: NodeJS.Timeout | null = null
  
  const validatePONumberDebounced = (
    poNumber: string,
    customerId: string,
    level: 'order' | 'item' = 'order',
    excludeOrderId?: string,
    excludeOrderItemId?: string,
    debounceMs: number = 500
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      if (validationTimeout) {
        clearTimeout(validationTimeout)
      }

      validationTimeout = setTimeout(async () => {
        const result = await validatePONumber(
          poNumber,
          customerId,
          level,
          excludeOrderId,
          excludeOrderItemId
        )
        resolve(result)
      }, debounceMs)
    })
  }

  return {
    // State
    validationState: readonly(validationState),
    isValidating,
    showWarning,
    currentPONumber,
    currentLevel,
    duplicateData,

    // Actions
    validatePONumber,
    validatePONumberDebounced,
    handleConfirmProceed,
    handleCancel,
    handleViewOrder,
    closeWarning,

    // Utilities
    isValidPOFormat,
    checkPODuplicate
  }
}

// Validation mixin for Vue components
export const POValidationMixin = {
  setup() {
    const poValidation = usePOValidation()
    
    return {
      ...poValidation
    }
  }
}