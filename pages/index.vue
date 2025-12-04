<template>
  <div class="p-4">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Warehouse Administrator Dashboard</h1>
      <ClientOnly>
        <p class="mt-2 text-lg text-gray-600">
          Welcome back, {{ session?.data?.user?.name }}! Here's your warehouse overview.
        </p>
        <template #fallback>
          <p class="mt-2 text-lg text-gray-600">
            Welcome back! Here's your warehouse overview.
          </p>
        </template>
      </ClientOnly>
      
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
    <ClientOnly>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Orders in Progress -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="navigateToOrdersWithStatus('ORDER_PROCESSING')">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:document-text" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders in Progress</p>
            <p class="text-3xl font-bold text-gray-900">
              <span v-if="isLoading" class="animate-pulse bg-gray-200 rounded px-2 py-1">--</span>
              <span v-else>{{ dashboardMetrics.inProduction || '0' }}</span>
            </p>
            <p class="text-xs text-gray-400">Currently processing</p>
          </div>
        </div>
      </div>

      <!-- Orders Pending -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="navigateToOrdersWithStatus('PENDING')">
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
            <p class="text-xs text-gray-400">Awaiting approval</p>
          </div>
        </div>
      </div> 

      <!-- Orders Ready to Ship -->
      <div class="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="navigateToOrdersWithStatus('READY_TO_SHIP')">
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
            <p class="text-xs text-gray-400">Ready for shipment</p>
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
    </ClientOnly>

    <!-- Secondary KPI Cards Grid -->
    <ClientOnly>
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

      <!-- Items at Cutting Station -->
      <div v-show="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-red-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="openStationItemsModal('CUTTING', 'Items at Cutting')">
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

      <!-- Items at Sewing Station -->
      <div v-show="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="openStationItemsModal('SEWING', 'Items at Sewing')">
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

      <!-- Items at Foam Cutting Station -->
      <div v-show="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="openStationItemsModal('FOAM_CUTTING', 'Items at Foam Cutting')">
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

      <!-- Items at Stuffing Station -->
      <div v-show="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="openStationItemsModal('STUFFING', 'Items at Stuffing')">
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

      <!-- Items at Packaging Station -->
      <div v-show="isAdmin" class="bg-white p-6 rounded-lg shadow border-l-4 border-emerald-500 cursor-pointer hover:bg-gray-50 transition-colors" @click="openStationItemsModal('PACKAGING', 'Items at Packaging')">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:gift" class="h-8 w-8 text-emerald-600" />
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
    </ClientOnly>

    <!-- Performance Metrics Row -->
    <div v-show="isAdmin" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
    <ClientOnly>
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
    </ClientOnly>

    <!-- Station Items Modal -->
    <AppModal :is-open="showStationItemsModal" :title="stationItemsModalTitle" @close="closeStationItemsModal" size="full">
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isStationItemsLoading" class="space-y-4">
          <div class="animate-pulse">
            <div class="h-4 bg-gray-300 rounded mb-4"></div>
            <div class="space-y-3">
              <div v-for="i in 5" :key="i" class="h-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="stationItemsError" class="text-center py-8">
          <Icon name="heroicons:exclamation-triangle" class="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p class="text-red-600 mb-4">{{ stationItemsError }}</p>
          <button
            @click="fetchStationItemsModalData(stationItemsModalStatus)"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="stationItemsModalData.length === 0" class="text-center py-8">
          <Icon name="heroicons:cube" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500">No items found at this station.</p>
        </div>

        <!-- Data Table -->
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in stationItemsModalData" :key="item.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ item.item?.name || 'Unknown Item' }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button class="text-indigo-600 hover:text-indigo-900 font-medium" 
                          @click="navigateToOrder(item.orderId)">
                    {{ item.order?.salesOrderNumber || item.order?.purchaseOrderNumber || `Order-${item.orderId?.slice(-8)}` }}
                  </button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ item.order?.customer?.name || 'Unknown Customer' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusBadgeClass(item.itemStatus)" 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ formatItemStatus(item.itemStatus) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getPriorityBadgeClass(item.order?.priority)" 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ item.order?.priority || 'Normal' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-indigo-600 hover:text-indigo-900" 
                          @click="navigateToOrder(item.orderId)">
                    View Order
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="px-6 py-4 bg-gray-50 flex justify-end">
        <button
          @click="closeStationItemsModal"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </AppModal>
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

// Station Items Modal state
const showStationItemsModal = ref(false);
const stationItemsModalTitle = ref('');
const stationItemsModalData = ref<any[]>([]);
const stationItemsModalStatus = ref<string>('');
const isStationItemsLoading = ref(false);
const stationItemsError = ref<string | null>(null);
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
    return roles.some(userRole => {
      const roleName = userRole.role.name;
      const roleTypeName = userRole.role.roleType?.name;
      
      // Check by role name (fallback)
      const allowedRoleNames = ['Super Admin', 'Admin', 'Manager'];
      // Check by role type (preferred)
      const allowedRoleTypes = ['Administrator', 'Manager', 'Super Administrator', 'Office Employee'];
      
      return (roleName && allowedRoleNames.includes(roleName)) || 
             (roleTypeName && allowedRoleTypes.includes(roleTypeName));
    });
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
      // Fetch recent orders using our new API
      $fetch('/api/reports/recent-orders', { query: { limit: 5 } })
    ]);
    
    // Extract values with fallbacks
    const leadTime = leadTimeResponse.status === 'fulfilled' ? leadTimeResponse.value?.summary?.avgLeadTimeDays || 0 : 0;
    const stationItems = stationItemsResponse.status === 'fulfilled' ? stationItemsResponse.value || [] : [];
    const recentOrders = recentOrdersResponse.status === 'fulfilled' ? recentOrdersResponse.value || [] : [];
    
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
    // All other authenticated users can access the dashboard
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

// Navigation functions
function navigateToOrdersWithStatus(status: string) {
  navigateTo(`/admin/orders?status=${status}`);
}

function navigateToOrder(orderId: string) {
  navigateTo(`/admin/orders/edit/${orderId}`);
}

// Station Items Modal functions
async function openStationItemsModal(status: string, title: string) {
  stationItemsModalStatus.value = status;
  stationItemsModalTitle.value = title;
  showStationItemsModal.value = true;
  await fetchStationItemsModalData(status);
}

async function fetchStationItemsModalData(status: string) {
  isStationItemsLoading.value = true;
  stationItemsError.value = null;
  stationItemsModalData.value = [];

  try {
    const response = await $fetch('/api/reports/items-by-status', {
      query: { status }
    });

    if (response && typeof response === 'object' && 'success' in response && response.success) {
      stationItemsModalData.value = (response as any).data || [];
    } else {
      throw new Error('Failed to fetch station items');
    }
  } catch (err) {
    console.error('Error loading station items:', err);
    stationItemsError.value = 'Failed to load station items. Please try again.';
    stationItemsModalData.value = [];
  } finally {
    isStationItemsLoading.value = false;
  }
}

function closeStationItemsModal() {
  showStationItemsModal.value = false;
  stationItemsModalData.value = [];
  stationItemsError.value = null;
  stationItemsModalStatus.value = '';
  stationItemsModalTitle.value = '';
}

// Status formatting functions
function formatItemStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'Not Started',
    'CUTTING': 'Cutting',
    'SEWING': 'Sewing',
    'FOAM_CUTTING': 'Foam Cutting',
    'STUFFING': 'Stuffing',
    'PACKAGING': 'Packaging',
    'PRODUCT_FINISHED': 'Finished',
    'READY': 'Ready'
  };
  return statusMap[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'bg-gray-100 text-gray-800',
    'CUTTING': 'bg-red-100 text-red-800',
    'SEWING': 'bg-blue-100 text-blue-800',
    'FOAM_CUTTING': 'bg-purple-100 text-purple-800',
    'STUFFING': 'bg-orange-100 text-orange-800',
    'PACKAGING': 'bg-emerald-100 text-emerald-800',
    'PRODUCT_FINISHED': 'bg-green-100 text-green-800',
    'READY': 'bg-green-100 text-green-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityBadgeClass(priority: string): string {
  const classMap: Record<string, string> = {
    'HIGH': 'bg-red-100 text-red-800',
    'MEDIUM': 'bg-yellow-100 text-yellow-800',
    'LOW': 'bg-green-100 text-green-800',
    'NORMAL': 'bg-gray-100 text-gray-800'
  };
  return classMap[priority] || 'bg-gray-100 text-gray-800';
}

definePageMeta({
  layout: 'default', // Will use layouts/default.vue
  middleware: ['auth-required'] // Changed from auth-admin-only to auth-required
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 