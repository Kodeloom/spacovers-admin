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
          {{ queueStatus.count }} labels
        </div>
        <button @click="refetchPrintQueue()" 
          class="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100">
          <Icon name="heroicons:arrow-path-20-solid" class="mr-2 h-4 w-4" />
          Refresh
        </button>
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
import { ref, onMounted, computed, watchEffect } from 'vue';
import { usePrintQueue } from '~/composables/usePrintQueue';
import { usePrintWarnings } from '~/composables/usePrintWarnings';
import { useFindManyPrintQueue, useUpdatePrintQueue } from '~/lib/hooks';
import AdminSplitLabel from '~/components/admin/SplitLabel.vue';
import AdminPrintWarningModal from '~/components/admin/PrintWarningModal.vue';
import { authClient } from '~/lib/auth-client';
import { useQueryClient } from '@tanstack/vue-query';
// Note: vuedraggable needs to be installed: npm install vuedraggable@next
// For now, we'll implement a basic reorder functionality without drag-and-drop
// import draggable from 'vuedraggable';

definePageMeta({
  layout: 'default',
  middleware: ['auth-office-admin'],
});

// Note: Using console.log and alerts instead of toast system

// Database-only print queue with explicit enabled option
const { data: dbPrintQueue, refetch: refetchPrintQueue, error: dbError, isLoading: dbLoading } = useFindManyPrintQueue({
  where: { isPrinted: false },
  include: {
    orderItem: {
      include: {
        order: {
          include: {
            customer: true
          }
        },
        item: true,
        productAttributes: true
      }
    }
  },
  orderBy: { addedAt: 'asc' }
}, {
  enabled: true,
  refetchOnMount: true,
  refetchOnWindowFocus: false,
  staleTime: 0 // Always refetch to ensure fresh data
});

// ZenStack mutation for updating print queue items
const updatePrintQueueMutation = useUpdatePrintQueue();

// Get current user session
const { data: sessionData } = await authClient.useSession(useFetch);

// Query client for manual cache invalidation
const queryClient = useQueryClient();

// Loading and error state (now from database only)
const isLoading = dbLoading;
const error = ref(null);

const MAX_QUEUE_SIZE = 4;

// Debug database query
watchEffect(() => {
  console.log('DB Print Queue Loading:', dbLoading.value);
  console.log('DB Print Queue Error:', dbError.value);
  console.log('DB Print Queue Data:', dbPrintQueue.value);
});

// Database-only functions
const removeFromQueue = async (item: any) => {
  console.log('=== REMOVE FUNCTION CALLED ===');
  console.log('Removing database item:', item.id);
  
  // All items are now database items, so extract the database ID
  const dbId = item.id.replace('db_', '');
  console.log('Extracted database ID:', dbId);
  
  try {
    // Use ZenStack mutation to mark as printed
    const result = await updatePrintQueueMutation.mutateAsync({
      where: { id: dbId },
      data: {
        isPrinted: true,
        printedAt: new Date(),
        printedBy: sessionData.value?.user?.id || null
      }
    });
    
    console.log('Database update result:', result);
    console.log('Item successfully marked as printed and should be removed from queue');
    
  } catch (error) {
    console.error('=== ERROR IN MUTATION ===');
    console.error('Error details:', error);
    throw error;
  }
  
  console.log('=== REMOVE FUNCTION COMPLETED ===');
};

// Clear all items from database queue
const clearQueue = async (): Promise<boolean> => {
  try {
    // Mark all items as printed to remove them from queue
    if (dbPrintQueue.value && dbPrintQueue.value.length > 0) {
      for (const item of dbPrintQueue.value) {
        await updatePrintQueueMutation.mutateAsync({
          where: { id: item.id },
          data: {
            isPrinted: true,
            printedAt: new Date(),
            printedBy: sessionData.value?.user?.id || null
          }
        });
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to clear queue:', error);
    return false;
  }
};

// Add item to database queue
const addToQueue = async (orderItem: any): Promise<boolean> => {
  try {
    await $fetch('/api/admin/print-queue/add-item', {
      method: 'POST',
      body: { orderItemId: orderItem.id }
    });
    return true;
  } catch (error) {
    console.error('Failed to add item to queue:', error);
    return false;
  }
};

// Reorder is not implemented for database queue yet - would need API endpoint
const reorderQueue = async (fromIndex: number, toIndex: number): Promise<boolean> => {
  console.log('Reorder not implemented for database queue yet');
  return false;
};

// Clear error function
const clearError = () => {
  error.value = null;
};





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
      gap: 0.35in;
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
      gap: 0;
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
      height: 3.15in;
      display: flex;
      flex-direction: column;
      margin-bottom: -2px;
      border-bottom: none;
    }
    
    .label-part.bottom-part {
      width: 3in;
      height: 2in;
      display: flex;
      flex-direction: column;
      margin-top: -2px;
      border-top: none;
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
    
    .barcode-canvas {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
      border: 1px solid #000;
      background: #fff;
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
      gap: 0.1in;
      margin-bottom: 0.05in;
    }
    
    .spec-column {
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
      font-size: 5pt;
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
    
    .empty-label-placeholder {
      width: 100%;
      height: 100%;
      border: 1px dashed #d1d5db;
      background: #f9fafb;
    }
  `;
};

// Duplicate function removed

// Use the original working print system - just create a temporary localStorage queue
const openPrintDialog = async (itemsToPrint: any[]) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Import the original print queue composable temporarily for printing
      const { 
        queue: tempQueue,
        addToQueue: tempAddToQueue,
        clearQueue: tempClearQueue,
        printQueue: tempPrintQueue
      } = usePrintQueue();
      
      // Clear any existing items in the temp queue
      await tempClearQueue();
      
      // Add our database items to the temporary localStorage queue for printing
      for (const item of itemsToPrint) {
        const orderItemWithRelations = item.labelData.orderItem;
        await tempAddToQueue(orderItemWithRelations);
      }
      
      // Use the original working print function
      const success = await tempPrintQueue(true); // Force partial print
      
      if (!success) {
        reject(new Error('Print function failed'));
        return;
      }
      
      // Wait for the print dialog to close by polling for window focus
      let checkCount = 0;
      const maxChecks = 30; // Max 30 seconds
      
      const checkPrintComplete = () => {
        checkCount++;
        
        // Check if we've waited long enough or if window has focus (indicating print dialog closed)
        if (checkCount >= maxChecks || document.hasFocus()) {
          resolve(true);
        } else {
          setTimeout(checkPrintComplete, 1000); // Check every second
        }
      };
      
      // Start checking after a short delay to let the print dialog open
      setTimeout(checkPrintComplete, 3000);
      
    } catch (error) {
      console.error('Print dialog error:', error);
      reject(error);
    }
  });
};

// Database-only queue
const queue = computed(() => {
  console.log('=== QUEUE COMPUTED PROPERTY TRIGGERED ===');
  console.log('Raw dbPrintQueue.value:', dbPrintQueue.value);
  
  if (!dbPrintQueue.value) {
    console.log('No database queue data available (null/undefined)');
    return [];
  }
  
  if (!Array.isArray(dbPrintQueue.value)) {
    console.log('Database queue data is not an array:', typeof dbPrintQueue.value);
    return [];
  }
  
  if (dbPrintQueue.value.length === 0) {
    console.log('Database queue data is empty array');
    return [];
  }
  
  console.log('Processing', dbPrintQueue.value.length, 'database items');
  
  // Convert all database items to QueuedLabel format
  const queueItems = dbPrintQueue.value.map((dbItem, index) => {
    console.log('Processing database item:', dbItem);
    
    try {
      const queuedLabel = {
        id: 'db_' + dbItem.id,
        orderItemId: dbItem.orderItemId,
        orderNumber: dbItem.orderItem.order.salesOrderNumber || dbItem.orderItem.order.id,
        customerName: dbItem.orderItem.order.customer.name,
        itemName: dbItem.orderItem.item.name,
        labelData: generateLabelDataFromOrderItem(dbItem.orderItem),
        createdAt: dbItem.addedAt,
        position: index
      };
      console.log('Successfully converted to queuedLabel:', queuedLabel.id);
      return queuedLabel;
    } catch (error) {
      console.error('Error converting database item to queuedLabel:', error, dbItem);
      return null;
    }
  }).filter(item => item !== null);
  
  console.log('Final queue items:', queueItems.length);
  console.log('Queue contents:', queueItems.map(item => ({ id: item.id, orderItemId: item.orderItemId })));
  
  return queueItems;
});

// Helper function to generate label data from order item
function generateLabelDataFromOrderItem(orderItem: any) {
  const attrs = orderItem.productAttributes;
  const upgrades: string[] = [];

  // Collect upgrades
  if (attrs?.doublePlasticWrapUpgrade === 'Yes') upgrades.push('Double Wrap');
  if (attrs?.webbingUpgrade === 'Yes') upgrades.push('Webbing');
  if (attrs?.metalForLifterUpgrade === 'Yes') upgrades.push('Metal Lifter');
  if (attrs?.steamStopperUpgrade === 'Yes') upgrades.push('Steam Stop');
  if (attrs?.fabricUpgrade === 'Yes') upgrades.push('Fabric');
  if (attrs?.extraHandleQty && parseInt(attrs.extraHandleQty) > 0) {
    upgrades.push('Extra Handles: +' + attrs.extraHandleQty);
  }
  if (attrs?.extraLongSkirt === 'Yes') upgrades.push('Extra Long Skirt');
  if (attrs?.packaging === true) upgrades.push('Packaging');

  // Size logic
  let sizeDisplay = '';
  if (attrs?.width && attrs?.length) {
    sizeDisplay = attrs.width + '" x ' + attrs.length + '"';
  } else {
    sizeDisplay = attrs?.size || 'Custom';
  }

  return {
    orderItem,
    customer: orderItem.order.customer.name,
    thickness: '',
    type: attrs?.productType === 'SPA_COVER' ? 'Spa Cover' : (attrs?.productType || 'Standard'),
    color: attrs?.color || 'Standard',
    size: sizeDisplay,
    shape: attrs?.shape || 'Standard',
    radiusSize: attrs?.radiusSize || '',
    skirtType: attrs?.skirtType === 'CONN' ? 'Connected' : (attrs?.skirtType || 'Standard'),
    skirtLength: attrs?.skirtLength || '0',
    tieDownsQty: attrs?.tieDownsQty || '0',
    tieDownPlacement: attrs?.tieDownPlacement === 'HANDLE_SIDE' ? 'Handle Side' : (attrs?.tieDownPlacement || 'Standard'),
    tieDownLength: attrs?.tieDownLength || '-',
    distance: attrs?.distance || '0',
    foam: attrs?.foamUpgrade || 'Standard',
    date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
    barcode: (orderItem.order.salesOrderNumber || orderItem.order.id?.slice(-8) || 'N/A') + '-' + orderItem.id,
    upgrades
  };
}

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

// Computed properties for database-only queue
const queueStatus = computed(() => {
  const count = queue.value.length;
  return {
    count,
    isEmpty: count === 0,
    isFull: count >= 4 // Full batch is 4 labels
  };
});

const printReadiness = computed(() => {
  const count = queueStatus.value.count;
  return {
    canPrint: count > 0,
    isOptimal: count >= 4, // Optimal when we have at least 4 labels for a full batch
    labelCount: Math.min(count, 4), // We print max 4 at a time
    totalCount: count
  };
});

// Methods
function getStatusMessage(): string {
  const count = queueStatus.value.count;

  if (count === 0) {
    return 'Queue is empty. Add labels to start building your batch.';
  } else if (count >= 4) {
    const batches = Math.floor(count / 4);
    const remaining = count % 4;
    if (remaining === 0) {
      return 'Ready for optimal printing! ' + batches + ' full batch' + (batches !== 1 ? 'es' : '') + ' of 4 labels.';
    } else {
      return batches + ' full batch' + (batches !== 1 ? 'es' : '') + ' + ' + remaining + ' partial. Next print will process 4 labels.';
    }
  } else {
    return (4 - count) + ' more label' + (4 - count !== 1 ? 's' : '') + ' needed for a full batch of 4.';
  }
}

function getStatusColor(): string {
  const count = queueStatus.value.count;

  if (count === 0) {
    return 'text-gray-400';
  } else if (count >= 4) {
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
  const labelsToPrint = Math.min(count, 4);

  if (printReadiness.value.isOptimal) {
    return 'Print ' + labelsToPrint + ' Labels';
  } else {
    return 'Print ' + labelsToPrint + ' Label' + (labelsToPrint !== 1 ? 's' : '') + ' (Partial)';
  }
}

function handlePrint(): void {
  const readiness = printReadiness.value;

  if (readiness.isOptimal) {
    // Print immediately without warnings for full batch (4+ labels)
    executePrint(false);
  } else if (readiness.canPrint) {
    // Start warning process for partial batch (1-3 labels)
    printWarnings.startPrintWarning(readiness.labelCount);
  } else {
    alert('Cannot Print: No labels in queue to print.');
  }
}

async function executePrint(forcePartial: boolean = false): Promise<void> {
  try {
    const totalLabels = queueStatus.value.count;
    
    if (totalLabels === 0) {
      throw new Error('No labels in queue to print');
    }

    const labelsToPrint = Math.min(totalLabels, 4);
    const itemsToPrint = queue.value.slice(0, labelsToPrint);

    console.log('Print Started: Opening print dialog for ' + labelsToPrint + ' labels...');

    // Open the print dialog using our custom function
    await openPrintDialog(itemsToPrint);
    
    console.log('Print dialog closed. Asking for user confirmation...');
    
    // NOW show confirmation dialog asking if printing was successful
    const printedSuccessfully = confirm(
      'Did the ' + labelsToPrint + ' labels print successfully?\n\n' +
      'Click "OK" if they printed correctly, or "Cancel" if there was a problem.'
    );
    
    if (printedSuccessfully) {
      // Remove the printed items from the queue
      for (const item of itemsToPrint) {
        await removeFromQueue(item);
      }
      console.log('Print Completed: ' + labelsToPrint + ' labels marked as printed and removed from queue.');
    } else {
      console.log('User indicated printing failed. Items remain in queue.');
    }
    
    lastFailedOperation.value = null; // Clear any previous failed operation

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
        errorMessage = 'Print Failed: ' + err.userMessage;
      }
      if ('suggestions' in err && Array.isArray(err.suggestions)) {
        suggestions = '\n\nSuggestions:\n• ' + err.suggestions.join('\n• ');
      }
    }

    alert(errorMessage + suggestions);
    throw err; // Re-throw so warning system can handle it
  }
}

async function removeLabel(labelId: string): Promise<void> {
  try {
    // Find the item to determine if it's a database or localStorage item
    const item = queue.value.find(q => q.id === labelId);
    if (item) {
      await removeFromQueue(item);
      console.log('Label Removed: Label has been removed from the print queue.');
      
      // Remove from expanded previews if it was expanded
      expandedPreviews.value.delete(labelId);
      lastFailedOperation.value = null; // Clear any previous failed operation
    }
  } catch (err) {
    // Track failed operation for retry
    lastFailedOperation.value = { type: 'removeLabel', args: [labelId] };

    const errorMsg = 'Failed to remove label from queue.';
    alert('Error: ' + errorMsg);
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
    const fullMessage = suggestions ? errorMsg + '\n\nSuggestions:\n• ' + suggestions : errorMsg;

    alert('Error: ' + fullMessage);
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
      const fullMessage = suggestions ? errorMsg + '\n\nSuggestions:\n• ' + suggestions : errorMsg;

      alert('Error: ' + fullMessage);
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
      const fullMessage = suggestions ? errorMsg + '\n\nSuggestions:\n• ' + suggestions : errorMsg;

      alert('Error: ' + fullMessage);
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



// Clear any errors when component mounts and force refetch
onMounted(async () => {
  clearError();
  console.log('Component mounted, forcing refetch...');
  try {
    await refetchPrintQueue();
    console.log('Manual refetch completed on mount');
  } catch (error) {
    console.error('Manual refetch failed on mount:', error);
  }
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