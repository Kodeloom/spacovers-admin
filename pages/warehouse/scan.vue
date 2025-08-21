<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Warehouse Scanner</h1>
            <p class="text-gray-600 mt-1">Scan orders and process items through production stations</p>
          </div>
          <div v-if="currentUser" class="text-right">
            <p class="text-sm text-gray-500">Logged in as</p>
            <p class="font-medium text-gray-900">{{ currentUser.name }}</p>
          </div>
        </div>
      </div>

      <!-- Active Task Warning -->
      <div v-if="activeTask" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400 mr-3" />
          <div>
            <h3 class="text-sm font-medium text-yellow-800">Active Task In Progress</h3>
            <p class="text-sm text-yellow-700 mt-1">
              You are currently working on <strong>{{ activeTask.itemName }}</strong> at <strong>{{ activeTask.stationName }}</strong>.
              Please complete this task before starting a new one.
            </p>
          </div>
        </div>
      </div>

      <!-- Order Barcode Input -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">1. Scan Order Barcode</h2>
        <div class="flex space-x-4">
          <div class="flex-1">
            <label for="orderBarcode" class="block text-sm font-medium text-gray-700 mb-2">Order Barcode</label>
            <input
              id="orderBarcode"
              v-model="orderBarcodeInput"
              type="text"
              placeholder="Scan or enter order barcode"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              @keyup.enter="scanOrder"
            >
          </div>
          <button
            :disabled="!orderBarcodeInput.trim() || isLoadingOrder"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="scanOrder"
          >
            <Icon v-if="isLoadingOrder" name="svg-spinners:180-ring-with-bg" class="h-5 w-5" />
            <span v-else>Scan</span>
          </button>
        </div>
      </div>

      <!-- Order Details -->
      <div v-if="scannedOrder" class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p class="text-sm text-gray-500">Order Number</p>
            <p class="font-medium">{{ scannedOrder.salesOrderNumber || scannedOrder.id.slice(-8) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Customer</p>
            <p class="font-medium">{{ scannedOrder.customer?.name }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Status</p>
            <span 
              :class="{
                'bg-green-100 text-green-800': scannedOrder.orderStatus === 'APPROVED',
                'bg-blue-100 text-blue-800': scannedOrder.orderStatus === 'ORDER_PROCESSING',
                'bg-purple-100 text-purple-800': scannedOrder.orderStatus === 'READY_TO_SHIP',
                'bg-yellow-100 text-yellow-800': scannedOrder.orderStatus === 'PENDING'
              }"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ scannedOrder.orderStatus.replace(/_/g, ' ') }}
            </span>
          </div>
          <div>
            <p class="text-sm text-gray-500">Contact</p>
            <p class="font-medium">{{ scannedOrder.contactEmail }}</p>
          </div>
        </div>

        <!-- Order Items -->
        <h3 class="text-md font-semibold text-gray-900 mb-3">Order Items</h3>
        <div class="space-y-3">
          <div 
            v-for="item in scannedOrder.items" 
            :key="item.id"
            :class="{
              'border-blue-200 bg-blue-50': selectedItem?.id === item.id,
              'border-gray-200': selectedItem?.id !== item.id
            }"
            class="border rounded-lg p-4 cursor-pointer transition-colors"
            @click="selectItem(item)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900">{{ item.item?.name }}</h4>
                <p class="text-sm text-gray-500">Quantity: {{ item.quantity }}</p>
              </div>
              <div class="text-right">
                <span 
                  :class="{
                    'bg-gray-100 text-gray-800': item.itemStatus === 'NOT_STARTED_PRODUCTION',
                    'bg-orange-100 text-orange-800': item.itemStatus === 'CUTTING',
                    'bg-blue-100 text-blue-800': item.itemStatus === 'SEWING',
                    'bg-purple-100 text-purple-800': item.itemStatus === 'FOAM_CUTTING',
                    'bg-green-100 text-green-800': item.itemStatus === 'READY'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ item.itemStatus.replace(/_/g, ' ') }}
                </span>
              </div>
            </div>
            <div v-if="selectedItem?.id === item.id" class="mt-2 p-2 bg-blue-100 rounded">
              <p class="text-sm text-blue-800">✓ Selected for processing</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Station Selection & Processing -->
      <div v-if="selectedItem" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">2. Scan Station & Process Item</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Station Barcode Input -->
          <div>
            <label for="stationBarcode" class="block text-sm font-medium text-gray-700 mb-2">Station Barcode</label>
            <input
              id="stationBarcode"
              v-model="stationBarcodeInput"
              type="text"
              placeholder="Scan station barcode"
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              @keyup.enter="processItem"
            >
            <p class="text-sm text-gray-500 mt-1">Scan the barcode at your current station</p>
          </div>

          <!-- Available Stations -->
          <div>
            <p class="block text-sm font-medium text-gray-700 mb-2">Available Stations</p>
            <div class="space-y-2">
              <div 
                v-for="station in stations" 
                :key="station.id"
                :class="{
                  'border-blue-500 bg-blue-50': stationBarcodeInput === station.id,
                  'border-gray-200': stationBarcodeInput !== station.id
                }"
                class="border rounded p-2 cursor-pointer"
                @click="stationBarcodeInput = station.id"
              >
                <p class="font-medium">{{ station.name }}</p>
                <p class="text-sm text-gray-500">{{ station.description || 'Production station' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Process Button -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <button
            :disabled="!stationBarcodeInput.trim() || isProcessingItem || activeTask"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-md text-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            @click="processItem"
          >
            <Icon v-if="isProcessingItem" name="svg-spinners:180-ring-with-bg" class="h-5 w-5 inline mr-2" />
            {{ isProcessingItem ? 'Processing...' : 'Process Item at Station' }}
          </button>
        </div>

        <!-- Current Item Info -->
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-700">Processing:</p>
          <p class="text-lg font-semibold text-gray-900">{{ selectedItem.item?.name }} ({{ selectedItem.quantity }}x)</p>
          <p class="text-sm text-gray-500">Current Status: {{ selectedItem.itemStatus.replace(/_/g, ' ') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyStation } from '~/lib/hooks/index';

definePageMeta({
  layout: 'empty',
  middleware: 'auth-warehouse-only',
});

const toast = useToast();

// Reactive state
const orderBarcodeInput = ref('');
const stationBarcodeInput = ref('');
const scannedOrder = ref<Record<string, unknown> | null>(null);
const selectedItem = ref<Record<string, unknown> | null>(null);
const currentUser = ref<Record<string, unknown> | null>(null);
const activeTask = ref<Record<string, unknown> | null>(null);
const isLoadingOrder = ref(false);
const isProcessingItem = ref(false);

// Fetch available stations
const { data: stations } = useFindManyStation({
  orderBy: { name: 'asc' }
});

// Get current user on mount
onMounted(async () => {
  try {
    const response = await $fetch('/api/auth/session') as Record<string, unknown>;
    currentUser.value = response?.user as Record<string, unknown>;
    
    // Check for active tasks
    if (currentUser.value) {
      await checkActiveTask();
    }
  } catch (error) {
    console.error('Error getting user session:', error);
  }
});

async function checkActiveTask() {
  try {
    const response = await $fetch('/api/warehouse/active-task', {
      query: { userId: (currentUser.value as Record<string, unknown>)?.id }
    }) as Record<string, unknown>;
    activeTask.value = response.activeTask as Record<string, unknown>;
  } catch (error) {
    console.error('Error checking active task:', error);
  }
}

async function scanOrder() {
  if (!orderBarcodeInput.value.trim()) return;
  
  isLoadingOrder.value = true;
  try {
    const response = await $fetch('/api/warehouse/scan-order', {
      method: 'POST',
      body: { barcode: orderBarcodeInput.value.trim() }
    }) as { order: Record<string, unknown> };
    
    scannedOrder.value = response.order;
    selectedItem.value = null;
    stationBarcodeInput.value = '';
    
    const orderNumber = (response.order.salesOrderNumber as string) || (response.order.id as string).slice(-8);
    toast.success({ 
      title: 'Order Found', 
      message: `Order ${orderNumber} loaded successfully!` 
    });
  } catch (error: unknown) {
    const fetchError = error as { data?: { message?: string } };
    const message = fetchError.data?.message || 'Order not found or invalid barcode';
    toast.error({ title: 'Error', message });
    scannedOrder.value = null;
    selectedItem.value = null;
  } finally {
    isLoadingOrder.value = false;
  }
}

function selectItem(item: Record<string, unknown>) {
  if (item.itemStatus === 'READY') {
    toast.warning({ title: 'Item Complete', message: 'This item has already completed production.' });
    return;
  }
  
  selectedItem.value = item;
  stationBarcodeInput.value = '';
}

async function processItem() {
  if (!selectedItem.value || !stationBarcodeInput.value.trim()) return;
  
  if (activeTask.value) {
    toast.error({ 
      title: 'Active Task', 
      message: 'Please complete your current task before starting a new one.' 
    });
    return;
  }
  
  isProcessingItem.value = true;
  try {
    const response = await $fetch('/api/warehouse/process-item', {
      method: 'POST',
      body: {
        orderItemId: selectedItem.value.id,
        stationId: stationBarcodeInput.value.trim(),
        userId: (currentUser.value as Record<string, unknown>)?.id
      }
    }) as Record<string, unknown>;
    
    // Update the item status locally - simplify response handling
    const newStatus = response.newItemStatus || response.itemStatus || 'UNKNOWN';
    if (selectedItem.value) {
      selectedItem.value.itemStatus = newStatus;
    }
    
    // Update the order status if changed
    if (response.orderStatusChanged && scannedOrder.value) {
      scannedOrder.value.orderStatus = response.newOrderStatus || response.orderStatus;
    }
    
    toast.success({ 
      title: 'Item Processed', 
      message: `Item processing completed successfully!` 
    });
    
    // Clear selections
    selectedItem.value = null;
    stationBarcodeInput.value = '';
    
    // Check for new active task
    await checkActiveTask();
    
  } catch (error: unknown) {
    const fetchError = error as { data?: { message?: string } };
    const message = fetchError.data?.message || 'Error processing item';
    toast.error({ title: 'Processing Error', message });
  } finally {
    isProcessingItem.value = false;
  }
}
</script> 