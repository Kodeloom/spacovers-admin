import { ref, computed, readonly, onMounted } from 'vue'
import type { OrderItem, Order, Customer, Item, Product, ProductAttribute } from '@prisma-app/client'
import { 
  validateQueueIntegrity, 
  repairQueueData, 
  getErrorContext, 
  logPrintQueueError,
  checkSystemHealth 
} from '~/utils/printQueueErrorHandling'

// Types for the print queue system
export interface QueuedLabel {
  id: string
  orderItemId: string
  orderNumber: string
  customerName: string
  itemName: string
  labelData: SplitLabelData
  createdAt: Date
  position: number
}

export interface SplitLabelData {
  orderItem: OrderItemWithRelations
  customer: string
  thickness: string
  size: string
  type: string
  color: string
  date: string
  barcode: string
  upgrades: string[]
}

export interface OrderItemWithRelations extends OrderItem {
  order: Order & {
    customer: Customer
  }
  item: Item
  product?: Product | null
  productAttributes?: ProductAttribute | null
}

export interface PrintQueueState {
  labels: QueuedLabel[]
  maxSize: number
}

export interface QueueValidationError {
  type: 'DUPLICATE_ITEM' | 'INVALID_DATA' | 'STORAGE_ERROR' | 'MAX_SIZE_EXCEEDED' | 'PRINT_ERROR' | 'NETWORK_ERROR' | 'BROWSER_ERROR'
  message: string
  userMessage: string
  suggestions: string[]
  retryable: boolean
  orderItemId?: string
  details?: any
}

const STORAGE_KEY = 'spacovers_print_queue'
const MAX_QUEUE_SIZE = 4

/**
 * Composable for managing the print queue system
 * Handles adding, removing, reordering labels and localStorage persistence
 */
export const usePrintQueue = () => {
  // Reactive state
  const queue = ref<QueuedLabel[]>([])
  const isLoading = ref(false)
  const error = ref<QueueValidationError | null>(null)

  // Load queue from localStorage with comprehensive validation and repair
  const loadQueue = (): void => {
    const context = getErrorContext('loadQueue')
    
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          
          // Validate queue integrity
          const validation = validateQueueIntegrity(parsed)
          
          if (!validation.isValid) {
            console.warn('Queue data integrity issues found:', validation.issues)
            
            // Attempt to repair the queue
            const repair = repairQueueData(parsed)
            
            if (repair.repairedQueue.length > 0) {
              console.log('Queue repair completed:', repair.repairLog)
              
              // Convert date strings back to Date objects
              queue.value = repair.repairedQueue.map((item: any) => ({
                ...item,
                createdAt: new Date(item.createdAt)
              }))
              
              // Save the repaired queue
              saveQueue()
              
              // Show warning about repaired data
              error.value = {
                type: 'STORAGE_ERROR',
                message: 'Queue data was repaired',
                userMessage: `Your print queue was partially corrupted but has been repaired. ${repair.removedItems} invalid items were removed.`,
                suggestions: [
                  'Your queue has been automatically repaired',
                  'Please verify that all expected labels are still present',
                  'Contact support if you notice missing labels'
                ],
                retryable: false,
                details: { repairLog: repair.repairLog, removedItems: repair.removedItems }
              }
              
              return
            } else {
              throw new Error('Queue data is completely corrupted and cannot be repaired')
            }
          }
          
          // Convert date strings back to Date objects for valid data
          queue.value = parsed.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load print queue from localStorage:', err)
      
      // Log error with context
      const errorDetails: QueueValidationError = {
        type: 'STORAGE_ERROR',
        message: 'Failed to load saved print queue',
        userMessage: 'Your saved print queue could not be loaded. The queue has been reset.',
        suggestions: [
          'Your previous queue items have been cleared due to data corruption',
          'You can safely add new labels to the queue',
          'Contact support if this problem persists'
        ],
        retryable: false,
        details: err
      }
      
      logPrintQueueError(errorDetails, context)
      
      // Clear corrupted data
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch (clearErr) {
          console.error('Failed to clear corrupted queue data:', clearErr)
        }
      }
      
      error.value = errorDetails
      
      // Reset queue to empty state
      queue.value = []
    }
  }

  // Save queue to localStorage with retry mechanism
  const saveQueue = async (retryCount: number = 0): Promise<boolean> => {
    const maxRetries = 3
    
    try {
      if (typeof window !== 'undefined') {
        // Check localStorage availability and quota
        const testKey = 'test_storage_' + Date.now()
        localStorage.setItem(testKey, 'test')
        localStorage.removeItem(testKey)
        
        // Validate queue data before saving
        if (!Array.isArray(queue.value)) {
          throw new Error('Invalid queue data - not an array')
        }
        
        const serializedQueue = JSON.stringify(queue.value)
        
        // Check if data is too large (rough estimate)
        if (serializedQueue.length > 5 * 1024 * 1024) { // 5MB limit
          throw new Error('Queue data too large for localStorage')
        }
        
        localStorage.setItem(STORAGE_KEY, serializedQueue)
        return true
      }
      return false
    } catch (err) {
      console.error(`Failed to save print queue (attempt ${retryCount + 1}):`, err)
      
      if (retryCount < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
        return saveQueue(retryCount + 1)
      }
      
      // Determine error type and provide appropriate user message
      let errorType: QueueValidationError['type'] = 'STORAGE_ERROR'
      let userMessage = 'Failed to save print queue changes'
      let suggestions = ['Try the operation again', 'Contact support if the problem persists']
      
      if (err instanceof Error) {
        if (err.message.includes('quota') || err.message.includes('QUOTA_EXCEEDED')) {
          userMessage = 'Not enough storage space to save the print queue'
          suggestions = [
            'Clear your browser cache and cookies',
            'Close other browser tabs to free up memory',
            'Contact IT support for assistance'
          ]
        } else if (err.message.includes('too large')) {
          userMessage = 'Print queue has too many items to save'
          suggestions = [
            'Print the current batch to reduce queue size',
            'Remove some items from the queue',
            'Contact support if you need to queue more items'
          ]
        }
      }
      
      error.value = {
        type: errorType,
        message: 'Failed to save print queue',
        userMessage,
        suggestions,
        retryable: retryCount < maxRetries,
        details: err
      }
      
      return false
    }
  }

  // Validate order item data with comprehensive checks
  const validateOrderItem = (orderItem: OrderItemWithRelations): QueueValidationError | null => {
    // Check if orderItem exists and is an object
    if (!orderItem || typeof orderItem !== 'object') {
      return {
        type: 'INVALID_DATA',
        message: 'Order item is required',
        userMessage: 'No order item provided for label generation',
        suggestions: ['Select a valid order item', 'Refresh the page and try again'],
        retryable: true
      }
    }

    // Check required ID
    if (!orderItem.id || typeof orderItem.id !== 'string') {
      return {
        type: 'INVALID_DATA',
        message: 'Order item must have a valid ID',
        userMessage: 'This order item is missing required information',
        suggestions: ['Try selecting the item again', 'Contact support if the problem persists'],
        retryable: true
      }
    }

    // Check order and customer information
    if (!orderItem.order) {
      return {
        type: 'INVALID_DATA',
        message: 'Order item must have order information',
        userMessage: 'This order item is missing order details',
        suggestions: ['Refresh the order data', 'Contact support if the problem persists'],
        retryable: true
      }
    }

    if (!orderItem.order.customer?.name) {
      return {
        type: 'INVALID_DATA',
        message: 'Order item must have customer information',
        userMessage: 'This order is missing customer information required for labels',
        suggestions: [
          'Ensure the order has a valid customer assigned',
          'Contact the office to update customer information',
          'Refresh the page and try again'
        ],
        retryable: true
      }
    }

    // Check item information
    if (!orderItem.item?.name) {
      return {
        type: 'INVALID_DATA',
        message: 'Order item must have item information',
        userMessage: 'This order item is missing product details required for labels',
        suggestions: [
          'Ensure the order item has a valid product assigned',
          'Contact the office to update product information',
          'Refresh the page and try again'
        ],
        retryable: true
      }
    }

    // Check for duplicate with more detailed message
    const exists = queue.value.some(label => label.orderItemId === orderItem.id)
    if (exists) {
      const existingLabel = queue.value.find(label => label.orderItemId === orderItem.id)
      return {
        type: 'DUPLICATE_ITEM',
        message: 'This item is already in the print queue',
        userMessage: `This item is already queued for printing (added ${existingLabel ? new Date(existingLabel.createdAt).toLocaleString() : 'recently'})`,
        suggestions: [
          'Check the print queue to see the existing label',
          'Remove the existing label first if you need to re-add it',
          'Print the current queue if ready'
        ],
        retryable: false,
        orderItemId: orderItem.id
      }
    }

    // Validate essential label data can be generated
    try {
      if (!orderItem.order.customer.name.trim()) {
        return {
          type: 'INVALID_DATA',
          message: 'Customer name is empty',
          userMessage: 'Customer name is required for label generation',
          suggestions: ['Update the customer name in the order', 'Contact the office for assistance'],
          retryable: true
        }
      }

      if (!orderItem.item.name.trim()) {
        return {
          type: 'INVALID_DATA',
          message: 'Item name is empty',
          userMessage: 'Product name is required for label generation',
          suggestions: ['Update the product information', 'Contact the office for assistance'],
          retryable: true
        }
      }
    } catch (err) {
      return {
        type: 'INVALID_DATA',
        message: 'Error validating order item data',
        userMessage: 'There was an error processing this order item',
        suggestions: ['Try again with a different item', 'Contact support for assistance'],
        retryable: true,
        details: err
      }
    }

    return null
  }

  // Generate optimized label data
  const generateLabelData = (orderItem: OrderItemWithRelations): SplitLabelData => {
    const upgrades: string[] = []
    
    // Collect upgrades from order item
    if (orderItem.foamUpgrade && orderItem.foamUpgrade !== 'No') {
      upgrades.push(`Foam: ${orderItem.foamUpgrade}`)
    }
    if (orderItem.doublePlasticWrapUpgrade === 'Yes') {
      upgrades.push('Double Wrap')
    }
    if (orderItem.webbingUpgrade === 'Yes') {
      upgrades.push('Webbing')
    }
    if (orderItem.metalForLifterUpgrade === 'Yes') {
      upgrades.push('Metal Lifter')
    }
    if (orderItem.steamStopperUpgrade === 'Yes') {
      upgrades.push('Steam Stop')
    }
    if (orderItem.fabricUpgrade && orderItem.fabricUpgrade !== 'No') {
      upgrades.push(`Fabric: ${orderItem.fabricUpgrade}`)
    }
    if (orderItem.extraHandleQty && parseInt(orderItem.extraHandleQty) > 0) {
      upgrades.push(`+${orderItem.extraHandleQty} Handle`)
    }

    // Get product attributes if available
    const attrs = orderItem.productAttributes
    const color = attrs?.color || orderItem.product?.color || 'Standard'
    const size = attrs?.size || orderItem.size || orderItem.product?.size || 'Custom'
    
    return {
      orderItem,
      customer: orderItem.order.customer.name,
      thickness: attrs?.foamUpgrade || orderItem.foamUpgrade || 'Standard',
      size,
      type: orderItem.item.name,
      color,
      date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      barcode: orderItem.id, // Using order item ID as barcode
      upgrades
    }
  }

  // Add item to queue with comprehensive error handling
  const addToQueue = async (orderItem: OrderItemWithRelations): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      // Check queue size limit
      if (queue.value.length >= MAX_QUEUE_SIZE) {
        error.value = {
          type: 'MAX_SIZE_EXCEEDED',
          message: `Queue is full. Maximum ${MAX_QUEUE_SIZE} labels allowed.`,
          userMessage: `Cannot add more labels. The print queue is full (${MAX_QUEUE_SIZE}/${MAX_QUEUE_SIZE})`,
          suggestions: [
            'Print the current batch to make room for new labels',
            'Remove some labels from the queue',
            'Consider printing in smaller batches'
          ],
          retryable: false
        }
        return false
      }

      // Validate order item
      const validationError = validateOrderItem(orderItem)
      if (validationError) {
        error.value = validationError
        return false
      }

      // Generate label data with error handling
      let labelData: SplitLabelData
      try {
        labelData = generateLabelData(orderItem)
      } catch (err) {
        console.error('Failed to generate label data:', err)
        error.value = {
          type: 'INVALID_DATA',
          message: 'Failed to generate label data',
          userMessage: 'Could not create label from this order item',
          suggestions: [
            'Check that the order item has all required information',
            'Try refreshing the page and selecting the item again',
            'Contact support if the problem persists'
          ],
          retryable: true,
          details: err
        }
        return false
      }

      // Create queued label with validation
      let queuedLabel: QueuedLabel
      try {
        queuedLabel = {
          id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          orderItemId: orderItem.id,
          orderNumber: orderItem.order.salesOrderNumber || orderItem.order.id,
          customerName: orderItem.order.customer.name,
          itemName: orderItem.item.name,
          labelData,
          createdAt: new Date(),
          position: queue.value.length
        }

        // Validate the created label
        if (!queuedLabel.id || !queuedLabel.orderItemId || !queuedLabel.labelData) {
          throw new Error('Generated label is missing required fields')
        }
      } catch (err) {
        console.error('Failed to create queued label:', err)
        error.value = {
          type: 'INVALID_DATA',
          message: 'Failed to create queued label',
          userMessage: 'Could not create a valid label for this item',
          suggestions: [
            'Try selecting the item again',
            'Check that the order has all required information',
            'Contact support for assistance'
          ],
          retryable: true,
          details: err
        }
        return false
      }

      // Add to queue
      queue.value.push(queuedLabel)
      
      // Save queue with error handling
      const saveSuccess = await saveQueue()
      if (!saveSuccess) {
        // Remove the item we just added since save failed
        queue.value.pop()
        return false
      }

      return true
    } catch (err) {
      console.error('Unexpected error adding item to queue:', err)
      error.value = {
        type: 'STORAGE_ERROR',
        message: 'Unexpected error adding item to print queue',
        userMessage: 'An unexpected error occurred while adding the label',
        suggestions: [
          'Try the operation again',
          'Refresh the page if the problem persists',
          'Contact support for assistance'
        ],
        retryable: true,
        details: err
      }
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Remove item from queue with comprehensive error handling
  const removeFromQueue = async (labelId: string): Promise<boolean> => {
    try {
      // Validate input
      if (!labelId || typeof labelId !== 'string') {
        error.value = {
          type: 'INVALID_DATA',
          message: 'Invalid label ID provided',
          userMessage: 'Cannot remove label - invalid identifier',
          suggestions: ['Try refreshing the page', 'Contact support if the problem persists'],
          retryable: true
        }
        return false
      }

      const index = queue.value.findIndex(label => label.id === labelId)
      if (index === -1) {
        error.value = {
          type: 'INVALID_DATA',
          message: 'Label not found in queue',
          userMessage: 'This label is no longer in the queue',
          suggestions: [
            'The label may have already been removed',
            'Refresh the page to see the current queue',
            'Check if the label was printed in another session'
          ],
          retryable: false
        }
        return false
      }

      // Store the label info for potential error messages
      const labelToRemove = queue.value[index]
      
      // Remove from queue
      queue.value.splice(index, 1)
      
      // Update positions
      queue.value.forEach((label, idx) => {
        label.position = idx
      })

      // Save queue with error handling
      const saveSuccess = await saveQueue()
      if (!saveSuccess) {
        // Restore the removed item since save failed
        queue.value.splice(index, 0, labelToRemove)
        // Restore positions
        queue.value.forEach((label, idx) => {
          label.position = idx
        })
        return false
      }

      error.value = null
      return true
    } catch (err) {
      console.error('Failed to remove item from queue:', err)
      error.value = {
        type: 'STORAGE_ERROR',
        message: 'Failed to remove item from queue',
        userMessage: 'Could not remove the label from the queue',
        suggestions: [
          'Try the operation again',
          'Refresh the page if the problem persists',
          'Contact support for assistance'
        ],
        retryable: true,
        details: err
      }
      return false
    }
  }

  // Clear entire queue with backup and recovery
  const clearQueue = async (): Promise<boolean> => {
    try {
      // Create backup of current queue in case we need to restore
      const queueBackup = [...queue.value]
      
      // Clear the queue
      queue.value = []
      
      // Save the cleared queue
      const saveSuccess = await saveQueue()
      if (!saveSuccess) {
        // Restore from backup since save failed
        queue.value = queueBackup
        return false
      }

      error.value = null
      return true
    } catch (err) {
      console.error('Failed to clear queue:', err)
      error.value = {
        type: 'STORAGE_ERROR',
        message: 'Failed to clear print queue',
        userMessage: 'Could not clear the print queue',
        suggestions: [
          'Try the operation again',
          'Refresh the page if the problem persists',
          'Contact support for assistance'
        ],
        retryable: true,
        details: err
      }
      return false
    }
  }

  // Reorder queue items with validation and recovery
  const reorderQueue = async (fromIndex: number, toIndex: number): Promise<boolean> => {
    try {
      // Validate indices
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
        error.value = {
          type: 'INVALID_DATA',
          message: 'Invalid reorder indices - must be integers',
          userMessage: 'Cannot reorder items - invalid position specified',
          suggestions: ['Try the reorder operation again', 'Refresh the page if the problem persists'],
          retryable: true
        }
        return false
      }

      if (fromIndex < 0 || fromIndex >= queue.value.length || 
          toIndex < 0 || toIndex >= queue.value.length) {
        error.value = {
          type: 'INVALID_DATA',
          message: 'Invalid reorder indices - out of bounds',
          userMessage: 'Cannot reorder items - position is out of range',
          suggestions: [
            'The queue may have changed since you started the operation',
            'Refresh the page to see the current queue',
            'Try the reorder operation again'
          ],
          retryable: true
        }
        return false
      }

      if (fromIndex === toIndex) {
        // No change needed
        return true
      }

      // Create backup for recovery
      const queueBackup = [...queue.value]

      // Move item
      const [movedItem] = queue.value.splice(fromIndex, 1)
      queue.value.splice(toIndex, 0, movedItem)

      // Update positions
      queue.value.forEach((label, idx) => {
        label.position = idx
      })

      // Save with error handling
      const saveSuccess = await saveQueue()
      if (!saveSuccess) {
        // Restore from backup since save failed
        queue.value = queueBackup
        return false
      }

      error.value = null
      return true
    } catch (err) {
      console.error('Failed to reorder queue:', err)
      error.value = {
        type: 'STORAGE_ERROR',
        message: 'Failed to reorder queue items',
        userMessage: 'Could not reorder the queue items',
        suggestions: [
          'Try the reorder operation again',
          'Refresh the page if the problem persists',
          'Contact support for assistance'
        ],
        retryable: true,
        details: err
      }
      return false
    }
  }

  // Get queue status
  const getQueueStatus = () => {
    return computed(() => ({
      count: queue.value.length,
      maxSize: MAX_QUEUE_SIZE,
      canPrintWithoutWarning: queue.value.length === MAX_QUEUE_SIZE,
      isEmpty: queue.value.length === 0,
      isFull: queue.value.length >= MAX_QUEUE_SIZE,
      hasPartialBatch: queue.value.length > 0 && queue.value.length < MAX_QUEUE_SIZE
    }))
  }

  // Check if order item is already queued
  const isItemQueued = (orderItemId: string): boolean => {
    return queue.value.some(label => label.orderItemId === orderItemId)
  }

  // Get label by order item ID
  const getLabelByOrderItemId = (orderItemId: string): QueuedLabel | undefined => {
    return queue.value.find(label => label.orderItemId === orderItemId)
  }

  // Print queue with comprehensive error handling and retry mechanism
  const printQueue = async (forcePartial: boolean = false, retryCount: number = 0): Promise<boolean> => {
    const maxRetries = 2
    
    try {
      if (queue.value.length === 0) {
        error.value = {
          type: 'INVALID_DATA',
          message: 'No labels in queue to print',
          userMessage: 'Cannot print - no labels in the queue',
          suggestions: [
            'Add labels to the queue before printing',
            'Check that labels were not already printed',
            'Refresh the page to see the current queue'
          ],
          retryable: false
        }
        return false
      }

      // Validate queue data before printing
      const invalidLabels = queue.value.filter(label => 
        !label.id || !label.labelData || !label.orderItemId
      )
      
      if (invalidLabels.length > 0) {
        error.value = {
          type: 'INVALID_DATA',
          message: 'Queue contains invalid labels',
          userMessage: 'Some labels in the queue are corrupted and cannot be printed',
          suggestions: [
            'Remove the corrupted labels from the queue',
            'Clear the queue and re-add the labels',
            'Contact support for assistance'
          ],
          retryable: false,
          details: { invalidCount: invalidLabels.length }
        }
        return false
      }

      // For full batches or forced partial prints, proceed directly
      if (queue.value.length === MAX_QUEUE_SIZE || forcePartial) {
        try {
          // Generate print layout and trigger browser print
          await generatePrintLayout()
          
          // Clear the queue after successful printing
          const clearSuccess = await clearQueue()
          if (!clearSuccess) {
            // Print succeeded but queue clear failed - warn user
            console.warn('Print succeeded but failed to clear queue')
            error.value = {
              type: 'STORAGE_ERROR',
              message: 'Print succeeded but failed to clear queue',
              userMessage: 'Labels were printed successfully, but the queue could not be cleared automatically',
              suggestions: [
                'Manually clear the queue to avoid duplicate printing',
                'Refresh the page to see the current queue status',
                'Contact support if the problem persists'
              ],
              retryable: true
            }
            return true // Print was successful even if clear failed
          }
          
          return true
        } catch (printErr) {
          console.error('Print generation failed:', printErr)
          
          // Determine error type based on the error
          let errorType: QueueValidationError['type'] = 'PRINT_ERROR'
          let userMessage = 'Failed to generate the print layout'
          let suggestions = ['Try printing again', 'Contact support if the problem persists']
          
          if (printErr instanceof Error) {
            if (printErr.message.includes('popup') || printErr.message.includes('blocked')) {
              errorType = 'BROWSER_ERROR'
              userMessage = 'Print popup was blocked by your browser'
              suggestions = [
                'Allow popups for this site in your browser settings',
                'Try printing again after allowing popups',
                'Use a different browser if the problem persists'
              ]
            } else if (printErr.message.includes('network') || printErr.message.includes('connection')) {
              errorType = 'NETWORK_ERROR'
              userMessage = 'Network error occurred during printing'
              suggestions = [
                'Check your internet connection',
                'Try printing again',
                'Contact IT support if the problem persists'
              ]
            }
          }
          
          error.value = {
            type: errorType,
            message: 'Failed to print labels',
            userMessage,
            suggestions,
            retryable: retryCount < maxRetries,
            details: printErr
          }
          
          // Retry for certain types of errors
          if (retryCount < maxRetries && (errorType === 'NETWORK_ERROR' || errorType === 'PRINT_ERROR')) {
            console.log(`Retrying print operation (attempt ${retryCount + 1})`)
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
            return printQueue(forcePartial, retryCount + 1)
          }
          
          return false
        }
      }

      // For partial batches, the warning system should be handled by the UI component
      // This function should only be called after warnings are confirmed
      error.value = {
        type: 'INVALID_DATA',
        message: 'Cannot print partial batch without confirmation',
        userMessage: 'Partial batch printing requires confirmation',
        suggestions: [
          'Use the print button in the interface to get proper warnings',
          'Add more labels to create a full batch',
          'Contact support if you need to bypass warnings'
        ],
        retryable: false
      }
      return false
    } catch (err) {
      console.error('Unexpected error during print operation:', err)
      error.value = {
        type: 'PRINT_ERROR',
        message: 'Unexpected error during print operation',
        userMessage: 'An unexpected error occurred while printing',
        suggestions: [
          'Try the print operation again',
          'Refresh the page if the problem persists',
          'Contact support for assistance'
        ],
        retryable: retryCount < maxRetries,
        details: err
      }
      
      // Retry for unexpected errors
      if (retryCount < maxRetries) {
        console.log(`Retrying print operation after unexpected error (attempt ${retryCount + 1})`)
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
        return printQueue(forcePartial, retryCount + 1)
      }
      
      return false
    }
  }

  // Generate print layout and trigger browser print with comprehensive error handling
  const generatePrintLayout = async (): Promise<void> => {
    if (typeof window === 'undefined') {
      throw new Error('Print functionality is not available in server-side environment')
    }

    // Check if browser supports required features
    if (!window.open) {
      throw new Error('Browser does not support opening new windows for printing')
    }

    let printWindow: Window | null = null
    
    try {
      // Attempt to open print window with error handling
      printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes')
      
      if (!printWindow) {
        throw new Error('Failed to open print window - popup may be blocked by browser')
      }

      // Check if the window was actually created and accessible
      try {
        printWindow.document.title = 'Print Test'
      } catch (accessErr) {
        throw new Error('Print window is not accessible - may be blocked by browser security')
      }

      // Generate HTML content for printing with validation
      let printContent: string
      try {
        printContent = await generatePrintHTML()
        
        if (!printContent || printContent.trim().length === 0) {
          throw new Error('Generated print content is empty')
        }
      } catch (contentErr) {
        throw new Error(`Failed to generate print content: ${contentErr}`)
      }
      
      // Create complete HTML document with error handling
      const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Split Label Print - ${queue.value.length} Labels</title>
  <style>${getPrintStyles()}</style>
</head>
<body>
  ${printContent}
  <script>
    let printAttempted = false;
    let windowClosed = false;
    
    // Auto-print when page loads
    window.onload = function() {
      setTimeout(function() {
        if (!printAttempted && !windowClosed) {
          try {
            printAttempted = true;
            window.print();
          } catch (printErr) {
            console.error('Print failed:', printErr);
            alert('Print failed: ' + printErr.message);
          }
        }
      }, 500);
    };
    
    // Handle print dialog events
    window.onbeforeprint = function() {
      console.log('Print dialog opened');
    };
    
    window.onafterprint = function() {
      console.log('Print dialog closed');
      if (!windowClosed) {
        windowClosed = true;
        setTimeout(function() {
          try {
            window.close();
          } catch (closeErr) {
            console.log('Could not auto-close print window');
          }
        }, 1000);
      }
    };
    
    // Fallback close after timeout
    setTimeout(function() {
      if (!windowClosed) {
        windowClosed = true;
        try {
          window.close();
        } catch (closeErr) {
          console.log('Could not auto-close print window after timeout');
        }
      }
    }, 30000); // 30 second timeout
  </script>
</body>
</html>`
      
      // Write document content with error handling
      try {
        printWindow.document.open()
        printWindow.document.write(htmlDocument)
        printWindow.document.close()
      } catch (writeErr) {
        throw new Error(`Failed to write content to print window: ${writeErr}`)
      }
      
    } catch (error) {
      // Clean up print window if it was created
      if (printWindow) {
        try {
          printWindow.close()
        } catch (closeErr) {
          console.warn('Could not close print window after error:', closeErr)
        }
      }
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error(`Unknown error during print layout generation: ${error}`)
      }
    }
  }

  // Generate HTML content for split labels with validation
  const generatePrintHTML = async (): Promise<string> => {
    try {
      // Validate queue state
      if (!Array.isArray(queue.value)) {
        throw new Error('Queue is not in a valid state for printing')
      }

      if (queue.value.length === 0) {
        throw new Error('No labels to print')
      }

      let html = '<div class="print-page">'
      html += '<div class="label-grid">'
      
      // Create 2x2 grid with labels (4 positions total)
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        const label = queue.value[i]
        const row = Math.floor(i / 2) + 1 // Row 1 or 2
        const col = (i % 2) + 1 // Column 1 or 2
        
        html += `<div class="label-position position-${i + 1} row-${row} col-${col}">`
        
        if (label) {
          try {
            // Validate label before generating HTML
            if (!label.id || !label.labelData || !label.orderItemId) {
              throw new Error(`Invalid label at position ${i + 1}`)
            }
            
            // Generate split label HTML for each queued item
            const labelHTML = await generateSplitLabelHTML(label)
            
            if (!labelHTML || labelHTML.trim().length === 0) {
              throw new Error(`Empty HTML generated for label at position ${i + 1}`)
            }
            
            html += labelHTML
          } catch (labelErr) {
            console.error(`Error generating HTML for label at position ${i + 1}:`, labelErr)
            // Generate error placeholder instead of failing completely
            html += `<div class="label-error-placeholder">
              <div class="error-message">Error generating label</div>
              <div class="error-details">Position ${i + 1}</div>
            </div>`
          }
        } else {
          // Empty placeholder for unused positions
          html += '<div class="empty-label-placeholder"></div>'
        }
        
        html += '</div>'
      }
      
      html += '</div>'
      html += '</div>'
      
      // Validate final HTML
      if (!html || html.trim().length === 0) {
        throw new Error('Generated HTML is empty')
      }
      
      return html
    } catch (error) {
      console.error('Error generating print HTML:', error)
      throw new Error(`Failed to generate print HTML: ${error}`)
    }
  }

  // Generate HTML for a single split label with validation and error handling
  const generateSplitLabelHTML = async (label: QueuedLabel): Promise<string> => {
    try {
      // Validate label structure
      if (!label || typeof label !== 'object') {
        throw new Error('Invalid label object')
      }

      if (!label.labelData || typeof label.labelData !== 'object') {
        throw new Error('Label is missing labelData')
      }

      const { labelData } = label

      // Validate required label data fields
      const requiredFields = ['customer', 'type', 'color', 'thickness', 'size', 'date', 'barcode']
      for (const field of requiredFields) {
        if (!labelData[field as keyof SplitLabelData]) {
          throw new Error(`Label is missing required field: ${field}`)
        }
      }

      // Sanitize text content to prevent XSS and HTML issues
      const sanitizeText = (text: string): string => {
        if (typeof text !== 'string') return String(text || '')
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      }

      // Sanitize all text fields
      const safeCustomer = sanitizeText(labelData.customer)
      const safeOrderNumber = sanitizeText(label.orderNumber)
      const safeDate = sanitizeText(labelData.date)
      const safeBarcode = sanitizeText(labelData.barcode)
      const safeType = sanitizeText(labelData.type)
      const safeColor = sanitizeText(labelData.color)
      const safeThickness = sanitizeText(labelData.thickness)
      const safeSize = sanitizeText(labelData.size)
      
      // Handle upgrades array safely
      let safeUpgrades: string[] = []
      if (Array.isArray(labelData.upgrades)) {
        safeUpgrades = labelData.upgrades
          .filter(upgrade => upgrade && typeof upgrade === 'string')
          .map(upgrade => sanitizeText(upgrade))
      }

      // Validate that we have meaningful content after sanitization
      if (!safeCustomer.trim() || !safeType.trim()) {
        throw new Error('Label has empty required fields after sanitization')
      }

      return `
        <div class="split-label-container">
          <!-- Top Part (3x3) -->
          <div class="label-part top-part">
            <div class="label-header">
              <div class="customer-info">
                <span class="customer-label">Customer:</span>
                <span class="customer-name">${safeCustomer}</span>
              </div>
              <div class="order-info">
                <div class="order-number">Order #${safeOrderNumber}</div>
                <div class="order-date">${safeDate}</div>
              </div>
            </div>
            
            <div class="barcode-section">
              <div class="barcode-text">${safeBarcode}</div>
            </div>
            
            <div class="specs-section">
              <div class="spec-grid">
                <div class="spec-item">
                  <span class="spec-label">Type:</span>
                  <span class="spec-value">${safeType}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Color:</span>
                  <span class="spec-value">${safeColor}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Thickness:</span>
                  <span class="spec-value">${safeThickness}</span>
                </div>
                <div class="spec-item">
                  <span class="spec-label">Size:</span>
                  <span class="spec-value">${safeSize}</span>
                </div>
              </div>
              ${safeUpgrades.length > 0 ? `
                <div class="upgrades-section">
                  <div class="spec-item upgrades">
                    <span class="spec-label">Upgrades:</span>
                    <span class="spec-value">${safeUpgrades.join(', ')}</span>
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="label-footer">
              <div class="part-indicator">TOP PART</div>
            </div>
          </div>
          
          <!-- Bottom Part (2x3) -->
          <div class="label-part bottom-part">
            <div class="label-header compact">
              <div class="customer-info compact">
                <span class="customer-label">Customer:</span>
                <span class="customer-name">${safeCustomer}</span>
              </div>
              <div class="order-info compact">
                <div class="order-number">${safeOrderNumber}</div>
                <div class="order-date">${safeDate}</div>
              </div>
            </div>
            
            <div class="barcode-section compact">
              <div class="barcode-text compact">${safeBarcode}</div>
            </div>
            
            <div class="specs-section compact">
              <div class="spec-list">
                <div class="spec-item compact">
                  <span class="spec-label">Type:</span>
                  <span class="spec-value">${safeType}</span>
                </div>
                <div class="spec-item compact">
                  <span class="spec-label">Color:</span>
                  <span class="spec-value">${safeColor}</span>
                </div>
                <div class="spec-item compact">
                  <span class="spec-label">Thick:</span>
                  <span class="spec-value">${safeThickness}</span>
                </div>
                <div class="spec-item compact">
                  <span class="spec-label">Size:</span>
                  <span class="spec-value">${safeSize}</span>
                </div>
                ${safeUpgrades.length > 0 ? `
                  <div class="spec-item compact">
                    <span class="spec-label">Up:</span>
                    <span class="spec-value">${safeUpgrades.join(', ')}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            
            <div class="label-footer compact">
              <div class="part-indicator">BOTTOM PART</div>
            </div>
          </div>
        </div>
      `
    } catch (error) {
      console.error('Error generating split label HTML:', error)
      throw new Error(`Failed to generate label HTML: ${error}`)
    }
  }

  // Get CSS styles for printing
  const getPrintStyles = (): string => {
    return `
      @page {
        size: 8.5in 11in;
        margin: 0.5in 1.25in;
      }
      
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        font-size: 8pt;
        line-height: 1.1;
      }
      
      .print-page {
        width: 6in;
        height: 10in;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .label-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 0.25in;
        width: 100%;
        height: 100%;
      }
      
      .label-position {
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-inside: avoid;
      }
      
      .split-label-container {
        display: flex;
        flex-direction: column;
        gap: 0.1in;
        width: 100%;
        height: 100%;
      }
      
      .label-part {
        border: 2px solid #000;
        background: #fff;
        padding: 0.05in;
        overflow: hidden;
      }
      
      .label-part.top-part {
        width: 3in;
        height: 3in;
        display: flex;
        flex-direction: column;
      }
      
      .label-part.bottom-part {
        width: 2in;
        height: 3in;
        display: flex;
        flex-direction: column;
      }
      
      .label-header {
        border-bottom: 1px solid #000;
        margin-bottom: 0.05in;
        padding-bottom: 0.03in;
      }
      
      .label-header.compact {
        margin-bottom: 0.03in;
        padding-bottom: 0.02in;
      }
      
      .customer-info {
        margin-bottom: 0.03in;
      }
      
      .customer-info.compact {
        margin-bottom: 0.02in;
        font-size: 7pt;
      }
      
      .customer-label {
        font-weight: bold;
      }
      
      .customer-name {
        font-weight: bold;
        margin-left: 0.05in;
      }
      
      .order-info {
        text-align: right;
        font-size: 7pt;
      }
      
      .order-info.compact {
        font-size: 6pt;
      }
      
      .order-number {
        font-weight: bold;
      }
      
      .barcode-section {
        text-align: center;
        margin: 0.05in 0;
        flex-shrink: 0;
      }
      
      .barcode-section.compact {
        margin: 0.03in 0;
      }
      
      .barcode-text {
        font-family: monospace;
        font-size: 8pt;
        font-weight: bold;
        border: 1px solid #000;
        padding: 0.02in;
        background: #fff;
      }
      
      .barcode-text.compact {
        font-size: 7pt;
      }
      
      .specs-section {
        flex: 1;
        margin: 0.05in 0;
      }
      
      .specs-section.compact {
        margin: 0.03in 0;
      }
      
      .spec-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.02in;
        margin-bottom: 0.05in;
      }
      
      .spec-list {
        display: flex;
        flex-direction: column;
        gap: 0.01in;
      }
      
      .spec-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px dotted #ccc;
        padding-bottom: 0.01in;
        margin-bottom: 0.02in;
      }
      
      .spec-item.compact {
        margin-bottom: 0.01in;
        font-size: 6pt;
      }
      
      .spec-item.upgrades {
        grid-column: 1 / -1;
        margin-top: 0.02in;
      }
      
      .spec-label {
        font-weight: bold;
        flex-shrink: 0;
      }
      
      .spec-value {
        text-align: right;
        margin-left: 0.05in;
        word-break: break-word;
      }
      
      .upgrades-section {
        margin-top: 0.05in;
      }
      
      .label-footer {
        border-top: 1px solid #000;
        padding-top: 0.02in;
        margin-top: auto;
        text-align: center;
      }
      
      .label-footer.compact {
        padding-top: 0.01in;
      }
      
      .part-indicator {
        font-size: 6pt;
        font-weight: bold;
        color: #666;
      }
      
      /* Error placeholder styles */
      .label-error-placeholder {
        width: 100%;
        height: 100%;
        border: 2px dashed #dc2626;
        background: #fef2f2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.1in;
      }
      
      .error-message {
        font-size: 8pt;
        font-weight: bold;
        color: #dc2626;
        text-align: center;
        margin-bottom: 0.05in;
      }
      
      .error-details {
        font-size: 6pt;
        color: #991b1b;
        text-align: center;
      }
      
      .empty-label-placeholder {
        width: 100%;
        height: 100%;
        border: 1px dashed #d1d5db;
        background: #f9fafb;
      }
    `
  }

  // Check if printing requires warnings
  const requiresPrintWarning = (): boolean => {
    return queue.value.length > 0 && queue.value.length < MAX_QUEUE_SIZE
  }

  // Get print readiness status
  const getPrintReadiness = () => {
    return computed(() => {
      const count = queue.value.length
      return {
        canPrint: count > 0,
        requiresWarning: count > 0 && count < MAX_QUEUE_SIZE,
        isOptimal: count === MAX_QUEUE_SIZE,
        isEmpty: count === 0,
        labelCount: count
      }
    })
  }

  // Clear error
  const clearError = (): void => {
    error.value = null
  }

  // Check system health and capabilities
  const checkHealth = () => {
    const health = checkSystemHealth()
    
    if (!health.healthy) {
      error.value = {
        type: 'BROWSER_ERROR',
        message: 'System health check failed',
        userMessage: 'Your browser or system has issues that may prevent the print queue from working properly',
        suggestions: [
          ...health.issues,
          ...health.recommendations,
          'Try using a different browser if problems persist'
        ],
        retryable: false,
        details: health
      }
      return false
    }
    
    return true
  }

  // Validate current queue integrity
  const validateCurrentQueue = (): boolean => {
    const validation = validateQueueIntegrity(queue.value)
    
    if (!validation.isValid) {
      error.value = {
        type: 'INVALID_DATA',
        message: 'Queue data integrity check failed',
        userMessage: 'The print queue contains corrupted data that needs to be fixed',
        suggestions: [
          'Clear the queue and re-add your labels',
          'Refresh the page to reload the queue',
          'Contact support if the problem persists'
        ],
        retryable: false,
        details: validation
      }
      return false
    }
    
    return true
  }

  // Initialize queue on mount
  onMounted(() => {
    loadQueue()
  })

  return {
    // State
    queue: readonly(queue),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Actions
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    printQueue,
    clearError,
    
    // Getters
    getQueueStatus,
    getPrintReadiness,
    isItemQueued,
    getLabelByOrderItemId,
    requiresPrintWarning,
    
    // Health and validation
    checkHealth,
    validateCurrentQueue,
    
    // Constants
    MAX_QUEUE_SIZE
  }
}