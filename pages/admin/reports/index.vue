<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Reports & Analytics</h1>

    <!-- Report Type Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'productivity'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'productivity'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Employee Productivity
          </button>
          <button
            @click="activeTab = 'lead-time'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'lead-time'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            Order Lead Time
          </button>
        </nav>
      </div>
    </div>

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
        <div v-if="activeTab === 'productivity'">
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
        <div v-if="activeTab === 'productivity'">
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
        <div v-if="activeTab === 'lead-time'">
          <label for="customerFilter" class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
          <select
            id="customerFilter"
            v-model="filters.customerId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Customers</option>
            <option v-for="customer in customers" :key="customer.id" :value="customer.id">
              {{ customer.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="mt-4 flex space-x-4">
        <button
          @click="loadReports"
          :disabled="isLoading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
          {{ isLoading ? 'Loading...' : 'Generate Reports' }}
        </button>
        <button
          @click="clearFilters"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Clear Filters
        </button>
        <button
          @click="exportCSV"
          :disabled="!reportData || isExporting"
          class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <Icon v-if="isExporting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline" />
          {{ isExporting ? 'Exporting...' : 'Export CSV' }}
        </button>
      </div>
    </div>

    <!-- Summary Statistics -->
    <div v-if="summaryStats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:users" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Active Employees' : 'Total Orders' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' ? (summaryStats.totalEmployees || 0) : (summaryStats.totalOrders || 0) }}
            </p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cube" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Items Processed' : 'Items Produced' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' ? (summaryStats.totalItemsProcessed || 0) : (summaryStats.totalItemsProduced || 0) }}
            </p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock" class="h-8 w-8 text-purple-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Production Time' : 'Avg Lead Time' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' 
                ? formatDuration(summaryStats.totalProductionTime || 0) 
                : (summaryStats.avgLeadTimeDays || 0) + ' days' }}
            </p>
          </div>
        </div>
      </div>
      
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:currency-dollar" class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">
              {{ activeTab === 'productivity' ? 'Total Labor Cost' : 'Production Hours' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' 
                ? '$' + (summaryStats.totalLaborCost || 0).toFixed(2) 
                : (summaryStats.totalProductionHours || 0).toFixed(1) + 'h' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Employee Productivity Report -->
    <div v-if="activeTab === 'productivity' && reportData" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Employee Productivity</h2>
      
      <div v-if="reportData.length === 0" class="text-gray-500 text-center py-8">
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
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="row in reportData" :key="`${row.userId}-${row.stationId}`">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ row.userName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.stationName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.itemsProcessed || 0 }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.totalDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDuration(row.avgDuration) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row.efficiency || 0 }} items/hr</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${{ (row.totalCost || 0).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Lead Time Report -->
    <div v-if="activeTab === 'lead-time' && reportData" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Order Lead Time Analysis</h2>
      
      <div v-if="reportData.length === 0" class="text-gray-500 text-center py-8">
        No lead time data found for the selected filters.
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days in Production</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion %</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bottlenecks</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="order in reportData" :key="order.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ order.orderNumber || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.customerName || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="{
                    'bg-yellow-100 text-yellow-800': order.orderStatus === 'PENDING',
                    'bg-green-100 text-green-800': order.orderStatus === 'APPROVED',
                    'bg-blue-100 text-blue-800': order.orderStatus === 'ORDER_PROCESSING',
                    'bg-purple-100 text-purple-800': order.orderStatus === 'READY_TO_SHIP',
                    'bg-gray-100 text-gray-800': order.orderStatus === 'SHIPPED'
                  }"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ (order.orderStatus || '').replace(/_/g, ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ order.daysInProduction || 0 }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center">
                  <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full" 
                      :style="{ width: (order.completionPercentage || 0) + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs">{{ order.completionPercentage || 0 }}%</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span v-if="order.bottlenecks && order.bottlenecks.length > 0" class="text-red-600">
                  {{ order.bottlenecks.join(', ') }}
                </span>
                <span v-else class="text-gray-400">None</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyStation } from '~/lib/hooks/station';
import { useFindManyUser } from '~/lib/hooks/user';
import { useFindManyCustomer } from '~/lib/hooks/customer';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const toast = useToast();

// Reactive state
const activeTab = ref<'productivity' | 'lead-time'>('productivity');
const filters = reactive({
  startDate: '',
  endDate: '',
  stationId: '',
  userId: '',
  customerId: '',
});

const reportData = ref<any[]>([]);
const summaryStats = ref<any>(null);
const isLoading = ref(false);
const isExporting = ref(false);

// Fetch filter options
const { data: stations } = useFindManyStation({
  orderBy: { name: 'asc' }
});

const { data: users } = useFindManyUser({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

const { data: customers } = useFindManyCustomer({
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

// Watch for tab changes
watch(activeTab, () => {
  clearFilters();
  loadReports();
});

async function loadReports() {
  isLoading.value = true;
  
  try {
    if (activeTab.value === 'productivity') {
      const response = await $fetch('/api/reports/productivity', {
        query: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          stationId: filters.stationId || undefined,
          userId: filters.userId || undefined,
        }
      });
      reportData.value = response.data || [];
      summaryStats.value = response.summary || {};
    } else {
      const response = await $fetch('/api/reports/lead-time', {
        query: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          customerId: filters.customerId || undefined,
        }
      });
      reportData.value = response.data || [];
      summaryStats.value = response.summary || {};
    }
  } catch (error) {
    console.error('Error loading reports:', error);
    toast.error({ title: 'Error', message: 'Failed to load reports. Please try again.' });
  } finally {
    isLoading.value = false;
  }
}

function clearFilters() {
  filters.stationId = '';
  filters.userId = '';
  filters.customerId = '';
}

async function exportCSV() {
  isExporting.value = true;
  
  try {
    const queryParams = new URLSearchParams({
      reportType: activeTab.value,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    if (activeTab.value === 'productivity') {
      if (filters.stationId) queryParams.set('stationId', filters.stationId);
      if (filters.userId) queryParams.set('userId', filters.userId);
    } else {
      if (filters.customerId) queryParams.set('customerId', filters.customerId);
    }

    // Create a temporary link to download the CSV
    const link = document.createElement('a');
    link.href = `/api/reports/export-csv?${queryParams.toString()}`;
    link.download = `${activeTab.value}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success({ title: 'Success', message: 'Report exported successfully!' });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    toast.error({ title: 'Error', message: 'Failed to export report. Please try again.' });
  } finally {
    isExporting.value = false;
  }
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