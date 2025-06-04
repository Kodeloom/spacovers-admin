<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Permissions Management</h1>
      <button 
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out"
        @click="handleRequestAddPermission"
      >
        <Icon name="heroicons:plus-circle" class="mr-2 h-5 w-5 inline-block align-text-bottom" />
        Add New Permission
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-10">
      <p class="text-gray-500">Loading permissions...</p>
      <!-- You can add a spinner icon here -->
    </div>
    <div v-else-if="error" class="text-center py-10 bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-600 font-semibold">Error loading permissions:</p>
      <p class="text-red-500 mt-1">{{ error.message || 'An unknown error occurred.' }}</p>
      <pre v-if="error.data" class="mt-2 text-xs text-left bg-red-50 p-2 rounded overflow-x-auto">{{ JSON.stringify(error.data, null, 2) }}</pre>
    </div>
    <div v-else-if="permissions && permissions.length > 0">
      <div class="bg-white shadow-md rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="permission in permissions" :key="permission.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ permission.action }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ permission.subject }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ permission.description || 'N/A' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 mr-4" @click="handleRequestEditPermission(permission)">Edit</button>
                <button class="text-red-600 hover:text-red-900" @click="handleRequestDeletePermission(permission)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No permissions found. Get started by adding a new permission.</p>
      <Icon name="heroicons:key-20-solid" class="mt-4 h-12 w-12 text-gray-300 mx-auto" />
    </div>

    <!-- High-Risk Action Warning Modal -->
    <AppWarningModal 
      :is-open="isWarningModalOpen"
      title="Critical Permissions Area"
      message="Modifying permissions is a high-risk operation that can affect system stability and user access. Ensure you understand the consequences."
      confirmation-phrase="PROCEED"
      confirm-button-text="I Understand, PROCEED"
      @confirmed="handleWarningConfirmed"
      @closed="closeWarningModal"
    />

    <!-- Delete Confirmation Modal (original) -->
    <AppModal :show="isDeleteModalOpen" @close="closeDeleteModal">
      <template #title>Confirm Delete Permission</template>
      <template #default>
        <p v-if="permissionToModify">
          Are you sure you want to delete the permission 
          '<strong>{{ permissionToModify.action }} - {{ permissionToModify.subject }}</strong>'? 
          This action cannot be undone.
        </p>
        <p v-else>Confirm deletion.</p>
      </template>
      <template #footer>
        <button
          type="button"
          class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          @click="closeDeleteModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="ml-3 inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          :disabled="isDeleting"
          @click="executeDeletePermission"
        >
          <Icon v-if="isDeleting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
          {{ isDeleting ? 'Deleting...' : 'Delete' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFindManyPermission, useDeletePermission } from '~/lib/hooks'; 
import type { Permission } from '@prisma-app/client';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const router = useRouter();
const toast = useToast();

const { 
  data: permissions, 
  suspense, 
  isLoading, 
  error, 
  refetch: refreshPermissions
} = useFindManyPermission({
  orderBy: [{ subject: 'asc' }, { action: 'asc' }],
});

onMounted(async () => {
  try {
    await suspense();
  } catch (e) {
    console.error("Error during initial permission fetch:", e);
  }
});

// For AppWarningModal
const isWarningModalOpen = ref(false);
const pendingAction = ref<(() => void) | null>(null); // Stores the action to execute after warning confirmation

// For AppModal (Delete Confirmation)
const isDeleteModalOpen = ref(false);
const permissionToModify = ref<Permission | null>(null); // Used for both edit and delete context for the modals

const { mutate: deletePermissionMutate, isPending: isDeleting } = useDeletePermission();

const openWarningModal = (action: () => void) => {
  pendingAction.value = action;
  isWarningModalOpen.value = true;
};

const closeWarningModal = () => {
  isWarningModalOpen.value = false;
  pendingAction.value = null;
  permissionToModify.value = null; // Clear context if warning is cancelled
};

const handleWarningConfirmed = () => {
  isWarningModalOpen.value = false;
  if (pendingAction.value) {
    pendingAction.value();
  }
  pendingAction.value = null;
  // permissionToModify is kept here as the pendingAction might need it (e.g. for opening delete modal)
};

// Request Handlers that first show the warning
const handleRequestAddPermission = () => {
  openWarningModal(() => {
    router.push('/admin/permissions/add');
  });
};

const handleRequestEditPermission = (permission: Permission) => {
  permissionToModify.value = permission;
  openWarningModal(() => {
    router.push(`/admin/permissions/edit/${permission.id}`);
  });
};

const handleRequestDeletePermission = (permission: Permission) => {
  permissionToModify.value = permission;
  openWarningModal(() => {
    isDeleteModalOpen.value = true; // Now open the actual delete confirmation modal
  });
};

// Actual Delete Logic (renamed from handleDeletePermission)
const executeDeletePermission = async () => {
  if (!permissionToModify.value || !permissionToModify.value.id || isDeleting.value) {
    toast.error({ title: 'Error', message: 'No permission selected for deletion or deletion already in progress.'});
    return;
  }
  try {
    await deletePermissionMutate({ where: { id: permissionToModify.value.id } });
    toast.success({ title: 'Success', message: `Permission '${permissionToModify.value.action} - ${permissionToModify.value.subject}' deleted successfully.`});
    await refreshPermissions();
  } catch (err: unknown) {
    console.error("Error deleting permission:", err);
    let message = 'Failed to delete permission.';
    if (err && typeof err === 'object') {
      const errorObj = err as { data?: { message?: string }, message?: string };
      message = errorObj.data?.message || errorObj.message || message;
    }
    toast.error({ title: 'Error Deleting Permission', message: message});
  } finally {
    closeDeleteModal();
  }
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  permissionToModify.value = null; // Clear context after delete modal is closed
};

</script> 