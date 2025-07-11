<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Add New Permission</h1>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="action" class="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <input 
            id="action" 
            v-model.trim="permissionData.action" 
            type="text" 
            required 
            placeholder="e.g., create, read, update, delete"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
          <p v-if="validationErrors.action" class="text-xs text-red-500 mt-1">{{ validationErrors.action }}</p>
        </div>

        <div class="mb-4">
          <label for="subject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select 
            id="subject" 
            v-model="permissionData.subject" 
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="" disabled>Select a subject</option>
            <option v-for="subject in availableSubjects" :key="subject" :value="subject">
              {{ subject }}
            </option>
          </select>
           <p v-if="validationErrors.subject" class="text-xs text-red-500 mt-1">{{ validationErrors.subject }}</p>
        </div>

        <div class="mb-6">
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea 
            id="description" 
            v-model.trim="permissionData.description" 
            rows="3" 
            placeholder="Briefly describe what this permission allows"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div v-if="apiError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <p class="font-medium">Error creating permission:</p>
          <p>{{ apiError }}</p>
        </div>

        <div class="flex items-center justify-end space-x-4">
          <NuxtLink 
            to="/admin/permissions" 
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition duration-150 ease-in-out"
          >
            Cancel
          </NuxtLink>
          <button 
            type="submit" 
            :disabled="isCreating"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
          >
            <Icon v-if="isCreating" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
            {{ isCreating ? 'Creating...' : 'Create Permission' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useCreatePermission } from '~/lib/hooks';
import type { Prisma } from '@prisma-app/client'; // Import Prisma namespace

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const router = useRouter();
const toast = useToast();

const availableSubjects = [
  'Customer',
  'Item',
  'ItemProcessingLog',
  'Order',
  'Role',
  'Station',
  'User',
].sort();

// Use Prisma.PermissionCreateInput for the type
const permissionData = reactive<Partial<Prisma.PermissionCreateInput>>({
  action: '',
  subject: '', // Initialize subject as empty string for the select placeholder
  description: '',
});

const validationErrors = reactive({
  action: '',
  subject: '',
});

const apiError = ref<string | null>(null);

// A non-reactive flag to prevent re-entrant calls
let isCreateInProgress = false;

const { mutate: createPermission, isPending: isCreating } = useCreatePermission({
  onSuccess: () => {
    toast.success({ title: 'Success', message: 'Permission created successfully!' });
    router.push('/admin/permissions');
  },
  onError: (err: any) => {
    console.error("Error creating permission:", err);
    console.error("Error structure:", JSON.stringify(err, null, 2));
    
    // Check for unique constraint violation (P2002) in multiple possible locations
    const isPrismaUniqueError = 
      err.data?.error?.code === 'P2002' ||  // Original structure
      err.code === 'P2002' ||               // Direct Prisma error
      err.data?.code === 'P2002' ||         // Alternative structure
      err.meta?.code === 'P2002' ||         // Another possible structure
      (err.message && err.message.includes('Unique constraint failed')) || // Message-based check
      (err.data?.message && err.data.message.includes('Unique constraint failed'));
    
    if (isPrismaUniqueError) {
      const message = 'A permission with this action and subject already exists.';
      apiError.value = message;
      toast.error({ title: 'Duplicate Permission', message: message });
    } else {
      const message = err.data?.message || err.message || 'Failed to create permission. Please try again.';
      apiError.value = message;
      toast.error({ title: 'Error Creating Permission', message: message });
    }
  },
  onSettled: () => {
    // Ensure our guard flag is always reset
    isCreateInProgress = false;
  }
});

const validateForm = (): boolean => {
  validationErrors.action = '';
  validationErrors.subject = '';
  let isValid = true;

  if (!permissionData.action) {
    validationErrors.action = 'Action is required.';
    isValid = false;
  }
  // Basic validation for action characters
  if (permissionData.action && !/^[a-zA-Z0-9._-]+$/.test(permissionData.action)) {
    validationErrors.action = 'Action can only contain letters, numbers, underscores, hyphens, and dots.';
    isValid = false;
  }
  
  // Subject validation (ensures a selection is made)
  if (!permissionData.subject) {
    validationErrors.subject = 'Subject is required.';
    isValid = false;
  }
  return isValid;
};

const handleSubmit = () => {
  // Use the non-reactive guard to prevent multiple executions
  if (isCreateInProgress) {
    return;
  }

  apiError.value = null;
  if (!validateForm()) {
    return;
  }

  // Set the flag immediately
  isCreateInProgress = true;

  const permissionInputData: Prisma.PermissionCreateInput = {
    action: permissionData.action!,
    subject: permissionData.subject!,
    description: permissionData.description || null,
  };

  createPermission({ data: permissionInputData });
};
</script> 