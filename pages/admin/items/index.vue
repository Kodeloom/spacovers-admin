<template>
  <div class="p-4">
    <header class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">
          Items
        </h1>
        <p class="text-gray-500 mt-1">
          Manage products and services synchronized with QuickBooks.
        </p>
      </div>
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
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          Add Item
        </NuxtLink>
      </div>
    </header>

    <div class="mb-4">
        <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search items..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
    </div>

    <AppTable
      v-model:current-page="currentPage"
      title="All Items"
      :columns="columns"
      :items="items || []"
      :total-items="totalItems || 0"
      :items-per-page="itemsPerPage"
      :is-loading="isItemsLoading || isCountLoading"
      :actions="['edit', 'delete']"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <AppModal
      :show="isDeleteModalOpen"
      title="Delete Item"
      :message="`Are you sure you want to delete the item '${itemToDelete?.name}'? This action cannot be undone.`"
      @confirm="confirmDeleteItem"
      @close="closeDeleteModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFindManyItem, useDeleteItem, useCountItem } from '~/lib/hooks';
import type { Item, Prisma } from '@prisma-app/client';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const toast = useToast();
const router = useRouter();

// Table and data state
const currentPage = ref(1);
const itemsPerPage = ref(15);
const searchQuery = ref('');

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'retailPrice', label: 'Retail Price', format: (value: Prisma.Decimal | null) => value ? `$${Number(value).toFixed(2)}` : '-' },
  { key: 'wholesalePrice', label: 'Wholesale Price', format: (value: Prisma.Decimal | null) => value ? `$${Number(value).toFixed(2)}` : '-' },
  { key: 'status', label: 'Status' },
];

const paginatedQueryOptions = computed(() => ({
  skip: (currentPage.value - 1) * itemsPerPage.value,
  take: itemsPerPage.value,
  select: {
    id: true,
    name: true,
    category: true,
    retailPrice: true,
    wholesalePrice: true,
    status: true,
  },
}));

const { data: items, isLoading: isItemsLoading, refetch: refetchItems } = useFindManyItem(paginatedQueryOptions);
const { data: totalItems, isLoading: isCountLoading, refetch: refetchCount } = useCountItem();

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
const deleteItemMutation = useDeleteItem();
const isDeleteModalOpen = ref(false);
const itemToDelete = ref<Item | null>(null);

function handleEdit(item: Item) {
  router.push(`/admin/items/edit/${item.id}`);
}

function handleDelete(item: Item) {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
}

async function confirmDeleteItem() {
  if (itemToDelete.value) {
    try {
      await deleteItemMutation.mutateAsync({ where: { id: itemToDelete.value.id } });
      toast.success({ title: 'Item Deleted', message: `Item '${itemToDelete.value.name}' has been deleted.` });
      refetchItems();
      refetchCount();
    }
    catch (error) {
      const e = error as Error;
      toast.error({ title: 'Deletion Failed', message: e.message || 'Could not delete item.' });
    }
    finally {
        closeDeleteModal();
    }
  }
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  itemToDelete.value = null;
}
</script> 