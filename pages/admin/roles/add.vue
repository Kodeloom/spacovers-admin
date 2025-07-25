<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Add New Role</h1>
      <form @submit.prevent="handleSubmit">
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-3">Role Type</label>
          <p class="text-sm text-gray-600 mb-4">Choose a role type template to get started with pre-configured permissions</p>
          
          <div v-if="isRoleTypesLoading" class="text-center py-4">
            <Icon name="svg-spinners:180-ring-with-bg" class="h-6 w-6 text-indigo-500 mx-auto" />
            <p class="text-gray-500 mt-2">Loading role types...</p>
          </div>
          
          <div v-else-if="roleTypesError" class="text-red-500 py-4">
            Error loading role types: {{ roleTypesError.message }}
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              v-for="roleType in allRoleTypes" 
              :key="roleType.id"
              :class="[
                'p-4 border-2 rounded-lg cursor-pointer transition-colors duration-200',
                selectedRoleType?.id === roleType.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
              @click="selectRoleType(roleType)"
            >
              <div class="flex items-center space-x-3 mb-2">
                <div 
                  v-if="roleType.color"
                  :style="{ backgroundColor: roleType.color }" 
                  class="w-4 h-4 rounded-full"
                />
                <h3 class="font-medium text-gray-900">{{ roleType.name }}</h3>
                <div v-if="roleType.canUseStations" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Stations
                </div>
              </div>
              <p v-if="roleType.description" class="text-sm text-gray-600">{{ roleType.description }}</p>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label for="roleName" class="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
          <input 
            id="roleName" 
            v-model.trim="roleData.name" 
            type="text" 
            required 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
          <p v-if="validationErrors.name" class="text-xs text-red-500 mt-1">{{ validationErrors.name }}</p>
        </div>

        <div class="mb-6">
          <label for="roleDescription" class="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea 
            id="roleDescription" 
            v-model.trim="roleData.description" 
            rows="3" 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Assign Stations</h2>
          <p class="text-sm text-gray-600 mb-3">Select which stations this role can work at (primarily for Warehouse Staff roles)</p>
          <div v-if="isStationsLoading" class="text-center py-4">
            <p class="text-gray-500">Loading stations...</p>
            <Icon name="svg-spinners:180-ring-with-bg" class="mt-2 h-6 w-6 text-indigo-500 mx-auto" />
          </div>
          <div v-else-if="stationsError" class="text-red-500 py-4">
            Error loading stations: {{ stationsError.message }}
          </div>
          <div v-else-if="allStations && allStations.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="station in allStations" :key="station.id" class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input 
                :id="`station-${station.id}`"
                type="checkbox"
                :checked="selectedStationIds.includes(station.id)"
                class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                @change="toggleStation(station.id)"
              >
              <label :for="`station-${station.id}`" class="flex-1 cursor-pointer">
                <div class="font-medium text-gray-900">{{ station.name }}</div>
                <div v-if="station.description" class="text-sm text-gray-500">{{ station.description }}</div>
              </label>
            </div>
          </div>
          <div v-else>
            <p class="text-gray-500 py-4">No stations available. Create stations first in the Stations management page.</p>
          </div>
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Assign Permissions</h2>
          <div v-if="isPermissionsLoading" class="text-center py-4">
            <p class="text-gray-500">Loading permissions...</p>
            <Icon name="svg-spinners:180-ring-with-bg" class="mt-2 h-6 w-6 text-indigo-500 mx-auto" />
          </div>
          <div v-else-if="permissionsError" class="text-red-500 py-4">
            Error loading permissions: {{ permissionsError.message }}
          </div>
          <div v-else-if="permissionTable.subjects.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-md">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-300">Module (Subject)</th>
                  <th v-for="action in permissionTable.actions" :key="action" scope="col" class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-300 last:border-r-0">
                    {{ action }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="subject in permissionTable.subjects" :key="subject" class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 border-r border-gray-300">{{ subject }}</td>
                  <td v-for="action in permissionTable.actions" :key="action" class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center border-r border-gray-300 last:border-r-0">
                    <template v-if="permissionTable.data.get(subject)?.[action]">
                      <input 
                        type="checkbox"
                        :checked="selectedPermissionIds.includes(permissionTable.data.get(subject)[action].id)"
                        class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                        :aria-label="`Permission for ${subject} - ${action}`"
                        @change="togglePermission(permissionTable.data.get(subject)[action].id)"
                      >
                    </template>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p class="text-gray-500 py-4">No permissions available to assign or define subjects/actions for the grid.</p>
          </div>
        </div>
        
        <div v-if="apiError" class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <p class="font-medium">Error creating role:</p>
          <p>{{ apiError }}</p>
        </div>

        <div class="flex items-center justify-end space-x-4 mt-8">
          <NuxtLink 
            to="/admin/roles" 
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
            {{ isSubmitting ? 'Creating...' : 'Create Role' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyPermission, useFindManyStation, useFindManyRoleType } from '~/lib/hooks/index';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
// import type { Permission } from '@prisma-app/client'; // Assuming GridCellPermission can be simplified or based on this. Commented out as unused.

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();

const roleData = reactive({
  name: '',
  description: '',
});

const selectedPermissionIds = ref<string[]>([]);
const selectedStationIds = ref<string[]>([]);
const selectedRoleType = ref(null);
const validationErrors = reactive({ name: '' });
const apiError = ref<string | null>(null);

const { 
  data: allPermissions, 
  isLoading: isPermissionsLoading, 
  error: permissionsError,
  suspense: permissionsSuspense 
} = useFindManyPermission({
  orderBy: [{ subject: 'asc' }, { action: 'asc' }]
});

const { 
  data: allStations, 
  isLoading: isStationsLoading, 
  error: stationsError,
  suspense: stationsSuspense 
} = useFindManyStation({
  orderBy: [{ name: 'asc' }]
});

const { 
  data: allRoleTypes, 
  isLoading: isRoleTypesLoading, 
  error: roleTypesError,
  suspense: roleTypesSuspense 
} = useFindManyRoleType({
  orderBy: [{ displayOrder: 'asc' }]
});

onMounted(async () => {
  try {
    await permissionsSuspense();
    await stationsSuspense();
    await roleTypesSuspense();
    console.log('Mounted Add Role - allPermissions.value:', JSON.parse(JSON.stringify(allPermissions.value)));
    console.log('Mounted Add Role - allStations.value:', JSON.parse(JSON.stringify(allStations.value)));
    console.log('Mounted Add Role - allRoleTypes.value:', JSON.parse(JSON.stringify(allRoleTypes.value)));
  } catch (e: unknown) {
    console.error("Error during initial data fetch for add role page:", e);
    if (e instanceof Error) {
      toast.error({ title: 'Error', message: `Failed to load data: ${e.message}` });
    }
    // Set an error state that the template can show, if errors aren't already covering it
    if ((!permissionsError.value && !stationsError.value && !roleTypesError.value) && e instanceof Error) {
      apiError.value = `Failed to load critical data: ${e.message}`;
    }
  }
});

// Permission Grid Logic (copied from edit/[id].vue)
const standardActions = ['create', 'read', 'update', 'delete'];

interface GridCellPermission {
  id: string;
  action: string;
  subject: string;
  description?: string | null;
}

const permissionTable = computed(() => {
  if (!allPermissions.value) return { subjects: [], actions: standardActions, data: new Map() };

  const subjectsMap = new Map<string, Record<string, GridCellPermission | null>>();

  for (const p of allPermissions.value) {
    if (!subjectsMap.has(p.subject)) {
      subjectsMap.set(p.subject, {});
    }
    const subjectActions = subjectsMap.get(p.subject)!;
    if (standardActions.includes(p.action)) {
      subjectActions[p.action] = { id: p.id, action: p.action, subject: p.subject, description: p.description };
    }
  }

  const sortedSubjects = Array.from(subjectsMap.keys()).sort();
  
  for (const subjectName of sortedSubjects) {
    const actions = subjectsMap.get(subjectName)!;
    for (const action of standardActions) {
      if (!(action in actions)) {
        actions[action] = null;
      }
    }
  }

  return {
    subjects: sortedSubjects,
    actions: standardActions,
    data: subjectsMap, 
  };
});

const togglePermission = (permissionId: string | undefined) => {
  if (!permissionId) return;
  const index = selectedPermissionIds.value.indexOf(permissionId);
  if (index > -1) {
    selectedPermissionIds.value.splice(index, 1);
  } else {
    selectedPermissionIds.value.push(permissionId);
  }
};

const toggleStation = (stationId: string) => {
  const index = selectedStationIds.value.indexOf(stationId);
  if (index === -1) {
    selectedStationIds.value.push(stationId);
  } else {
    selectedStationIds.value.splice(index, 1);
  }
};

// Role type selection function
const selectRoleType = (roleType: any) => {
  selectedRoleType.value = roleType;
  
  // Apply default permissions from role type
  if (roleType.defaultPermissions && allPermissions.value) {
    selectedPermissionIds.value = [];
    
    const defaults = roleType.defaultPermissions as { subjects?: string[], actions?: string[] };
    const subjects = defaults.subjects || [];
    const actions = defaults.actions || [];
    
    allPermissions.value.forEach(permission => {
      if (subjects.includes(permission.subject) && actions.includes(permission.action)) {
        selectedPermissionIds.value.push(permission.id);
      }
    });
  }
  
  // Apply default station access for warehouse roles
  if (roleType.canUseStations && allStations.value) {
    selectedStationIds.value = allStations.value.map(station => station.id);
  } else {
    selectedStationIds.value = [];
  }
  
  // Set default name if empty
  if (!roleData.name) {
    roleData.name = `New ${roleType.name}`;
  }
};

const validateForm = (): boolean => {
  validationErrors.name = '';
  let isValid = true;
  if (!roleData.name) {
    validationErrors.name = 'Role name is required.';
    isValid = false;
  }
  // Add other validations if needed
  return isValid;
};

const { mutate: createRole, isPending: isSubmitting } = useMutation({
  mutationFn: (payload: { name: string; description: string | null; permissionIds: string[]; stationIds: string[] }) => {
    return $fetch('/api/admin/roles', {
      method: 'POST',
      body: payload,
    });
  },
  onSuccess: async () => {
    toast.success({ title: 'Success', message: 'Role created successfully!' });
    await queryClient.invalidateQueries();
    router.push('/admin/roles');
  },
  onError: (err) => {
    const fetchError = err as { data?: { statusMessage?: string; message?: string; data?: Record<string, string[]> }, message?: string };
    const message = fetchError.data?.statusMessage || fetchError.data?.message || fetchError.message || 'An unexpected error occurred.';
    const validationIssues = fetchError.data?.data;
    if (validationIssues?.name) validationErrors.name = validationIssues.name.join(', ');
    
    apiError.value = message;
    toast.error({ title: 'Error Creating Role', message: message });
  },
});

const handleSubmit = () => {
  apiError.value = null;
  if (!validateForm()) {
    return;
  }
  
  const payload = {
    name: roleData.name,
    description: roleData.description || null,
    permissionIds: selectedPermissionIds.value,
    stationIds: selectedStationIds.value,
  };

  createRole(payload);
};
</script> 