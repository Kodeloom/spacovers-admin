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

    <!-- Customer Filter -->
    <div class="mb-4 bg-white p-4 rounded-lg shadow">
      <div class="flex items-center space-x-4">
        <div class="flex-1">
          <label for="customerFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
          <input
            id="customerFilter"
            v-model="customerFilter"
            type="text"
            placeholder="Type customer name to filter..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
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
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <NuxtLink
              :to="`/admin/orders/edit/${row.id}`"
              class="text-indigo-600 hover:text-indigo-900"
              title="Edit Order"
            >
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button
              v-if="row.orderStatus === 'PENDING'"
              class="text-green-600 hover:text-green-900"
              title="Approve Order"
              @click="approveOrder(row)"
            >
              <Icon name="heroicons:check-circle-20-solid" class="h-5 w-5" />
            </button>
            <button
              v-if="row.orderStatus !== 'ARCHIVED'"
              class="text-gray-600 hover:text-gray-900"
              title="Archive Order"
              @click="archiveOrder(row)"
            >
              <Icon name="heroicons:archive-box-20-solid" class="h-5 w-5" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFindManyOrder, useCountOrder, useUpdateOrder } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const route = useRoute();
const isSyncing = ref(false);

// Archive modal state
const showArchiveModal = ref(false);
const orderToArchive = ref<any>(null);
const isArchiving = ref(false);

const columns = [
  { key: 'salesOrderNumber', label: 'Order #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: false },
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
  
  if (customerFilter.value) {
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
  }
});

function clearFilters() {
  customerFilter.value = '';
  statusFilter.value = '';
  page.value = 1; // Reset to first page
}

async function approveOrder(order: Record<string, any>) {
  try {
    await $fetch(`/api/model/Order/${order.id}`, {
      method: 'PUT',
      body: {
        orderStatus: 'APPROVED',
        approvedAt: new Date().toISOString(),
        barcode: order.salesOrderNumber || `ORDER-${order.id.slice(-8)}`, // Generate barcode
      },
    });
    
    toast.success({ 
      title: 'Order Approved', 
      message: `Order ${order.salesOrderNumber || order.id} has been approved and is ready for production.` 
    });
    
    refreshOrders();
    refreshCount();
  } catch (error) {
    const err = error as { data?: { data?: { message?: string } } };
    toast.error({ 
      title: 'Error', 
      message: err.data?.data?.message || 'Failed to approve order.' 
    });
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
      message: err.data?.data?.message || 'Failed to archive order.' 
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