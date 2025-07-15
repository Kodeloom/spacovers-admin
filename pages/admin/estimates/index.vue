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
        :rows="estimates ?? []"
        :columns="columns"
        :pending="isEstimatesLoading || isCountLoading"
      >
        <template #transactionDate-data="{ row }">
          <span>{{ row.transactionDate ? new Date(row.transactionDate).toLocaleDateString() : '-' }}</span>
        </template>
        <template #totalAmount-data="{ row }">
          <span>{{ new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.totalAmount) }}</span>
        </template>
        <template #customerName-data="{ row }">
          <span>{{ row.customer?.name || '-' }}</span>
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
        v-if="totalEstimates && totalEstimates > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalEstimates) }}</span>
          of
          <span class="font-medium">{{ totalEstimates }}</span>
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
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFindManyEstimate, useCountEstimate } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const { showLoading, hideLoading } = useGlobalLoading();
const toast = useToast();
const route = useRoute();
const isSyncing = ref(false);

const columns = [
  { key: 'estimateNumber', label: 'Estimate #', sortable: true },
  { key: 'customerName', label: 'Customer', sortable: false },
  { key: 'transactionDate', label: 'Date', sortable: true },
  { key: 'totalAmount', label: 'Amount', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'transactionDate', direction: 'desc' as 'asc' | 'desc' });

const query = computed(() => ({
  skip: (page.value - 1) * limit.value,
  take: limit.value,
  include: { customer: true },
  orderBy: { [sort.value.column]: sort.value.direction },
}));

const { data: estimates, isLoading: isEstimatesLoading, refetch: refreshEstimates } = useFindManyEstimate(query);
const { data: totalEstimates, isLoading: isCountLoading, refetch: refreshCount } = useCountEstimate();

const totalPages = computed(() => {
  const count = totalEstimates.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/estimates') {
    refreshEstimates();
    refreshCount();
  }
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
    toast.success({ title: 'QBO Sync Successful', message: message });
    refreshEstimates();
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