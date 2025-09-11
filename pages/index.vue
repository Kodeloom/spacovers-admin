<template>
  <div class="p-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Warehouse Administrator Dashboard</h1>
      <p class="mt-2 text-lg text-gray-600">
        Welcome back, {{ session?.data?.user?.name }}! Here's your warehouse overview.
      </p>
      
      <!-- Loading indicator -->
      <div v-if="isLoading" class="mt-4 flex items-center text-blue-600">
        <Icon name="heroicons:arrow-path" class="h-5 w-5 animate-spin mr-2" />
        <span class="text-sm">Loading dashboard metrics...</span>
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-400 mr-2" />
          <div>
            <h3 class="text-sm font-medium text-red-800">Error Loading Metrics</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
            <button 
              @click="fetchDashboardMetrics"
              class="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Average Lead Time (Always Last 60 Days) -->
    <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 mb-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <Icon name="heroicons:clock" class="h-8 w-8 text-green-600" />
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-500">Avg Lead Time</p>
          <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.avgLeadTime || '0' }} days</p>
          <p class="text-xs text-gray-400">Last 60 days</p>
        </div>
      </div>
    </div>

    <!-- Dashboard Refresh Button -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-1">Real-time Dashboard Metrics</h3>
          <p class="text-xs text-gray-500">Dashboard shows current status and real-time calculations</p>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="fetchDashboardMetrics"
            :disabled="isLoading"
            class="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Icon 
              name="heroicons:arrow-path" 
              class="h-4 w-4 mr-1"
              :class="{ 'animate-spin': isLoading }"
            />
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Main KPI Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Orders -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:document-text" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Total Orders</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.totalOrders || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">All time</p>
          </div>
        </div>
      </div>

      <!-- Orders Pending -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock" class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders Pending</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.pendingOrders || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Current status</p>
          </div>
        </div>
      </div> 

      <!-- Orders Ready to Ship -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:truck" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Ready to Ship</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.readyToShip || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Current status</p>
          </div>
        </div>
      </div>

      <!-- Revenue This Month -->
      <!-- <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:currency-dollar" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Revenue This Month</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>${{ (dashboardMetrics.revenueThisMonth || 0).toLocaleString() }}</span>
            </p>
            <p class="text-xs text-gray-400">Current month</p>
          </div>
        </div>
      </div> -->
    </div>

    <!-- Secondary KPI Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
<!-- Orders This Week -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:calendar-days" class="h-8 w-8 text-indigo-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders This Week</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.ordersThisWeek || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Current week</p>
          </div>
        </div>
      </div> 

      <!-- Items at Cutting Station (Admin Only) -->
      <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:scissors" class="h-8 w-8 text-red-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Items at Cutting</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.cuttingItems || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently in production</p>
          </div>
        </div>
      </div>

      <!-- Items at Sewing Station (Admin Only) -->
      <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:swatch" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Items at Sewing</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.sewingItems || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently in production</p>
          </div>
        </div>
      </div>

      <!-- Items at Foam Cutting Station (Admin Only) -->
      <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cube" class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Items at Foam Cutting</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.foamCuttingItems || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently in production</p>
          </div>
        </div>
      </div>

      <!-- Items at Stuffing Station (Admin Only) -->
      <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:archive-box" class="h-8 w-8 text-orange-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Items at Stuffing</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.stuffingItems || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently in production</p>
          </div>
        </div>
      </div>

      <!-- Items at Packaging Station (Admin Only) -->
      <div v-if="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:gift" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Items at Packaging</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.packagingItems || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently in production</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Metrics Row (Admin Only) -->
    <div v-if="isAdmin" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Production Efficiency -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Production Efficiency</h3>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Items in Production:</span>
            <span class="text-sm font-medium text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-1">--</span>
              <span v-else>{{ dashboardMetrics.itemsInProduction || '0' }}</span>
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Items Completed Today:</span>
            <span class="text-sm font-medium text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-1">--</span>
              <span v-else>{{ dashboardMetrics.itemsCompletedToday || '0' }}</span>
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Avg Items/Day:</span>
            <span class="text-sm font-medium text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-1">--</span>
              <span v-else>{{ dashboardMetrics.avgItemsPerDay || '0' }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div class="space-y-3">
          <NuxtLink
            to="/admin/orders/add"
            class="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
          >
            Create New Order
          </NuxtLink>
          <NuxtLink
            to="/admin/customers/add"
            class="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Customer
          </NuxtLink>
          <NuxtLink
            to="/admin/items/add"
            class="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Add New Product
          </NuxtLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div class="space-y-2">
          <div v-if="dashboardMetrics.recentOrders && dashboardMetrics.recentOrders.length > 0" class="space-y-2">
            <div v-for="order in dashboardMetrics.recentOrders.slice(0, 3)" :key="order.id" class="text-sm">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Order #{{ order.salesOrderNumber }}</span>
                <span
class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-yellow-100 text-yellow-800': order.orderStatus === 'PENDING',
                        'bg-blue-100 text-blue-800': order.orderStatus === 'APPROVED',
                        'bg-indigo-100 text-indigo-800': order.orderStatus === 'ORDER_PROCESSING',
                        'bg-green-100 text-green-800': order.orderStatus === 'READY_TO_SHIP',
                        'bg-emerald-100 text-emerald-800': order.orderStatus === 'COMPLETED'
                      }">
                  {{ order.orderStatus }}
                </span>
              </div>
              <div class="text-xs text-gray-500">{{ order.customerName }}</div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">No recent orders</div>
        </div>
      </div>
    </div>

    <!-- User Information Card -->
    <div v-if="session?.data?.user" class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p class="text-sm text-gray-600"><strong>Name:</strong></p>
          <p class="text-sm font-medium text-gray-900">{{ session.data.user.name }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600"><strong>Email:</strong></p>
          <p class="text-sm font-medium text-gray-900">{{ session.data.user.email }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600"><strong>Roles:</strong></p>
          <p class="text-sm font-medium text-gray-900">{{ userRolesDisplay || 'No roles assigned' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { authClient } from '~/lib/auth-client';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';
import type { DashboardMetrics } from '~/utils/metricsService';

// Define a minimal type for what we expect in user.roles for display
interface UserRoleForDisplay {
  role: {
    name: string;
  };
}

const session = authClient.useSession();
const { isAdmin: isAdminRole, isWarehouseStaff, getDefaultRoute } = useRoleBasedRouting();

// Dashboard state
const isLoading = ref(false);
const error = ref<string | null>(null);
const dashboardMetrics = ref<DashboardMetrics & {
  avgLeadTime: number;
  ordersCompleted: number;
  cuttingItems: number;
  sewingItems: number;
  foamCuttingItems: number;
  stuffingItems: number;
  packagingItems: number;
  itemsInProduction: number;
  itemsCompletedToday: number;
  avgItemsPerDay: number;
  recentOrders: any[];
}>({
  totalOrders: 0,
  revenueThisMonth: 0,
  ordersThisWeek: 0,
  pendingOrders: 0,
  inProduction: 0,
  readyToShip: 0,
  avgLeadTime: 0,
  ordersCompleted: 0,
  cuttingItems: 0,
  sewingItems: 0,
  foamCuttingItems: 0,
  stuffingItems: 0,
  packagingItems: 0,
  itemsInProduction: 0,
  itemsCompletedToday: 0,
  avgItemsPerDay: 0,
  recentOrders: []
});



const userRolesDisplay = computed(() => {
  const user = session.value?.data?.user;
  if (user && user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    // Explicitly type userRole here
    return (user.roles as UserRoleForDisplay[])
      .map((userRole: UserRoleForDisplay) => userRole.role.name)
      .join(', ');
  }
  return '';
});

// Check if user is an admin
const isAdmin = computed(() => {
  const user = session.value?.data?.user;
  if (user && user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    const roles = user.roles as UserRoleForDisplay[];
    return roles.some(userRole => 
      userRole.role.name === 'Super Admin' || 
      userRole.role.name === 'Admin'
    );
  }
  return false;
});

// Fetch dashboard metrics function
async function fetchDashboardMetrics() {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Fetch core metrics from new metrics API
    const metricsResponse = await $fetch('/api/metrics/dashboard');
    
    if (!metricsResponse.success) {
      throw new Error('Failed to fetch dashboard metrics');
    }
    
    const coreMetrics = metricsResponse.data;
    
    // Fetch additional data that's not yet in the metrics service
    // Calculate date range for last 60 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    
    const [leadTimeResponse, stationItemsResponse, recentOrdersResponse] = await Promise.allSettled([
      $fetch('/api/reports/lead-time', { 
        query: { 
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        } 
      }),
      $fetch('/api/reports/station-items'),
      $fetch('/api/model/Order', {
        query: { 
          take: 5, 
          orderBy: { createdAt: 'desc' },
          include: { customer: true }
        }
      })
    ]);
    
    // Extract values with fallbacks
    const leadTime = leadTimeResponse.status === 'fulfilled' ? leadTimeResponse.value?.avgLeadTime || 0 : 0;
    const stationItems = stationItemsResponse.status === 'fulfilled' ? stationItemsResponse.value || [] : [];
    const recentOrders = recentOrdersResponse.status === 'fulfilled' ? recentOrdersResponse.value?.data || [] : [];
    
    // Process station items data
    const cuttingItems = stationItems.find((s: any) => s.stationName === 'Cutting')?.itemsCount || 0;
    const sewingItems = stationItems.find((s: any) => s.stationName === 'Sewing')?.itemsCount || 0;
    const foamCuttingItems = stationItems.find((s: any) => s.stationName === 'Foam Cutting')?.itemsCount || 0;
    const stuffingItems = stationItems.find((s: any) => s.stationName === 'Stuffing')?.itemsCount || 0;
    const packagingItems = stationItems.find((s: any) => s.stationName === 'Packaging')?.itemsCount || 0;
    
    // Update metrics with real data from metrics API
    dashboardMetrics.value = {
      // Core metrics from new API
      totalOrders: coreMetrics.totalOrders,
      revenueThisMonth: coreMetrics.revenueThisMonth,
      ordersThisWeek: coreMetrics.ordersThisWeek,
      pendingOrders: coreMetrics.pendingOrders,
      inProduction: coreMetrics.inProduction,
      readyToShip: coreMetrics.readyToShip,
      
      // Legacy metrics (to be migrated later)
      avgLeadTime: leadTime,
      ordersCompleted: 0, // Will be calculated from order status counts
      cuttingItems,
      sewingItems,
      foamCuttingItems,
      stuffingItems,
      packagingItems,
      itemsInProduction: cuttingItems + sewingItems + foamCuttingItems + stuffingItems + packagingItems,
      itemsCompletedToday: 0, // TODO: Implement when ItemProcessingLog is available
      avgItemsPerDay: 0, // TODO: Implement when ItemProcessingLog is available
      recentOrders
    };
    
  } catch (fetchError) {
    console.error('Failed to fetch dashboard metrics:', fetchError);
    error.value = 'Failed to load dashboard metrics. Please try refreshing the page.';
    
    // Use fallback values on error
    dashboardMetrics.value = {
      totalOrders: 0,
      revenueThisMonth: 0,
      ordersThisWeek: 0,
      pendingOrders: 0,
      inProduction: 0,
      readyToShip: 0,
      avgLeadTime: 0,
      ordersCompleted: 0,
      cuttingItems: 0,
      sewingItems: 0,
      foamCuttingItems: 0,
      stuffingItems: 0,
      packagingItems: 0,
      itemsInProduction: 0,
      itemsCompletedToday: 0,
      avgItemsPerDay: 0,
      recentOrders: []
    };
  } finally {
    isLoading.value = false;
  }
}



// Role-based routing
watch(session, (newSession) => {
  if (newSession?.data?.user) {
    // If user is warehouse staff, redirect to kiosk
    if (isWarehouseStaff.value) {
      navigateTo('/warehouse/kiosk');
    }
    // If user is admin, they can stay on dashboard
    // If user has no valid roles, redirect to login
    else if (!isAdminRole.value) {
      navigateTo('/login');
    }
  }
}, { immediate: true });

// Auto-refresh interval
const refreshInterval = ref<NodeJS.Timeout | null>(null);

// Start auto-refresh when component mounts
onMounted(() => {
  fetchDashboardMetrics();
  
  // Set up auto-refresh every 30 seconds
  refreshInterval.value = setInterval(() => {
    if (!isLoading.value) {
      fetchDashboardMetrics();
    }
  }, 30000);
});

// Clean up interval when component unmounts
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

definePageMeta({
  layout: 'default', // Will use layouts/default.vue
  middleware: ['auth-required'] // Changed from auth-admin-only to auth-required
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 