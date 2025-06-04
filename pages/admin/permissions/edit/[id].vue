<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="isLoading || !permissionData" class="text-center py-10">
      <p class="text-gray-500">{{ isLoading ? 'Loading permission details...' : 'Permission not found or an error occurred.' }}</p>
      <Icon v-if="isLoading" name="svg-spinners:180-ring-with-bg" class="mt-4 h-8 w-8 text-indigo-500 mx-auto" />
    </div>
    <div v-else-if="fetchError" class="text-center py-10 bg-red-50 border border-red-200 rounded-md p-4 max-w-2xl mx-auto">
      <p class="text-red-600 font-semibold">Error loading permission:</p>
      <p class="text-red-500 mt-1">{{ fetchError.message || 'An unknown error occurred.' }}</p>
    </div>
    <div v-else class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Edit Permission</h1>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="action" class="block text-sm font-medium text-gray-700 mb-1">Action</label>
          <input 
            id="action" 
            v-model.trim="editablePermissionData.action" 
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
            v-model="editablePermissionData.subject" 
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="" disabled>Select a subject</option>
            <option v-for="subject_opt in availableSubjects" :key="subject_opt" :value="subject_opt">
              {{ subject_opt }}
            </option>
          </select>
           <p v-if="validationErrors.subject" class="text-xs text-red-500 mt-1">{{ validationErrors.subject }}</p>
        </div>

        <div class="mb-6">
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea 
            id="description" 
            v-model.trim="editablePermissionData.description" 
            rows="3" 
            placeholder="Briefly describe what this permission allows"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div v-if="apiError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <p class="font-medium">Error updating permission:</p>
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
            :disabled="isUpdating"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
          >
            <Icon v-if="isUpdating" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
            {{ isUpdating ? 'Updating...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFindUniquePermission, useUpdatePermission } from '~/lib/hooks';
import { useToast } from 'vue-toastification';
import type { Prisma, Permission } from '@prisma-app/client';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const permissionId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;

const availableSubjects = [
  'Customer',
  'Item',
  'ItemProcessingLog',
  'Order',
  'Role',
  'Station',
  'User',
].sort();

const editablePermissionData = reactive<{
  action?: string | null; 
  subject?: string | null; 
  description?: string | null;
}>({
  action: '',
  subject: '', // Initialize for select
  description: '',
});

const validationErrors = reactive({
  action: '',
  subject: '',
});
const apiError = ref<string | null>(null);

// Fetch existing permission data
const { 
  data: permissionData, 
  isLoading, 
  error: fetchError,
  suspense 
} = useFindUniquePermission({ where: { id: permissionId } }, { enabled: !!permissionId });


onMounted(async () => {
  if (permissionId) {
    try {
      await suspense(); // Wait for initial data to load if ID is present
      if (permissionData.value) {
        editablePermissionData.action = permissionData.value.action;
        editablePermissionData.subject = permissionData.value.subject;
        editablePermissionData.description = permissionData.value.description || '';
      }
    } catch (e) {
      console.error("Error fetching permission for editing:", e);
      // fetchError ref should capture this
    }
  } else {
    toast.error("Permission ID is missing.");
    router.push("/admin/permissions");
  }
});

// Watch for changes in fetched data and update form (if data arrives after initial mount)
watch(permissionData, (newData: Permission | null | undefined) => {
  if (newData) {
    editablePermissionData.action = newData.action;
    editablePermissionData.subject = newData.subject;
    editablePermissionData.description = newData.description || '';
  }
}, { immediate: false });


const { mutate: updatePermission, isPending: isUpdating, error: updateErrorData } = useUpdatePermission();

const validateForm = (): boolean => {
  validationErrors.action = '';
  validationErrors.subject = '';
  let isValid = true;
  if (!editablePermissionData.action) {
    validationErrors.action = 'Action is required.';
    isValid = false;
  }
  if (editablePermissionData.action && !/^[a-zA-Z0-9._-]+$/.test(String(editablePermissionData.action))) {
    validationErrors.action = 'Action can only contain letters, numbers, underscores, hyphens, and dots.';
    isValid = false;
  }
  if (!editablePermissionData.subject) {
    validationErrors.subject = 'Subject is required.';
    isValid = false;
  }
  return isValid;
};

const handleSubmit = async () => {
  apiError.value = null;
  if (!validateForm() || !permissionId) {
    return;
  }

  try {
    // Construct payload with only changed fields
    // Corrected type to Prisma.PermissionUpdateInput
    const payload: Prisma.PermissionUpdateInput = {}; 
    if (editablePermissionData.action !== permissionData.value?.action) {
        payload.action = editablePermissionData.action as string;
    }
    if (editablePermissionData.subject !== permissionData.value?.subject) {
        payload.subject = editablePermissionData.subject as string;
    }
    // Ensure description is explicitly set to null if cleared, or to the new value
    const originalDescription = permissionData.value?.description || null; // Treat empty string from form as potentially null
    const newDescription = editablePermissionData.description || null;
    if (newDescription !== originalDescription) {
      payload.description = newDescription;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes detected.");
      router.push('/admin/permissions');
      return;
    }

    await updatePermission({ 
      where: { id: permissionId }, 
      data: payload 
    });

    if (updateErrorData.value) {
      const err = updateErrorData.value as { data?: { message?: string }, message?: string };
      const message = err.data?.message || err.message || 'An unknown error occurred during permission update.';
      apiError.value = message;
      toast.error(message);
      return;
    }

    toast.success('Permission updated successfully!');
    router.push('/admin/permissions');
  } catch (err: unknown) {
    console.error("Error updating permission:", err);
    let message = 'Failed to update permission. Please try again.';
    if (err && typeof err === 'object') {
      const errorObj = err as { data?: { message?: string }, message?: string, error?: {message?: string}, toString?: () => string };
      if (errorObj.data?.message) message = errorObj.data.message;
      else if (errorObj.message) message = errorObj.message;
      else if (errorObj.error?.message) message = errorObj.error.message;
       else if (errorObj.toString && typeof errorObj.toString === 'function') {
        const errStr = errorObj.toString();
        if (errStr !== '[object Object]') message = errStr;
      }
    }
    apiError.value = message;
    toast.error(message);
  }
};
</script> 