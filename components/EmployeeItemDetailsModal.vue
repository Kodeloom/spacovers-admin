<template>
  <AppModal :is-open="isOpen" :title="modalTitle" @close="$emit('close')">
    <div class="mt-4">
      <!-- Loading State -->
      <div v-if="isLoading" class="space-y-4">
        <div class="animate-pulse">
          <div class="h-4 bg-gray-300 rounded mb-4"></div>
          <div class="space-y-3">
            <div v-for="i in 5" :key="i" class="h-12 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <Icon name="heroicons:exclamation-triangle" class="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="loadEmployeeItems"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="items.length === 0" class="text-center py-8">
        <Icon name="heroicons:cube" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500">No items found for this employee in the selected date range.</p>
      </div>

      <!-- Items List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Total Processing Sessions:</span>
              <span class="ml-2 text-gray-900">{{ pagination.totalCount }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Showing:</span>
              <span class="ml-2 text-gray-900">{{ summary.totalProcessingLogs }} on this page</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Total Processing Time (this page):</span>
              <span class="ml-2 text-gray-900">{{ summary.totalProcessingTimeFormatted }}</span>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="overflow-x-auto max-h-96 overflow-y-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Name
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Type
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shape
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in items" :key="item.processingLogId" class="hover:bg-gray-50">
                <td class="px-4 py-4 text-sm font-medium text-gray-900">
                  {{ item.itemName }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  <span v-if="item.productType" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {{ item.productType === 'SPA_COVER' ? 'Spa Cover' : 'Cover for Cover' }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.shape || '-' }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.size || '-' }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  <NuxtLink 
                    :to="`/admin/orders/edit/${item.orderId}`"
                    class="text-indigo-600 hover:text-indigo-900 font-medium"
                    @click="$emit('close')"
                  >
                    {{ item.orderNumber }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-4 text-sm">
                  <span 
                    :class="getStatusBadgeClass(item.status)"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ formatStatus(item.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ item.stationName }}
                  </span>
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.customerName }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div v-if="pagination.totalPages > 1" class="mt-6 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing page {{ pagination.page }} of {{ pagination.totalPages }} 
            ({{ pagination.totalCount }} total processing sessions)
          </div>
          <div class="flex space-x-2">
            <button
              @click="previousPage"
              :disabled="!pagination.hasPreviousPage"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md',
                pagination.hasPreviousPage
                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'
              ]"
            >
              Previous
            </button>
            
            <!-- Page numbers -->
            <div class="flex space-x-1">
              <button
                v-for="page in getVisiblePages()"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'px-3 py-2 text-sm font-medium rounded-md',
                  page === pagination.page
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
            </div>
            
            <button
              @click="nextPage"
              :disabled="!pagination.hasNextPage"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md',
                pagination.hasNextPage
                  ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  : 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'
              ]"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="mt-6 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
interface EmployeeItemDetail {
  processingLogId: string;
  orderItemId: string;
  itemName: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  status: string;
  stationName: string;
  stationId: string;
  startTime: string;
  endTime: string;
  processingTime: number;
  processingTimeFormatted: string;
  // Product attributes
  productType: string | null;
  shape: string | null;
  size: string | null;
  color: string | null;
}

interface EmployeeItemsSummary {
  totalProcessingLogs: number;
  totalProcessingTime: number;
  totalProcessingTimeFormatted: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Props {
  isOpen: boolean;
  employeeId: string | null;
  employeeName: string | null;
  startDate: string;
  endDate: string;
  stationId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(['close']);

const items = ref<EmployeeItemDetail[]>([]);
const summary = ref<EmployeeItemsSummary>({
  totalProcessingLogs: 0,
  totalProcessingTime: 0,
  totalProcessingTimeFormatted: '0s'
});
const pagination = ref<PaginationInfo>({
  page: 1,
  limit: 50,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false
});
const isLoading = ref(false);
const error = ref<string | null>(null);

const modalTitle = computed(() => {
  return props.employeeName 
    ? `Items Processed by ${props.employeeName}`
    : 'Employee Item Details';
});

// Watch for modal opening and load data
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.employeeId) {
    loadEmployeeItems();
  }
});

// Watch for filter changes and reload data
watch([() => props.employeeId, () => props.startDate, () => props.endDate, () => props.stationId], () => {
  if (props.isOpen && props.employeeId) {
    loadEmployeeItems(1); // Reset to page 1 when filters change
  }
});

async function loadEmployeeItems(page: number = 1) {
  if (!props.employeeId) return;

  isLoading.value = true;
  error.value = null;

  try {
    const queryParams: any = {
      userId: props.employeeId,
      startDate: props.startDate,
      endDate: props.endDate,
      page,
      limit: 50
    };

    if (props.stationId) {
      queryParams.stationId = props.stationId;
    }

    const response = await $fetch('/api/reports/employee-items', {
      query: queryParams
    });

    if (response.success) {
      items.value = (response.data || []) as EmployeeItemDetail[];
      summary.value = response.summary || {
        totalProcessingLogs: 0,
        totalProcessingTime: 0,
        totalProcessingTimeFormatted: '0s'
      };
      pagination.value = response.pagination || {
        page: 1,
        limit: 50,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };
    } else {
      throw new Error('Failed to load employee items');
    }
  } catch (err) {
    console.error('Error loading employee items:', err);
    error.value = 'Failed to load employee item details. Please try again.';
    items.value = [];
    summary.value = {
      totalProcessingLogs: 0,
      totalProcessingTime: 0,
      totalProcessingTimeFormatted: '0s'
    };
    pagination.value = {
      page: 1,
      limit: 50,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  } finally {
    isLoading.value = false;
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    loadEmployeeItems(page);
  }
}

function nextPage() {
  if (pagination.value.hasNextPage) {
    goToPage(pagination.value.page + 1);
  }
}

function previousPage() {
  if (pagination.value.hasPreviousPage) {
    goToPage(pagination.value.page - 1);
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return 'Invalid Date';
  }
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'In Progress';
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}

function getVisiblePages(): number[] {
  const current = pagination.value.page;
  const total = pagination.value.totalPages;
  const delta = 2; // Show 2 pages before and after current page
  
  const range = [];
  const rangeWithDots = [];
  
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  
  if (current - delta > 2) {
    rangeWithDots.push(1, '...');
  } else {
    rangeWithDots.push(1);
  }
  
  rangeWithDots.push(...range);
  
  if (current + delta < total - 1) {
    rangeWithDots.push('...', total);
  } else if (total > 1) {
    rangeWithDots.push(total);
  }
  
  return rangeWithDots.filter((page, index, arr) => 
    typeof page === 'number' && arr.indexOf(page) === index
  ) as number[];
}

function navigateToOrder(orderId: string) {
  // Navigate to the order edit page
  navigateTo(`/admin/orders/edit/${orderId}`);
  // Close the modal after navigation
  emit('close');
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'Not Started',
    'IN_PRODUCTION': 'In Production',
    'PRODUCT_FINISHED': 'Finished',
    'SHIPPED': 'Shipped',
    'CANCELLED': 'Cancelled',
    'UNKNOWN': 'Unknown'
  };
  return statusMap[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'bg-gray-100 text-gray-800',
    'IN_PRODUCTION': 'bg-blue-100 text-blue-800',
    'PRODUCT_FINISHED': 'bg-green-100 text-green-800',
    'SHIPPED': 'bg-purple-100 text-purple-800',
    'CANCELLED': 'bg-red-100 text-red-800',
    'UNKNOWN': 'bg-gray-100 text-gray-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
}
</script>