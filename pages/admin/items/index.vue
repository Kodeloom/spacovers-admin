<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Items
      </h1>
      <div class="flex items-center space-x-2">
        <button
          :disabled="isSyncing"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          @click="syncItems"
        >
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          {{ isSyncing ? 'Syncing...' : 'Sync with QuickBooks' }}
        </button>
        <NuxtLink
          to="/admin/items/add"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
          Add Item
        </NuxtLink>
      </div>
    </div>

    <div class="mb-4">
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Search items..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
      >
    </div>

    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="items ?? []"
        :columns="columns"
        :pending="isItemsLoading || isCountLoading"
      >
        <template #retailPrice-data="{ row }">
          {{ row.retailPrice ? `$${Number(row.retailPrice).toFixed(2)}` : '-' }}
        </template>
        <template #wholesalePrice-data="{ row }">
          {{ row.wholesalePrice ? `$${Number(row.wholesalePrice).toFixed(2)}` : '-' }}
        </template>
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <NuxtLink :to="`/admin/items/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button class="text-red-600 hover:text-red-900" @click="confirmDelete(row)">
              <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="totalItems && totalItems > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalItems) }}</span>
          of
          <span class="font-medium">{{ totalItems }}</span>
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

    <AppModal :is-open="!!itemToDelete" title="Confirm Deletion" @close="itemToDelete = null">
      <p>Are you sure you want to delete the item '<strong>{{ itemToDelete?.name }}</strong>'? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="itemToDelete = null">
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
import { useFindManyItem, useDeleteItem, useCountItem } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const toast = useToast();
const route = useRoute();
const isDeleting = ref(false);
const itemToDelete = ref<{ id: string, name: string } | null>(null);

// Table and data state
const page = ref(1);
const limit = ref(15);
const searchQuery = ref('');
const sort = ref({ column: 'name', direction: 'asc' as 'asc' | 'desc' });

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'retailPrice', label: 'Retail Price', sortable: true },
  { key: 'wholesalePrice', label: 'Wholesale Price', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const query = computed(() => ({
  skip: (page.value - 1) * limit.value,
  take: limit.value,
  orderBy: { [sort.value.column]: sort.value.direction },
  select: {
    id: true,
    name: true,
    category: true,
    retailPrice: true,
    wholesalePrice: true,
    status: true,
  },
}));

const { data: items, isLoading: isItemsLoading, refetch: refetchItems } = useFindManyItem(query);
const { data: totalItems, isLoading: isCountLoading, refetch: refetchCount } = useCountItem();

const totalPages = computed(() => {
  const count = totalItems.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/items') {
    refetchItems();
    refetchCount();
  }
});

// Sync logic
const isSyncing = ref(false);
async function syncItems() {
  isSyncing.value = true;
  toast.info({ title: 'Sync Started', message: 'Fetching items from QuickBooks...' });
  try {
    const response = await $fetch<{ created: number; updated: number }>('/api/qbo/sync/items', { method: 'POST' });
    toast.success({
      title: 'Sync Complete',
      message: `${response.created} items created, ${response.updated} items updated.`,
    });
    refetchItems();
    refetchCount();
  }
  catch (error) {
    const e = error as Error & { data?: { message?: string }};
    console.error('Failed to sync items:', e);
    toast.error({
      title: 'Sync Failed',
      message: e.data?.message || e.message || 'An unexpected error occurred.',
    });
  }
  finally {
    isSyncing.value = false;
  }
}

// Delete logic
const deleteMutation = useDeleteItem({
  onSuccess: () => {
    toast.success({ title: 'Success', message: 'Item deleted successfully.' });
    refetchItems();
    refetchCount();
  },
  onError: (error: { data?: { data?: { message?: string } } }) => {
    const errorMessage = error.data?.data?.message || 'Failed to delete item.';
    toast.error({ title: 'Error', message: errorMessage });
  },
  onSettled: () => {
    isDeleting.value = false;
    itemToDelete.value = null;
  },
});

function confirmDelete(item: any) {
  itemToDelete.value = { id: item.id, name: item.name };
}

function handleDelete() {
  if (itemToDelete.value) {
    isDeleting.value = true;
    deleteMutation.mutate({ where: { id: itemToDelete.value.id } });
  }
}
</script> 