import { ref, computed, readonly } from 'vue'

/**
 * Composable for managing print warning system
 * Handles two-stage confirmation for partial batch printing
 */
export interface PrintWarningState {
  showFirstWarning: boolean
  showSecondWarning: boolean
  isProcessing: boolean
  labelCount: number
}

export interface PrintWarningConfig {
  onConfirmPrint: () => Promise<void>
  onCancel: () => void
}

export const usePrintWarnings = (config: PrintWarningConfig) => {
  // Reactive state
  const warningState = ref<PrintWarningState>({
    showFirstWarning: false,
    showSecondWarning: false,
    isProcessing: false,
    labelCount: 0
  })

  // Calculate paper waste information
  const paperWasteInfo = computed(() => {
    const labelCount = warningState.value.labelCount
    const wastedLabels = 4 - labelCount
    const wastePercentage = Math.round((wastedLabels / 4) * 100)
    
    return {
      wastedLabels,
      wastePercentage,
      usedLabels: labelCount,
      totalLabels: 4
    }
  })

  // Generate warning messages based on label count
  const getWarningMessages = (labelCount: number) => {
    const wasteInfo = {
      wastedLabels: 4 - labelCount,
      wastePercentage: Math.round(((4 - labelCount) / 4) * 100)
    }

    const firstWarningMessages = {
      1: {
        title: 'Incomplete Batch - Only 1 Label',
        message: `You're about to print only 1 label on a 4-label sheet. This will waste 3 label spaces (${wasteInfo.wastePercentage}% waste). Consider adding more labels to the queue for efficient printing.`,
        confirmText: 'Continue Anyway'
      },
      2: {
        title: 'Incomplete Batch - Only 2 Labels', 
        message: `You're about to print only 2 labels on a 4-label sheet. This will waste 2 label spaces (${wasteInfo.wastePercentage}% waste). Consider adding more labels to the queue for efficient printing.`,
        confirmText: 'Continue Anyway'
      },
      3: {
        title: 'Incomplete Batch - Only 3 Labels',
        message: `You're about to print only 3 labels on a 4-label sheet. This will waste 1 label space (${wasteInfo.wastePercentage}% waste). Consider adding one more label to the queue for efficient printing.`,
        confirmText: 'Continue Anyway'
      }
    }

    const secondWarningMessages = {
      1: {
        title: 'Final Confirmation - Paper Waste Warning',
        message: `Are you absolutely sure you want to proceed? This will waste 75% of the label sheet. You can cancel now and add more labels to the queue, or proceed with printing just 1 label.`,
        confirmText: 'Yes, Print 1 Label',
        confirmationPhrase: 'PRINT'
      },
      2: {
        title: 'Final Confirmation - Paper Waste Warning',
        message: `Are you absolutely sure you want to proceed? This will waste 50% of the label sheet. You can cancel now and add more labels to the queue, or proceed with printing just 2 labels.`,
        confirmText: 'Yes, Print 2 Labels',
        confirmationPhrase: 'PRINT'
      },
      3: {
        title: 'Final Confirmation - Paper Waste Warning',
        message: `Are you absolutely sure you want to proceed? This will waste 25% of the label sheet. You can cancel now and add one more label, or proceed with printing just 3 labels.`,
        confirmText: 'Yes, Print 3 Labels',
        confirmationPhrase: 'PRINT'
      }
    }

    return {
      first: firstWarningMessages[labelCount as keyof typeof firstWarningMessages],
      second: secondWarningMessages[labelCount as keyof typeof secondWarningMessages]
    }
  }

  // Start the warning process for partial batch printing
  const startPrintWarning = (labelCount: number): void => {
    if (labelCount >= 4) {
      // No warnings needed for full batch
      handleConfirmPrint()
      return
    }

    if (labelCount < 1) {
      // No labels to print
      return
    }

    // Start first warning
    warningState.value.labelCount = labelCount
    warningState.value.showFirstWarning = true
    warningState.value.showSecondWarning = false
    warningState.value.isProcessing = false
  }

  // Handle first warning confirmation
  const handleFirstWarningConfirm = (): void => {
    warningState.value.showFirstWarning = false
    warningState.value.showSecondWarning = true
  }

  // Handle second warning confirmation (final confirmation)
  const handleSecondWarningConfirm = async (): Promise<void> => {
    warningState.value.isProcessing = true
    
    try {
      await config.onConfirmPrint()
      // Close all warnings on success
      closeAllWarnings()
    } catch (error) {
      console.error('Print failed:', error)
      warningState.value.isProcessing = false
      
      // Handle different types of print errors
      if (error && typeof error === 'object' && 'retryable' in error && error.retryable) {
        // Keep second warning open for retryable errors so user can try again
        console.log('Print failed with retryable error - keeping dialog open for retry')
      } else {
        // Close warnings for non-retryable errors and let the main error handling show the message
        closeAllWarnings()
      }
    }
  }

  // Handle direct print (no warnings needed)
  const handleConfirmPrint = async (): Promise<void> => {
    warningState.value.isProcessing = true
    
    try {
      await config.onConfirmPrint()
      closeAllWarnings()
    } catch (error) {
      console.error('Print failed:', error)
      warningState.value.isProcessing = false
      
      // For direct prints, always close warnings and let main error handling take over
      closeAllWarnings()
    }
  }

  // Handle cancel at any stage
  const handleCancel = (): void => {
    closeAllWarnings()
    config.onCancel()
  }

  // Close all warning dialogs
  const closeAllWarnings = (): void => {
    warningState.value.showFirstWarning = false
    warningState.value.showSecondWarning = false
    warningState.value.isProcessing = false
    warningState.value.labelCount = 0
  }

  // Get current warning messages
  const currentWarningMessages = computed(() => {
    return getWarningMessages(warningState.value.labelCount)
  })

  // Check if any warning is currently shown
  const hasActiveWarning = computed(() => {
    return warningState.value.showFirstWarning || warningState.value.showSecondWarning
  })

  return {
    // State
    warningState: readonly(warningState),
    paperWasteInfo,
    currentWarningMessages,
    hasActiveWarning,
    
    // Actions
    startPrintWarning,
    handleFirstWarningConfirm,
    handleSecondWarningConfirm,
    handleCancel,
    closeAllWarnings
  }
}