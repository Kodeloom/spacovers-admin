<template>
  <div class="split-label-container">
    <!-- Print Controls -->
    <div class="print-controls mb-4">
      <div class="flex gap-4 items-center">
        <button v-if="canAccessPrintQueue" @click="handleAddAllToQueue" :disabled="allItemsQueued"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="{ 'bg-green-50 border-green-300 text-green-700': allItemsQueued }">
          <Icon :name="allItemsQueued ? 'heroicons:check' : 'heroicons:queue-list'" class="mr-2 h-4 w-4" />
          {{ allItemsQueued ? 'All Items in Queue' : 'Add All to Queue' }}
        </button>

        <NuxtLink v-if="canAccessPrintQueue" to="/admin/print-queue"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <Icon name="heroicons:queue-list" class="mr-2 h-4 w-4" />
          View Print Queue
          <span v-if="queueStatus.count > 0"
            class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {{ queueStatus.count }}
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Split Labels for Each Production Item -->
    <div class="space-y-6">
      <div v-for="orderItem in productionItems" :key="orderItem.id" class="split-label-item-wrapper">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-semibold text-gray-800">
            Packing Slip for: {{ orderItem.productNumber ? `P${String(orderItem.productNumber).padStart(5, '0')}` : orderItem.item?.name }}
          </h3>
          <div class="flex gap-2">
            <button v-if="canAccessPrintQueue" @click="handleAddToQueue(orderItem)"
              :disabled="isItemQueued(orderItem.id)"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{ 'bg-green-50 border-green-300 text-green-700': isItemQueued(orderItem.id) }">
              <Icon :name="isItemQueued(orderItem.id) ? 'heroicons:check' : 'heroicons:queue-list'"
                class="mr-1 h-3 w-3" />
              {{ isItemQueued(orderItem.id) ? 'In Queue' : 'Add to Queue' }}
            </button>
          </div>
        </div>

        <!-- Split Label -->
        <div class="split-label-wrapper" :ref="(el: any) => setSplitLabelRef(el, orderItem.id)">
          <AdminSplitLabel :order-item="orderItem" :order="order" :show-preview="true" :is-print-mode="false" />
        </div>
      </div>
    </div>

    <!-- No Production Items Message -->
    <div v-if="productionItems.length === 0" class="text-center py-8 text-gray-500">
      <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p>No production items found for this order.</p>
      <p class="text-sm">Mark items as production items to generate packing slips.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePrintQueue } from '~/composables/usePrintQueue';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';
import AdminSplitLabel from '~/components/admin/SplitLabel.vue';

interface Props {
  order: any;
}

const props = defineProps<Props>();

const splitLabelRefs = ref<Record<string, HTMLElement>>({});

// Initialize database print queue
const {
  isItemQueued,
  getQueueStatus,
  refetchPrintQueue
} = useDatabasePrintQueue();

const queueStatus = getQueueStatus();

// Role-based access control
const { hasOfficeAdminAccess } = useRoleBasedRouting();

// Check if user has access to print queue features
// According to requirements: office employees, admins, and super admins
const canAccessPrintQueue = computed(() => {
  return hasOfficeAdminAccess.value;
});

// Get only production items (items marked as products)
const productionItems = computed(() => {
  if (!props.order?.items) return [];

  return props.order.items.filter((item: any) => {
    // Check if item has productAttributes (meaning it's marked as a product)
    // Also include items that have isProduct flag set to true
    return item.productAttributes !== null || item.isProduct === true;
  });
});

// Check if all production items are already in the queue
const allItemsQueued = computed(() => {
  if (productionItems.value.length === 0) return false;
  return productionItems.value.every((item: any) => isItemQueued(item.id));
});

// Function to set split label ref for each item
function setSplitLabelRef(el: any, itemId: string) {
  if (el) {
    splitLabelRefs.value[itemId] = el;
  }
}

// Handler for adding single item to print queue (database)
async function handleAddToQueue(orderItem: any) {
  if (isItemQueued(orderItem.id)) {
    return; // Item already in queue
  }

  try {
    const response = await $fetch<{ success: boolean; message: string }>('/api/admin/print-queue/add-item', {
      method: 'POST',
      body: {
        orderItemId: orderItem.id
      }
    });

    if (response.success) {
      console.log('Item added to print queue:', response.message);
      // Refresh the queue to update UI
      await refetchPrintQueue();
    } else {
      alert(`Failed to add item to queue: ${response.message}`);
    }
  } catch (error) {
    console.error('Error adding item to print queue:', error);
    alert('Failed to add item to queue. Please try again.');
  }
}

// Handler for adding all production items to print queue (database)
async function handleAddAllToQueue() {
  if (allItemsQueued.value) {
    return; // All items already in queue
  }

  const itemsToAdd = productionItems.value.filter((item: any) => !isItemQueued(item.id));
  let successCount = 0;
  let errorCount = 0;

  for (const orderItem of itemsToAdd) {
    try {
      const response = await $fetch<{ success: boolean; message: string }>('/api/admin/print-queue/add-item', {
        method: 'POST',
        body: {
          orderItemId: orderItem.id
        }
      });

      if (response.success) {
        successCount++;
        const itemDisplay = orderItem.productNumber ? `P${String(orderItem.productNumber).padStart(5, '0')}` : orderItem.item?.name;
        console.log(`Added ${itemDisplay} to print queue`);
      } else {
        errorCount++;
        const itemDisplay = orderItem.productNumber ? `P${String(orderItem.productNumber).padStart(5, '0')}` : orderItem.item?.name;
        console.error(`Failed to add ${itemDisplay} to queue:`, response.message);
      }
    } catch (error) {
      errorCount++;
      const itemDisplay = orderItem.productNumber ? `P${String(orderItem.productNumber).padStart(5, '0')}` : orderItem.item?.name;
      console.error(`Failed to add ${itemDisplay} to queue:`, error);
    }
  }

  // Refresh the queue to update UI
  if (successCount > 0) {
    await refetchPrintQueue();
  }

  // Show summary message
  if (successCount > 0 && errorCount === 0) {
    console.log(`Successfully added ${successCount} item${successCount === 1 ? '' : 's'} to print queue`);
  } else if (successCount > 0 && errorCount > 0) {
    alert(`Added ${successCount} item${successCount === 1 ? '' : 's'} to print queue, but ${errorCount} failed. Please check the console for details.`);
  } else if (errorCount > 0) {
    alert(`Failed to add ${errorCount} item${errorCount === 1 ? '' : 's'} to print queue. Please try again.`);
  }
}
</script>

<style scoped>
.split-label-container {
  max-width: 100%;
}

.split-label-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #f9fafb;
  margin-bottom: 1rem;
}

.order-date {
  margin-bottom: 0.05in;
}

.barcode-container {
  margin: 0.05in 0;
  text-align: center;
  justify-self: flex-end;
}

.barcode-canvas {
  display: block;
  margin-right: 1.5px;
  max-width: 100%;
  height: auto;
}

.po-number {
  margin-top: 0.05in;
  font-size: 7pt;
}

.barcode-toggle {
  display: none;
}

.specs-section {
  margin: 0.1in 0;
}

.core-specs-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 0.1in !important;
  margin-bottom: 0.1in !important;
}

.spec-column {
  display: flex !important;
  flex-direction: column !important;
}

.additional-specs {
  display: flex !important;
  flex-direction: column !important;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.05in;
  border-bottom: 1px dotted #ccc;
  padding-bottom: 0.02in;
}

.spec-label {
  font-weight: bold;
}

.spec-value {
  text-align: right;
}

.footer-section {
  border-top: 1px solid #000;
  padding-top: 0.1in;
  margin-top: 0.1in;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.priority-info {
  display: flex;
  align-items: center;
}

.priority-label {
  font-weight: bold;
  margin-right: 0.1in;
}

.priority-value {
  padding: 0.02in 0.1in;
  border: 1px solid #000;
  border-radius: 0.05in;
  font-size: 7pt;
}

.save-info {
  font-size: 7pt;
  font-style: italic;
  color: #666;
}

/* Priority colors */
.text-red-600 {
  color: #dc2626;
}

.text-yellow-600 {
  color: #ca8a04;
}

.text-green-600 {
  color: #16a34a;
}

.font-bold {
  font-weight: bold;
}

.font-semibold {
  font-weight: 600;
}

/* Print styles */
@media print {
  .print-controls {
    display: none;
  }

  .split-label-item-wrapper {
    border: none;
    background: none;
    padding: 0;
  }

  .split-label-wrapper {
    box-shadow: none;
    border: 1px solid #000;
  }
}
</style>
