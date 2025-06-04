<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Roles Management</h1>
      <NuxtLink to="/admin/roles/new" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
        Create New Role
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingRoles" class="text-center py-4">
      <p>Loading roles...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="rolesError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <p class="text-red-700">Error loading roles: {{ rolesError.message }}</p>
      <pre v-if="detailedRolesErrorInfo" class="mt-2 text-sm text-red-600">{{ detailedRolesErrorInfo }}</pre>
    </div>

    <!-- Roles List -->
    <div v-else-if="roles && roles.length > 0" class="bg-white shadow-sm rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="role in roles" :key="role.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ role.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ role.description || '-' }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <div class="flex space-x-2">
                <NuxtLink :to="`/admin/roles/${role.id}`" class="text-indigo-600 hover:text-indigo-900">Edit</NuxtLink>
                <button class="text-red-600 hover:text-red-900" @click="openDeleteModal(role.id)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8 bg-white rounded-lg shadow-sm">
      <p class="text-gray-500">No roles found. Create your first role to get started.</p>
    </div>

    <AppModal :show="isDeleteModalVisible" @close="closeDeleteModal">
      <template #title>
        Confirm Deletion
      </template>
      <template #default>
        <p class="text-sm text-gray-500">
          Are you sure you want to delete this role? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
          @click="closeDeleteModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          :disabled="deleteRoleMutation.isPending.value"
          @click="confirmDeleteRole"
        >
          {{ deleteRoleMutation.isPending.value ? 'Deleting...' : 'Delete' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
// import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useFindManyRole, useDeleteRole } from '~/lib/hooks';
// import type { Role } from '@prisma-app/client';
import AppModal from '~/components/AppModal.vue';

// const router = useRouter();

const toast = useToast();

const { data: roles, isLoading: isLoadingRoles, error: rolesError, refetch: refreshRoles } = useFindManyRole();

const detailedRolesErrorInfo = computed(() => {
  const cause = rolesError.value?.cause as { info?: unknown } | undefined;
  if (cause && typeof cause.info === 'object' && cause.info !== null) {
    return JSON.stringify(cause.info, null, 2);
  } else if (cause && cause.info) {
    return String(cause.info); // Convert to string if not an object
  }
  return null;
});

const deleteRoleMutation = useDeleteRole();

// Modal state
const isDeleteModalVisible = ref(false);
const roleIdToDelete = ref<string | null>(null);

function openDeleteModal(id: string) {
  roleIdToDelete.value = id;
  isDeleteModalVisible.value = true;
}

function closeDeleteModal() {
  isDeleteModalVisible.value = false;
  roleIdToDelete.value = null;
}

async function confirmDeleteRole() {
  if (!roleIdToDelete.value) return;

  try {
    await deleteRoleMutation.mutateAsync({ where: { id: roleIdToDelete.value } });
    toast.success('Role deleted successfully!'); // Success toast
    await refreshRoles();
    closeDeleteModal();
  } catch (error: unknown) {
    console.error('Error deleting role:', error);
    let message = 'An unexpected error occurred while deleting the role.';
    if (typeof error === 'object' && error !== null) {
      const err = error as { info?: { message?: string }, message?: string };
      message = err.info?.message || err.message || message;
    }
    toast.error(`Error deleting role: ${message}`); // Error toast
  }
}

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style>