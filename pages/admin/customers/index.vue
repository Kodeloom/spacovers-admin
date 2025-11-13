<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Customers
      </h1>
      <div class="flex items-center space-x-2">
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
        <NuxtLink
          to="/admin/customers/add"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
          Add Customer
        </NuxtLink>
      </div>
    </div>
    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="customersData?.data ?? []"
        :columns="columns"
        :pending="pending"
      >
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <NuxtLink :to="`/admin/customers/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <NuxtLink :to="`/admin/orders?customerId=${row.id}`" class="text-green-600 hover:text-green-900" title="View Orders">
              <Icon name="heroicons:document-text-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button class="text-red-600 hover:text-red-900" @click="confirmDeleteCustomer(row)">
              <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="customersData && customersData.count > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, customersData.count) }}</span>
          of
          <span class="font-medium">{{ customersData.count }}</span>
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
    <AppModal :is-open="!!customerToDelete" title="Confirm Deletion" @close="customerToDelete = null">
      <p>Are you sure you want to delete this customer? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="customerToDelete = null">
          Cancel
        </button>
        <button
          class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
          :disabled="isDeleting"
          @click="handleDelete"
        >
          <Icon v-if="isDeleting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          Delete
        </button>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFindManyCustomer, useCountCustomer, useDeleteCustomer } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: 'auth-office-admin',
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const isSyncing = ref(false);
const isDeleting = ref(false);
const customerToDelete = ref<{ id: string } | null>(null);

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'name', direction: 'asc' as 'asc' | 'desc' });

const route = useRoute();

const query = computed(() => ({
  skip: (page.value - 1) * limit.value,
  take: limit.value,
  orderBy: { [sort.value.column]: sort.value.direction },
}));

const { data: customers, isLoading: pending, refetch: refreshCustomers } = useFindManyCustomer(query);
const { data: totalCustomers, refetch: refreshCount } = useCountCustomer();

const customersData = computed(() => ({
  data: customers.value || [],
  count: totalCustomers.value || 0,
}));

const totalPages = computed(() => {
  const count = totalCustomers.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/customers') {
    refreshCustomers();
    refreshCount();
  }
});

const deleteCustomerMutation = useDeleteCustomer({
  onSuccess: () => {
    toast.success({ title: 'Success', message: 'Customer deleted successfully.' });
    refreshCustomers();
    refreshCount();
  },
  onError: (error: { data?: { data?: { message?: string } } }) => {
    const errorMessage = error.data?.data?.message || 'Failed to delete customer.';
    toast.error({ title: 'Error', message: errorMessage });
  },
  onSettled: () => {
    isDeleting.value = false;
    customerToDelete.value = null;
  },
});

function confirmDeleteCustomer(customer: any) {
  customerToDelete.value = customer;
}

function handleDelete() {
  if (customerToDelete.value) {
    isDeleting.value = true;
    deleteCustomerMutation.mutate({ where: { id: customerToDelete.value.id } });
  }
}

async function handleSync(syncMode: 'UPSERT' | 'CREATE_NEW') {
  isSyncing.value = true;
  showLoading();
  try {
    await $fetch('/api/qbo/sync/customers', { method: 'POST', body: { syncMode } });
    toast.success({ title: 'QBO Sync Successful', message: 'Customers synced with QBO.' });
    refreshCustomers();
    refreshCount();
  }
  catch (e) {
    const error = e as { data?: { data?: { message?: string } } };
    toast.error({ title: 'Error', message: error.data?.data?.message || 'Failed to sync with QBO.' });
  }
  finally {
    isSyncing.value = false;
    hideLoading();
  }
}
</script> 