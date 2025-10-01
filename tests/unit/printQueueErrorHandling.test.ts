/**
 * Comprehensive tests for print queue error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { 
  validateBrowserCapabilities,
  getErrorContext,
  getRecoveryStrategy,
  formatPrintQueueError,
  validateQueueIntegrity,
  repairQueueData,
  checkSystemHealth
} from '~/utils/printQueueErrorHandling'
import type { QueueValidationError } from '~/composables/usePrintQueue'

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

const mockWindow = {
  open: vi.fn(),
  print: vi.fn()
}

const mockNavigator = {
  userAgent: 'Test Browser',
  onLine: true
}

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage)
  vi.stubGlobal('window', { ...window, ...mockWindow })
  vi.stubGlobal('navigator', { ...navigator, ...mockNavigator })
  vi.stubGlobal('Storage', function() {})
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('validateBrowserCapabilities', () => {
  it('should detect supported browser', () => {
    const result = validateBrowserCapabilities()
    
    expect(result.supported).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('should detect localStorage issues', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage not available')
    })

    const result = validateBrowserCapabilities()
    
    expect(result.supported).toBe(false)
    expect(result.issues).toContain('Browser does not support localStorage - queue persistence will not work')
  })

  it('should detect missing window.open', () => {
    vi.stubGlobal('window', { ...window, open: undefined })

    const result = validateBrowserCapabilities()
    
    expect(result.supported).toBe(false)
    expect(result.issues).toContain('Browser does not support opening new windows - printing will not work')
  })

  it('should detect popup blocker', () => {
    mockWindow.open.mockReturnValue(null)

    const result = validateBrowserCapabilities()
    
    expect(result.warnings).toContain('Popup blocker may be enabled - printing may be blocked')
  })
})

describe('getErrorContext', () => {
  it('should create comprehensive error context', () => {
    const context = getErrorContext('testOperation', ['label1', 'label2'])
    
    expect(context.operation).toBe('testOperation')
    expect(context.queueState.size).toBe(2)
    expect(context.queueState.labels).toEqual(['label1', 'label2'])
    expect(context.browserInfo.userAgent).toBe('Test Browser')
    expect(context.networkStatus).toBe('online')
    expect(context.timestamp).toBeInstanceOf(Date)
  })

  it('should detect offline status', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })

    const context = getErrorContext('testOperation')
    
    expect(context.networkStatus).toBe('offline')
  })
})

describe('getRecoveryStrategy', () => {
  const mockContext = getErrorContext('test')

  it('should provide recovery for storage errors', () => {
    const error: QueueValidationError = {
      type: 'STORAGE_ERROR',
      message: 'Storage failed',
      userMessage: 'Storage failed',
      suggestions: [],
      retryable: true
    }

    const strategy = getRecoveryStrategy(error, mockContext)
    
    expect(strategy.canRecover).toBe(true)
    expect(strategy.recoveryAction).toBeDefined()
    expect(strategy.userAction).toContain('Clear browser data')
  })

  it('should handle browser errors', () => {
    const error: QueueValidationError = {
      type: 'BROWSER_ERROR',
      message: 'Browser error',
      userMessage: 'Browser error',
      suggestions: [],
      retryable: true
    }

    const strategy = getRecoveryStrategy(error, mockContext)
    
    expect(strategy.canRecover).toBe(true)
    expect(strategy.userAction).toContain('Allow popups')
    expect(strategy.preventRetry).toBe(false)
  })

  it('should prevent retry for non-recoverable errors', () => {
    const error: QueueValidationError = {
      type: 'DUPLICATE_ITEM',
      message: 'Duplicate item',
      userMessage: 'Duplicate item',
      suggestions: [],
      retryable: false
    }

    const strategy = getRecoveryStrategy(error, mockContext)
    
    expect(strategy.canRecover).toBe(false)
    expect(strategy.preventRetry).toBe(true)
  })
})

describe('formatPrintQueueError', () => {
  const mockContext = getErrorContext('test')

  it('should format error with proper severity', () => {
    const error: QueueValidationError = {
      type: 'STORAGE_ERROR',
      message: 'Storage failed',
      userMessage: 'Your data could not be saved',
      suggestions: ['Try again', 'Clear cache'],
      retryable: true
    }

    const formatted = formatPrintQueueError(error, mockContext)
    
    expect(formatted.title).toBe('Storage Error')
    expect(formatted.message).toBe('Your data could not be saved')
    expect(formatted.suggestions).toContain('Try again')
    expect(formatted.suggestions).toContain('Clear cache')
    expect(formatted.canRetry).toBe(true)
    expect(formatted.severity).toBe('high')
  })

  it('should handle low severity errors', () => {
    const error: QueueValidationError = {
      type: 'DUPLICATE_ITEM',
      message: 'Duplicate',
      userMessage: 'Item already exists',
      suggestions: [],
      retryable: false
    }

    const formatted = formatPrintQueueError(error, mockContext)
    
    expect(formatted.severity).toBe('low')
    expect(formatted.canRetry).toBe(false)
  })
})

describe('validateQueueIntegrity', () => {
  it('should validate correct queue data', () => {
    const validQueue = [
      {
        id: 'label1',
        orderItemId: 'item1',
        labelData: { customer: 'Test', type: 'Cover', barcode: '123' },
        createdAt: new Date()
      }
    ]

    const result = validateQueueIntegrity(validQueue)
    
    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
    expect(result.corruptedItems).toHaveLength(0)
  })

  it('should detect invalid queue structure', () => {
    const invalidQueue = 'not an array' as any

    const result = validateQueueIntegrity(invalidQueue)
    
    expect(result.isValid).toBe(false)
    expect(result.issues).toContain('Queue is not an array')
  })

  it('should detect missing required fields', () => {
    const corruptedQueue = [
      { id: 'label1' }, // Missing required fields
      {
        id: 'label2',
        orderItemId: 'item2',
        labelData: { customer: 'Test' }, // Missing barcode
        createdAt: new Date()
      }
    ]

    const result = validateQueueIntegrity(corruptedQueue)
    
    expect(result.isValid).toBe(false)
    expect(result.corruptedItems).toContain(0)
    expect(result.corruptedItems).toContain(1)
  })

  it('should detect invalid objects', () => {
    const corruptedQueue = [
      null,
      'invalid',
      { id: 'valid', orderItemId: 'item', labelData: { customer: 'Test', type: 'Cover', barcode: '123' }, createdAt: new Date() }
    ]

    const result = validateQueueIntegrity(corruptedQueue)
    
    expect(result.isValid).toBe(false)
    expect(result.corruptedItems).toContain(0)
    expect(result.corruptedItems).toContain(1)
    expect(result.corruptedItems).not.toContain(2)
  })
})

describe('repairQueueData', () => {
  it('should repair queue with missing IDs', () => {
    const corruptedQueue = [
      {
        orderItemId: 'item1',
        labelData: { customer: 'Test', type: 'Cover', barcode: '123' }
        // Missing id and createdAt
      }
    ]

    const result = repairQueueData(corruptedQueue)
    
    expect(result.repairedQueue).toHaveLength(1)
    expect(result.repairedQueue[0].id).toBeDefined()
    expect(result.repairedQueue[0].createdAt).toBeInstanceOf(Date)
    expect(result.removedItems).toBe(0)
    expect(result.repairLog).toContain('Generated missing ID for item at index 0')
  })

  it('should remove unrepairable items', () => {
    const corruptedQueue = [
      { id: 'valid', orderItemId: 'item1', labelData: { customer: 'Test', type: 'Cover', barcode: '123' }, createdAt: new Date() },
      { id: 'invalid' }, // Missing critical fields
      null,
      'invalid'
    ]

    const result = repairQueueData(corruptedQueue)
    
    expect(result.repairedQueue).toHaveLength(1)
    expect(result.removedItems).toBe(3)
    expect(result.repairLog.length).toBeGreaterThan(0)
  })

  it('should handle non-array input', () => {
    const result = repairQueueData('not an array' as any)
    
    expect(result.repairedQueue).toEqual([])
    expect(result.removedItems).toBe(1)
    expect(result.repairLog).toContain('Queue was not an array - reset to empty array')
  })

  it('should update positions after repair', () => {
    const corruptedQueue = [
      { id: 'item1', orderItemId: 'order1', labelData: { customer: 'Test', type: 'Cover', barcode: '123' }, createdAt: new Date(), position: 5 },
      { invalid: true }, // Will be removed
      { id: 'item2', orderItemId: 'order2', labelData: { customer: 'Test2', type: 'Cover', barcode: '456' }, createdAt: new Date(), position: 10 }
    ]

    const result = repairQueueData(corruptedQueue)
    
    expect(result.repairedQueue).toHaveLength(2)
    expect(result.repairedQueue[0].position).toBe(0)
    expect(result.repairedQueue[1].position).toBe(1)
  })
})

describe('checkSystemHealth', () => {
  it('should report healthy system', () => {
    const health = checkSystemHealth()
    
    expect(health.healthy).toBe(true)
    expect(health.issues).toHaveLength(0)
  })

  it('should detect localStorage quota issues', () => {
    mockLocalStorage.setItem.mockImplementation((key, value) => {
      if (key === 'quota_test') {
        throw new Error('QuotaExceededError')
      }
    })

    const health = checkSystemHealth()
    
    expect(health.healthy).toBe(false)
    expect(health.issues).toContain('localStorage quota may be exceeded')
    expect(health.recommendations).toContain('Clear browser data to free up storage space')
  })

  it('should detect offline status', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })

    const health = checkSystemHealth()
    
    expect(health.healthy).toBe(false)
    expect(health.issues).toContain('No network connection detected')
    expect(health.recommendations).toContain('Check your internet connection')
  })
})

describe('Error Recovery Integration', () => {
  it('should provide complete error handling workflow', () => {
    const error: QueueValidationError = {
      type: 'STORAGE_ERROR',
      message: 'localStorage failed',
      userMessage: 'Could not save your changes',
      suggestions: ['Try again'],
      retryable: true
    }

    const context = getErrorContext('saveQueue', ['label1', 'label2'])
    const strategy = getRecoveryStrategy(error, context)
    const formatted = formatPrintQueueError(error, context)

    // Verify complete error handling chain
    expect(strategy.canRecover).toBe(true)
    expect(strategy.recoveryAction).toBeDefined()
    expect(formatted.canRetry).toBe(true)
    expect(formatted.severity).toBe('high')
    expect(formatted.suggestions.length).toBeGreaterThan(1)
  })
})