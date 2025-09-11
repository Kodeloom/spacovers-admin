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
          {{ isLoading ? 'Loading...' : 'Refresh Reports' }}
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

    <!-- Error Boundary -->
    <ReportErrorBoundary
      :error="reportError"
      :retryable="true"
      :show-contact-support="true"
      :show-technical-details="true"
      @retry="retryLoadReports"
      @clear="clearReportError"
      @contact-support="contactSupport"
    >
      <!-- Loading State -->
      <ReportLoadingState
        v-if="isLoading"
        :loading-title="`Generating ${activeTab === 'productivity' ? 'Productivity' : 'Lead Time'} Report`"
        :loading-message="loadingMessage"
        :progress="loadingProgress"
        :show-summary-skeletons="true"
        :show-table-skeleton="true"
        :show-tips="true"
      />

      <!-- Report Content (when not loading and no error) -->
      <template v-else>
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
              {{ activeTab === 'productivity' ? 'Total Labor Cost' : 'Total Revenue' }}
            </p>
            <p class="text-2xl font-semibold text-gray-900">
              {{ activeTab === 'productivity' 
                ? '$' + (summaryStats.totalLaborCost || 0).toFixed(2) 
                : '$' + (summaryStats.totalRevenue || 0).toFixed(2) }}
            </p>
            </div>
          </div>
        </div>
        </div>

        <!-- Employee Productivity Report -->
        <div v-if="activeTab === 'productivity'" class="bg-white shadow rounded-lg p-6 mb-8">
          <h2 class="text-xl font-semibold text-gray-700 mb-6">Employee Productivity</h2>
          
          <div v-if="reportData && reportData.length === 0" class="text-center py-12">
            <Icon name="heroicons:chart-bar" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p class="text-gray-500 mb-4">
              No productivity data found for the selected filters and date range.
            </p>
            <div class="text-sm text-gray-400">
              <p>Try:</p>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li>Expanding your date range</li>
                <li>Removing station or employee filters</li>
                <li>Checking if there was any production activity during this period</li>
              </ul>
            </div>
          </div>
          
          <div v-else-if="reportData && reportData.length > 0" class="overflow-x-auto">
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
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  @click="openEmployeeItemsModal(row.userId, row.userName, row.itemsProcessed)"
                  :disabled="!row.itemsProcessed || row.itemsProcessed === 0"
                  :class="[
                    'font-medium',
                    row.itemsProcessed > 0 
                      ? 'text-indigo-600 hover:text-indigo-900 cursor-pointer underline' 
                      : 'text-gray-500 cursor-default'
                  ]"
                >
                  {{ row.itemsProcessed || 0 }}
                </button>
              </td>
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
    <div v-if="activeTab === 'lead-time'" class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-700 mb-6">Order Lead Time Analysis</h2>
      
      <div v-if="isLoading" class="animate-pulse">
        <div class="h-4 bg-gray-300 rounded mb-4"></div>
        <div class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 bg-gray-300 rounded"></div>
        </div>
      </div>
      
      <div v-if="reportData && reportData.length === 0" class="text-center py-12">
        <Icon name="heroicons:clock" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
        <p class="text-gray-500 mb-4">
          No orders found for the selected filters and date range.
        </p>
        <div class="text-sm text-gray-400">
          <p>Try:</p>
          <ul class="list-disc list-inside mt-2 space-y-1">
            <li>Expanding your date range</li>
            <li>Removing customer filters</li>
            <li>Checking if there were any orders created during this period</li>
          </ul>
        </div>
      </div>
      
      <div v-else-if="reportData && reportData.length > 0" class="overflow-x-auto">
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
                {{ order.createdAt ? TimezoneService.formatUTCForLocalDisplay(new Date(order.createdAt), undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'N/A' }}
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
      </template>
    </ReportErrorBoundary>

    <!-- Employee Item Details Modal -->
    <EmployeeItemDetailsModal
      :is-open="employeeItemsModal.isOpen"
      :employee-id="employeeItemsModal.employeeId"
      :employee-name="employeeItemsModal.employeeName"
      :start-date="filters.startDate"
      :end-date="filters.endDate"
      :station-id="filters.stationId"
      @close="closeEmployeeItemsModal"
    />
  </div>
</template>

<script setup lang="ts">
import { useFindManyStation } from '~/lib/hooks/station';
import { useFindManyUser } from '~/lib/hooks/user';
import { useFindManyCustomer } from '~/lib/hooks/customer';
import { TimezoneService } from '~/utils/timezoneService';

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
const reportError = ref<any>(null);
const loadingProgress = ref<number | undefined>(undefined);
const loadingMessage = ref('Please wait while we process your request...');

// Employee items modal state
const employeeItemsModal = reactive({
  isOpen: false,
  employeeId: null as string | null,
  employeeName: null as string | null,
});

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
  setDefaultDateRange();
  loadReports();
});

/**
 * Convert any date format to YYYY-MM-DD format
 */
function convertToYYYYMMDD(dateInput: string): string {
  if (!dateInput) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  // Handle MM/DD/YYYY format (most common issue)
  const mmddyyyyMatch = dateInput.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyyMatch) {
    const [, month, day, year] = mmddyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try to parse as a date and format properly
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Could not convert date:', dateInput, error);
    return '';
  }
}

/**
 * Set default date range to last 30 days
 */
function setDefaultDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  // Force YYYY-MM-DD format
  const endDateStr = endDate.getFullYear() + '-' + 
    String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(endDate.getDate()).padStart(2, '0');
  
  const startDateStr = startDate.getFullYear() + '-' + 
    String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(startDate.getDate()).padStart(2, '0');
  
  filters.endDate = endDateStr;
  filters.startDate = startDateStr;
  
  console.log('🔍 Set default dates:', { startDateStr, endDateStr });
}

/**
 * Validate date range inputs
 */
function validateDateRange(): boolean {
  if (!filters.startDate || !filters.endDate) {
    toast.error({ title: 'Error', message: 'Please select both start and end dates.' });
    return false;
  }

  // Automatically convert dates to correct format
  filters.startDate = convertToYYYYMMDD(filters.startDate);
  filters.endDate = convertToYYYYMMDD(filters.endDate);

  // Validate that conversion was successful
  if (!filters.startDate || !filters.endDate) {
    toast.error({ 
      title: 'Invalid Date Format', 
      message: 'Please select valid dates using the date picker.' 
    });
    return false;
  }

  const startDate = new Date(filters.startDate);
  const endDate = new Date(filters.endDate);
  
  // Check if dates are valid
  if (isNaN(startDate.getTime())) {
    toast.error({ title: 'Invalid Date', message: 'Start date is not a valid date.' });
    return false;
  }
  
  if (isNaN(endDate.getTime())) {
    toast.error({ title: 'Invalid Date', message: 'End date is not a valid date.' });
    return false;
  }
  
  if (startDate > endDate) {
    toast.error({ title: 'Error', message: 'Start date must be before or equal to end date.' });
    return false;
  }

  // Check if date range is too large (more than 1 year)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    toast.error({ title: 'Error', message: 'Date range cannot exceed 365 days.' });
    return false;
  }

  // Check if dates are in the future
  const now = new Date();
  if (startDate > now) {
    toast.error({ title: 'Error', message: 'Start date cannot be in the future.' });
    return false;
  }

  return true;
}

// Watch for tab changes
watch(activeTab, () => {
  clearFilters();
  loadReports();
});

// Watch for date changes and auto-refresh (with debounce)
const debouncedLoadReports = debounce(loadReports, 1000);

// Watch for date changes and auto-refresh (with debounce)
watch([() => filters.startDate, () => filters.endDate], () => {
  if (filters.startDate && filters.endDate) {
    debouncedLoadReports();
  }
});

/**
 * Simple debounce function to prevent excessive API calls
 */
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadReports() {
  isLoading.value = true;
  reportError.value = null;
  loadingProgress.value = undefined;
  
  try {
    // Validate date range before making API call
    if (!validateDateRange()) {
      return;
    }

    loadingMessage.value = 'Validating date range...';
    loadingProgress.value = 10;

    // Automatically convert dates to YYYY-MM-DD format
    const normalizedStartDate = convertToYYYYMMDD(filters.startDate);
    const normalizedEndDate = convertToYYYYMMDD(filters.endDate);
    
    // Validate that we have valid dates
    if (!normalizedStartDate || !normalizedEndDate) {
      reportError.value = {
        statusMessage: 'Invalid date format',
        message: 'Please select valid start and end dates',
        data: {
          suggestions: [
            'Use the date picker to select dates',
            'Ensure both start and end dates are selected',
            'Try refreshing the page if dates appear incorrect'
          ]
        }
      };
      return;
    }
    
    // Update the filters with normalized dates (this fixes the display)
    if (normalizedStartDate !== filters.startDate) {
      filters.startDate = normalizedStartDate;
    }
    if (normalizedEndDate !== filters.endDate) {
      filters.endDate = normalizedEndDate;
    }

    // Create UTC date range directly (bypass TimezoneService issues)
    let utcDateRange;
    try {
      // Create dates and convert to ISO strings for API
      const startDate = new Date(normalizedStartDate + 'T00:00:00.000Z');
      const endDate = new Date(normalizedEndDate + 'T23:59:59.999Z');
      
      // Validate the dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values');
      }
      
      utcDateRange = {
        start: startDate,
        end: endDate
      };
    } catch (dateError: any) {
      console.error('Date creation error:', dateError);
      reportError.value = {
        statusMessage: 'Invalid date values provided',
        message: 'Please select valid dates',
        data: {
          suggestions: [
            'Use the date picker to select dates',
            'Ensure dates are not too far in the future',
            'Try refreshing the page and selecting different dates'
          ]
        }
      };
      return;
    }

    loadingMessage.value = 'Fetching report data...';
    loadingProgress.value = 30;

    if (activeTab.value === 'productivity') {
      // Fetch productivity data
      loadingMessage.value = 'Calculating productivity metrics...';
      loadingProgress.value = 50;

      const response = await $fetch('/api/reports/productivity', {
        query: {
          startDate: utcDateRange.start.toISOString(),
          endDate: utcDateRange.end.toISOString(),
          stationId: filters.stationId || undefined,
          userId: filters.userId || undefined,
        }
      });

      loadingProgress.value = 80;

      if (response.success && response.data) {
        reportData.value = response.data;
        summaryStats.value = response.summary;
        
        // Show warnings if any
        if (response.warnings && response.warnings.length > 0) {
          console.warn('Report warnings:', response.warnings);
          toast.warning({ 
            title: 'Data Quality Notice', 
            message: `Report generated with ${response.warnings.length} data quality warnings. Check console for details.` 
          });
        }
      } else {
        throw new Error('Invalid response from productivity API');
      }
    } else {
      // Fetch lead-time data
      loadingMessage.value = 'Calculating lead time metrics...';
      loadingProgress.value = 50;

      const ordersResponse = await $fetch('/api/reports/lead-time', {
        query: {
          startDate: utcDateRange.start.toISOString(),
          endDate: utcDateRange.end.toISOString(),
          customerId: filters.customerId || undefined,
        }
      });

      loadingProgress.value = 80;
      
      if (ordersResponse.success && ordersResponse.data) {
        reportData.value = ordersResponse.data;
        summaryStats.value = ordersResponse.summary;
      } else {
        throw new Error('Invalid response from lead-time API');
      }
    }

    loadingMessage.value = 'Finalizing report...';
    loadingProgress.value = 100;

    // Clear any previous errors
    reportError.value = null;

  } catch (error: any) {
    console.error('Error loading reports:', error);
    reportError.value = error;
    
    // Set empty data on error
    reportData.value = [];
    summaryStats.value = null;

    // Show user-friendly error message
    const errorMessage = error.statusMessage || error.message || 'Failed to load reports. Please try again.';
    toast.error({ 
      title: 'Report Generation Failed', 
      message: errorMessage 
    });
  } finally {
    isLoading.value = false;
    loadingProgress.value = undefined;
  }
}

function clearFilters() {
  filters.stationId = '';
  filters.userId = '';
  filters.customerId = '';
  setDefaultDateRange();
}

async function exportCSV() {
  isExporting.value = true;
  
  try {
    // Validate that we have data to export
    if (!reportData.value || reportData.value.length === 0) {
      toast.error({ 
        title: 'Export Error', 
        message: 'No data available to export. Please generate a report first.' 
      });
      return;
    }

    // Validate date range before exporting
    if (!filters.startDate || !filters.endDate) {
      toast.error({ 
        title: 'Export Error', 
        message: 'Please select both start and end dates before exporting.' 
      });
      return;
    }

    // Convert dates for export API
    let utcDateRange;
    try {
      const normalizedStartDate = convertToYYYYMMDD(filters.startDate);
      const normalizedEndDate = convertToYYYYMMDD(filters.endDate);
      
      const startDate = new Date(normalizedStartDate + 'T00:00:00.000Z');
      const endDate = new Date(normalizedEndDate + 'T23:59:59.999Z');
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date values');
      }
      
      utcDateRange = {
        start: startDate,
        end: endDate
      };
    } catch (dateError: any) {
      console.error('Date conversion error during export:', dateError);
      toast.error({ 
        title: 'Export Failed', 
        message: 'Invalid date format. Please ensure dates are properly selected using the date picker.',
        timeout: 5000
      });
      return;
    }

    const queryParams = new URLSearchParams({
      reportType: activeTab.value,
      startDate: utcDateRange.start.toISOString(),
      endDate: utcDateRange.end.toISOString(),
    });

    if (activeTab.value === 'productivity') {
      if (filters.stationId) queryParams.set('stationId', filters.stationId);
      if (filters.userId) queryParams.set('userId', filters.userId);
    } else {
      if (filters.customerId) queryParams.set('customerId', filters.customerId);
    }

    // Show progress toast
    toast.info({ 
      title: 'Exporting Report', 
      message: 'Preparing your CSV file for download...' 
    });

    // Create a temporary link to download the CSV
    const link = document.createElement('a');
    link.href = `/api/reports/export-csv?${queryParams.toString()}`;
    link.download = `${activeTab.value}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success({ 
      title: 'Export Successful', 
      message: 'Your report has been downloaded successfully!' 
    });
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    
    const errorMessage = error.statusMessage || error.message || 'Failed to export report. Please try again.';
    toast.error({ 
      title: 'Export Failed', 
      message: errorMessage,
      timeout: 5000
    });
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

/**
 * Transform productivity data from metrics service to match UI expectations
 * Applies filtering and flattens station breakdown data
 */
function transformProductivityData(productivityData: any[], filters: any) {
  const result: any[] = [];
  
  productivityData.forEach(employee => {
    employee.stationBreakdown.forEach((station: any) => {
      // Apply station filter if specified
      if (filters.stationId && station.stationId !== filters.stationId) {
        return;
      }
      
      // Apply user filter if specified
      if (filters.userId && employee.userId !== filters.userId) {
        return;
      }
      
      result.push({
        userId: employee.userId,
        userName: employee.userName,
        stationId: station.stationId,
        stationName: station.stationName,
        itemsProcessed: station.itemsProcessed,
        totalDuration: station.hoursWorked * 3600, // Convert hours to seconds
        avgDuration: station.averageTimePerItem,
        efficiency: station.hoursWorked > 0 ? Math.round((station.itemsProcessed / station.hoursWorked) * 100) / 100 : 0,
        totalCost: calculateStationLaborCost(station.hoursWorked, employee.userId)
      });
    });
  });
  
  return result.sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Calculate total labor cost from productivity data
 */
function calculateTotalLaborCost(productivityData: any[]): number {
  return productivityData.reduce((total, employee) => {
    return total + employee.stationBreakdown.reduce((stationTotal: number, station: any) => {
      return stationTotal + calculateStationLaborCost(station.hoursWorked, employee.userId);
    }, 0);
  }, 0);
}

/**
 * Calculate labor cost for a station (placeholder - would need user hourly rate data)
 * For now, using a default rate since we don't have access to user hourly rates in the metrics service
 */
function calculateStationLaborCost(hoursWorked: number, userId: string): number {
  const defaultHourlyRate = 25; // Default hourly rate - should be fetched from user data
  return hoursWorked * defaultHourlyRate;
}

/**
 * Calculate total revenue from revenue periods data
 */
function calculateRevenueFromPeriods(revenueByPeriod: any[]): number {
  if (!revenueByPeriod || revenueByPeriod.length === 0) {
    return 0;
  }
  
  return revenueByPeriod.reduce((total, period) => total + (period.revenue || 0), 0);
}

/**
 * Open the employee items modal for drill-down details
 */
function openEmployeeItemsModal(employeeId: string, employeeName: string, itemCount: number) {
  if (!itemCount || itemCount === 0) {
    return; // Don't open modal if no items
  }

  employeeItemsModal.employeeId = employeeId;
  employeeItemsModal.employeeName = employeeName;
  employeeItemsModal.isOpen = true;
}

/**
 * Close the employee items modal
 */
function closeEmployeeItemsModal() {
  employeeItemsModal.isOpen = false;
  employeeItemsModal.employeeId = null;
  employeeItemsModal.employeeName = null;
}

/**
 * Clear the current error state
 */
function clearReportError() {
  reportError.value = null;
}

/**
 * Retry loading reports after an error
 */
function retryLoadReports() {
  clearReportError();
  loadReports();
}

/**
 * Handle contact support action
 */
function contactSupport() {
  // In a real application, this might open a support ticket system
  // or mailto link with pre-filled error information
  const subject = encodeURIComponent('Report Generation Error');
  const body = encodeURIComponent(`
I encountered an error while generating reports:

Report Type: ${activeTab.value}
Date Range: ${filters.startDate} to ${filters.endDate}
Error: ${reportError.value?.statusMessage || reportError.value?.message || 'Unknown error'}

Please help me resolve this issue.
  `);
  
  window.open(`mailto:support@company.com?subject=${subject}&body=${body}`, '_blank');
}


</script>