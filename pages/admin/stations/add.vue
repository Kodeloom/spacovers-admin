<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Add New Station</h1>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="stationName" class="block text-sm font-medium text-gray-700 mb-1">Station Name</label>
          <input 
            id="stationName" 
            v-model.trim="stationData.name" 
            type="text" 
            required 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
          <p v-if="validationErrors.name" class="text-xs text-red-500 mt-1">{{ validationErrors.name }}</p>
        </div>

        <div class="mb-4">
          <label for="stationBarcode" class="block text-sm font-medium text-gray-700 mb-1">Barcode (Optional)</label>
          <input 
            id="stationBarcode" 
            v-model.trim="stationData.barcode" 
            type="text" 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
          <p v-if="validationErrors.barcode" class="text-xs text-red-500 mt-1">{{ validationErrors.barcode }}</p>
        </div>

        <div class="mb-6">
          <label for="stationDescription" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea 
            id="stationDescription" 
            v-model.trim="stationData.description" 
            rows="3" 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Assign Roles</h2>
          <div v-if="isRolesLoading" class="text-center py-4">
            <p class="text-gray-500">Loading roles...</p>
            <Icon name="svg-spinners:180-ring-with-bg" class="mt-2 h-6 w-6 text-indigo-500 mx-auto" />
          </div>
          <div v-else-if="rolesError" class="text-red-500 py-4">
            Error loading roles: {{ rolesError.message }}
          </div>
          <div v-else-if="allRoles && allRoles.length > 0" class="space-y-2">
            <div v-for="role in allRoles" :key="role.id" class="flex items-center">
              <input 
                :id="`role-${role.id}`"
                type="checkbox"
                :checked="selectedRoleIds.includes(role.id)"
                class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                @change="toggleRole(role.id)"
              >
              <label :for="`role-${role.id}`" class="ml-2 text-sm text-gray-700">
                {{ role.name }}
                <span v-if="role.description" class="text-gray-500">- {{ role.description }}</span>
              </label>
            </div>
          </div>
          <div v-else>
            <p class="text-gray-500 py-4">No roles available to assign.</p>
          </div>
        </div>
        
        <div v-if="apiError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <p class="font-medium">Error creating station:</p>
          <p>{{ apiError }}</p>
        </div>

        <div class="flex items-center justify-end space-x-4 mt-8">
          <NuxtLink 
            to="/admin/stations" 
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition duration-150 ease-in-out"
          >
            Cancel
          </NuxtLink>
          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
          >
            <Icon v-if="isSubmitting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
            {{ isSubmitting ? 'Creating...' : 'Create Station' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyRole } from '~/lib/hooks/index';
import { useMutation, useQueryClient } from '@tanstack/vue-query';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();

const stationData = reactive({
  name: '',
  barcode: '',
  description: '',
});

const selectedRoleIds = ref<string[]>([]);
const validationErrors = reactive({ 
  name: '',
  barcode: '' 
});
const apiError = ref<string | null>(null);

const { 
  data: allRoles, 
  isLoading: isRolesLoading, 
  error: rolesError,
  suspense: rolesSuspense 
} = useFindManyRole({
  orderBy: { name: 'asc' }
});

onMounted(async () => {
  try {
    await rolesSuspense();
    console.log('Mounted Add Station - allRoles.value:', JSON.parse(JSON.stringify(allRoles.value)));
  } catch (e: unknown) {
    console.error("Error during initial role fetch for add station page:", e);
    if (e instanceof Error) {
      toast.error({ title: 'Error', message: `Failed to load roles: ${e.message}` });
    }
    if (!rolesError.value && e instanceof Error) {
      apiError.value = `Failed to load critical role data: ${e.message}`;
    }
  }
});

const toggleRole = (roleId: string) => {
  const index = selectedRoleIds.value.indexOf(roleId);
  if (index > -1) {
    selectedRoleIds.value.splice(index, 1);
  } else {
    selectedRoleIds.value.push(roleId);
  }
};

const validateForm = (): boolean => {
  validationErrors.name = '';
  validationErrors.barcode = '';
  let isValid = true;
  
  if (!stationData.name) {
    validationErrors.name = 'Station name is required.';
    isValid = false;
  }
  
  return isValid;
};

const { mutate: createStation, isPending: isSubmitting } = useMutation({
  mutationFn: (payload: { 
    name: string; 
    barcode: string | null; 
    description: string | null; 
    roleIds: string[] 
  }) => {
    return $fetch('/api/admin/stations', {
      method: 'POST',
      body: payload,
    });
  },
  onSuccess: async () => {
    toast.success({ title: 'Success', message: 'Station created successfully!' });
    await queryClient.invalidateQueries();
    router.push('/admin/stations');
  },
  onError: (err) => {
    const fetchError = err as { 
      data?: { 
        statusMessage?: string; 
        message?: string; 
        data?: Record<string, string[]> 
      }, 
      message?: string 
    };
    const message = fetchError.data?.statusMessage || fetchError.data?.message || fetchError.message || 'An unexpected error occurred.';
    const validationIssues = fetchError.data?.data;
    
    if (validationIssues?.name) validationErrors.name = validationIssues.name.join(', ');
    if (validationIssues?.barcode) validationErrors.barcode = validationIssues.barcode.join(', ');
    
    apiError.value = message;
    toast.error({ title: 'Error Creating Station', message: message });
  },
});

const handleSubmit = () => {
  apiError.value = null;
  if (!validateForm()) {
    return;
  }
  
  const payload = {
    name: stationData.name,
    barcode: stationData.barcode || null,
    description: stationData.description || null,
    roleIds: selectedRoleIds.value
  };

  createStation(payload);
};
</script> 