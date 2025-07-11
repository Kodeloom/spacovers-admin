<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Users
      </h1>
      <NuxtLink
        to="/admin/users/add"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
        Add User
      </NuxtLink>
    </div>
    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="usersData ?? []"
        :columns="columns"
        :pending="pending"
      >
        <template #status-data="{ row }">
          <span
            class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
            :class="{
              'bg-green-100 text-green-800': row.status === 'ACTIVE',
              'bg-yellow-100 text-yellow-800': row.status === 'INACTIVE',
              'bg-red-100 text-red-800': row.status === 'ARCHIVED',
            }"
          >
            {{ row.status }}
          </span>
        </template>
        <template #roles-data="{ row }">
          <div v-if="row.roles && row.roles.length > 0" class="flex flex-wrap gap-1">
            <span v-for="userRole in row.roles" :key="userRole.role.id" class="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">
              {{ userRole.role.name }}
            </span>
          </div>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <NuxtLink :to="`/admin/users/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button class="text-red-600 hover:text-red-900" @click="confirmDelete(row)">
              <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="totalCount && totalCount > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, totalCount) }}</span>
          of
          <span class="font-medium">{{ totalCount }}</span>
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
    <AppModal :is-open="!!userToDelete" title="Confirm Deletion" @close="userToDelete = null">
      <p>Are you sure you want to delete the user '<strong>{{ userToDelete?.name }}</strong>'? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="userToDelete = null">
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
import { useFindManyUser, useCountUser, useDeleteUser } from '~/lib/hooks';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'roles', label: 'Roles', sortable: false },
  { key: 'actions', label: 'Actions', sortable: false },
];

const toast = useToast();
const route = useRoute();
const isDeleting = ref(false);
const userToDelete = ref<{ id: string, name: string } | null>(null);

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'name', direction: 'asc' as 'asc' | 'desc' });

const query = computed(() => ({
  skip: (page.value - 1) * limit.value,
  take: limit.value,
  include: { roles: { include: { role: true } } },
  orderBy: { [sort.value.column]: sort.value.direction },
}));

const { data: usersData, isLoading: pending, refetch: refreshUsers } = useFindManyUser(query);
const { data: totalCount, refetch: refreshCount } = useCountUser();

const totalPages = computed(() => {
  const count = totalCount.value ?? 0;
  if (count === 0) return 1;
  return Math.ceil(count / limit.value);
});

// When navigating back to this page, force a refresh
watch(() => route.fullPath, (fullPath) => {
  if (fullPath === '/admin/users') {
    refreshUsers();
    refreshCount();
  }
});

const deleteMutation = useDeleteUser({
  onSuccess: () => {
    toast.success({ title: 'Success', message: 'User deleted successfully.' });
    refreshUsers();
    refreshCount();
  },
  onError: (error: { data?: { data?: { message?: string } } }) => {
    const errorMessage = error.data?.data?.message || 'Failed to delete user.';
    toast.error({ title: 'Error', message: errorMessage });
  },
  onSettled: () => {
    isDeleting.value = false;
    userToDelete.value = null;
  },
});

function confirmDelete(user: { id: string; name: string }) {
  userToDelete.value = { id: user.id, name: user.name };
}

function handleDelete() {
  if (userToDelete.value) {
    isDeleting.value = true;
    deleteMutation.mutate({ where: { id: userToDelete.value.id } });
  }
}
</script>

<style scoped>
/* Page specific styles */
</style> 