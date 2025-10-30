<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-50" @close="handleClose">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-yellow-700 flex items-center">
                <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-yellow-500 mr-2" />
                Incomplete Batch Warning
              </DialogTitle>
              
              <div class="mt-4">
                <p class="text-sm text-gray-700 mb-4">
                  You are about to print {{ currentBatchSize }} item{{ currentBatchSize !== 1 ? 's' : '' }}, but the standard batch size is {{ standardBatchSize }} items.
                </p>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div class="flex items-start">
                    <Icon name="heroicons:light-bulb" class="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div class="text-sm text-yellow-800">
                      <p class="font-medium mb-2">Why does batch size matter?</p>
                      <ul class="list-disc list-inside space-y-1">
                        <li>Standard paper sheets are designed for {{ standardBatchSize }} packing slips</li>
                        <li>Printing fewer items may result in paper waste</li>
                        <li>Printing more items may require manual paper handling</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div class="flex items-start">
                    <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div class="text-sm text-blue-800">
                      <p class="font-medium mb-2">Recommendations:</p>
                      <ul class="list-disc list-inside space-y-1">
                        <li v-if="currentBatchSize < standardBatchSize">
                          Wait for {{ standardBatchSize - currentBatchSize }} more item{{ (standardBatchSize - currentBatchSize) !== 1 ? 's' : '' }} to be added to the queue for optimal printing
                        </li>
                        <li v-else>
                          Consider printing in batches of {{ standardBatchSize }} for optimal paper usage
                        </li>
                        <li>Partial batches may result in paper waste or require manual paper handling</li>
                        <li>You can still proceed if urgent printing is needed</li>
                        <li>Items will remain in queue if printing fails, allowing for retry</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Batch Size Visualization -->
                <div class="mb-4">
                  <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Current Batch Progress</span>
                    <span>{{ currentBatchSize }} / {{ standardBatchSize }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      class="h-3 rounded-full transition-all duration-300"
                      :class="getProgressBarClass()"
                      :style="{ width: `${Math.min((currentBatchSize / standardBatchSize) * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div class="flex items-start">
                    <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div class="text-sm text-red-800">
                      <p class="font-medium mb-1">Error</p>
                      <p>{{ error }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  :disabled="isProcessing"
                  class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  @click="handleCancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  :disabled="isProcessing"
                  class="inline-flex justify-center rounded-md border border-transparent bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  @click="handleProceed"
                >
                  <Icon v-if="isProcessing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  {{ isProcessing ? 'Processing...' : 'Print Anyway' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'

// Props
interface Props {
  isOpen: boolean
  currentBatchSize: number
  standardBatchSize: number
  isProcessing?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isProcessing: false,
  error: null
})

// Emits
const emit = defineEmits<{
  close: []
  proceed: []
  cancel: []
}>()

// Methods
const handleClose = () => {
  if (props.isProcessing) return // Prevent closing during processing
  emit('close')
}

const handleCancel = () => {
  if (props.isProcessing) return
  emit('cancel')
}

const handleProceed = () => {
  if (props.isProcessing) return
  emit('proceed')
}

const getProgressBarClass = () => {
  const percentage = (props.currentBatchSize / props.standardBatchSize) * 100
  
  if (percentage >= 100) {
    return 'bg-green-500'
  } else if (percentage >= 75) {
    return 'bg-yellow-500'
  } else if (percentage >= 50) {
    return 'bg-orange-500'
  } else {
    return 'bg-red-500'
  }
}
</script>