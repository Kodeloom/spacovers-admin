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
    <div v-else class="w-full h-screen flex flex-col p-4 lg:p-8">
      <!-- Header -->
      <div class="text-center mb-6 lg:mb-8">
        <Icon name="heroicons:building-office-2" class="h-12 w-12 lg:h-16 lg:w-16 text-blue-400 mx-auto mb-4" />
        <h1 class="text-2xl lg:text-4xl font-bold text-white mb-2">Warehouse Kiosk</h1>
        <p class="text-lg lg:text-xl text-gray-300">Scan barcodes to process items</p>
        <button
          @click="logout"
          data-logout
          class="mt-4 px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-400"
        >
          Logout
        </button>
      </div>

      <!-- Split Layout Container -->
      <div class="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0">
        <!-- Left Panel - Scan Interface (60% on large screens, full width on mobile) -->
        <div class="flex-1 lg:w-3/5 flex flex-col">
          <!-- Scan Interface -->
          <div class="bg-white rounded-2xl shadow-2xl p-6 lg:p-12 flex-1">
            <!-- Current Scanner Info -->
            <div v-if="currentScannerInfo" class="mb-6 lg:mb-8 p-3 lg:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base lg:text-lg font-semibold text-blue-900">Current Scanner</h3>
                  <p class="text-sm lg:text-base text-blue-700">{{ currentScannerInfo.user }} at {{ currentScannerInfo.station }}</p>
                  <p class="text-xs lg:text-sm text-blue-600">Scanner: {{ currentScannerInfo.prefix }}</p>
                </div>
                <Icon name="heroicons:identification" class="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0" />
              </div>
            </div>

            <!-- Status Display -->
            <div v-if="lastScanResult" class="mb-6 lg:mb-8 p-4 lg:p-6 rounded-xl" :class="lastScanResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'">
              <div class="flex items-start">
                <Icon 
                  :name="lastScanResult.success ? 'heroicons:check-circle' : 'heroicons:x-circle'" 
                  :class="lastScanResult.success ? 'text-green-600' : 'text-red-600'"
                  class="h-6 w-6 lg:h-8 lg:w-8 mr-3 lg:mr-4 flex-shrink-0 mt-1" 
                />
                <div class="min-w-0 flex-1">
                  <h3 :class="lastScanResult.success ? 'text-green-800' : 'text-red-800'" class="text-base lg:text-lg font-semibold">
                    {{ lastScanResult.title }}
                  </h3>
                  <p :class="lastScanResult.success ? 'text-green-700' : 'text-red-700'" class="text-sm lg:text-base break-words">
                    {{ lastScanResult.message }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Barcode Input -->
            <div class="text-center">
              <label class="block text-xl lg:text-2xl font-semibold text-gray-900 mb-4 lg:mb-6">
                <Icon name="heroicons:qr-code" class="h-6 w-6 lg:h-8 lg:w-8 inline mr-2 lg:mr-3" />
                Scan Barcode
              </label>
              
              <input
                ref="barcodeInput"
                v-model="scanForm.barcode"
                type="text"
                placeholder="Ready to scan..."
                class="w-full text-center text-2xl lg:text-3xl py-4 lg:py-6 px-4 lg:px-8 border-4 border-gray-300 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500 focus:border-blue-500 font-mono"
                @keyup.enter="processItem"
                @input="onBarcodeInput"
                @blur="focusInput"
              >
              
              <!-- Processing Indicator -->
              <div v-if="isProcessing" class="mt-4 lg:mt-6 flex items-center justify-center">
                <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mr-2 lg:mr-3" />
                <span class="text-lg lg:text-xl text-gray-700">Processing scan...</span>
              </div>
            </div>

            <!-- Instructions -->
            <div class="mt-8 lg:mt-12 text-center text-gray-600">
              <p class="text-base lg:text-lg">Point the scanner at the barcode and scan</p>
              <p class="text-sm mt-2">The scanner ID will identify the user and station automatically</p>
            </div>
          </div>

          <!-- Recent Activity (moved to bottom of left panel) -->
          <div v-if="recentActivity.length > 0" class="mt-4 lg:mt-6 bg-gray-800 rounded-xl p-4 lg:p-6">
            <h3 class="text-white text-base lg:text-lg font-semibold mb-4">Recent Activity</h3>
            <div class="space-y-2">
              <div 
                v-for="activity in recentActivity.slice(0, 3)" 
                :key="activity.id"
                class="flex flex-col lg:flex-row lg:items-center lg:justify-between text-sm gap-1 lg:gap-0"
              >
                <span class="text-gray-300 truncate">
                  {{ activity.orderNumber }} - {{ activity.itemName }}
                </span>
                <div class="flex justify-between lg:gap-4">
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

        <!-- Right Panel - Priority Items (40% on large screens, hidden on mobile for now) -->
        <div class="hidden lg:block lg:w-2/5">
          <div class="bg-gray-800 rounded-2xl shadow-2xl h-full">
            <PriorityItemsPanel 
              :priority-items="priorityItems"
              :loading="priorityItemsLoading"
              :should-use-virtual-scrolling="shouldUseVirtualScrolling"
              @refocus="handleRefocus"
              @scroll-position-update="handleScrollPositionUpdate"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch, onUnmounted } from 'vue';
import { authClient } from '~/lib/auth-client';
import { decodeBarcode, isValidStatusTransition, getNextStatus, getStatusDisplayName } from '~/utils/barcodeUtils';
import { formatErrorForUI } from '~/utils/errorHandling';
import { FocusGuard } from '~/utils/focusGuard';
import PriorityItemsPanel from '~/components/warehouse/PriorityItemsPanel.vue';
import { usePriorityItems } from '~/composables/usePriorityItems';

definePageMeta({
  layout: 'empty',
});

// Type definitions
interface ScanResult {
  success: boolean;
  title: string;
  message: string;
}

interface ScannerInfo {
  prefix: string;
  user: string;
  station: string;
  userId: string;
  stationId: string | null;
}

interface RecentActivity {
  id: number;
  orderNumber: string;
  itemName: string;
  user: string;
  station: string;
  status: string;
  success: boolean;
  timestamp: Date;
}

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
const lastScanResult = ref<ScanResult | null>(null);
const recentActivity = ref<RecentActivity[]>([]);
const barcodeInput = ref<HTMLInputElement | null>(null);
const currentScannerInfo = ref<ScannerInfo | null>(null);

// Priority items integration with performance optimization
const { 
  priorityItems, 
  loading: priorityItemsLoading, 
  shouldUseVirtualScrolling,
  initialize: initializePriorityItems,
  refreshOnScanComplete,
  updateScrollPosition
} = usePriorityItems();

// Enhanced focus management using FocusGuard utility
// Requirements: 6.1, 6.2, 6.3, 6.5 - Comprehensive focus protection system
const focusGuard = new FocusGuard(300);

// Auto-focus the input and keep it focused when logged in
onMounted(async () => {
  if (isLoggedIn.value) {
    await nextTick();
    startFocusGuard();
    // Initialize priority items with lazy loading to not delay scan input
    // Requirements: 8.1 - Ensure priority panel doesn't delay scan input initialization
    initializePriorityItems(false); // Lazy initialization
  }
});

// Cleanup on unmount
onUnmounted(() => {
  focusGuard.stopGuarding();
});

// Watch for login state changes
watch(isLoggedIn, async (newValue) => {
  if (newValue) {
    await nextTick();
    startFocusGuard();
    // Initialize priority items when user logs in with lazy loading
    initializePriorityItems(false); // Lazy initialization
  } else {
    // Stop focus guard when user logs out
    focusGuard.stopGuarding();
    // Clear any existing state
    currentScannerInfo.value = null;
    lastScanResult.value = null;
    recentActivity.value = [];
  }
});

// Enhanced focus management functions
function startFocusGuard() {
  if (barcodeInput.value && isLoggedIn.value) {
    try {
      focusGuard.startGuarding(barcodeInput.value);
      console.log('FocusGuard started successfully');
    } catch (error) {
      console.error('Failed to start FocusGuard:', error);
      // Fallback to basic focus management
      nextTick(() => {
        if (barcodeInput.value) {
          barcodeInput.value.focus();
        }
      });
    }
  }
}

// Handle refocus events from priority panel
function handleRefocus() {
  // Only refocus if not currently processing to avoid interrupting scan workflow
  // Requirements: 5.4 - Ensure updates don't disrupt scan input focus
  if (!isProcessing.value && focusGuard.isGuarding()) {
    focusGuard.refocus();
  }
}

// Handle scroll position updates from priority panel
function handleScrollPositionUpdate(position: number) {
  // Requirements: 5.5 - Maintain scroll position during updates when possible
  updateScrollPosition(position);
}

// Legacy focus function - now delegates to FocusGuard
function focusInput() {
  // Delegate to FocusGuard for consistent behavior
  if (focusGuard.isGuarding()) {
    focusGuard.refocus();
  } else {
    // Fallback for cases where FocusGuard isn't active yet
    nextTick(() => {
      if (barcodeInput.value && isLoggedIn.value) {
        barcodeInput.value.focus();
      }
    });
  }
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
      
      // Start focus guard and initialize priority items after login
      await nextTick();
      startFocusGuard();
      initializePriorityItems(false); // Lazy initialization
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
    // Stop focus guard before logout
    focusGuard.stopGuarding();
    
    await authClient.signOut();
    currentScannerInfo.value = null;
    lastScanResult.value = null;
    recentActivity.value = [];
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Debounce variables
let processTimeout: NodeJS.Timeout | null = null;
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
        // FocusGuard will automatically maintain focus
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
  
  let barcodeData: any = null;
  let orderItem: any = null;
  
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
    
    // Office scanners handle specific critical transitions:
    // 1. NOT_STARTED_PRODUCTION → CUTTING (starting production)
    // 2. PRODUCT_FINISHED → READY (finalizing for delivery)
    if (currentScannerInfo.value.station === 'Office') {
      const currentStatusDisplay = getStatusDisplayName(orderItem.itemStatus);
      
      // Check if this is a valid office transition
      const canTransition = isValidStatusTransition(orderItem.itemStatus, 'Office');
      console.log('🔍 Office transition check:', {
        currentStatus: orderItem.itemStatus,
        station: 'Office',
        canTransition: canTransition
      });
      
      if (!canTransition) {
        // Office scanner viewing status of item they can't process
        lastScanResult.value = {
          success: false, // Changed to false to show as warning/info instead of success
          title: 'Status Check',
          message: `This item is currently "${currentStatusDisplay}". Office scanners can only start production (from "Not Started") or finalize items (from "Item Done").`
        };
        
        // Add to recent activity
        addToRecentActivity({
          orderNumber: (orderResponse.order as any).orderNumber || 'Unknown',
          itemName: (orderItem as any).itemName || orderItem.item?.name || 'Unknown Item',
          user: currentScannerInfo.value?.user || 'Unknown',
          station: currentScannerInfo.value?.station || 'Unknown',
          status: `Status Check: ${currentStatusDisplay}`,
          success: true,
          timestamp: new Date()
        });
        
        // Clear the barcode input
        scanForm.value.barcode = '';
        // FocusGuard will automatically maintain focus
        
        // Clear message after 8 seconds (longer for reading)
        setTimeout(() => {
          lastScanResult.value = null;
        }, 20000);
        
        return; // Exit early - office can't process this transition
      }
      
      // Office scanner can process this transition - continue with normal workflow
    }
    
    // Validate status transition using the scanner's station (for production stations)
    if (!isValidStatusTransition(orderItem.itemStatus, currentScannerInfo.value.station)) {
      const currentStatusDisplay = getStatusDisplayName(orderItem.itemStatus);
      const errorMessage = `This item is currently "${currentStatusDisplay}" and cannot be processed at the ${currentScannerInfo.value?.station} station. Please check the workflow order.`;
      console.log('Throwing workflow error:', errorMessage);
      const error = new Error(errorMessage) as any;
      error.code = 'INVALID_STATUS_TRANSITION';
      error.itemStatus = orderItem.itemStatus;
      error.station = currentScannerInfo.value?.station;
      throw error;
    }
    
    // Get next status
    const nextStatus = getNextStatus(orderItem.itemStatus, currentScannerInfo.value.station);
    
    // Process the item using the scanner's user and station
    console.log('🚀 Calling process-item API with:', {
      orderItemId: orderItem.id,
      stationId: currentScannerInfo.value.stationId,
      userId: currentScannerInfo.value.userId,
      scannerPrefix: barcodeData.prefix,
      currentStatus: orderItem.itemStatus,
      nextStatus: nextStatus
    });
    
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
    
    console.log('✅ Process-item API response:', response);
    
    if (response.success && response.newItemStatus) {
      console.log('🎉 API call successful - showing success message');
      // Show success result
      const stepInfo = response.workflowStep as any;
      lastScanResult.value = {
        success: true,
        title: `Step ${stepInfo?.step || ''} Complete`,
        message: `${currentScannerInfo.value?.user} completed: ${stepInfo?.description || (response.newItemStatus as string).replace(/_/g, ' ')}`
      };
      
      // Add to recent activity
      addToRecentActivity({
        orderNumber: (orderResponse.order as any).orderNumber || 'Unknown',
        itemName: (orderItem as any).itemName || orderItem.item?.name || 'Unknown Item',
        user: currentScannerInfo.value?.user || 'Unknown',
        station: currentScannerInfo.value?.station || 'Unknown',
        status: (response.newItemStatus as string).replace(/_/g, ' '),
        success: true,
        timestamp: new Date()
      });

      // Trigger priority items refresh for real-time updates
      // Requirements: 5.1, 5.2 - Connect priority items refresh to scan processing events
      const itemStatusChange = {
        orderItemId: orderItem.id,
        fromStatus: orderItem.itemStatus,
        toStatus: response.newItemStatus as string,
        orderNumber: (orderResponse.order as any).orderNumber || (orderResponse.order as any).salesOrderNumber,
        itemName: (orderItem as any).itemName || orderItem.item?.name
      };
      
      // Refresh priority items with status change context
      refreshOnScanComplete(itemStatusChange);
      
      // Emit custom event for other components that might be listening
      // Requirements: 5.4 - Ensure updates don't disrupt scan input focus
      const scanProcessedEvent = new CustomEvent('scanProcessed', {
        detail: {
          success: true,
          itemStatusChange,
          orderNumber: itemStatusChange.orderNumber,
          newStatus: response.newItemStatus
        }
      });
      document.dispatchEvent(scanProcessedEvent);
      
      // Clear the barcode input
      scanForm.value.barcode = '';
      
      // FocusGuard will automatically maintain focus for next scan
      
      // Clear success message after 8 seconds (longer for reading)
      setTimeout(() => {
        lastScanResult.value = null;
      }, 8000);
    }
  } catch (error) {
    console.error('❌ API call failed:', error);
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
      itemName: (orderItem as any)?.itemName || orderItem?.item?.name || 'Unknown Item',
      user: currentScannerInfo.value?.user || 'Unknown',
      station: currentScannerInfo.value?.station || 'Unknown',
      status: 'Error: ' + errorInfo.title,
      success: false,
      timestamp: new Date()
    });
    
    // Clear the barcode input
    scanForm.value.barcode = '';
    
    // FocusGuard will automatically maintain focus
    
    // Clear error message after 8 seconds
    setTimeout(() => {
      lastScanResult.value = null;
    }, 8000);
  } finally {
    isProcessing.value = false;
  }
}

function addToRecentActivity(activity: Omit<RecentActivity, 'id'>) {
  recentActivity.value.unshift({
    ...activity,
    id: Date.now()
  });
  
  // Keep only last 10 activities
  if (recentActivity.value.length > 10) {
    recentActivity.value = recentActivity.value.slice(0, 10);
  }
}

function formatTime(timestamp: Date | string | null) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
</script>

