<template>
  <div class="container mx-auto px-4 py-8">
    <div v-if="isRoleLoading || isPermissionsLoading" class="text-center py-10">
      <p class="text-gray-500">Loading role details and permissions...</p>
      <Icon name="svg-spinners:180-ring-with-bg" class="mt-4 h-8 w-8 text-indigo-500 mx-auto" />
    </div>
    <div v-else-if="roleError || permissionsError" class="text-center py-10 bg-red-50 border border-red-200 rounded-md p-4 max-w-2xl mx-auto">
      <p class="text-red-600 font-semibold">Error loading data:</p>
      <p v-if="roleError" class="text-red-500 mt-1">Role: {{ roleError.message || 'Unknown error' }}</p>
      <p v-if="permissionsError" class="text-red-500 mt-1">Permissions: {{ permissionsError.message || 'Unknown error' }}</p>
    </div>
    <div v-else-if="!role" class="text-center py-10">
      <p class="text-gray-500">Role not found.</p>
      <NuxtLink to="/admin/roles" class="mt-4 inline-block text-indigo-600 hover:text-indigo-800">Go back to Roles</NuxtLink>
    </div>
    <div v-else class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Edit Role: {{ role.name }}</h1>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="roleName" class="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
          <input 
            id="roleName" 
            v-model.trim="editableRoleData.name" 
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
            v-model.trim="editableRoleData.description" 
            rows="3" 
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
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
          <p class="font-medium">Error updating role:</p>
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
            :disabled="isUpdating"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
          >
            <Icon v-if="isUpdating" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
            {{ isUpdating ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFindUniqueRole, useFindManyPermission } from '~/lib/hooks';
// Import the actual types directly, avoid re-aliasing if it confuses the linter
import type { Permission, RolePermission as PrismaRolePermissionModel } from '@prisma-app/client'; 

// Define a more specific type for Role with its included relations
// interface RoleWithIncludedPermissions extends Role { // Extends the direct 'Role' type
//   permissions: PopulatedRolePermission[];
// }

// Type for individual RolePermission entry with nested Permission
interface PopulatedRolePermission extends PrismaRolePermissionModel { // Extends the direct 'RolePermission' type
  permission: Permission; // Uses the direct 'Permission' type
}

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const roleId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;

const editableRoleData = reactive({
  name: '',
  description: '' as string | null,
});

const selectedPermissionIds = ref<string[]>([]);
const validationErrors = reactive({ name: '' });
const apiError = ref<string | null>(null);
const isUpdating = ref(false);

const { 
  data: role, // Type will be Ref<RoleWithIncludedPermissions | undefined>
  isLoading: isRoleLoading, 
  error: roleError,
  suspense: roleSuspense
} = useFindUniqueRole({
  where: { id: roleId },
  include: { permissions: { include: { permission: true } } } 
}, { enabled: !!roleId });

const { 
  data: allPermissions, // Type will be Ref<Permission[] | undefined>
  isLoading: isPermissionsLoading, 
  error: permissionsError,
  suspense: permissionsSuspense
} = useFindManyPermission({
    orderBy: [{ subject: 'asc' }, { action: 'asc' }]
});

// ---- NEW CODE FOR PERMISSION GRID ----
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
    // Ensure we only map actions that are part of our standardActions columns
    if (standardActions.includes(p.action)) {
      subjectActions[p.action] = { id: p.id, action: p.action, subject: p.subject, description: p.description };
    }
  }

  const sortedSubjects = Array.from(subjectsMap.keys()).sort();
  
  // Ensure all standard actions are present as keys for each subject, even if null, for consistent grid structure
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
// ---- END NEW CODE ----

onMounted(async () => {
  if (!roleId) {
    toast.error({ title: 'Error', message: "Role ID is missing." });
    router.push("/admin/roles");
    return;
  }
  try {
    await Promise.all([roleSuspense(), permissionsSuspense()]);
    
    console.log('Mounted - role.value:', JSON.parse(JSON.stringify(role.value)));
    console.log('Mounted - allPermissions.value:', JSON.parse(JSON.stringify(allPermissions.value)));

    const currentRole = role.value; // Keep as is, assuming type RoleWithIncludedPermissions | undefined
    if (currentRole) {
      editableRoleData.name = currentRole.name; 
      editableRoleData.description = currentRole.description || ''; 
      if (currentRole.permissions) {
        selectedPermissionIds.value = currentRole.permissions.map((rp: PopulatedRolePermission) => rp.permissionId); 
      }
    } else if (!isRoleLoading.value && !roleError.value) {
        toast.error({ title: 'Error', message: 'Role not found.' });
        router.push('/admin/roles');
    }
  } catch (e: unknown) { // Catch as unknown
    console.error("Error during initial data fetch for edit role page:", e);
    // Handle or display error to user if necessary, e.g. via a toast
    if (e instanceof Error) {
      toast.error({ title: 'Error', message: `Failed to load role data: ${e.message}` });
    }
  }
});

// ... watch and handleSubmit functions would follow ...
// The provided snippet seems to be incomplete. I am adding the closing part of the script.

watch(role, (currentRole) => {
    if (currentRole) {
        editableRoleData.name = currentRole.name;
        editableRoleData.description = currentRole.description || '';
        if (currentRole.permissions) {
          selectedPermissionIds.value = currentRole.permissions.map((rp: PopulatedRolePermission) => rp.permissionId);
        }
    }
}, { immediate: true });

function validate() {
  let isValid = true;
  validationErrors.name = '';

  if (!editableRoleData.name) {
    validationErrors.name = 'Role name is required.';
    isValid = false;
  }
  return isValid;
}

const handleSubmit = async () => {
  apiError.value = null;
  validationErrors.name = '';
  if (!editableRoleData.name) {
    validationErrors.name = 'Role name cannot be empty.';
    return;
  }
  
  isUpdating.value = true;
  
  try {
    const payload = {
      data: {
        name: editableRoleData.name,
        description: editableRoleData.description === null ? undefined : editableRoleData.description,
        permissionIds: selectedPermissionIds.value,
      },
    };

    console.log("Submitting payload:", JSON.stringify(payload, null, 2));

    await $fetch(`/api/model/role/${roleId}`, {
      method: 'PUT',
      body: payload,
    });
    
    toast.success({ title: 'Success', message: `Role "${editableRoleData.name}" updated successfully.` });
    router.push('/admin/roles');

  } catch (error: any) {
    console.error('Error updating role:', error);
    apiError.value = error.data?.message || error.message || 'An unexpected error occurred.';
    toast.error({ title: 'Update Failed', message: apiError.value });
  } finally {
    isUpdating.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles for the edit page */
</style> 