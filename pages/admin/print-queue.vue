<template>
  <div class="p-4">
    <!-- Breadcrumb Navigation -->
    <AppBreadcrumb :items="breadcrumbItems" />

    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Print Queue
      </h1>
      <div class="flex items-center space-x-2">
        <div class="text-sm text-gray-600">
          {{ queueStatus.count }} / {{ MAX_QUEUE_SIZE }} labels
        </div>
        <button v-if="!queueStatus.isEmpty" @click="showClearModal = true"
          class="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100">
          <Icon name="heroicons:trash-20-solid" class="mr-2 h-4 w-4" />
          Clear All
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-start">
        <Icon name="heroicons:exclamation-triangle-20-solid" class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div class="flex-1">
          <h3 class="text-sm font-medium text-red-800">
            {{ error.userMessage || error.message }}
          </h3>
          <div v-if="error.suggestions && error.suggestions.length > 0" class="mt-2">
            <p class="text-xs text-red-700 mb-1">Suggestions:</p>
            <ul class="text-xs text-red-700 list-disc list-inside space-y-1">
              <li v-for="suggestion in error.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>
          <div class="mt-3 flex items-center space-x-3">
            <button @click="clearError" class="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded">
              Dismiss
            </button>
            <button v-if="error.retryable" @click="retryLastOperation"
              class="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue Status Card -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-medium text-gray-900">Queue Status</h3>
          <p class="text-sm text-gray-600 mt-1">
            {{ getStatusMessage() }}
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-center">
            <div class="text-2xl font-bold" :class="getStatusColor()">
              {{ queueStatus.count }}
            </div>
            <div class="text-xs text-gray-500">Labels</div>
          </div>
          <button v-if="!queueStatus.isEmpty" @click="handlePrint"
            class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm"
            :class="getPrintButtonClass()">
            <Icon name="heroicons:printer-20-solid" class="mr-2 h-5 w-5" />
            {{ getPrintButtonText() }}
          </button>
        </div>
      </div>
    </div>
    <!-- Queue Items -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Queued Labels</h3>
      </div>

      <!-- Empty State -->
      <div v-if="queueStatus.isEmpty" class="p-8 text-center">
        <Icon name="heroicons:queue-list-20-solid" class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No labels in queue</h3>
        <p class="mt-1 text-sm text-gray-500">
          Add labels from order items to start building your print batch.
        </p>
        <div class="mt-6">
          <NuxtLink to="/admin/orders"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            <Icon name="heroicons:plus-20-solid" class="mr-2 h-4 w-4" />
            Browse Orders
          </NuxtLink>
        </div>
      </div>

      <!-- Queue Items List -->
      <div v-else class="divide-y divide-gray-200">
        <div v-for="(label, index) in queue" :key="label.id"
          class="p-6 hover:bg-gray-50 transition-colors duration-200">
          <div class="flex items-start space-x-4">
            <!-- Reorder Controls -->
            <div class="flex-shrink-0 flex flex-col space-y-1">
              <button @click="moveUp(index)" :disabled="index === 0 || isLoading"
                class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move up">
                <Icon name="heroicons:chevron-up-20-solid" class="h-4 w-4" />
              </button>
              <button @click="moveDown(index)" :disabled="index === queue.length - 1 || isLoading"
                class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move down">
                <Icon name="heroicons:chevron-down-20-solid" class="h-4 w-4" />
              </button>
            </div>

            <!-- Position Number -->
            <div
              class="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
              {{ index + 1 }}
            </div>

            <!-- Label Preview -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="text-sm font-medium text-gray-900 truncate">
                    {{ label.itemName }}
                  </h4>
                  <div class="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{{ label.customerName }}</span>
                    <span>Order #{{ label.orderNumber }}</span>
                    <span>{{ formatDate(label.createdAt) }}</span>
                  </div>
                </div>
                <button @click="removeLabel(label.id)" class="ml-4 text-red-600 hover:text-red-800"
                  title="Remove from queue">
                  <Icon name="heroicons:x-mark-20-solid" class="h-5 w-5" />
                </button>
              </div>

              <!-- Split Label Preview -->
              <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <h5 class="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Label Preview
                  </h5>
                  <button @click="togglePreview(label.id)" class="text-xs text-indigo-600 hover:text-indigo-800">
                    {{ expandedPreviews.has(label.id) ? 'Collapse' : 'Expand' }}
                  </button>
                </div>

                <div v-if="expandedPreviews.has(label.id)" class="label-preview-container">
                  <AdminSplitLabel :order-item="label.labelData.orderItem" :order="label.labelData.orderItem.order"
                    :show-preview="false" :is-print-mode="false" />
                </div>
                <div v-else class="text-xs text-gray-500">
                  Click "Expand" to see full label preview
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Clear All Confirmation Modal -->
    <AppModal :is-open="showClearModal" title="Clear Print Queue" @close="showClearModal = false">
      <div class="p-6">
        <div class="flex items-center mb-4">
          <Icon name="heroicons:exclamation-triangle-20-solid" class="h-6 w-6 text-yellow-500 mr-2" />
          <h3 class="text-lg font-medium text-gray-900">Clear All Labels</h3>
        </div>
        <p class="text-gray-700 mb-4">
          Are you sure you want to remove all {{ queueStatus.count }} labels from the print queue?
        </p>
        <p class="text-sm text-gray-600 mb-6">
          This action cannot be undone. You will need to re-add labels to the queue if you want to print them later.
        </p>
        <div class="flex justify-end space-x-3">
          <button type="button" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="showClearModal = false">
            Cancel
          </button>
          <button type="button" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            :disabled="isLoading" @click="confirmClearAll">
            {{ isLoading ? 'Clearing...' : 'Clear All Labels' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Print Warning System -->
    <AdminPrintWarningModal :warning-state="printWarnings.warningState.value"
      :paper-waste-info="printWarnings.paperWasteInfo.value"
      :current-warning-messages="printWarnings.currentWarningMessages.value"
      @first-warning-confirm="printWarnings.handleFirstWarningConfirm"
      @second-warning-confirm="printWarnings.handleSecondWarningConfirm" @cancel="printWarnings.handleCancel" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePrintQueue } from '~/composables/usePrintQueue';
import { usePrintWarnings } from '~/composables/usePrintWarnings';
import AdminSplitLabel from '~/components/admin/SplitLabel.vue';
import AdminPrintWarningModal from '~/components/admin/PrintWarningModal.vue';
// Note: vuedraggable needs to be installed: npm install vuedraggable@next
// For now, we'll implement a basic reorder functionality without drag-and-drop
// import draggable from 'vuedraggable';

definePageMeta({
  layout: 'default',
  middleware: ['auth-office-admin'],
});

// Note: Using console.log and alerts instead of toast system

// Print queue composable
const {
  queue,
  isLoading,
  error,
  removeFromQueue,
  clearQueue,
  reorderQueue,
  getQueueStatus,
  getPrintReadiness,
  printQueue,
  clearError,
  MAX_QUEUE_SIZE
} = usePrintQueue();

// Print warnings composable
const printWarnings = usePrintWarnings({
  onConfirmPrint: async () => {
    await executePrint(true); // Force partial print after confirmation
  },
  onCancel: () => {
    console.log('Print cancelled - Labels remain in queue');
  }
});

// Local state
const showClearModal = ref(false);
const expandedPreviews = ref(new Set<string>());
const lastFailedOperation = ref<{ type: string; args: any[] } | null>(null);

// Breadcrumb navigation
const breadcrumbItems = [
  { name: 'Dashboard', path: '/', icon: 'heroicons:home' },
  { name: 'Print Queue', path: '/admin/print-queue' }
];

// Computed properties
const queueStatus = getQueueStatus();
const printReadiness = getPrintReadiness();

// Methods
function getStatusMessage(): string {
  const count = queueStatus.value.count;

  if (count === 0) {
    return 'Queue is empty. Add labels to start building your batch.';
  } else if (count === MAX_QUEUE_SIZE) {
    return 'Queue is full and ready for optimal printing!';
  } else {
    return `${MAX_QUEUE_SIZE - count} more label${MAX_QUEUE_SIZE - count !== 1 ? 's' : ''} needed for a full batch.`;
  }
}

function getStatusColor(): string {
  const count = queueStatus.value.count;

  if (count === 0) {
    return 'text-gray-400';
  } else if (count === MAX_QUEUE_SIZE) {
    return 'text-green-600';
  } else {
    return 'text-yellow-600';
  }
}

function getPrintButtonClass(): string {
  if (printReadiness.value.isOptimal) {
    return 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500';
  } else {
    return 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500';
  }
}

function getPrintButtonText(): string {
  const count = queueStatus.value.count;

  if (printReadiness.value.isOptimal) {
    return `Print ${count} Labels`;
  } else {
    return `Print ${count} Label${count !== 1 ? 's' : ''} (Partial)`;
  }
}

function handlePrint(): void {
  const readiness = printReadiness.value;

  if (readiness.isOptimal) {
    // Print immediately without warnings for full batch
    executePrint(false);
  } else if (readiness.canPrint) {
    // Start warning process for partial batch
    printWarnings.startPrintWarning(readiness.labelCount);
  } else {
    alert('Cannot Print: No labels in queue to print.');
  }
}

async function executePrint(forcePartial: boolean = false): Promise<void> {
  try {
    const labelCount = queueStatus.value.count;

    console.log(`Print Started: Printing ${labelCount} labels...`);

    // Use the print queue method with force partial flag
    const success = await printQueue(forcePartial);

    if (success) {
      console.log('Print Completed: Labels have been sent to printer and removed from queue.');
      lastFailedOperation.value = null; // Clear any previous failed operation
    } else {
      // Track failed operation for retry
      lastFailedOperation.value = { type: 'print', args: [forcePartial] };

      // Create a structured error for the warning system
      const printError = {
        message: error.value?.userMessage || error.value?.message || 'Print operation failed',
        userMessage: error.value?.userMessage || 'Print operation failed',
        suggestions: error.value?.suggestions || ['Try printing again', 'Contact support if the problem persists'],
        retryable: error.value?.retryable || false
      };
      throw printError;
    }

  } catch (err) {
    console.error('Print failed:', err);

    // Track failed operation for retry if not already tracked
    if (!lastFailedOperation.value) {
      lastFailedOperation.value = { type: 'print', args: [forcePartial] };
    }

    // Provide detailed error message to user
    let errorMessage = 'Print Failed: There was an error printing the labels.';
    let suggestions = '';

    if (err && typeof err === 'object') {
      if ('userMessage' in err && err.userMessage) {
        errorMessage = `Print Failed: ${err.userMessage}`;
      }
      if ('suggestions' in err && Array.isArray(err.suggestions)) {
        suggestions = `\n\nSuggestions:\n• ${err.suggestions.join('\n• ')}`;
      }
    }

    alert(errorMessage + suggestions);
    throw err; // Re-throw so warning system can handle it
  }
}

async function removeLabel(labelId: string): Promise<void> {
  const success = await removeFromQueue(labelId);

  if (success) {
    console.log('Label Removed: Label has been removed from the print queue.');

    // Remove from expanded previews if it was expanded
    expandedPreviews.value.delete(labelId);
    lastFailedOperation.value = null; // Clear any previous failed operation
  } else {
    // Track failed operation for retry
    lastFailedOperation.value = { type: 'removeLabel', args: [labelId] };

    const errorMsg = error.value?.userMessage || error.value?.message || 'Failed to remove label from queue.';
    const suggestions = error.value?.suggestions?.join('\n• ') || '';
    const fullMessage = suggestions ? `${errorMsg}\n\nSuggestions:\n• ${suggestions}` : errorMsg;

    alert(`Error: ${fullMessage}`);
  }
}

async function confirmClearAll(): Promise<void> {
  const success = await clearQueue();

  if (success) {
    showClearModal.value = false;
    expandedPreviews.value.clear();
    lastFailedOperation.value = null; // Clear any previous failed operation

    console.log('Queue Cleared: All labels have been removed from the print queue.');
  } else {
    // Track failed operation for retry
    lastFailedOperation.value = { type: 'clearQueue', args: [] };

    const errorMsg = error.value?.userMessage || error.value?.message || 'Failed to clear the print queue.';
    const suggestions = error.value?.suggestions?.join('\n• ') || '';
    const fullMessage = suggestions ? `${errorMsg}\n\nSuggestions:\n• ${suggestions}` : errorMsg;

    alert(`Error: ${fullMessage}`);
  }
}

async function moveUp(index: number): Promise<void> {
  if (index > 0) {
    const success = await reorderQueue(index, index - 1);

    if (success) {
      console.log('Label Moved Up: Label has been moved up in the queue.');
      lastFailedOperation.value = null; // Clear any previous failed operation
    } else {
      // Track failed operation for retry
      lastFailedOperation.value = { type: 'moveUp', args: [index] };

      const errorMsg = error.value?.userMessage || error.value?.message || 'Failed to reorder queue items.';
      const suggestions = error.value?.suggestions?.join('\n• ') || '';
      const fullMessage = suggestions ? `${errorMsg}\n\nSuggestions:\n• ${suggestions}` : errorMsg;

      alert(`Error: ${fullMessage}`);
    }
  }
}

async function moveDown(index: number): Promise<void> {
  if (index < queue.value.length - 1) {
    const success = await reorderQueue(index, index + 1);

    if (success) {
      console.log('Label Moved Down: Label has been moved down in the queue.');
      lastFailedOperation.value = null; // Clear any previous failed operation
    } else {
      // Track failed operation for retry
      lastFailedOperation.value = { type: 'moveDown', args: [index] };

      const errorMsg = error.value?.userMessage || error.value?.message || 'Failed to reorder queue items.';
      const suggestions = error.value?.suggestions?.join('\n• ') || '';
      const fullMessage = suggestions ? `${errorMsg}\n\nSuggestions:\n• ${suggestions}` : errorMsg;

      alert(`Error: ${fullMessage}`);
    }
  }
}

function togglePreview(labelId: string): void {
  if (expandedPreviews.value.has(labelId)) {
    expandedPreviews.value.delete(labelId);
  } else {
    expandedPreviews.value.add(labelId);
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function retryLastOperation(): Promise<void> {
  if (!lastFailedOperation.value) return;

  const { type, args } = lastFailedOperation.value;

  try {
    switch (type) {
      case 'removeLabel':
        await removeLabel(args[0]);
        break;
      case 'clearQueue':
        await confirmClearAll();
        break;
      case 'moveUp':
        await moveUp(args[0]);
        break;
      case 'moveDown':
        await moveDown(args[0]);
        break;
      case 'print':
        await executePrint(args[0]);
        break;
      default:
        console.warn('Unknown operation type for retry:', type);
    }

    // Clear the failed operation if retry succeeded
    lastFailedOperation.value = null;
  } catch (err) {
    console.error('Retry failed:', err);
    // Keep the failed operation for another retry attempt
  }
}

// Clear any errors when component mounts
onMounted(() => {
  clearError();
});
</script>

<style scoped>
.label-preview-container {
  transform: scale(0.6);
  transform-origin: top left;
  width: 166.67%;
  /* Compensate for 0.6 scale */
  overflow: hidden;
}

/* Reorder button styles */
.reorder-controls button:hover {
  background-color: #f3f4f6;
  border-radius: 0.25rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .label-preview-container {
    transform: scale(0.4);
    width: 250%;
    /* Compensate for 0.4 scale */
  }
}

/* Print mode styles */
@media print {
  .p-4 {
    display: none;
  }
}
</style>