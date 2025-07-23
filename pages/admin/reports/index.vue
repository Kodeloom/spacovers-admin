<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Reports & Analytics</h1>

    <!-- Filters -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            id="startDate"
            v-model="filters.startDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
        </div>
        <div>
          <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            id="endDate"
            v-model="filters.endDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
        </div>
        <div>
          <label for="stationFilter" class="block text-sm font-medium text-gray-700 mb-1">Station</label>
          <select
            id="stationFilter"
            v-model="filters.stationId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Stations</option>
            <option v-for="station in stations" :key="station.id" :value="station.id">
              {{ station.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="userFilter" class="block text-sm font-medium text-gray-700 mb-1">Employee</label>
          <select
            id="userFilter"
            v-model="filters.userId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Employees</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex space-x-4">
        <button
          :disabled="isLoading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          @click="loadReports"
        >
          <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
          {{ isLoading ? 'Loading...' : 'Generate Reports' }}
        </button>
        <button
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Employee Productivity Report -->
    <div v-if="productivityData" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Employee Productivity</h2>
      
      <div v-if="productivityData.length === 0" class="text-gray-500 text-center py-8">
        No productivity data found for the selected filters.
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Processed</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Time</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Time/Item</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="row in productivityData" :key="`${row.userId}-${row.stationId}`">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ row.userName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.stationName }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.itemsProcessed }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.totalDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.avgDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${{ row.totalCost.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Lead Time Report -->
    <div v-if="leadTimeData" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Order Lead Time Analysis</h2>
      
      <div v-if="leadTimeData.length === 0" class="text-gray-500 text-center py-8">
        No lead time data found for the selected filters.
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days in Production</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Items</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="order in leadTimeData" :key="order.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ order.salesOrderNumber || order.id.slice(-8) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.customerName }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': order.orderStatus === 'PENDING',
                    'bg-green-100 text-green-800': order.orderStatus === 'APPROVED',
                    'bg-blue-100 text-blue-800': order.orderStatus === 'ORDER_PROCESSING',
                    'bg-purple-100 text-purple-800': order.orderStatus === 'READY_TO_SHIP'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ order.orderStatus.replace(/_/g, ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ order.approvedAt ? new Date(order.approvedAt).toLocaleDateString() : '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.daysInProduction }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.totalItems }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div v-if="summaryStats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock-20-solid" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Avg Lead Time</p>
            <p class="text-2xl font-semibold text-gray-900">{{ summaryStats.avgLeadTime }} days</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:shopping-cart-20-solid" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Orders Processed</p>
            <p class="text-2xl font-semibold text-gray-900">{{ summaryStats.ordersProcessed }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cube-20-solid" class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Items Produced</p>
            <p class="text-2xl font-semibold text-gray-900">{{ summaryStats.itemsProduced }}</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:currency-dollar-20-solid" class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Total Labor Cost</p>
            <p class="text-2xl font-semibold text-gray-900">${{ summaryStats.totalLaborCost.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyStation, useFindManyUser } from '~/lib/hooks/index';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const toast = useToast();

// Reactive state
const filters = reactive({
  startDate: '',
  endDate: '',
  stationId: '',
  userId: '',
});

const productivityData = ref<Array<{
  userId: string;
  userName: string;
  stationId: string;
  stationName: string;
  itemsProcessed: number;
  totalDuration: number;
  avgDuration: number;
  totalCost: number;
}>>([]);

const leadTimeData = ref<Array<{
  id: string;
  salesOrderNumber?: string;
  customerName: string;
  orderStatus: string;
  approvedAt?: string;
  daysInProduction: number;
  totalItems: number;
}>>([]);

const summaryStats = ref<{
  avgLeadTime: number;
  ordersProcessed: number;
  itemsProduced: number;
  totalLaborCost: number;
} | null>(null);
const isLoading = ref(false);

// Fetch stations and users for filters
const { data: stations } = useFindManyStation({
  orderBy: { name: 'asc' }
});

const { data: users } = useFindManyUser({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

// Set default date range (last 30 days)
onMounted(() => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  filters.endDate = endDate.toISOString().split('T')[0];
  filters.startDate = startDate.toISOString().split('T')[0];
  
  loadReports();
});

async function loadReports() {
  isLoading.value = true;
  
  try {
    // Load productivity data
    const productivityResponse = await $fetch('/api/reports/productivity', {
      query: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        stationId: filters.stationId || undefined,
        userId: filters.userId || undefined,
      }
    });
    productivityData.value = Array.isArray(productivityResponse) ? productivityResponse : [];
    
    // Load lead time data
    const leadTimeResponse = await $fetch('/api/reports/lead-time', {
      query: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      }
    });
    leadTimeData.value = Array.isArray(leadTimeResponse) ? leadTimeResponse : [];
    
    // Calculate summary stats
    summaryStats.value = {
      avgLeadTime: leadTimeData.value.length > 0 
        ? Math.round(leadTimeData.value.reduce((sum: number, order) => sum + order.daysInProduction, 0) / leadTimeData.value.length)
        : 0,
      ordersProcessed: leadTimeData.value.length,
      itemsProduced: productivityData.value.reduce((sum: number, row) => sum + row.itemsProcessed, 0),
      totalLaborCost: productivityData.value.reduce((sum: number, row) => sum + row.totalCost, 0),
    };
    
  } catch (error) {
    console.error('Error loading reports:', error);
    toast.error({ title: 'Error', message: 'Failed to load reports. Please try again.' });
  } finally {
    isLoading.value = false;
  }
}

function clearFilters() {
  filters.startDate = '';
  filters.endDate = '';
  filters.stationId = '';
  filters.userId = '';
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
</script> 