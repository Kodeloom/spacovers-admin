<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Permissions
      </h1>
      <NuxtLink
        to="/admin/permissions/add"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
        Add Permission
      </NuxtLink>
    </div>
    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="permissions ?? []"
        :columns="columns"
        :pending="isPermissionsLoading || isCountLoading"
      >
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <NuxtLink :to="`/admin/permissions/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button class="text-red-600 hover:text-red-900" @click="confirmDelete(row)">
              <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="totalPermissions && totalPermissions > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalPermissions) }}</span>
          of
          <span class="font-medium">{{ totalPermissions }}</span>
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
    <AppModal :is-open="!!permissionToDelete" title="Confirm Deletion" @close="permissionToDelete = null">
      <p>Are you sure you want to delete the permission '<strong>{{ permissionToDelete?.action }} on {{ permissionToDelete?.subject }}</strong>'? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="permissionToDelete = null">
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
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFindManyPermission, useCountPermission, useDeletePermission } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const columns = [
  { key: 'subject', label: 'Module (Subject)', sortable: true },
  { key: 'action', label: 'Action', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'createdAt', label: 'Created At', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

const toast = useToast();
const route = useRoute();
const isDeleting = ref(false);
const permissionToDelete = ref<{ id: string, action: string, subject: string } | null>(null);

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'subject', direction: 'asc' as 'asc' | 'desc' });

const query = computed(() => ({
  skip: (page.value - 1) * limit.value,
  take: limit.value,
  orderBy: { [sort.value.column]: sort.value.direction },
}));

const { data: permissions, isLoading: isPermissionsLoading, refetch: refreshPermissions } = useFindManyPermission(query);
const { data: totalPermissions, isLoading: isCountLoading, refetch: refreshCount } = useCountPermission();

const totalPages = computed(() => {
  const count = totalPermissions.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/permissions') {
    refreshPermissions();
    refreshCount();
  }
});

const deleteMutation = useDeletePermission({
  onSuccess: () => {
    toast.success({ title: 'Success', message: 'Permission deleted successfully.' });
    refreshPermissions();
    refreshCount();
  },
  onError: (error: { data?: { data?: { message?: string } } }) => {
    const errorMessage = error.data?.data?.message || 'Failed to delete permission.';
    toast.error({ title: 'Error', message: errorMessage });
  },
  onSettled: () => {
    isDeleting.value = false;
    permissionToDelete.value = null;
  },
});

function confirmDelete(permission: any) {
  permissionToDelete.value = { id: permission.id, action: permission.action, subject: permission.subject };
}

function handleDelete() {
  if (permissionToDelete.value) {
    isDeleting.value = true;
    deleteMutation.mutate({ where: { id: permissionToDelete.value.id } });
  }
}
</script>

<style scoped>
/* Page specific styles */
</style>