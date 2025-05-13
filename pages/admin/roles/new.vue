<template>
  <div class="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
    <h1 class="text-2xl font-semibold mb-6 text-gray-800">Create New Role</h1>
    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="roleName" class="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
        <input
          id="roleName"
          v-model="role.name"
          type="text"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Warehouse Manager"
        >
      </div>
      <div class="mb-6">
        <label for="roleDescription" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
        <textarea
          id="roleDescription"
          v-model="role.description"
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="e.g., Responsible for overseeing warehouse operations"
        />
      </div>

      <div class="flex items-center justify-end space-x-3">
        <NuxtLink to="/admin/roles" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Cancel
        </NuxtLink>
        <button
          type="submit"
          :disabled="isCreatingRole"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isCreatingRole ? 'Creating...' : 'Create Role' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCreateRole } from '~/lib/hooks';
import { useToast } from 'vue-toastification';

const toast = useToast();

interface RoleInput {
  name: string;
  description?: string;
}

const role = ref<RoleInput>({ name: '', description: '' });
const router = useRouter();

const createRoleMutation = useCreateRole();

const isCreatingRole = computed(() => createRoleMutation.isPending.value);

async function handleSubmit() {
  if (!role.value.name.trim()) {
    toast.warning('Role name is required.');
    return;
  }

  try {
    await createRoleMutation.mutateAsync({
      data: {
        name: role.value.name,
        description: role.value.description || undefined,
      },
    });
    toast.success('Role created successfully!');
    router.push('/admin/roles');
  } catch (err: unknown) {
    console.error('Failed to create role via mutation:', err);
    let message = 'An unexpected error occurred while creating the role.';
    if (typeof err === 'object' && err !== null) {
      const error = err as { info?: { message?: string }, message?: string };
      message = error.info?.message || error.message || message;
    }
    toast.error(`Error creating role: ${message}`);
  }
}

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});
</script> 