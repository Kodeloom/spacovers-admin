<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Estimates
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
      </div>
    </div>
    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="estimatesData?.data ?? []"
        :columns="columns"
        :pending="pending"
      >
        <template #txnDate-data="{ row }">
          <span>{{ new Date(row.txnDate).toLocaleDateString() }}</span>
        </template>
        <template #total-data="{ row }">
          <span>{{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.total) }}</span>
        </template>
        <template #actions-data="{ row }">
          <NuxtLink
            :to="`/admin/estimates/view/${row.id}`"
            class="text-indigo-600 hover:text-indigo-900"
          >
            <Icon name="heroicons:eye-20-solid" class="h-5 w-5" />
          </NuxtLink>
        </template>
      </AppTable>
      <div
        v-if="estimatesData && estimatesData.count > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, estimatesData.count) }}</span>
          of
          <span class="font-medium">{{ estimatesData.count }}</span>
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
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const isSyncing = ref(false);

const columns = [
  { key: 'docNumber', label: 'Estimate #' },
  { key: 'customer.name', label: 'Customer' },
  { key: 'txnDate', label: 'Date' },
  { key: 'total', label: 'Amount' },
  { key: 'actions', label: 'Actions', sortable: false },
];

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'txnDate', direction: 'desc' as 'asc' | 'desc' });

const query = computed(() => ({
  $skip: (page.value - 1) * limit.value,
  $take: limit.value,
  $include: { customer: true },
  $orderBy: { [sort.value.column]: sort.value.direction },
}));

const {
  data: estimatesData,
  pending,
  refresh,
} = await useAsyncData('estimates', () => $fetch<{ data: any[], count: number }>('/api/model/estimate', {
  method: 'GET',
  query: query.value,
}), {
  watch: [page, limit, sort],
});

const totalPages = computed(() => {
  if (!estimatesData.value || estimatesData.value.count === 0)
    return 1;
  return Math.ceil(estimatesData.value.count / limit.value);
});

async function handleSync(syncMode: 'UPSERT' | 'CREATE_NEW') {
  isSyncing.value = true;
  showLoading();
  try {
    const result = await $fetch('/api/qbo/sync/all', {
      method: 'POST',
      body: { syncMode },
    });
    const message = `Sync complete. Estimates: ${result.estimatesSynced}, Orders: ${result.invoicesSynced}.`;
    toast.add({ title: 'QBO Sync Successful', description: message, color: 'green' });
    await refresh();
  } catch (e) {
    const error = e as { data?: { data?: { message?: string } } };
    toast.add({ title: 'Error', description: error.data?.data?.message || 'Failed to sync with QBO.', color: 'red' });
  } finally {
    isSyncing.value = false;
    hideLoading();
  }
}
</script> 