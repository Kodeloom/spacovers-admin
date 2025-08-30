<template>
  <div class="p-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Warehouse Administrator Dashboard</h1>
      <p class="mt-2 text-lg text-gray-600">
        Welcome back, {{ session?.data?.user?.name }}! Here's your warehouse overview.
      </p>
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

    <!-- Time Filter for Dashboard Metrics -->
    <div class="mb-6 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Dashboard Time Period</label>
          <p class="text-xs text-gray-500">Select the time period for dashboard metrics</p>
        </div>
        <div class="flex items-center space-x-2">
          <select
            v-model="timeFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            @change="updateDashboardMetrics"
          >
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="ytd">Year To Date</option>
            <option value="365">Last 365 Days</option>
            <option value="lifetime">Lifetime</option>
          </select>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.totalOrders || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.ordersPending || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.ordersReadyToShip || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Orders Completed -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:check-circle" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders Completed</p>
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.ordersCompleted || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary KPI Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
<!-- Orders In Progress -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cog" class="h-8 w-8 text-indigo-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders In Progress</p>
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.ordersInProgress || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.cuttingItems || '0' }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.sewingItems || '0' }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.foamCuttingItems || '0' }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.stuffingItems || '0' }}</p>
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
            <p class="text-3xl font-bold text-gray-900">{{ dashboardMetrics.packagingItems || '0' }}</p>
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
            <span class="text-sm font-medium text-gray-900">{{ dashboardMetrics.itemsInProduction || '0' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Items Completed Today:</span>
            <span class="text-sm font-medium text-gray-900">{{ dashboardMetrics.itemsCompletedToday || '0' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Avg Items/Day:</span>
            <span class="text-sm font-medium text-gray-900">{{ dashboardMetrics.avgItemsPerDay || '0' }}</span>
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
import { computed, ref, onMounted, watch } from 'vue';
import { authClient } from '~/lib/auth-client';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';

// Define a minimal type for what we expect in user.roles for display
interface UserRoleForDisplay {
  role: {
    name: string;
  };
}

const session = authClient.useSession();
const { isAdmin: isAdminRole, isWarehouseStaff, getDefaultRoute } = useRoleBasedRouting();

// Dashboard state
const timeFilter = ref('30'); // Default to last 30 days
const dashboardMetrics = ref({
  totalOrders: 0,
  avgLeadTime: 0,
  ordersPending: 0,
  ordersInProgress: 0,
  ordersReadyToShip: 0,
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

// Computed property for time filter label
const timeFilterLabel = computed(() => {
  switch (timeFilter.value) {
    case '30': return 'Last 30 days';
    case '60': return 'Last 60 days';
    case '90': return 'Last 90 days';
    case 'ytd': return 'Year to date';
    case '365': return 'Last 365 days';
    case 'lifetime': return 'Lifetime';
    default: return 'Last 30 days';
  }
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
  try {
    // Fetch order counts
    const orderCountsResponse = await $fetch('/api/reports/order-counts', {
      query: { timeFilter: timeFilter.value }
    });
    
    // Fetch average lead time (always last 60 days)
    const leadTimeResponse = await $fetch('/api/reports/lead-time', {
      query: { days: 60 }
    });
    
    // Fetch station items data
    const stationItemsResponse = await $fetch('/api/reports/station-items');
    
    // Fetch recent orders
    const recentOrdersResponse = await $fetch('/api/model/Order', {
      query: { 
        take: 5, 
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }
    });
    
    // Process station items data
    const cuttingItems = stationItemsResponse.find((s: any) => s.stationName === 'Cutting')?.itemsCount || 0;
    const sewingItems = stationItemsResponse.find((s: any) => s.stationName === 'Sewing')?.itemsCount || 0;
    const foamCuttingItems = stationItemsResponse.find((s: any) => s.stationName === 'Foam Cutting')?.itemsCount || 0;
    const stuffingItems = stationItemsResponse.find((s: any) => s.stationName === 'Stuffing')?.itemsCount || 0;
    const packagingItems = stationItemsResponse.find((s: any) => s.stationName === 'Packaging')?.itemsCount || 0;
    
    // Update metrics
    dashboardMetrics.value = {
      totalOrders: orderCountsResponse.pending + orderCountsResponse.inProgress + 
                   orderCountsResponse.readyToShip + orderCountsResponse.completed,
      avgLeadTime: leadTimeResponse.avgLeadTime || 0,
      ordersPending: orderCountsResponse.pending || 0,
      ordersInProgress: orderCountsResponse.inProgress || 0,
      ordersReadyToShip: orderCountsResponse.readyToShip || 0,
      ordersCompleted: orderCountsResponse.completed || 0,
      cuttingItems,
      sewingItems,
      foamCuttingItems,
      stuffingItems,
      packagingItems,
      itemsInProduction: cuttingItems + sewingItems + foamCuttingItems + stuffingItems + packagingItems,
      itemsCompletedToday: 0, // TODO: Implement when ItemProcessingLog is available
      avgItemsPerDay: 0, // TODO: Implement when ItemProcessingLog is available
      recentOrders: recentOrdersResponse?.data || []
    };
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
    // Keep existing metrics on error
  }
}

// Update metrics when time filter changes
async function updateDashboardMetrics() {
  await fetchDashboardMetrics();
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

// Initial metrics fetch
onMounted(() => {
  fetchDashboardMetrics();
});

definePageMeta({
  layout: 'default', // Will use layouts/default.vue
  middleware: ['auth-required'] // Changed from auth-admin-only to auth-required
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 