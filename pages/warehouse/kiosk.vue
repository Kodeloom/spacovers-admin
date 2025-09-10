<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <!-- Login Screen -->
    <div v-if="!isLoggedIn" class="w-full max-w-md mx-auto p-8">
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <div class="text-center mb-8">
          <Icon name="heroicons:building-office-2" class="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Warehouse Kiosk</h1>
          <p class="text-gray-600">Login to access scanning</p>
        </div>

        <form @submit.prevent="login" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              id="email"
              v-model="loginForm.email"
              type="email"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
            >
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              id="password"
              v-model="loginForm.password"
              type="password"
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            >
          </div>
          
          <button
            type="submit"
            :disabled="isLoggingIn"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Icon v-if="isLoggingIn" name="svg-spinners:180-ring-with-bg" class="h-5 w-5 mr-2" />
            {{ isLoggingIn ? 'Logging in...' : 'Login' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Main Kiosk Interface -->
    <div v-else class="w-full max-w-4xl mx-auto p-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <Icon name="heroicons:building-office-2" class="h-16 w-16 text-blue-400 mx-auto mb-4" />
        <h1 class="text-4xl font-bold text-white mb-2">Warehouse Kiosk</h1>
        <p class="text-xl text-gray-300">Scan barcodes to process items</p>
        <button
          @click="logout"
          data-logout
          class="mt-4 px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-400"
        >
          Logout
        </button>
      </div>

      <!-- Scan Interface -->
      <div class="bg-white rounded-2xl shadow-2xl p-12" @click="focusInput">
        <!-- Current Scanner Info -->
        <div v-if="currentScannerInfo" class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg" @click="focusInput">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-blue-900">Current Scanner</h3>
              <p class="text-blue-700">{{ currentScannerInfo.user }} at {{ currentScannerInfo.station }}</p>
              <p class="text-sm text-blue-600">Scanner: {{ currentScannerInfo.prefix }}</p>
            </div>
            <Icon name="heroicons:identification" class="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <!-- Status Display -->
        <div v-if="lastScanResult" class="mb-8 p-6 rounded-xl" :class="lastScanResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'" @click="focusInput">
          <div class="flex items-center">
            <Icon 
              :name="lastScanResult.success ? 'heroicons:check-circle' : 'heroicons:x-circle'" 
              :class="lastScanResult.success ? 'text-green-600' : 'text-red-600'"
              class="h-8 w-8 mr-4" 
            />
            <div>
              <h3 :class="lastScanResult.success ? 'text-green-800' : 'text-red-800'" class="text-lg font-semibold">
                {{ lastScanResult.title }}
              </h3>
              <p :class="lastScanResult.success ? 'text-green-700' : 'text-red-700'" class="text-sm">
                {{ lastScanResult.message }}
              </p>
            </div>
          </div>
        </div>

        <!-- Barcode Input -->
        <div class="text-center" @click="focusInput">
          <label class="block text-2xl font-semibold text-gray-900 mb-6" @click="focusInput">
            <Icon name="heroicons:qr-code" class="h-8 w-8 inline mr-3" />
            Scan Barcode
          </label>
          
          <input
            ref="barcodeInput"
            v-model="scanForm.barcode"
            type="text"
            placeholder="Ready to scan..."
            class="w-full text-center text-3xl py-6 px-8 border-4 border-gray-300 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-mono"
            @keyup.enter="processItem"
            @input="onBarcodeInput"
            @blur="focusInput"
          >
          
          <!-- Processing Indicator -->
          <div v-if="isProcessing" class="mt-6 flex items-center justify-center" @click="focusInput">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-blue-600 mr-3" />
            <span class="text-xl text-gray-700">Processing scan...</span>
          </div>
        </div>

        <!-- Instructions -->
        <div class="mt-12 text-center text-gray-600" @click="focusInput">
          <p class="text-lg">Point the scanner at the barcode and scan</p>
          <p class="text-sm mt-2">The scanner ID will identify the user and station automatically</p>
        </div>
      </div>

      <!-- Recent Activity -->
      <div v-if="recentActivity.length > 0" class="mt-8 bg-gray-800 rounded-xl p-6" @click="focusInput">
        <h3 class="text-white text-lg font-semibold mb-4">Recent Activity</h3>
        <div class="space-y-2">
          <div 
            v-for="activity in recentActivity.slice(0, 5)" 
            :key="activity.id"
            class="flex items-center justify-between text-sm"
            @click="focusInput"
          >
            <span class="text-gray-300">
              {{ activity.orderNumber }} - {{ activity.itemName }}
            </span>
            <span class="text-gray-400">{{ activity.user }} @ {{ activity.station }}</span>
            <span :class="activity.success ? 'text-green-400' : 'text-red-400'">
              {{ activity.status }}
            </span>
            <span class="text-gray-500">
              {{ formatTime(activity.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { authClient } from '~/lib/auth-client';
import { decodeBarcode, isValidStatusTransition, getNextStatus, getStatusDisplayName } from '~/utils/barcodeUtils';
import { parseScannerPrefix, getScannerInfo } from '~/utils/scannerUtils';
import { formatErrorForUI } from '~/utils/errorHandling';

definePageMeta({
  layout: 'empty',
});

// Auth state
const session = authClient.useSession();
const isLoggedIn = computed(() => !!session.value?.data?.user);

// Login form
const loginForm = ref({
  email: '',
  password: ''
});
const isLoggingIn = ref(false);

// Scan form and state
const scanForm = ref({
  barcode: ''
});

const isProcessing = ref(false);
const lastScanResult = ref(null);
const recentActivity = ref([]);
const barcodeInput = ref(null);
const currentScannerInfo = ref(null);

// Auto-focus the input and keep it focused when logged in
onMounted(() => {
  if (isLoggedIn.value) {
    focusInput();
  }
  
  // Keep input focused at all times - more aggressive
  setInterval(() => {
    if (isLoggedIn.value && document.activeElement !== barcodeInput.value) {
      focusInput();
    }
  }, 500); // Check every 500ms
  
  // Add global click handler to focus input on any click (except logout)
  document.addEventListener('click', (event) => {
    if (isLoggedIn.value) {
      const target = event.target as HTMLElement;
      // Don't focus if clicking on logout button
      if (!target.closest('button[data-logout]')) {
        focusInput();
      }
    }
  });
});

// Watch for login state changes
watch(isLoggedIn, (newValue) => {
  if (newValue) {
    nextTick(() => {
      focusInput();
    });
  }
});

function focusInput() {
  nextTick(() => {
    if (barcodeInput.value && isLoggedIn.value) {
      barcodeInput.value.focus();
    }
  });
}

async function login() {
  try {
    isLoggingIn.value = true;
    
    const response = await authClient.signIn.email({
      email: loginForm.value.email,
      password: loginForm.value.password
    });
    
    if (response.data) {
      // Clear form
      loginForm.value = { email: '', password: '' };
      
      // Focus input after login
      setTimeout(() => {
        focusInput();
      }, 100);
    }
  } catch (error) {
    console.error('Login failed:', error);
    // You might want to show an error message here
  } finally {
    isLoggingIn.value = false;
  }
}

async function logout() {
  try {
    await authClient.signOut();
    currentScannerInfo.value = null;
    lastScanResult.value = null;
    recentActivity.value = [];
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Debounce variables
let processTimeout = null;
let lastProcessedBarcode = '';
let lastProcessTime = 0;

function onBarcodeInput() {
  // Clear any existing timeout
  if (processTimeout) {
    clearTimeout(processTimeout);
  }
  
  // Auto-process when barcode looks complete (typical barcode length)
  if (scanForm.value.barcode.length >= 10 && scanForm.value.barcode.includes('-')) {
    // Small delay to ensure full barcode is captured
    processTimeout = setTimeout(() => {
      const currentBarcode = scanForm.value.barcode;
      const currentTime = Date.now();
      
      // Prevent duplicate processing of same barcode within 2 seconds
      if (currentBarcode === lastProcessedBarcode && (currentTime - lastProcessTime) < 2000) {
        console.log('Ignoring duplicate barcode scan');
        scanForm.value.barcode = '';
        focusInput();
        return;
      }
      
      if (currentBarcode.length >= 10 && !isProcessing.value) {
        lastProcessedBarcode = currentBarcode;
        lastProcessTime = currentTime;
        processItem();
      }
    }, 150);
  }
}

async function processItem() {
  if (!scanForm.value.barcode.trim() || isProcessing.value) return;
  
  let barcodeData = null;
  let orderItem = null;
  
  try {
    isProcessing.value = true;
    
    // Decode the barcode
    barcodeData = decodeBarcode(scanForm.value.barcode);
    
    if (!barcodeData) {
      throw new Error('Invalid barcode format');
    }
    
    // Look up scanner information from the prefix
    const scannerResponse = await $fetch('/api/warehouse/scanner-lookup', {
      method: 'POST',
      body: { 
        prefix: barcodeData.prefix
      }
    });
    
    if (!scannerResponse.scanner) {
      throw new Error(`Scanner with prefix "${barcodeData.prefix}" not found or not assigned`);
    }
    
    // Update current scanner info display
    currentScannerInfo.value = {
      prefix: scannerResponse.scanner.prefix,
      user: scannerResponse.scanner.user.name,
      station: scannerResponse.scanner.station.name,
      userId: scannerResponse.scanner.user.id,
      stationId: scannerResponse.scanner.station.id
    };
    
    // Get the order and item
    const orderResponse = await $fetch('/api/warehouse/scan-order', {
      method: 'POST',
      body: { 
        barcode: scanForm.value.barcode,
        barcodeData: barcodeData
      }
    });
    
    if (!orderResponse.order) {
      throw new Error('Order not found');
    }
    
    // Find the specific item
    orderItem = orderResponse.order.items.find(item => item.id === barcodeData.itemId);
    if (!orderItem) {
      throw new Error('Item not found in this order');
    }
    
    // Handle office scanners differently - they can view status but not process items
    if (currentScannerInfo.value.station === 'Office') {
      const currentStatusDisplay = getStatusDisplayName(orderItem.itemStatus);
      
      // Show status information for office scanners
      lastScanResult.value = {
        success: true,
        title: 'Item Status',
        message: `This item is currently "${currentStatusDisplay}". Office scanners can view status but cannot process workflow transitions.`
      };
      
      // Add to recent activity
      addToRecentActivity({
        orderNumber: orderResponse.order.orderNumber,
        itemName: orderItem.itemName,
        user: currentScannerInfo.value.user,
        station: currentScannerInfo.value.station,
        status: `Status Check: ${currentStatusDisplay}`,
        success: true,
        timestamp: new Date()
      });
      
      // Clear the barcode input
      scanForm.value.barcode = '';
      focusInput();
      
      // Clear message after 5 seconds
      setTimeout(() => {
        lastScanResult.value = null;
      }, 5000);
      
      return; // Exit early for office scanners
    }
    
    // Validate status transition using the scanner's station (for production stations)
    if (!isValidStatusTransition(orderItem.itemStatus, currentScannerInfo.value.station)) {
      const currentStatusDisplay = getStatusDisplayName(orderItem.itemStatus);
      const errorMessage = `This item is currently "${currentStatusDisplay}" and cannot be processed at the ${currentScannerInfo.value.station} station. Please check the workflow order.`;
      console.log('Throwing workflow error:', errorMessage);
      const error = new Error(errorMessage);
      error.code = 'INVALID_STATUS_TRANSITION';
      error.itemStatus = orderItem.itemStatus;
      error.station = currentScannerInfo.value.station;
      throw error;
    }
    
    // Get next status
    const nextStatus = getNextStatus(orderItem.itemStatus, currentScannerInfo.value.station);
    
    // Process the item using the scanner's user and station
    const response = await $fetch('/api/warehouse/process-item', {
      method: 'POST',
      body: { 
        orderItemId: orderItem.id,
        stationId: currentScannerInfo.value.stationId,
        userId: currentScannerInfo.value.userId,
        scannerPrefix: barcodeData.prefix,
        barcodeData: barcodeData,
        currentStatus: orderItem.itemStatus,
        nextStatus: nextStatus
      }
    });
    
    if (response.success && response.newItemStatus) {
      // Show success result
      const stepInfo = response.workflowStep;
      lastScanResult.value = {
        success: true,
        title: `Step ${stepInfo?.step || ''} Complete`,
        message: `${currentScannerInfo.value.user} completed: ${stepInfo?.description || response.newItemStatus.replace(/_/g, ' ')}`
      };
      
      // Add to recent activity
      addToRecentActivity({
        orderNumber: orderResponse.order.orderNumber,
        itemName: orderItem.itemName,
        user: currentScannerInfo.value.user,
        station: currentScannerInfo.value.station,
        status: response.newItemStatus.replace(/_/g, ' '),
        success: true,
        timestamp: new Date()
      });
      
      // Clear the barcode input
      scanForm.value.barcode = '';
      
      // Auto-focus back to barcode input for next scan
      focusInput();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        lastScanResult.value = null;
      }, 5000);
    }
  } catch (error) {
    const errorInfo = formatErrorForUI(error);
    
    // Show error result
    lastScanResult.value = {
      success: false,
      title: errorInfo.title,
      message: errorInfo.message
    };
    
    // Add to recent activity
    addToRecentActivity({
      orderNumber: barcodeData?.orderNumber || scanForm.value.barcode.split('-')[1] || 'Unknown',
      itemName: orderItem?.itemName || 'Unknown Item',
      user: currentScannerInfo.value?.user || 'Unknown',
      station: currentScannerInfo.value?.station || 'Unknown',
      status: 'Error: ' + errorInfo.title,
      success: false,
      timestamp: new Date()
    });
    
    // Clear the barcode input
    scanForm.value.barcode = '';
    
    // Auto-focus back to barcode input
    focusInput();
    
    // Clear error message after 8 seconds
    setTimeout(() => {
      lastScanResult.value = null;
    }, 8000);
  } finally {
    isProcessing.value = false;
  }
}

function addToRecentActivity(activity) {
  recentActivity.value.unshift({
    ...activity,
    id: Date.now()
  });
  
  // Keep only last 10 activities
  if (recentActivity.value.length > 10) {
    recentActivity.value = recentActivity.value.slice(0, 10);
  }
}

function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
</script>

