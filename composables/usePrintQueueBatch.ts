import { ref, computed } from 'vue'

export interface BatchValidation {
  isValid: boolean
  canPrintWithoutWarning: boolean
  requiresWarning: boolean
  batchSize: number
  standardBatchSize: number
  warningMessage?: string
  recommendations: string[]
}

export interface PrintBatchStatus {
  isReady: boolean
  requiresConfirmation: boolean
  warningLevel: 'none' | 'info' | 'warning' | 'error'
  message: string
  actionText: string
}

/**
 * Composable for enhanced print queue batch processing
 * Provides validation, status tracking, and user feedback for batch operations
 */
export const usePrintQueueBatch = () => {
  // Reactive state
  const isValidating = ref(false)
  const validationError = ref<string | null>(null)
  const lastValidation = ref<BatchValidation | null>(null)

  // Standard batch size (should match backend)
  const STANDARD_BATCH_SIZE = 4

  /**
   * Validate the current print batch
   * @returns Promise<BatchValidation | null>
   */
  const validateBatch = async (): Promise<BatchValidation | null> => {
    try {
      isValidating.value = true
      validationError.value = null

      const response = await $fetch('/api/print-queue/validate-batch') as any

      if (response?.success && response.data?.validation) {
        lastValidation.value = response.data.validation
        return response.data.validation
      }

      throw new Error('Invalid response from validation endpoint')

    } catch (error) {
      console.error('Batch validation failed:', error)
      validationError.value = error instanceof Error ? error.message : 'Validation failed'
      return null
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Get print batch status with enhanced feedback
   * @param batchSize - Current batch size
   * @returns PrintBatchStatus
   */
  const getBatchStatus = (batchSize: number): PrintBatchStatus => {
    if (batchSize === 0) {
      return {
        isReady: false,
        requiresConfirmation: false,
        warningLevel: 'error',
        message: 'No items in queue to print',
        actionText: 'Add Items'
      }
    }

    if (batchSize < STANDARD_BATCH_SIZE) {
      return {
        isReady: true,
        requiresConfirmation: true,
        warningLevel: 'warning',
        message: `Partial batch (${batchSize}/${STANDARD_BATCH_SIZE}) - may result in paper waste`,
        actionText: `Print ${batchSize} Item${batchSize !== 1 ? 's' : ''}`
      }
    }

    if (batchSize === STANDARD_BATCH_SIZE) {
      return {
        isReady: true,
        requiresConfirmation: false,
        warningLevel: 'none',
        message: 'Perfect batch size for optimal printing',
        actionText: `Print ${batchSize} Items`
      }
    }

    // This shouldn't normally happen with current logic
    return {
      isReady: true,
      requiresConfirmation: true,
      warningLevel: 'info',
      message: `Large batch (${batchSize}) - verify all items are correct`,
      actionText: `Print ${batchSize} Items`
    }
  }

  /**
   * Generate detailed recommendations for batch processing
   * @param batchSize - Current batch size
   * @returns Array of recommendation strings
   */
  const getBatchRecommendations = (batchSize: number): string[] => {
    const recommendations: string[] = []

    if (batchSize === 0) {
      recommendations.push('Approve orders to add items to the print queue')
      recommendations.push('Check that orders have been properly processed')
      recommendations.push('Verify that order approval workflow is working correctly')
    } else if (batchSize < STANDARD_BATCH_SIZE) {
      const needed = STANDARD_BATCH_SIZE - batchSize
      recommendations.push(`Wait for ${needed} more item${needed !== 1 ? 's' : ''} for optimal printing`)
      recommendations.push('Partial batches may result in paper waste')
      recommendations.push('Consider waiting unless urgent printing is required')
      recommendations.push('Items will remain in queue if printing fails')
    } else if (batchSize === STANDARD_BATCH_SIZE) {
      recommendations.push('Perfect batch size for standard paper sheets')
      recommendations.push('No paper waste expected with this batch size')
      recommendations.push('Ready to print without warnings')
    } else {
      recommendations.push('Verify all items in the batch are correct')
      recommendations.push('Large batches may require manual paper handling')
      recommendations.push('Consider printing in smaller batches if needed')
    }

    return recommendations
  }

  /**
   * Check if batch can be printed without warnings
   * @param batchSize - Current batch size
   * @returns boolean
   */
  const canPrintWithoutWarning = (batchSize: number): boolean => {
    return batchSize >= STANDARD_BATCH_SIZE
  }

  /**
   * Check if batch requires user confirmation before printing
   * @param batchSize - Current batch size
   * @returns boolean
   */
  const requiresConfirmation = (batchSize: number): boolean => {
    return batchSize > 0 && batchSize !== STANDARD_BATCH_SIZE
  }

  /**
   * Get warning message for batch size
   * @param batchSize - Current batch size
   * @returns string or undefined
   */
  const getWarningMessage = (batchSize: number): string | undefined => {
    if (batchSize === 0) {
      return 'No items in print queue. Please approve orders to add items to the queue.'
    }

    if (batchSize < STANDARD_BATCH_SIZE) {
      return `Only ${batchSize} item${batchSize === 1 ? '' : 's'} available. Standard batch size is ${STANDARD_BATCH_SIZE} items. Do you want to proceed with a smaller batch?`
    }

    return undefined
  }

  /**
   * Clear validation state
   */
  const clearValidation = () => {
    validationError.value = null
    lastValidation.value = null
  }

  // Computed properties
  const hasValidation = computed(() => lastValidation.value !== null)
  const isValid = computed(() => lastValidation.value?.isValid ?? false)
  const currentBatchSize = computed(() => lastValidation.value?.batchSize ?? 0)

  return {
    // State
    isValidating: readonly(isValidating),
    validationError: readonly(validationError),
    lastValidation: readonly(lastValidation),
    hasValidation,
    isValid,
    currentBatchSize,

    // Methods
    validateBatch,
    getBatchStatus,
    getBatchRecommendations,
    canPrintWithoutWarning,
    requiresConfirmation,
    getWarningMessage,
    clearValidation,

    // Constants
    STANDARD_BATCH_SIZE
  }
}