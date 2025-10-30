<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Print Confirmation Workflow Test</h1>
      
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Test Components</h2>
        
        <div class="space-y-4">
          <div>
            <button 
              @click="showBatchWarning = true"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Test Batch Warning Modal
            </button>
            <p class="text-sm text-gray-600 mt-1">
              Tests the incomplete batch warning with {{ testBatchSize }} items (standard: {{ standardBatchSize }})
            </p>
          </div>
          
          <div>
            <button 
              @click="showConfirmation = true"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Test Print Confirmation Modal
            </button>
            <p class="text-sm text-gray-600 mt-1">
              Tests the print success confirmation with {{ testItemCount }} items
            </p>
          </div>
        </div>
      </div>

      <!-- Test Results -->
      <div v-if="testResults.length > 0" class="bg-gray-50 rounded-lg p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
        <div class="space-y-2">
          <div 
            v-for="(result, index) in testResults" 
            :key="index"
            class="text-sm p-3 rounded"
            :class="result.type === 'success' ? 'bg-green-100 text-green-800' : result.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'"
          >
            <span class="font-medium">{{ result.timestamp }}:</span> {{ result.message }}
          </div>
        </div>
        <button 
          @click="testResults = []"
          class="mt-4 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Results
        </button>
      </div>
    </div>

    <!-- Test Modals -->
    <PrintBatchWarning
      :is-open="showBatchWarning"
      :current-batch-size="testBatchSize"
      :standard-batch-size="standardBatchSize"
      :is-processing="isProcessing"
      :error="testError"
      @close="handleBatchWarningClose"
      @cancel="handleBatchWarningCancel"
      @proceed="handleBatchWarningProceed"
    />

    <PrintConfirmationModal
      :is-open="showConfirmation"
      :item-count="testItemCount"
      :queue-item-ids="testQueueItemIds"
      :is-processing="isProcessing"
      :error="testError"
      @close="handleConfirmationClose"
      @print-success="handlePrintSuccess"
      @print-failed="handlePrintFailed"
    />
  </div>
</template>

<script setup lang="ts">
import PrintBatchWarning from '~/components/PrintBatchWarning.vue'
import PrintConfirmationModal from '~/components/PrintConfirmationModal.vue'

// Page metadata
definePageMeta({
  middleware: 'auth-admin-only',
  layout: 'admin'
})

// Test data
const testBatchSize = ref(2)
const standardBatchSize = ref(4)
const testItemCount = ref(3)
const testQueueItemIds = ref(['test-id-1', 'test-id-2', 'test-id-3'])

// Modal states
const showBatchWarning = ref(false)
const showConfirmation = ref(false)
const isProcessing = ref(false)
const testError = ref<string | null>(null)

// Test results
interface TestResult {
  timestamp: string
  message: string
  type: 'success' | 'error' | 'info'
}

const testResults = ref<TestResult[]>([])

// Helper function to add test result
const addTestResult = (message: string, type: TestResult['type'] = 'info') => {
  testResults.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  })
}

// Batch Warning Handlers
const handleBatchWarningClose = () => {
  showBatchWarning.value = false
  addTestResult('Batch warning modal closed', 'info')
}

const handleBatchWarningCancel = () => {
  showBatchWarning.value = false
  addTestResult('Batch warning cancelled by user', 'info')
}

const handleBatchWarningProceed = async () => {
  showBatchWarning.value = false
  addTestResult('User chose to proceed with incomplete batch', 'success')
  
  // Simulate processing
  isProcessing.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))
  isProcessing.value = false
  
  // Show confirmation modal
  showConfirmation.value = true
  addTestResult('Proceeding to print confirmation', 'info')
}

// Print Confirmation Handlers
const handleConfirmationClose = () => {
  showConfirmation.value = false
  addTestResult('Print confirmation modal closed', 'info')
}

const handlePrintSuccess = async (queueItemIds: string[]) => {
  addTestResult(`User confirmed successful printing of ${queueItemIds.length} items`, 'success')
  
  // Simulate API call
  isProcessing.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1500))
    showConfirmation.value = false
    addTestResult('Items marked as printed successfully', 'success')
  } catch (error) {
    testError.value = 'Failed to mark items as printed'
    addTestResult('Error marking items as printed', 'error')
  } finally {
    isProcessing.value = false
  }
}

const handlePrintFailed = () => {
  showConfirmation.value = false
  addTestResult('User reported print failure - items remain in queue', 'info')
}

// Initialize with welcome message
onMounted(() => {
  addTestResult('Print confirmation workflow test page loaded', 'info')
})
</script>