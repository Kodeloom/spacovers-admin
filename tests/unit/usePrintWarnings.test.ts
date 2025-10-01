import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePrintWarnings } from '~/composables/usePrintWarnings'

describe('usePrintWarnings', () => {
  let mockConfig: {
    onConfirmPrint: ReturnType<typeof vi.fn>
    onCancel: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockConfig = {
      onConfirmPrint: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn()
    }
  })

  it('should initialize with default state', () => {
    const { warningState, hasActiveWarning } = usePrintWarnings(mockConfig)

    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(warningState.value.isProcessing).toBe(false)
    expect(warningState.value.labelCount).toBe(0)
    expect(hasActiveWarning.value).toBe(false)
  })

  it('should calculate paper waste info correctly', () => {
    const { paperWasteInfo, startPrintWarning } = usePrintWarnings(mockConfig)

    startPrintWarning(2)

    expect(paperWasteInfo.value.usedLabels).toBe(2)
    expect(paperWasteInfo.value.wastedLabels).toBe(2)
    expect(paperWasteInfo.value.wastePercentage).toBe(50)
    expect(paperWasteInfo.value.totalLabels).toBe(4)
  })

  it('should start first warning for partial batch (1 label)', () => {
    const { warningState, startPrintWarning, currentWarningMessages } = usePrintWarnings(mockConfig)

    startPrintWarning(1)

    expect(warningState.value.showFirstWarning).toBe(true)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(warningState.value.labelCount).toBe(1)
    expect(currentWarningMessages.value.first?.title).toBe('Incomplete Batch - Only 1 Label')
    expect(currentWarningMessages.value.first?.message).toContain('75% waste')
  })

  it('should start first warning for partial batch (2 labels)', () => {
    const { warningState, startPrintWarning, currentWarningMessages } = usePrintWarnings(mockConfig)

    startPrintWarning(2)

    expect(warningState.value.showFirstWarning).toBe(true)
    expect(warningState.value.labelCount).toBe(2)
    expect(currentWarningMessages.value.first?.title).toBe('Incomplete Batch - Only 2 Labels')
    expect(currentWarningMessages.value.first?.message).toContain('50% waste')
  })

  it('should start first warning for partial batch (3 labels)', () => {
    const { warningState, startPrintWarning, currentWarningMessages } = usePrintWarnings(mockConfig)

    startPrintWarning(3)

    expect(warningState.value.showFirstWarning).toBe(true)
    expect(warningState.value.labelCount).toBe(3)
    expect(currentWarningMessages.value.first?.title).toBe('Incomplete Batch - Only 3 Labels')
    expect(currentWarningMessages.value.first?.message).toContain('25% waste')
  })

  it('should skip warnings for full batch (4 labels)', async () => {
    const { warningState, startPrintWarning } = usePrintWarnings(mockConfig)

    startPrintWarning(4)

    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(mockConfig.onConfirmPrint).toHaveBeenCalled()
  })

  it('should not start warnings for empty batch (0 labels)', () => {
    const { warningState, startPrintWarning } = usePrintWarnings(mockConfig)

    startPrintWarning(0)

    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(mockConfig.onConfirmPrint).not.toHaveBeenCalled()
  })

  it('should progress from first to second warning', () => {
    const { warningState, startPrintWarning, handleFirstWarningConfirm } = usePrintWarnings(mockConfig)

    startPrintWarning(2)
    expect(warningState.value.showFirstWarning).toBe(true)
    expect(warningState.value.showSecondWarning).toBe(false)

    handleFirstWarningConfirm()
    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(true)
  })

  it('should handle second warning confirmation and call onConfirmPrint', async () => {
    const { warningState, startPrintWarning, handleFirstWarningConfirm, handleSecondWarningConfirm } = usePrintWarnings(mockConfig)

    startPrintWarning(2)
    handleFirstWarningConfirm()
    
    expect(warningState.value.isProcessing).toBe(false)
    
    await handleSecondWarningConfirm()
    
    expect(mockConfig.onConfirmPrint).toHaveBeenCalled()
    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(warningState.value.isProcessing).toBe(false)
  })

  it('should handle print failure in second warning', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConfig.onConfirmPrint.mockRejectedValue(new Error('Print failed'))

    const { warningState, startPrintWarning, handleFirstWarningConfirm, handleSecondWarningConfirm } = usePrintWarnings(mockConfig)

    startPrintWarning(2)
    handleFirstWarningConfirm()
    
    await handleSecondWarningConfirm()
    
    expect(mockConfig.onConfirmPrint).toHaveBeenCalled()
    expect(warningState.value.showSecondWarning).toBe(true) // Should stay open on error
    expect(warningState.value.isProcessing).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith('Print failed:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })

  it('should handle cancel and call onCancel', () => {
    const { warningState, startPrintWarning, handleCancel } = usePrintWarnings(mockConfig)

    startPrintWarning(2)
    expect(warningState.value.showFirstWarning).toBe(true)

    handleCancel()

    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(warningState.value.isProcessing).toBe(false)
    expect(warningState.value.labelCount).toBe(0)
    expect(mockConfig.onCancel).toHaveBeenCalled()
  })

  it('should close all warnings', () => {
    const { warningState, startPrintWarning, handleFirstWarningConfirm, closeAllWarnings } = usePrintWarnings(mockConfig)

    startPrintWarning(2)
    handleFirstWarningConfirm()
    
    expect(warningState.value.showSecondWarning).toBe(true)

    closeAllWarnings()

    expect(warningState.value.showFirstWarning).toBe(false)
    expect(warningState.value.showSecondWarning).toBe(false)
    expect(warningState.value.isProcessing).toBe(false)
    expect(warningState.value.labelCount).toBe(0)
  })

  it('should generate correct second warning messages', () => {
    const { startPrintWarning, handleFirstWarningConfirm, currentWarningMessages } = usePrintWarnings(mockConfig)

    startPrintWarning(1)
    handleFirstWarningConfirm()

    expect(currentWarningMessages.value.second?.title).toBe('Final Confirmation - Paper Waste Warning')
    expect(currentWarningMessages.value.second?.message).toContain('75% of the label sheet')
    expect(currentWarningMessages.value.second?.confirmText).toBe('Yes, Print 1 Label')
    expect(currentWarningMessages.value.second?.confirmationPhrase).toBe('PRINT')
  })

  it('should indicate active warning correctly', () => {
    const { hasActiveWarning, startPrintWarning, handleFirstWarningConfirm, closeAllWarnings } = usePrintWarnings(mockConfig)

    expect(hasActiveWarning.value).toBe(false)

    startPrintWarning(2)
    expect(hasActiveWarning.value).toBe(true)

    handleFirstWarningConfirm()
    expect(hasActiveWarning.value).toBe(true)

    closeAllWarnings()
    expect(hasActiveWarning.value).toBe(false)
  })
})