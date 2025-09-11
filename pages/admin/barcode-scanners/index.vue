<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Barcode Scanners</h1>
        <p class="text-gray-600">Manage barcode scanners and their assignments to stations and users</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
        Add Scanner
      </button>
    </div>

    <!-- Barcode Scanners Table -->
    <AppTable
      :columns="columns"
      :rows="scannersList"
      :loading="isLoading"
      :error="error"
      @update:sort="handleSort"
      @update:pagination="handlePagination"
    >
      <template #prefix-data="{ row }">
        <span class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{{ row.prefix }}</span>
      </template>
      
      <template #station-data="{ row }">
        <span class="text-sm">{{ row.station?.name || 'Office' }}</span>
      </template>
      
      <template #user-data="{ row }">
        <span class="text-sm">{{ row.user?.name || 'N/A' }}</span>
      </template>
      
      <template #isActive-data="{ row }">
        <span 
          :class="[
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            row.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          ]"
        >
          {{ row.isActive ? 'Active' : 'Inactive' }}
        </span>
      </template>
      
      <template #actions-data="{ row }">
        <div class="flex space-x-2">
          <button
            @click="openEditModal(row)"
            class="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            @click="openDeleteModal(row)"
            class="text-red-600 hover:text-red-900 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </template>
    </AppTable>

    <!-- Create/Edit Modal -->
    <AppModal
      :isOpen="isModalOpen"
      :title="isEditing ? 'Edit Barcode Scanner' : 'Add Barcode Scanner'"
      @close="closeModal"
    >
      <form @submit.prevent="saveScanner" class="space-y-4">
        <div>
          <label for="prefix" class="block text-sm font-medium text-gray-700">
            Prefix <span class="text-red-500">*</span>
          </label>
          <input
            id="prefix"
            v-model="form.prefix"
            type="text"
            required
            placeholder="e.g., S3A"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          <p class="mt-1 text-xs text-gray-500">
            Format: [Station][Person][Sequence] (e.g., S3A = Sewing, Person 3, Scanner A)
          </p>
          <div v-if="form.stationId && suggestedPrefixes.length > 0" class="mt-2">
            <p class="text-xs text-gray-600 mb-1">Suggested prefixes:</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="suggestion in suggestedPrefixes.slice(0, 6)"
                :key="suggestion"
                type="button"
                @click="form.prefix = suggestion"
                class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label for="stationId" class="block text-sm font-medium text-gray-700">
            Station <span class="text-red-500">If no station is selected, scanner will be assigned to the Office.</span>
          </label>
          <select
            id="stationId"
            v-model="form.stationId"
            :disabled="stationsLoading"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          >
            <option value="">{{ stationsLoading ? 'Loading stations...' : 'Select a station' }}</option>
            <option v-for="station in stationsList" :key="station.id" :value="station.id">
              {{ station.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="userId" class="block text-sm font-medium text-gray-700">
            User <span class="text-red-500">*</span>
          </label>
          <select
            id="userId"
            v-model="form.userId"
            required
            :disabled="usersLoading"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
          >
            <option value="">{{ usersLoading ? 'Loading users...' : 'Select a user' }}</option>
            <option v-for="user in usersList" :key="user.id" :value="user.id">
              {{ user.name }} ({{ user.email }})
            </option>
          </select>
        </div>

        <div>
          <label for="model" class="block text-sm font-medium text-gray-700">
            Scanner Model
          </label>
          <input
            id="model"
            v-model="form.model"
            type="text"
            placeholder="e.g., Honeywell 1450g"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label for="serialNumber" class="block text-sm font-medium text-gray-700">
            Serial Number
          </label>
          <input
            id="serialNumber"
            v-model="form.serialNumber"
            type="text"
            placeholder="e.g., SN123456789"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div class="flex items-center">
          <input
            id="isActive"
            v-model="form.isActive"
            type="checkbox"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label for="isActive" class="ml-2 block text-sm text-gray-900">
            Active
          </label>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal
      :isOpen="isDeleteModalOpen"
      title="Delete Barcode Scanner"
      @close="closeDeleteModal"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          Are you sure you want to delete the barcode scanner with prefix 
          <span class="font-mono font-semibold">{{ scannerToDelete?.prefix }}</span>?
          This action cannot be undone.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="closeDeleteModal"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            @click="deleteScanner"
            :disabled="isDeleting"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useFindManyBarcodeScanner, useCreateBarcodeScanner, useUpdateBarcodeScanner, useDeleteBarcodeScanner } from '~/lib/hooks/barcode-scanner';
import { useFindManyStation } from '~/lib/hooks/station';
import { useFindManyUser } from '~/lib/hooks/user';
import { getSuggestedPrefixes, validateScannerPrefix } from '~/utils/scannerUtils';

// Define middleware
definePageMeta({
  middleware: 'auth-admin-only'
});

const toast = useToast();

// Table configuration
const columns = [
  { key: 'prefix', label: 'Prefix', sortable: true },
  { key: 'station', label: 'Station', sortable: false },
  { key: 'user', label: 'User', sortable: false },
  { key: 'model', label: 'Model', sortable: true },
  { key: 'serialNumber', label: 'Serial Number', sortable: true },
  { key: 'isActive', label: 'Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
];

// Data fetching
const { data: scanners, isLoading, error, refetch } = useFindManyBarcodeScanner({
  include: {
    station: true,
    user: true
  }
});

const { data: stations, isLoading: stationsLoading } = useFindManyStation({
  orderBy: { name: 'asc' }
});
const { data: users, isLoading: usersLoading } = useFindManyUser({
  orderBy: { name: 'asc' }
});

// Debug computed properties
const stationsList = computed(() => {
  console.log('Stations data:', stations.value);
  return stations.value || [];
});

const usersList = computed(() => {
  console.log('Users data:', users.value);
  return users.value || [];
});

// Debug scanners data
const scannersList = computed(() => {
  console.log('Scanners data:', scanners.value);
  return scanners.value || [];
});

// Suggested prefixes based on selected station
const suggestedPrefixes = computed(() => {
  if (!form.value.stationId || !stationsList.value) {
    return [];
  }
  
  const selectedStation = stationsList.value.find(s => s.id === form.value.stationId);
  if (!selectedStation) {
    return [];
  }
  
  const existingPrefixes = scannersList.value.map(s => s.prefix);
  return getSuggestedPrefixes(selectedStation.name, existingPrefixes);
});

// Form state
const isModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const scannerToDelete = ref<any>(null);
const scannerToEdit = ref<any>(null);

const form = ref({
  prefix: '',
  stationId: '',
  userId: '',
  model: '',
  serialNumber: '',
  isActive: true
});

// Modal functions
function openCreateModal() {
  isEditing.value = false;
  form.value = {
    prefix: '',
    stationId: '',
    userId: '',
    model: '',
    serialNumber: '',
    isActive: true
  };
  isModalOpen.value = true;
}

function openEditModal(scanner: any) {
  isEditing.value = true;
  scannerToEdit.value = scanner;
  form.value = {
    prefix: scanner.prefix,
    stationId: scanner.stationId,
    userId: scanner.userId,
    model: scanner.model || '',
    serialNumber: scanner.serialNumber || '',
    isActive: scanner.isActive
  };
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  isEditing.value = false;
  scannerToEdit.value = null;
}

function openDeleteModal(scanner: any) {
  scannerToDelete.value = scanner;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  scannerToDelete.value = null;
}

// Mutations
const createMutation = useCreateBarcodeScanner({
  onSuccess: () => {
    toast.success({ title: 'Scanner created successfully' });
    closeModal();
    refetch();
  },
  onError: (error: any) => {
    console.error('Create scanner error:', error);
    const errorMessage = error.data?.data?.message || error.message || 'Failed to create scanner.';
    toast.error({ title: 'Error', description: errorMessage });
  },
  onSettled: () => {
    isSaving.value = false;
  }
});

const updateMutation = useUpdateBarcodeScanner({
  onSuccess: () => {
    toast.success({ title: 'Scanner updated successfully' });
    closeModal();
    refetch();
  },
  onError: (error: any) => {
    console.error('Update scanner error:', error);
    const errorMessage = error.data?.data?.message || error.message || 'Failed to update scanner.';
    toast.error({ title: 'Error', description: errorMessage });
  },
  onSettled: () => {
    isSaving.value = false;
  }
});

const deleteMutation = useDeleteBarcodeScanner({
  onSuccess: () => {
    toast.success({ title: 'Scanner deleted successfully' });
    closeDeleteModal();
    refetch();
  },
  onError: (error: any) => {
    console.error('Delete scanner error:', error);
    const errorMessage = error.data?.data?.message || error.message || 'Failed to delete scanner.';
    toast.error({ title: 'Error', description: errorMessage });
  },
  onSettled: () => {
    isDeleting.value = false;
  }
});

// CRUD operations
async function saveScanner() {
  if (isSaving.value) return; // Prevent double submission
  
  console.log('Saving scanner with data:', form.value);
  console.log('Is editing:', isEditing.value);
  
  isSaving.value = true;
  try {
    if (isEditing.value) {
      console.log('Updating scanner:', scannerToEdit.value.id);
      await updateMutation.mutateAsync({
        where: { id: scannerToEdit.value.id },
        data: form.value
      });
    } else {
      console.log('Creating new scanner');
      await createMutation.mutateAsync({
        data: form.value
      });
    }
  } catch (error) {
    console.error('Save scanner error:', error);
    // Error handling is done in the mutation callbacks
    // But ensure loading state is reset on error
    isSaving.value = false;
  }
}

async function deleteScanner() {
  if (!scannerToDelete.value) return;
  if (isDeleting.value) return; // Prevent double submission
  
  console.log('Deleting scanner:', scannerToDelete.value.id);
  
  isDeleting.value = true;
  try {
    await deleteMutation.mutateAsync({
      where: { id: scannerToDelete.value.id }
    });
  } catch (error) {
    console.error('Delete scanner error:', error);
    // Error handling is done in the mutation callbacks
    // But ensure loading state is reset on error
    isDeleting.value = false;
  }
}

// Table handlers
function handleSort(sort: any) {
  // Implement sorting logic if needed
  console.log('Sort:', sort);
}

function handlePagination(pagination: any) {
  // Implement pagination logic if needed
  console.log('Pagination:', pagination);
}

onMounted(() => {
  // Any initialization logic
});
</script>
