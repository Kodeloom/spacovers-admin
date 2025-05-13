<template>
  <div class="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
    <h1 class="text-2xl font-semibold mb-6 text-gray-800">Edit Role</h1>

    <div v-if="isLoadingRole" class="text-center py-6">
      <p class="text-gray-600">Loading role details...</p>
      <!-- Optional: Add a spinner or skeleton loader here -->
    </div>

    <div v-else-if="roleError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
      <p>Error loading role: {{ roleError.message }}</p>
      <pre v-if="detailedRoleErrorInfo" class="mt-1 text-xs">{{ detailedRoleErrorInfo }}</pre>
      <NuxtLink to="/admin/roles" class="mt-3 inline-block text-indigo-600 hover:text-indigo-800">&larr; Back to Roles</NuxtLink>
    </div>

    <form v-else-if="roleData" @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="roleName" class="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
        <input
          id="roleName"
          v-model="editableRole.name"
          type="text"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
      </div>
      <div class="mb-6">
        <label for="roleDescription" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
        <textarea
          id="roleDescription"
          v-model="editableRole.description"
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div class="flex items-center justify-end space-x-3">
        <NuxtLink to="/admin/roles" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Cancel
        </NuxtLink>
        <button
          type="submit"
          :disabled="isUpdatingRole"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isUpdatingRole ? 'Updating...' : 'Save Changes' }}
        </button>
      </div>
    </form>
    <div v-else class="text-center py-6 text-gray-500">
      Role not found or could not be loaded.
      <NuxtLink to="/admin/roles" class="mt-3 block text-indigo-600 hover:text-indigo-800">&larr; Back to Roles</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFindUniqueRole, useUpdateRole } from '~/lib/hooks';
import { useToast } from 'vue-toastification';

const toast = useToast();

interface RoleUpdateInput {
  name: string;
  description?: string | null; // Allow null to clear description
}

const route = useRoute();
const router = useRouter();
const roleId = computed(() => route.params.id as string);

const editableRole = ref<RoleUpdateInput>({ name: '', description: '' });

// Fetch the role data
const {
  data: roleData,
  isLoading: isLoadingRole,
  error: roleError,
  // refetch: refetchRole // if needed for manual refetch
} = useFindUniqueRole(
  { where: { id: roleId.value } },
  { enabled: computed(() => !!roleId.value) }
);

// Update mutation
const updateRoleMutation = useUpdateRole();
const isUpdatingRole = computed(() => updateRoleMutation.isPending.value);
// const updateError = computed(() => updateRoleMutation.error.value); // Will use toast for error

// Watch for fetched role data and populate the form
watchEffect(() => {
  if (roleData.value) {
    editableRole.value = {
      name: roleData.value.name,
      description: roleData.value.description,
    };
  }
});

// Computed property for detailed error message from initial role fetching
const detailedRoleErrorInfo = computed(() => {
  const error = roleError.value;
  if (error?.cause && typeof (error.cause as { info?: unknown }).info === 'object' && (error.cause as { info?: unknown }).info !== null) {
    return JSON.stringify((error.cause as { info?: unknown }).info, null, 2);
  } else if (error?.cause && (error.cause as { info?: unknown }).info) {
    return String((error.cause as { info?: unknown }).info);
  }
  return null;
});

async function handleSubmit() {
  if (!editableRole.value.name.trim()) {
    toast.warning('Role name is required.');
    return;
  }

  try {
    await updateRoleMutation.mutateAsync({
      where: { id: roleId.value },
      data: {
        name: editableRole.value.name,
        description: editableRole.value.description, // Send as is (string, null, or undefined)
      },
    });
    toast.success('Role updated successfully!');
    router.push('/admin/roles');
  } catch (err: unknown) {
    console.error('Failed to update role via mutation:', err);
    let message = 'An unexpected error occurred while updating the role.';
    if (typeof err === 'object' && err !== null) {
      const error = err as { info?: { message?: string }, message?: string };
      message = error.info?.message || error.message || message;
    }
    toast.error(`Error updating role: ${message}`);
  }
}

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});
</script> 