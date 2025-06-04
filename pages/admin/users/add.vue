<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 class="text-2xl font-semibold mb-6">Add New User</h1>
      <form @submit.prevent="submitAddUser">
        <!-- User Name -->
        <div class="mb-4">
          <label for="userName" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input id="userName" v-model="newUser.name" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Full Name">
        </div>

        <!-- User Email -->
        <div class="mb-4">
          <label for="userEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="userEmail" v-model="newUser.email" type="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="user@example.com">
        </div>

        <!-- User Password -->
        <div class="mb-4">
          <label for="userPassword" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input id="userPassword" v-model="newUser.password" type="password" required autocomplete="new-password" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Min. 8 characters">
        </div>

        <!-- User Status -->
        <div class="mb-4">
          <Listbox v-model="newUser.status" name="status">
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
          <Listbox v-model="newUser.roleIds" multiple name="roles">
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
          <button type="submit" :disabled="isCreatingUser" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            {{ isCreatingUser ? 'Creating...' : 'Create User' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Listbox, ListboxButton, ListboxLabel, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { useFindManyRole } from '~/lib/hooks';
import type { UserStatus } from '@prisma-app/client';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});

const router = useRouter();
const toast = useToast();

interface StatusOption {
  value: UserStatus;
  label: string;
}

const newUser = reactive({
  name: '',
  email: '',
  password: '',
  status: 'ACTIVE' as UserStatus,
  roleIds: [] as string[]
});

const statusOptions: StatusOption[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'ARCHIVED', label: 'Archived' }
];

const selectedStatusDisplay = computed(() => {
  return statusOptions.find(s => s.value === newUser.status)?.label || 'Select status';
});

// Fetch available roles
const { data: availableRoles, isLoading: rolesLoading, error: rolesError } = useFindManyRole({
  select: { id: true, name: true }
});

// Computed property to display selected role names
const selectedRolesDisplay = computed(() => {
  if (!availableRoles.value || newUser.roleIds.length === 0) {
    return '';
  }
  return newUser.roleIds
    .map((id: string) => availableRoles.value?.find((role: { id: string; name: string }) => role.id === id)?.name)
    .filter((name?: string): name is string => !!name)
    .join(', ');
});

watch(rolesError, (newError: Error | null) => {
  if (newError) {
    toast.error({ title: 'Error', message: `Error fetching roles: ${newError?.message}` });
  }
});

const isCreatingUser = ref(false);

async function submitAddUser() {
  if (newUser.password.length < 8) {
    toast.error({ title: 'Validation Error', message: 'Password must be at least 8 characters long.' });
    return;
  }
  isCreatingUser.value = true;
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        status: newUser.status,
        roleIds: newUser.roleIds
      }
    });
    toast.success({ title: 'Success', message: 'User created successfully!' });
    router.push('/admin/users');
  } catch (err) {
    const fetchError = err as { data?: { message?: string }, message?: string };
    console.error('Error creating user:', fetchError);
    const errorMessage = fetchError.data?.message || fetchError.message || 'An unexpected error occurred.';
    toast.error({ title: 'Error Creating User', message: `Error creating user: ${errorMessage}` });
  } finally {
    isCreatingUser.value = false;
  }
}
</script> 