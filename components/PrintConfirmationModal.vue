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
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 flex items-center">
                <Icon name="heroicons:check-circle" class="h-6 w-6 text-green-500 mr-2" />
                Print Status Confirmation
              </DialogTitle>
              
              <div class="mt-4">
                <p class="text-sm text-gray-600 mb-4">
                  Did the {{ itemCount }} packing slip{{ itemCount !== 1 ? 's' : '' }} print successfully?
                </p>
                
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div class="flex items-start">
                    <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div class="text-sm text-blue-800">
                      <p class="font-medium mb-2">Print Status Confirmation</p>
                      <ul class="list-disc list-inside space-y-1">
                        <li>Only confirm "Yes" if ALL {{ itemCount }} packing slip{{ itemCount !== 1 ? 's' : '' }} printed correctly</li>
                        <li>If ANY printing issues occurred, select "No" to keep items in queue</li>
                        <li>Confirming "Yes" will permanently remove items from the print queue</li>
                        <li>Selecting "No" allows you to retry printing later</li>
                      </ul>
                    </div>
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
                  @click="handlePrintFailed"
                >
                  <Icon v-if="isProcessing && lastAction === 'failed'" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  No, Print Failed
                </button>
                <button
                  type="button"
                  :disabled="isProcessing"
                  class="inline-flex justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  @click="handlePrintSuccess"
                >
                  <Icon v-if="isProcessing && lastAction === 'success'" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
                  Yes, Printed Successfully
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
  itemCount: number
  queueItemIds: string[]
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
  printSuccess: [queueItemIds: string[]]
  printFailed: []
}>()

// Local state
const lastAction = ref<'success' | 'failed' | null>(null)

// Methods
const handleClose = () => {
  if (props.isProcessing) return // Prevent closing during processing
  emit('close')
}

const handlePrintSuccess = async () => {
  if (props.isProcessing) return
  
  lastAction.value = 'success'
  emit('printSuccess', props.queueItemIds)
}

const handlePrintFailed = () => {
  if (props.isProcessing) return
  
  lastAction.value = 'failed'
  emit('printFailed')
}

// Reset lastAction when modal opens/closes
watch(() => props.isOpen, (newVal) => {
  if (!newVal) {
    lastAction.value = null
  }
})
</script>