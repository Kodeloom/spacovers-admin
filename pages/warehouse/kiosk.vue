<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center">
            <Icon name="heroicons:building-office-2" class="h-8 w-8 text-indigo-600 mr-3" />
            <h1 class="text-2xl font-bold text-gray-900">Warehouse Kiosk</h1>
          </div>
          <div class="flex items-center space-x-4">
            <div v-if="currentUser" class="text-sm text-gray-600">
              <span class="font-medium">{{ currentUser.name }}</span>
              <span class="mx-2">•</span>
              <span>{{ currentStation?.name || 'No Station' }}</span>
            </div>
            <!-- Debug info (remove this later) -->
            <div v-if="currentUser" class="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              <div>Debug: {{ JSON.stringify(stationDebugInfo) }}</div>
            </div>
            <button
              v-if="currentUser"
              class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              @click="logout"
            >
              <Icon name="heroicons:arrow-right-on-rectangle" class="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Login Section (if not logged in) -->
      <div v-if="!currentUser" class="max-w-md mx-auto">
        <div class="bg-white p-8 rounded-lg shadow">
          <h2 class="text-xl font-semibold text-gray-900 mb-6 text-center">Employee Login</h2>
          
          <form class="space-y-4" @submit.prevent="login">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                v-model="loginForm.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your email"
              >
            </div>
            
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                v-model="loginForm.password"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your password"
              >
            </div>
            
            <button
              type="submit"
              :disabled="isLoggingIn"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Icon v-if="isLoggingIn" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
              {{ isLoggingIn ? 'Logging in...' : 'Login' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Work Interface (if logged in) -->
      <div v-else class="space-y-6">
        <!-- Current Work Status -->
        <div v-if="currentWorkItem" class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Currently Working On</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p class="text-sm text-gray-600">Order</p>
              <p class="text-lg font-medium text-gray-900">#{{ currentWorkItem.order.salesOrderNumber }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Item</p>
              <p class="text-lg font-medium text-gray-900">{{ currentWorkItem.item.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Time Started</p>
              <p class="text-lg font-medium text-gray-900">{{ formatTime(currentWorkItem.startTime) }}</p>
            </div>
          </div>
          <div class="mt-4 flex space-x-3">
            <button
              :disabled="isCompletingWork"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              @click="completeCurrentWork"
            >
              <Icon v-if="isCompletingWork" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
              {{ isCompletingWork ? 'Completing...' : 'Mark Complete' }}
            </button>
            <button
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              @click="cancelCurrentWork"
            >
              Cancel Work
            </button>
          </div>
        </div>

        <!-- Scan New Item Section -->
        <div v-if="!currentWorkItem" class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Start New Work</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Scan Packing Slip Barcode</label>
              <div class="flex space-x-3">
                <input
                  v-model="scanForm.barcode"
                  type="text"
                  placeholder="Scan or enter barcode"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  @keyup.enter="scanBarcode"
                >
                <button
                  :disabled="!scanForm.barcode || isScanning"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  @click="scanBarcode"
                >
                  <Icon v-if="isScanning" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
                  {{ isScanning ? 'Scanning...' : 'Scan' }}
                </button>
              </div>
            </div>

            <!-- Scanned Item Details -->
            <div v-if="scannedItem" class="bg-gray-50 p-4 rounded-md">
              <h4 class="font-medium text-gray-900 mb-3">Item Details</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-600">Order:</p>
                  <p class="font-medium">#{{ scannedItem.order.salesOrderNumber }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Customer:</p>
                  <p class="font-medium">{{ scannedItem.order.customer.name }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Item:</p>
                  <p class="font-medium">{{ scannedItem.item.name }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Quantity:</p>
                  <p class="font-medium">{{ scannedItem.quantity }}</p>
                </div>
              </div>
              
              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Scan Station QR Code</label>
                <div class="flex space-x-3">
                  <input
                    v-model="scanForm.stationCode"
                    type="text"
                    placeholder="Scan station QR code"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    @keyup.enter="startWork"
                  >
                  <button
                    :disabled="!scanForm.stationCode || isStartingWork"
                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    @click="startWork"
                  >
                    <Icon v-if="isStartingWork" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
                    {{ isStartingWork ? 'Starting...' : 'Start Work' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Work Queue -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Work Queue - {{ currentStation?.name || 'All Stations' }}</h3>
          
          <div v-if="workQueue.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="heroicons:check-circle" class="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p class="text-lg">No pending work items</p>
            <p class="text-sm">All items are either completed or being worked on</p>
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="item in workQueue"
              :key="item.id"
              class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center space-x-3 mb-2">
                    <span class="text-sm font-medium text-gray-900">Order #{{ item.order.salesOrderNumber }}</span>
                    <span class="text-sm text-gray-500">•</span>
                    <span class="text-sm text-gray-600">{{ item.order.customer.name }}</span>
                  </div>
                  <p class="text-sm text-gray-700">{{ item.item.name }}</p>
                  <p class="text-xs text-gray-500">Quantity: {{ item.quantity }}</p>
                </div>
                <div class="text-right">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authClient } from '~/lib/auth-client';
import { useFindManyOrderItem, useFindManyStation, useFindManyItemProcessingLog } from '~/lib/hooks';

definePageMeta({
  layout: 'empty',
  middleware: 'auth-warehouse-only',
});

const router = useRouter();
const toast = useToast();

// Auth state
const session = authClient.useSession();
const currentUser = computed(() => session.value?.data?.user);

// Login form
const loginForm = ref({
  email: '',
  password: ''
});
const isLoggingIn = ref(false);

// Station and work state
const currentStation = ref(null);
const currentWorkItem = ref(null);
const scannedItem = ref(null);

// Scan form
const scanForm = ref({
  barcode: '',
  stationCode: ''
});

// Loading states
const isScanning = ref(false);
const isStartingWork = ref(false);
const isCompletingWork = ref(false);

// Fetch stations
const { data: stations } = useFindManyStation({
  orderBy: { name: 'asc' }
});

// Fetch work queue
const { data: orderItems, refetch: refetchWorkQueue } = useFindManyOrderItem({
  where: {
    order: {
      orderStatus: 'APPROVED'
    },
    itemStatus: {
      in: ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING']
    }
  },
  include: {
    order: {
      include: {
        customer: true
      }
    },
    item: true
  },
  orderBy: {
    order: {
      createdAt: 'asc'
    }
  }
});

// Fetch current work item
const { data: processingLogs, refetch: refetchProcessingLogs } = useFindManyItemProcessingLog({
  where: {
    userId: currentUser.value?.id,
    endTime: null
  },
  include: {
    orderItem: {
      include: {
        order: {
          include: {
            customer: true
          }
        },
        item: true
      }
    },
    station: true
  }
});

// Set current work item when processing logs change
watch(processingLogs, (logs) => {
  if (logs && logs.length > 0) {
    const activeLog = logs[0]; // Should only be one active log per user
    currentWorkItem.value = {
      ...activeLog,
      order: activeLog.orderItem.order,
      item: activeLog.orderItem.item,
      startTime: activeLog.startTime
    };
  } else {
    currentWorkItem.value = null;
  }
}, { immediate: true });

// Computed properties
const filteredWorkQueue = computed(() => {
  if (!orderItems.value || !currentStation.value) return [];
  
  // Filter items based on current station and production flow
  return orderItems.value.filter(item => {
    // Station 1 (Cutting): Show items that haven't started production
    if (currentStation.value.name === 'Cutting') {
      return item.itemStatus === 'NOT_STARTED_PRODUCTION';
    }
    
    // Station 2 (Sewing): Show items completed at Cutting
    if (currentStation.value.name === 'Sewing') {
      return item.itemStatus === 'CUTTING';
    }
    
    // Station 3 (Foam Cutting): Show items completed at Sewing
    if (currentStation.value.name === 'Foam Cutting') {
      return item.itemStatus === 'SEWING';
    }
    
    return false;
  });
});

// Use filtered work queue
const workQueue = computed(() => filteredWorkQueue.value);

// Debug: Show station info
const stationDebugInfo = computed(() => {
  if (!currentUser.value) return 'No user';
  
  const userRoles = currentUser.value.roles;
  if (!userRoles || !Array.isArray(userRoles)) return 'No roles';
  
  return userRoles.map(userRole => ({
    roleName: userRole.role?.name,
    roleType: userRole.role?.roleType?.name,
    stations: userRole.role?.stations,
    hasStations: userRole.role?.stations && userRole.role.stations.length > 0
  }));
});

// Methods
async function login() {
  try {
    isLoggingIn.value = true;
    
    // For now, we'll use the existing session
    // In a real implementation, you might want to implement a separate kiosk login
    if (session.value?.data?.user) {
      // Set the current station based on user's roles
      const userRoles = session.value.data.user.roles;
      console.log('Kiosk Login - User roles:', userRoles);
      
      if (userRoles && Array.isArray(userRoles)) {
        for (const userRole of userRoles) {
          console.log('Kiosk Login - Checking role:', userRole.role);
          console.log('Kiosk Login - Role stations:', userRole.role.stations);
          
          // Check if this role has stations assigned
          if (userRole.role.stations && userRole.role.stations.length > 0) {
            currentStation.value = userRole.role.stations[0].station;
            console.log('Kiosk Login - Set current station:', currentStation.value);
            break;
          }
          
          // Fallback: Check if role name matches a station name
          if (userRole.role.name && ['Cutting', 'Sewing', 'Foam Cutting (Shop)', 'Foam Cutting', 'Stuffing', 'Packaging'].includes(userRole.role.name)) {
            // Find the station by name
            const station = stations.value?.find(s => s.name === userRole.role.name);
            if (station) {
              currentStation.value = station;
              console.log('Kiosk Login - Set current station by name:', currentStation.value);
              break;
            }
          }
        }
      }
      
      if (!currentStation.value) {
        console.warn('Kiosk Login - No station found for user');
      }
      
      toast.add({
        title: 'Login successful',
        description: `Welcome to the ${currentStation.value?.name || 'warehouse'} kiosk`,
        color: 'green'
      });
    } else {
      throw new Error('No active session found');
    }
  } catch (error) {
    toast.add({
      title: 'Login failed',
      description: error.message,
      color: 'red'
    });
  } finally {
    isLoggingIn.value = false;
  }
}

async function logout() {
  try {
    // Actually sign out the user
    await authClient.signOut();
    
    // Clear local state
    currentStation.value = null;
    currentWorkItem.value = null;
    scannedItem.value = null;
    
    // Redirect to login
    router.push('/login');
  } catch (error) {
    console.error('Logout failed:', error);
    // Even if logout fails, redirect to login
    router.push('/login');
  }
}

async function scanBarcode() {
  try {
    isScanning.value = true;
    
    const response = await $fetch('/api/warehouse/scan-barcode', {
      method: 'POST',
      body: { barcode: scanForm.value.barcode }
    });
    
    if (response.success) {
      scannedItem.value = response.data;
      toast.add({
        title: 'Barcode scanned successfully',
        description: `Order #${response.data.order.salesOrderNumber} - ${response.data.item.name}`,
        color: 'green'
      });
    }
  } catch (error) {
    toast.add({
      title: 'Scan failed',
      description: error.data?.statusMessage || error.message || 'Failed to scan barcode',
      color: 'red'
    });
    scannedItem.value = null;
  } finally {
    isScanning.value = false;
  }
}

async function startWork() {
  try {
    isStartingWork.value = true;
    
    const response = await $fetch('/api/warehouse/start-work', {
      method: 'POST',
      body: { 
        orderItemId: scannedItem.value.id,
        stationCode: scanForm.value.stationCode
      }
    });
    
    if (response.success) {
      // Set the current work item
      currentWorkItem.value = {
        ...response.data.processingLog,
        order: scannedItem.value.order,
        item: scannedItem.value.item,
        startTime: response.data.processingLog.startTime
      };
      
      // Clear the scan form
      scanForm.value = { barcode: '', stationCode: '' };
      scannedItem.value = null;
      
      // Refresh the work queue
      await refetchWorkQueue();
      
      toast.add({
        title: 'Work started successfully',
        description: `Started working on ${response.data.orderItem.item.name}`,
        color: 'green'
      });
    }
  } catch (error) {
    toast.add({
      title: 'Failed to start work',
      description: error.data?.statusMessage || error.message || 'Failed to start work',
      color: 'red'
    });
  } finally {
    isStartingWork.value = false;
  }
}

async function completeCurrentWork() {
  try {
    isCompletingWork.value = true;
    
    const response = await $fetch('/api/warehouse/complete-work', {
      method: 'POST',
      body: { 
        processingLogId: currentWorkItem.value.id
      }
    });
    
    if (response.success) {
      const duration = Math.floor(response.data.duration / 60); // Convert to minutes
      
      toast.add({
        title: 'Work completed successfully',
        description: `Completed in ${duration} minutes. ${response.data.isFinalStep ? 'Item is ready!' : 'Moving to next station.'}`,
        color: 'green'
      });
      
      // Clear current work item
      currentWorkItem.value = null;
      
      // Refresh data
      await refetchWorkQueue();
      await refetchProcessingLogs();
    }
  } catch (error) {
    toast.add({
      title: 'Failed to complete work',
      description: error.data?.statusMessage || error.message || 'Failed to complete work',
      color: 'red'
    });
  } finally {
    isCompletingWork.value = false;
  }
}

function cancelCurrentWork() {
  // Cancel work logic
  currentWorkItem.value = null;
}

function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString();
}

// Lifecycle
onMounted(async () => {
  // Initialize kiosk state
  await refetchWorkQueue();
  await refetchProcessingLogs();
});
</script>
