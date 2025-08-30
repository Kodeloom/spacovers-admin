<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Orders
      </h1>
      <div class="flex items-center space-x-2">
        <NuxtLink
          to="/admin/orders/add"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
          Add Order
        </NuxtLink>
        <button
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleSync('CREATE_NEW')"
        >
          <Icon name="heroicons:plus-circle-20-solid" class="mr-2 h-5 w-5" />
          Sync New
        </button>
        <button
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleSync('UPSERT')"
        >
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          <Icon v-else name="heroicons:arrow-path-20-solid" class="mr-2 h-5 w-5" />
          Sync All
        </button>
      </div>
    </div>

    <!-- Metrics Cards -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Average Lead Time (Always Last 60 Days) -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock" class="h-8 w-8 text-blue-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Avg Lead Time</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.avgLeadTime || '0' }} days</p>
            <p class="text-xs text-gray-400">Last 60 days</p>
          </div>
        </div>
      </div>

      <!-- Orders Pending -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:clock" class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders Pending</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersPending || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Orders In Progress -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:cog" class="h-8 w-8 text-indigo-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders In Progress</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersInProgress || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Orders Ready to Ship -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:truck" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Ready to Ship</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersReadyToShip || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>

      <!-- Orders Completed -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Icon name="heroicons:check-circle" class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-500">Orders Completed</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.ordersCompleted || '0' }}</p>
            <p class="text-xs text-gray-400">{{ timeFilterLabel }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Time Filter for Metrics -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center justify-between">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Time Filter for Metrics</label>
          <p class="text-xs text-gray-500">Note: Average Lead Time is always calculated for the last 60 days</p>
        </div>
        <div class="flex items-center space-x-2">
          <select
            v-model="timeFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            @change="updateMetrics"
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

    <!-- Customer Filter -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center space-x-4">
        <div class="flex-1">
          <label for="customerFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
          <div class="flex items-center space-2">
            <input
              id="customerFilter"
              v-model="customerFilter"
              type="text"
              placeholder="Type customer name to filter..."
              :disabled="!!customerIdFromQuery"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
            <div v-if="customerIdFromQuery" class="flex items-center space-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md ml-3">
              <Icon name="heroicons:check-circle-20-solid" class="h-4 w-4" />
              <span>Filtered by: <span class="font-medium">{{ customerNameFromQuery || 'Loading...' }}</span></span>
            </div>
          </div>
        </div>
        <div>
          <label for="statusFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
          <select
            id="statusFilter"
            v-model="statusFilter"
            class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDER_PROCESSING">In Progress</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SHIPPED">Shipped</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            class="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            @click="clearFilters"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="orders ?? []"
        :columns="columns"
        :pending="isOrdersLoading || isCountLoading"
      >
        <template #transactionDate-data="{ row }">
          <span>{{ row.transactionDate ? new Date(row.transactionDate).toLocaleDateString() : '-' }}</span>
        </template>
        <template #totalAmount-data="{ row }">
          <span>{{ row.totalAmount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.totalAmount) : '-' }}</span>
        </template>
        <template #customerName-data="{ row }">
          <span>{{ row.customer?.name || '-' }}</span>
        </template>
        <template #priority-data="{ row }">
          <span 
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-red-100 text-red-800': row.priority === 'HIGH',
              'bg-yellow-100 text-yellow-800': row.priority === 'MEDIUM',
              'bg-green-100 text-green-800': row.priority === 'LOW'
            }"
          >
            {{ row.priority || 'MEDIUM' }}
          </span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex space-x-5 items-center">
            <NuxtLink
              :to="`/admin/orders/edit/${row.id}`"
              class="text-indigo-600 hover:text-indigo-900"
              title="Edit Order"
            >
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button
              v-if="row.orderStatus !== 'ARCHIVED'"
              class="text-gray-600 hover:text-gray-900"
              title="Archive Order"
              @click="archiveOrder(row)"
            >
              <Icon name="heroicons:archive-box-20-solid" class="h-5 w-5" />
            </button>
            <button
              v-if="row.orderStatus === 'PENDING'"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors duration-200"
              title="Verify Order"
              @click="openVerifyModal(row)"
            >
              <Icon name="heroicons:check-circle-20-solid" class="h-5 w-5 mr-1" />
              Verify Order
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="totalOrders && totalOrders > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalOrders) }}</span>
          of
          <span class="font-medium">{{ totalOrders }}</span>
          results
        </p>
        <div class="flex-1 flex justify-end">
          <button
            :disabled="page === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page--"
          >
            Previous
          </button>
          <button
            :disabled="page === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page++"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Archive Confirmation Modal -->
    <AppModal
      :is-open="showArchiveModal"
      title="Archive Order"
      @close="showArchiveModal = false"
    >
      <div class="p-6">
        <p class="text-gray-700 mb-4">
          Are you sure you want to archive order 
          <span class="font-semibold">{{ orderToArchive?.salesOrderNumber || orderToArchive?.id }}</span>?
        </p>
        <p class="text-sm text-gray-600 mb-6">
          This action will move the order to archived status. The order will remain in the system but will be hidden from the main view.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="showArchiveModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            :disabled="isArchiving"
            @click="confirmArchive"
          >
            {{ isArchiving ? 'Archiving...' : 'Archive Order' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Order Verification Modal -->
    <AppModal
      :is-open="showVerifyModal"
      title="Verify Order"
      @close="showVerifyModal = false"
    >
      <div class="p-6">
        <div class="mb-6">
          <div class="flex items-center mb-4">
            <Icon name="heroicons:exclamation-triangle-20-solid" class="h-6 w-6 text-yellow-500 mr-2" />
            <h3 class="text-lg font-medium text-gray-900">Order Verification Required</h3>
          </div>
          <p class="text-gray-700 mb-4">
            You are about to verify and approve order 
            <span class="font-semibold">{{ orderToVerify?.salesOrderNumber || orderToVerify?.id }}</span>
            for customer <span class="font-semibold">{{ orderToVerify?.customer?.name }}</span>.
          </p>
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-medium text-gray-900 mb-2">Order Details:</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-600">Order Number:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.salesOrderNumber || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Date:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.transactionDate ? new Date(orderToVerify.transactionDate).toLocaleDateString() : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Total Amount:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.totalAmount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(orderToVerify.totalAmount) : 'N/A' }}</span>
              </div>
              <div>
                <span class="text-gray-600">Items:</span>
                <span class="ml-2 font-medium">{{ orderToVerify?.items?.length || 0 }} items</span>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-600 mt-4">
            <strong>Important:</strong> Once verified, this order will be moved to "APPROVED" status and can begin production. 
            Please ensure all order details are correct before proceeding.
          </p>
        </div>
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            @click="showVerifyModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            :disabled="isVerifying"
            @click="confirmVerifyOrder"
          >
            <Icon v-if="isVerifying" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
            {{ isVerifying ? 'Verifying...' : 'Verify & Approve Order' }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFindManyOrder, useCountOrder, useUpdateOrder, useFindUniqueCustomer } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const isSyncing = ref(false);

// Archive modal state
const showArchiveModal = ref(false);
const orderToArchive = ref<any>(null);
const isArchiving = ref(false);

// Verification modal state
const showVerifyModal = ref(false);
const orderToVerify = ref<any>(null);
const isVerifying = ref(false);

const columns = [
  { key: 'salesOrderNumber', label: 'Order #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: false },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'transactionDate', label: 'Date', sortable: true },
  { key: 'totalAmount', label: 'Amount', sortable: true },
  { key: 'orderStatus', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'transactionDate', direction: 'desc' as 'asc' | 'desc' });
const customerFilter = ref('');
const statusFilter = ref('');

// Metrics state
const timeFilter = ref('30'); // Default to last 30 days
const metrics = ref({
  avgLeadTime: 0,
  ordersPending: 0,
  ordersInProgress: 0,
  ordersReadyToShip: 0,
  ordersCompleted: 0
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

// Check for customerId in URL query params
const customerIdFromQuery = computed(() => route.query.customerId as string);

// Fetch customer name when filtering by customerId
const { data: customerFromQuery } = useFindUniqueCustomer(
  computed(() => customerIdFromQuery.value ? { where: { id: customerIdFromQuery.value } } : { where: { id: '' } })
);

const customerNameFromQuery = computed(() => customerFromQuery.value?.name);

const query = computed(() => {
  const baseQuery = {
    skip: (page.value - 1) * limit.value,
    take: limit.value,
    include: { customer: true },
    orderBy: { [sort.value.column]: sort.value.direction },
    where: undefined as any,
  };

  // Add filters
  const where: Record<string, any> = {};
  
  // Priority: URL customerId query param overrides manual customer filter
  if (customerIdFromQuery.value) {
    where.customerId = customerIdFromQuery.value;
  } else if (customerFilter.value) {
    where.customer = {
      name: {
        contains: customerFilter.value,
        mode: 'insensitive'
      }
    };
  }
  
  if (statusFilter.value) {
    where.orderStatus = statusFilter.value;
  }
  
  if (Object.keys(where).length > 0) {
    baseQuery.where = where;
  } else {
    delete baseQuery.where;
  }
  
  return baseQuery;
});

const { data: orders, isLoading: isOrdersLoading, refetch: refreshOrders } = useFindManyOrder(query);
const { data: totalOrders, isLoading: isCountLoading, refetch: refreshCount } = useCountOrder();

const totalPages = computed(() => {
  const count = totalOrders.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/orders') {
    refreshOrders();
    refreshCount();
    fetchMetrics(); // Also refresh metrics
  }
});

// Fetch metrics function
async function fetchMetrics() {
  try {
    // Always fetch average lead time for last 60 days
    const leadTimeResponse = await $fetch('/api/reports/lead-time', {
      query: { days: 60 }
    });
    
    // Fetch order counts based on current time filter
    const orderCountsResponse = await $fetch('/api/reports/order-counts', {
      query: { timeFilter: timeFilter.value }
    });
    
    metrics.value = {
      avgLeadTime: leadTimeResponse.avgLeadTime || 0,
      ordersPending: orderCountsResponse.pending || 0,
      ordersInProgress: orderCountsResponse.inProgress || 0,
      ordersReadyToShip: orderCountsResponse.readyToShip || 0,
      ordersCompleted: orderCountsResponse.completed || 0
    };
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    // Keep existing metrics on error
  }
}

// Update metrics when time filter changes
async function updateMetrics() {
  await fetchMetrics();
}

// Initial metrics fetch
onMounted(() => {
  fetchMetrics();
});

function clearFilters() {
  customerFilter.value = '';
  statusFilter.value = '';
  page.value = 1; // Reset to first page
  
  // Clear URL query parameter if it exists
  if (customerIdFromQuery.value) {
    router.push({ query: { ...route.query, customerId: undefined } });
  }
}

function openVerifyModal(order: Record<string, any>) {
  orderToVerify.value = order;
  showVerifyModal.value = true;
}

async function confirmVerifyOrder() {
  if (!orderToVerify.value) return;
  
  try {
    isVerifying.value = true;
    
    // Get current user info for logging
    const currentUser = await $fetch('/api/auth/me');
    
    updateOrder({
      where: { id: orderToVerify.value.id },
      data: {
        orderStatus: 'APPROVED',
        approvedAt: new Date(),
        barcode: orderToVerify.value.salesOrderNumber || `ORDER-${orderToVerify.value.id.slice(-8)}`, // Generate barcode
      },
    });
    
    // Log the status change
    await $fetch('/api/tracking/log-order-status', {
      method: 'POST',
      body: {
        orderId: orderToVerify.value.id,
        fromStatus: orderToVerify.value.orderStatus,
        toStatus: 'APPROVED',
        userId: currentUser?.id,
        changeReason: 'Admin order verification and approval',
        triggeredBy: 'manual',
        notes: `Order verified by admin. Barcode generated: ${orderToVerify.value.salesOrderNumber || `ORDER-${orderToVerify.value.id.slice(-8)}`}`,
      },
    });
    
    toast.success({ 
      title: 'Order Verified & Approved', 
      message: `Order ${orderToVerify.value.salesOrderNumber || orderToVerify.value.id} has been verified and approved. Production can now begin.` 
    });
    
    showVerifyModal.value = false;
    orderToVerify.value = null;
  } catch (error) {
    // Error handling is done in the hook's onError
  } finally {
    isVerifying.value = false;
  }
}



const { mutate: updateOrder } = useUpdateOrder({
  onSuccess: () => {
    refreshOrders();
    refreshCount();
  },
  onError: (error: any) => {
    const err = error as { data?: { data?: { message?: string } } };
    toast.error({ 
      title: 'Error', 
      message: err.data?.data?.message || 'Failed to update order.' 
    });
  },
});

async function archiveOrder(order: Record<string, any>) {
  orderToArchive.value = order;
  showArchiveModal.value = true;
}

async function confirmArchive() {
  if (!orderToArchive.value) return;
  
  try {
    isArchiving.value = true;
    updateOrder({
      where: { id: orderToArchive.value.id },
      data: {
        orderStatus: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });
    
    toast.success({ 
      title: 'Order Archived', 
      message: `Order ${orderToArchive.value.salesOrderNumber || orderToArchive.value.id} has been archived.` 
    });
    
    showArchiveModal.value = false;
    orderToArchive.value = null;
  } catch (error) {
    // Error handling is done in the hook's onError
  } finally {
    isArchiving.value = false;
  }
}

async function handleSync(syncMode: 'UPSERT' | 'CREATE_NEW') {
  isSyncing.value = true;
  showLoading();
  try {
    const result = await $fetch('/api/qbo/sync/all', {
      method: 'POST',
      body: { syncMode },
    });
    const message = `Sync complete. Estimates: ${result.estimatesSynced}, Orders: ${result.invoicesSynced}.`;
    toast.success({ title: 'QBO Sync Successful', message: message });
    refreshOrders();
    refreshCount();
  } catch (e) {
    const error = e as { data?: { data?: { message?: string } } };
    toast.error({ title: 'Error', message: error.data?.data?.message || 'Failed to sync with QBO.' });
  } finally {
    isSyncing.value = false;
    hideLoading();
  }
}
</script> 