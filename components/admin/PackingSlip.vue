<template>
  <div class="split-label-container">
    <!-- Print Controls -->
    <div class="print-controls mb-4">
      <div class="flex gap-4 items-center">
        <button @click="handlePrintAll"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <Icon name="heroicons:printer" class="mr-2 h-4 w-4" />
          Add All to Print Queue
        </button>

        <button v-if="canAccessPrintQueue" @click="handleAddAllToQueue" :disabled="allItemsQueued"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            Split Label for: {{ orderItem.item?.name }}
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
            <button @click="handlePrintSingle(orderItem)"
              class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Icon name="heroicons:queue-list" class="mr-1 h-3 w-3" />
              Add to Queue
            </button>
          </div>
        </div>

        <!-- Split Label -->
        <div class="split-label-wrapper" :ref="(el: any) => setSplitLabelRef(el, orderItem.id)">
          <SplitLabel :order-item="orderItem" :order="order" :show-preview="true" :is-print-mode="false" />
        </div>
      </div>
    </div>

    <!-- No Production Items Message -->
    <div v-if="productionItems.length === 0" class="text-center py-8 text-gray-500">
      <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p>No production items found for this order.</p>
      <p class="text-sm">Mark items as production items to generate split labels.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';

import { usePrintQueue } from '~/composables/usePrintQueue';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';

interface Props {
  order: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'print-confirmation': [orderItem: any, printFunction: () => void]
}>();

const splitLabelRefs = ref<Record<string, HTMLElement>>({});

// Initialize print queue
const {
  addToQueue,
  isItemQueued,
  getQueueStatus,
  error: queueError
} = usePrintQueue();

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
    return item.productAttributes !== null;
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




// Function to get product attribute value
function getProductAttribute(orderItem: any, attributeName: string): string {
  if (!orderItem.productAttributes) return 'N/A';

  const value = orderItem.productAttributes[attributeName];

  // Handle boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle empty strings
  if (value === '' || value === null || value === undefined) {
    return 'N/A';
  }

  return value.toString();
}

// Helper function to determine if an upgrade should be shown
function shouldShowUpgrade(attributeName: string, orderItem: any): boolean {
  const value = getProductAttribute(orderItem, attributeName);
  // Show if value exists and is not "No" or "N/A"
  return !!(value && value !== 'No' && value !== 'N/A');
}

// Helper function to determine if Extra Handle Qty should be shown
function shouldShowExtraHandle(orderItem: any): boolean {
  const value = getProductAttribute(orderItem, 'extraHandleQty');
  // Show if value exists and is not "0" or "N/A"
  return !!(value && value !== '0' && value !== 'N/A');
}

// Helper function to check if there are any additional attributes to show
function hasAdditionalAttributes(orderItem: any): boolean {
  return !!(
    (getProductAttribute(orderItem, 'distance') && getProductAttribute(orderItem, 'distance') !== '0') ||
    getProductAttribute(orderItem, 'foamUpgrade') ||
    shouldShowUpgrade('doublePlasticWrapUpgrade', orderItem) ||
    shouldShowUpgrade('webbingUpgrade', orderItem) ||
    shouldShowUpgrade('metalForLifterUpgrade', orderItem) ||
    shouldShowUpgrade('steamStopperUpgrade', orderItem) ||
    shouldShowUpgrade('fabricUpgrade', orderItem) ||
    shouldShowExtraHandle(orderItem) ||
    shouldShowUpgrade('extraLongSkirt', orderItem) ||
    getProductAttribute(orderItem, 'packaging') ||
    shouldShowNotes(orderItem) ||
    shouldShowSize(orderItem)
  );
}

// Helper function to get the appropriate label for radius/side length field
function getRadiusFieldLabel(orderItem: any): string {
  const shape = getProductAttribute(orderItem, 'shape');
  if (shape === 'Octagon') {
    return 'Side Length';
  }
  return 'Radius Size';
}

// Helper function to determine if Size should be shown (only for Round and Octagon)
function shouldShowSize(orderItem: any): boolean {
  const shape = getProductAttribute(orderItem, 'shape');
  const value = getProductAttribute(orderItem, 'size');
  // Show size only for Round and Octagon shapes, and only if it has a value
  return (shape === 'Round' || shape === 'Octagon') && !!(value && value.trim() !== '' && value !== 'N/A');
}

// Helper function to determine if Notes should be shown
function shouldShowNotes(orderItem: any): boolean {
  const value = getProductAttribute(orderItem, 'notes');
  // Show if value exists and is not empty, "N/A", or just whitespace
  return !!(value && value.trim() !== '' && value !== 'N/A');
}

// Function to get priority styling class
function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'text-red-600 font-bold';
    case 'MEDIUM':
      return 'text-yellow-600 font-semibold';
    case 'LOW':
      return 'text-green-600';
    default:
      return '';
  }
}



// Handler functions for adding all items to print queue
async function handlePrintAll() {
  // Just call the add all to queue function
  await handleAddAllToQueue();
}

// Handler for adding single item to print queue
async function handleAddToQueue(orderItem: any) {
  if (isItemQueued(orderItem.id)) {
    return; // Item already in queue
  }

  // Transform order item to include required relations for print queue
  const orderItemWithRelations = {
    ...orderItem,
    order: {
      ...props.order,
      customer: props.order.customer
    },
    item: orderItem.item
  };

  const success = await addToQueue(orderItemWithRelations);

  if (!success && queueError.value) {
    // Show error message to user
    alert(`Failed to add item to queue: ${queueError.value.message}`);
  }
}

// Handler for adding all production items to print queue
async function handleAddAllToQueue() {
  if (allItemsQueued.value) {
    return; // All items already in queue
  }

  const itemsToAdd = productionItems.value.filter((item: any) => !isItemQueued(item.id));

  for (const orderItem of itemsToAdd) {
    const orderItemWithRelations = {
      ...orderItem,
      order: {
        ...props.order,
        customer: props.order.customer
      },
      item: orderItem.item
    };

    const success = await addToQueue(orderItemWithRelations);

    if (!success && queueError.value) {
      // Show error for this specific item but continue with others
      console.error(`Failed to add ${orderItem.item?.name} to queue:`, queueError.value.message);
    }
  }
}

function handlePrintSingle(orderItem: any) {
  handleAddToQueue(orderItem);
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
