<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div v-if="userLoading || !userData" class="text-center py-10">
      <p class="text-gray-500">{{ userLoading ? 'Loading user details...' : 'User not found or initial load pending.' }}</p>
      <!-- Optional: Add a spinner here -->
    </div>
    <div v-else-if="userError" class="text-center py-10">
      <p class="text-red-500">Error loading user: {{ userError.message }}</p>
      <NuxtLink to="/admin/users" class="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Back to User List</NuxtLink>
    </div>
    <div v-else class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 class="text-2xl font-semibold mb-6">Edit User: {{ userData.name }}</h1>
      <form @submit.prevent="submitUpdateUser">
        <!-- User Name -->
        <div class="mb-4">
          <label for="userName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input id="userName" v-model="editableUser.name" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>

        <!-- User Email -->
        <div class="mb-4">
          <label for="userEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="userEmail" v-model="editableUser.email" type="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
        </div>

        <!-- Change Password Section -->
        <div class="mb-4 border-t pt-4 mt-4">
          <div class="flex items-center">
            <input id="changePasswordCheck" v-model="changePassword" type="checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
            <label for="changePasswordCheck" class="ml-2 block text-sm font-medium text-gray-700">Change Password</label>
          </div>
        </div>

        <template v-if="changePassword">
          <!-- New Password -->
          <div class="mb-4">
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input id="newPassword" v-model="editableUser.password" type="password" :required="changePassword" autocomplete="new-password" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Min. 8 characters">
          </div>
          <!-- Confirm New Password -->
          <div class="mb-4">
            <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input id="confirmNewPassword" v-model="editableUser.confirmPassword" type="password" :required="changePassword" autocomplete="new-password" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>
        </template>

        <!-- User Status -->
        <div class="mb-4">
          <Listbox v-model="editableUser.status" name="status">
            <ListboxLabel class="block text-sm font-medium text-gray-700 mb-1">Status</ListboxLabel>
            <div class="relative mt-1">
              <ListboxButton class="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                <span class="block truncate">{{ selectedStatusDisplay }}</span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <Icon name="heroicons:chevron-up-down" class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </ListboxButton>
              <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  <ListboxOption
                    v-for="statusOpt in statusOptions"
                    :key="statusOpt.value"
                    v-slot="{ active, selected }"
                    :value="statusOpt.value"
                    as="template"
                  >
                    <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-10 pr-4']">
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ statusOpt.label }}</span>
                      <span v-if="selected" :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 left-0 flex items-center pl-3']">
                        <Icon name="heroicons:check" class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </transition>
            </div>
          </Listbox>
        </div>
        
        <!-- User Roles -->
        <div class="mb-6">
          <Listbox v-model="editableUser.roleIds" multiple name="roles">
            <ListboxLabel class="block text-sm font-medium text-gray-700 mb-1">Roles</ListboxLabel>
            <div class="relative mt-1">
              <ListboxButton class="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                <span class="block truncate">
                  {{ selectedRolesDisplay || 'Select roles' }}
                </span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <Icon name="heroicons:chevron-up-down" class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </ListboxButton>

              <transition leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                <ListboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  <div v-if="rolesLoading" class="px-3 py-2 text-sm text-gray-500">Loading roles...</div>
                  <div v-else-if="rolesError" class="px-3 py-2 text-sm text-red-500">Error loading roles.</div>
                  <ListboxOption
                    v-for="role in availableRoles"
                    v-else
                    :key="role.id"
                    v-slot="{ active, selected }"
                    :value="role.id"
                    as="template"
                  >
                    <li :class="[active ? 'bg-indigo-600 text-white' : 'text-gray-900', 'relative cursor-default select-none py-2 pl-10 pr-4']">
                      <span :class="[selected ? 'font-semibold' : 'font-normal', 'block truncate']">{{ role.name }}</span>
                      <span v-if="selected" :class="[active ? 'text-white' : 'text-indigo-600', 'absolute inset-y-0 left-0 flex items-center pl-3']">
                        <Icon name="heroicons:check" class="h-5 w-5" aria-hidden="true" />
                      </span>
                    </li>
                  </ListboxOption>
                </ListboxOptions>
              </transition>
            </div>
          </Listbox>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end space-x-3">
          <NuxtLink to="/admin/users" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</NuxtLink>
          <button type="submit" :disabled="isUpdatingUser" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ isUpdatingUser ? 'Updating...' : 'Update User' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Listbox, ListboxButton, ListboxLabel, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { useFindUniqueUser, useFindManyRole } from '~/lib/hooks';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import type { User, UserStatus } from '@prisma-app/client';

// Define interface for status options for clarity
interface StatusOption {
  value: UserStatus;
  label: string;
}

// Define a more specific type for the role object coming from the include in useFindUniqueUser
interface UserRoleWithIdAndName {
  roleId: string;
  role?: { // role might be optional depending on exact query success or prisma version nuances
    id: string;
    name: string;
  } | null;
}

// Define a more specific type for the user data including the roles structure
// This should align with the `include` used in `useFindUniqueUser`
interface UserDataForEditForm extends Omit<User, 'roles'> { // Omit original roles if it has a different type
  roles?: UserRoleWithIdAndName[];
}

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const userId = route.params.id as string;

const changePassword = ref(false);

const editableUser = reactive({
  name: '',
  email: '',
  status: 'ACTIVE' as UserStatus,
  roleIds: [] as string[],
  password: '',
  confirmPassword: ''
});

const statusOptions: StatusOption[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' }
];

// Fetch user data
const { 
  data: userData, 
  isLoading: userLoading, 
  error: userError, 
  refetch: _refetchUser // Prefixed with underscore to indicate it's intentionally unused
} = useFindUniqueUser({
  where: { id: userId },
  include: { roles: { select: { roleId: true, role: { select: { name: true, id: true }} } } } // Fetch role names for display if needed later, and IDs
});

// Fetch available roles for the dropdown
const { data: availableRoles, isLoading: rolesLoading, error: rolesError } = useFindManyRole({
  select: { id: true, name: true } // Select only necessary fields
});

// Populate form when userData is loaded
watch(userData, (currentUserData?: UserDataForEditForm | null) => {
  if (currentUserData) {
    editableUser.name = currentUserData.name || '';
    editableUser.email = currentUserData.email || '';
    editableUser.status = currentUserData.status as UserStatus;
    editableUser.roleIds = currentUserData.roles?.map((ur: UserRoleWithIdAndName) => ur.roleId) || [];
  }
}, { immediate: true });

// Computed property for displaying selected status label
const selectedStatusDisplay = computed(() => {
  return statusOptions.find(s => s.value === editableUser.status)?.label || 'Select status';
});

// Computed property for displaying selected role names
const selectedRolesDisplay = computed(() => {
  if (!availableRoles.value || editableUser.roleIds.length === 0) {
    return '';
  }
  return editableUser.roleIds
    .map((id: string) => availableRoles.value?.find((role: { id: string; name: string }) => role.id === id)?.name)
    .filter((name?: string): name is string => !!name)
    .join(', ');
});

// Watch for errors during user or role fetching
watch(userError, (newError: Error | null) => {
  if (newError) toast.error({ title: 'Error', message: `Error fetching user: ${newError.message}` });
});
watch(rolesError, (newError: Error | null) => {
  if (newError) toast.error({ title: 'Error', message: `Error fetching roles: ${newError.message}` });
});

const { mutate: updateUser, isPending: isUpdatingUser } = useMutation({
  mutationFn: (vars: typeof editableUser) => {
    const payload: {
      name: string;
      email: string;
      status: UserStatus;
      roleIds: string[];
      password?: string;
    } = {
      name: vars.name,
      email: vars.email,
      status: vars.status,
      roleIds: vars.roleIds,
    };
    if (changePassword.value) {
      payload.password = vars.password;
    }
    return $fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: payload,
    });
  },
  onSuccess: async () => {
    toast.success({ title: 'Success', message: 'User updated successfully!' });
    await queryClient.invalidateQueries();
    router.push('/admin/users');
  },
  onError: (err) => {
    const fetchError = err as { data?: { message?: string }, message?: string };
    const errorMessage = fetchError.data?.message || fetchError.message || 'An unexpected error occurred.';
    toast.error({ title: 'Error Updating User', message: `Error: ${errorMessage}` });
  },
});

function submitUpdateUser() {
  if (changePassword.value) {
    if (editableUser.password.length < 8) {
      toast.error({ title: 'Validation Error', message: 'New password must be at least 8 characters long.'});
      return;
    }
    if (editableUser.password !== editableUser.confirmPassword) {
      toast.error({ title: 'Validation Error', message: 'New passwords do not match.'});
      return;
    }
  }

  updateUser(editableUser);
}
</script> 