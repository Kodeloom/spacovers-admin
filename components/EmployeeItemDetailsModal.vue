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
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Total Items:</span>
              <span class="ml-2 text-gray-900">{{ summary.totalItems }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Total Processing Time:</span>
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
                  Order
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processing Time
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station(s)
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in items" :key="item.orderItemId" class="hover:bg-gray-50">
                <td class="px-4 py-4 text-sm font-medium text-gray-900">
                  {{ item.itemName }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.orderNumber }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.customerName }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.processingTimeFormatted }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  <span 
                    v-if="item.stationNames.length === 1"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {{ item.stationName }}
                  </span>
                  <div v-else class="space-y-1">
                    <span 
                      v-for="station in item.stationNames" 
                      :key="station"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1"
                    >
                      {{ station }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  {{ item.completedAt ? formatDate(item.completedAt) : 'In Progress' }}
                </td>
                <td class="px-4 py-4 text-sm text-gray-500">
                  <button
                    @click="navigateToOrder(item.orderId)"
                    class="text-indigo-600 hover:text-indigo-900 font-medium"
                  >
                    View Order
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
  orderItemId: string;
  itemName: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  processingTime: number;
  processingTimeFormatted: string;
  processedAt: string;
  completedAt: string | null;
  stationName: string;
  stationNames: string[];
}

interface EmployeeItemsSummary {
  totalItems: number;
  totalProcessingTime: number;
  totalProcessingTimeFormatted: string;
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
  totalItems: 0,
  totalProcessingTime: 0,
  totalProcessingTimeFormatted: '0s'
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
    loadEmployeeItems();
  }
});

async function loadEmployeeItems() {
  if (!props.employeeId) return;

  isLoading.value = true;
  error.value = null;

  try {
    const queryParams: any = {
      userId: props.employeeId,
      startDate: props.startDate,
      endDate: props.endDate,
    };

    if (props.stationId) {
      queryParams.stationId = props.stationId;
    }

    const response = await $fetch('/api/reports/employee-items', {
      query: queryParams
    });

    if (response.success) {
      items.value = response.data || [];
      summary.value = response.summary || {
        totalItems: 0,
        totalProcessingTime: 0,
        totalProcessingTimeFormatted: '0s'
      };
    } else {
      throw new Error('Failed to load employee items');
    }
  } catch (err) {
    console.error('Error loading employee items:', err);
    error.value = 'Failed to load employee item details. Please try again.';
    items.value = [];
    summary.value = {
      totalItems: 0,
      totalProcessingTime: 0,
      totalProcessingTimeFormatted: '0s'
    };
  } finally {
    isLoading.value = false;
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

function navigateToOrder(orderId: string) {
  // Navigate to the order edit page
  navigateTo(`/admin/orders/edit/${orderId}`);
  // Close the modal after navigation
  emit('close');
}
</script>