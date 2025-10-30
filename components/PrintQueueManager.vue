<template>
  <div class="print-queue-manager">
    <!-- Enhanced Queue Status -->
    <PrintQueueStatus
      :total-items="queueStatus.totalItems"
      :ready-to-print="queueStatus.readyToPrint"
      :requires-warning="queueStatus.requiresWarning"
      :standard-batch-size="BATCH_SIZE"
      :show-details="true"
      :recommendations="getBatchRecommendations()"
      class="mb-6"
    />

    <!-- Print Action Bar -->
    <div v-if="queueStatus.totalItems > 0" class="bg-white shadow rounded-lg mb-6">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium text-gray-900">Print Actions</h3>
            <p class="text-sm text-gray-600 mt-1">
              {{ getPrintActionMessage() }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <!-- Print Button -->
            <button 
              @click="handlePrint"
              :disabled="isLoading"
              class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm"
              :class="getPrintButtonClass()"
            >
              <Icon name="heroicons:printer" class="mr-2 h-5 w-5" />
              {{ getPrintButtonText() }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-start">
        <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
          <div class="mt-3">
            <button 
              @click="clearError" 
              class="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue Items List -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Queue Items</h3>
          <div class="text-sm text-gray-500">
            Oldest items first (FIFO)
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="p-8 text-center">
        <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-gray-500 mx-auto" />
        <p class="mt-2 text-sm text-gray-600">Loading queue items...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="queueItems.length === 0" class="p-8 text-center">
        <Icon name="heroicons:queue-list" class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No items in queue</h3>
        <p class="mt-1 text-sm text-gray-500">
          Items will appear here automatically when orders are approved.
        </p>
      </div>

      <!-- Queue Items -->
      <div v-else class="divide-y divide-gray-200">
        <PrintQueueItem
          v-for="(item, index) in queueItems"
          :key="item.id"
          :queue-item="item"
          :position="index + 1"
          :is-oldest="index < BATCH_SIZE"
          @remove="handleRemoveItem"
        />
      </div>
    </div>

    <!-- Print Batch Warning Modal -->
    <PrintBatchWarning
      :is-open="showBatchWarningModal"
      :current-batch-size="printBatch.length"
      :standard-batch-size="BATCH_SIZE"
      :is-processing="isPrinting"
      :error="printError"
      @close="showBatchWarningModal = false"
      @cancel="handleBatchWarningCancel"
      @proceed="handleBatchWarningProceed"
    />

    <!-- Print Confirmation Modal -->
    <PrintConfirmationModal
      :is-open="showConfirmationModal"
      :item-count="lastPrintedCount"
      :queue-item-ids="lastPrintedItemIds"
      :is-processing="isConfirmingPrint"
      :error="confirmationError"
      @close="showConfirmationModal = false"
      @print-success="handleConfirmPrintSuccess"
      @print-failed="handleConfirmPrintFailed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PrintBatchWarning from './PrintBatchWarning.vue'
import PrintConfirmationModal from './PrintConfirmationModal.vue'
import PrintQueueStatus from './PrintQueueStatus.vue'

// Types
interface PrintQueueItem {
  id: string
  orderItemId: string
  orderItem: any
  isPrinted: boolean
  addedAt: Date
  printedAt?: Date
  addedBy?: string
  printedBy?: string
}

interface QueueStatus {
  totalItems: number
  readyToPrint: number
  requiresWarning: boolean
}

// Constants
const BATCH_SIZE = 4
const REFRESH_INTERVAL = 30000 // 30 seconds

// Reactive state
const queueItems = ref<PrintQueueItem[]>([])
const queueStatus = ref<QueueStatus>({
  totalItems: 0,
  readyToPrint: 0,
  requiresWarning: false
})
const isLoading = ref(false)
const error = ref<string | null>(null)
const showBatchWarningModal = ref(false)
const showConfirmationModal = ref(false)
const isPrinting = ref(false)
const isConfirmingPrint = ref(false)
const printBatch = ref<PrintQueueItem[]>([])
const lastPrintedCount = ref(0)
const lastPrintedItemIds = ref<string[]>([])
const printError = ref<string | null>(null)
const confirmationError = ref<string | null>(null)
const refreshTimer = ref<NodeJS.Timeout | null>(null)

// Computed properties
const getPrintButtonClass = () => {
  if (queueStatus.value.totalItems >= BATCH_SIZE) {
    return 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500'
  } else {
    return 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
  }
}

const getPrintButtonText = () => {
  const total = queueStatus.value.totalItems
  if (total >= BATCH_SIZE) {
    return `Print Batch (${BATCH_SIZE})`
  } else {
    return `Print ${total} Item${total !== 1 ? 's' : ''} (Partial)`
  }
}

// Methods
const getBatchRecommendations = () => {
  const total = queueStatus.value.totalItems
  const recommendations: string[] = []
  
  if (total === 0) {
    recommendations.push('Approve orders to add items to the print queue')
    recommendations.push('Check that orders have been properly processed')
  } else if (total < BATCH_SIZE) {
    const needed = BATCH_SIZE - total
    recommendations.push(`Wait for ${needed} more item${needed !== 1 ? 's' : ''} for optimal printing`)
    recommendations.push('Partial batches may result in paper waste')
    recommendations.push('You can proceed if urgent printing is needed')
  } else if (total === BATCH_SIZE) {
    recommendations.push('Perfect batch size for standard paper sheets')
    recommendations.push('Ready to print without warnings')
  } else {
    const fullBatches = Math.floor(total / BATCH_SIZE)
    recommendations.push(`${fullBatches} full batch${fullBatches !== 1 ? 'es' : ''} ready to print`)
    recommendations.push('Consider printing in batches for optimal results')
  }
  
  return recommendations
}

const getPrintActionMessage = () => {
  const total = queueStatus.value.totalItems
  
  if (total === 0) {
    return 'No items available for printing'
  } else if (total < BATCH_SIZE) {
    return `Partial batch printing available (${total}/${BATCH_SIZE} items)`
  } else if (total === BATCH_SIZE) {
    return 'Full batch ready for optimal printing'
  } else {
    const fullBatches = Math.floor(total / BATCH_SIZE)
    const remaining = total % BATCH_SIZE
    return `${fullBatches} full batch${fullBatches !== 1 ? 'es' : ''} ready${remaining > 0 ? `, ${remaining} item${remaining !== 1 ? 's' : ''} remaining` : ''}`
  }
}

const fetchQueue = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await $fetch('/api/print-queue') as any
    
    if (response?.success) {
      queueItems.value = response.data.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
        printedAt: item.printedAt ? new Date(item.printedAt) : undefined
      }))
      
      // Update status from meta or calculate
      if (response.meta) {
        queueStatus.value = {
          totalItems: response.meta.totalItems,
          readyToPrint: response.meta.readyToPrint,
          requiresWarning: response.meta.requiresWarning
        }
      } else {
        // Fallback calculation
        queueStatus.value = {
          totalItems: queueItems.value.length,
          readyToPrint: Math.min(queueItems.value.length, BATCH_SIZE),
          requiresWarning: queueItems.value.length > 0 && queueItems.value.length < BATCH_SIZE
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch print queue:', err)
    error.value = 'Failed to load print queue. Please try refreshing the page.'
  } finally {
    isLoading.value = false
  }
}

const fetchNextBatch = async () => {
  try {
    const response = await $fetch('/api/print-queue/next-batch') as any
    
    if (response?.success) {
      return response.data.items.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
        printedAt: item.printedAt ? new Date(item.printedAt) : undefined
      }))
    }
    return []
  } catch (err) {
    console.error('Failed to fetch next batch:', err)
    throw new Error('Failed to prepare print batch')
  }
}

const validateBatch = async () => {
  try {
    const response = await $fetch('/api/print-queue/validate-batch') as any
    
    if (response?.success) {
      return response.data.validation
    }
    return null
  } catch (err) {
    console.error('Failed to validate batch:', err)
    return null
  }
}

const handlePrint = async () => {
  try {
    printError.value = null
    
    // Enhanced batch size validation
    const currentQueueSize = queueStatus.value.totalItems
    
    if (currentQueueSize === 0) {
      error.value = 'Cannot print - no items in queue. Please approve orders to add items to the queue.'
      return
    }
    
    // Fetch the next batch with enhanced validation
    printBatch.value = await fetchNextBatch()
    
    // Enhanced batch size validation with detailed warnings
    if (printBatch.value.length < BATCH_SIZE) {
      // Show warning modal for incomplete batch
      showBatchWarningModal.value = true
    } else if (printBatch.value.length === BATCH_SIZE) {
      // Perfect batch size - proceed directly to print
      await executePrint()
    } else {
      // This shouldn't happen with current logic, but handle gracefully
      console.warn('Unexpected batch size:', printBatch.value.length)
      await executePrint()
    }
  } catch (err) {
    console.error('Failed to prepare print batch:', err)
    error.value = 'Failed to prepare print batch. Please try again.'
  }
}

const handleBatchWarningCancel = () => {
  showBatchWarningModal.value = false
  printBatch.value = []
}

const handleBatchWarningProceed = async () => {
  showBatchWarningModal.value = false
  await executePrint()
}

const executePrint = async () => {
  try {
    isPrinting.value = true
    printError.value = null
    
    // Enhanced print validation
    if (printBatch.value.length === 0) {
      throw new Error('No items in batch to print')
    }
    
    // Validate that all items in batch are still valid
    const validItems = printBatch.value.filter(item => 
      item.id && item.orderItemId && item.orderItem
    )
    
    if (validItems.length !== printBatch.value.length) {
      throw new Error('Some items in the batch are invalid and cannot be printed')
    }
    
    // Enhanced print process with better error handling
    try {
      // Generate print layout and trigger browser print dialog
      // The print dialog will open and user can print or cancel
      window.print()
      
      // After print dialog closes, show confirmation modal
      // This implements the two-step confirmation process required by requirement 7.2
      lastPrintedCount.value = printBatch.value.length
      lastPrintedItemIds.value = printBatch.value.map(item => item.id)
      showConfirmationModal.value = true
      
    } catch (printErr) {
      console.error('Browser print failed:', printErr)
      throw new Error('Failed to open print dialog. Please check your browser settings.')
    }
    
  } catch (err) {
    console.error('Print execution failed:', err)
    printError.value = err instanceof Error ? err.message : 'Print operation failed. Please try again.'
  } finally {
    isPrinting.value = false
  }
}

const handleConfirmPrintSuccess = async (queueItemIds: string[]) => {
  try {
    isConfirmingPrint.value = true
    confirmationError.value = null
    
    // Enhanced validation before marking as printed
    if (!queueItemIds || queueItemIds.length === 0) {
      throw new Error('No items to mark as printed')
    }
    
    // Validate that all queue item IDs are valid
    const validIds = queueItemIds.filter(id => id && typeof id === 'string')
    if (validIds.length !== queueItemIds.length) {
      throw new Error('Some queue item IDs are invalid')
    }
    
    // Mark items as printed and remove from queue
    const response = await $fetch('/api/print-queue/mark-printed', {
      method: 'POST',
      body: { queueItemIds: validIds }
    }) as any
    
    if (!response?.success) {
      throw new Error(response?.message || 'Failed to mark items as printed')
    }
    
    // Enhanced cleanup after successful printing
    showConfirmationModal.value = false
    printBatch.value = []
    lastPrintedItemIds.value = []
    lastPrintedCount.value = 0
    
    // Refresh the queue to show updated state
    await fetchQueue()
    
    // Clear any previous errors
    error.value = null
    
    console.log(`Successfully marked ${validIds.length} items as printed and removed from queue`)
    
  } catch (err) {
    console.error('Failed to mark items as printed:', err)
    confirmationError.value = err instanceof Error ? err.message : 'Failed to update print status. Please try again.'
  } finally {
    isConfirmingPrint.value = false
  }
}

const handleConfirmPrintFailed = async () => {
  try {
    // Enhanced handling when print fails
    showConfirmationModal.value = false
    
    // Clear batch data but keep items in queue
    printBatch.value = []
    lastPrintedItemIds.value = []
    lastPrintedCount.value = 0
    
    // Refresh queue to ensure we have current state
    await fetchQueue()
    
    // Clear any print-related errors since user acknowledged the failure
    printError.value = null
    confirmationError.value = null
    
    console.log('Print failure acknowledged - items remain in queue for retry')
    
    // Provide user feedback about what happens next
    error.value = 'Print failed - items remain in queue. You can try printing again when ready.'
    
  } catch (err) {
    console.error('Error handling print failure:', err)
    // Don't throw here as this is cleanup - just log the error
  }
}

const handleRemoveItem = async (itemId: string) => {
  try {
    await $fetch('/api/print-queue/remove', {
      method: 'DELETE',
      body: { queueItemIds: [itemId] }
    })
    
    await fetchQueue() // Refresh the queue
    
  } catch (err) {
    console.error('Failed to remove item:', err)
    error.value = 'Failed to remove item from queue. Please try again.'
  }
}

const clearError = () => {
  error.value = null
}

const startAutoRefresh = () => {
  refreshTimer.value = setInterval(fetchQueue, REFRESH_INTERVAL)
}

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// Lifecycle
onMounted(() => {
  fetchQueue()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.print-queue-manager {
  @apply space-y-6;
}
</style>