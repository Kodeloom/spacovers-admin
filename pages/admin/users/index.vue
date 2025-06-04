<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">User Management</h1>
      <button class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2" @click="navigateToAddUserPage">
        Add New User
      </button>
    </div>

    <!-- User Table will go here -->
    <div class="bg-white shadow-md rounded-lg overflow-x-auto">
      <div v-if="usersLoading" class="p-4 text-center text-gray-500">Loading users...</div>
      <div v-else-if="usersError" class="p-4 text-center text-red-500">Error loading users. Check console or notification.</div>
      <div v-else-if="users && users.length === 0" class="p-4 text-center text-gray-500">No users found.</div>
      <table v-else class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="user in users" :key="user.id">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ user.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ user.email }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ user.roles?.map(r => r.role.name).join(', ') || 'N/A' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
:class="[
                'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                user.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800' // ARCHIVED or other
              ]">
                {{ user.status }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button class="text-indigo-600 hover:text-indigo-900 mr-3" @click="navigateToEditUserPage(user)">Edit</button>
              <button 
                v-if="canDeleteUser(user)" 
                class="text-red-600 hover:text-red-900" 
                @click="openDeleteUserModal(user)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit User Modal will go here -->
    <!-- Delete Confirmation Modal -->
    <TransitionRoot appear :show="isDeleteUserModalOpen" as="template">
      <Dialog as="div" class="relative z-10" @close="cancelDeleteUser">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black bg-opacity-25" />
        </TransitionChild>

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                  Delete User
                </DialogTitle>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete the user "<strong>{{ selectedUserForDelete?.name }}</strong>"? This action cannot be undone.
                  </p>
                </div>

                <div class="mt-4 flex justify-end space-x-3">
                  <button
                    type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                    @click="cancelDeleteUser"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    :disabled="isDeletingUser"
                    class="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
                    @click="confirmDeleteUser"
                  >
                    {{ isDeletingUser ? 'Deleting...' : 'Delete User' }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useFindManyUser, useDeleteUser } from '~/lib/hooks'; // Removed useFindUniqueUser
import type { User } from '@prisma-app/client'; // Removed UserStatus
import { useRouter } from 'vue-router';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { authClient } from '~/lib/auth-client'; // Correct import for authClient

// Define types for clarity based on customSession plugin
interface SessionUserRole {
  role: {
    name: string;
    // permissions?: Array<{ permission: { action: string; subject: string } }>; // If needed later
  };
}

interface UserFromSession {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean | null;
  roles?: SessionUserRole[];
  // include other fields from BetterAuth user and customSession if necessary
}

// Type for users in the list, fetched by useFindManyUser
type UserWithRoles = User & {
  roles: Array<{ role: { name: string } }>;
};

// Middleware to protect the page
definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only']
});

const router = useRouter();

// Get session state using authClient
const sessionState = authClient.useSession();

// Computed properties for the logged-in user from the session
const loggedInUser = computed(() => sessionState.value?.data?.user as UserFromSession | undefined);
const loggedInUserId = computed(() => loggedInUser.value?.id);
const loggedInUserRoleNames = computed(() => {
  return loggedInUser.value?.roles
    ?.map((userRole: SessionUserRole) => userRole.role.name)
    .filter((name: string | undefined) => !!name) as string[] // Ensure name is treated as potentially undefined before filter, then cast to string[]
    || [];
});

// Fetch all users for the list
const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useFindManyUser({
  include: { roles: { select: { role: { select: { name: true } } } } }
});

const toast = useToast(); // This should now use nuxt-toast's auto-imported composable

watch(usersError, (newError: Error | null) => {
  if (newError) {
    toast.error({ title: 'Error', message: `Error fetching users: ${newError.message}` });
  }
});

function navigateToAddUserPage() {
  router.push('/admin/users/add');
}

function navigateToEditUserPage(user: UserWithRoles) { // Changed User to UserWithRoles
  router.push(`/admin/users/edit/${user.id}`);
}

const selectedUserForDelete = ref<UserWithRoles | null>(null);
const isDeleteUserModalOpen = ref(false);

const { mutateAsync: deleteUser, isPending: isDeletingUser, error: deleteUserError } = useDeleteUser();

watch(deleteUserError, (newError: Error | null) => {
  if (newError) {
    toast.error({ title: 'Error', message: `Error deleting user: ${newError.message}` });
  }
});

function openDeleteUserModal(user: UserWithRoles) {
  selectedUserForDelete.value = user;
  isDeleteUserModalOpen.value = true;
}

async function confirmDeleteUser() {
  if (!selectedUserForDelete.value) return;

  try {
    await deleteUser({ where: { id: selectedUserForDelete.value.id } });
    toast.success({ title: 'Success', message: `User '${selectedUserForDelete.value.name}' deleted successfully.` });
    isDeleteUserModalOpen.value = false;
    selectedUserForDelete.value = null;
    await refetchUsers();
  } catch (err) {
    console.error("Confirm delete user error:", err);
    isDeleteUserModalOpen.value = false;
  }
}

function cancelDeleteUser() {
  isDeleteUserModalOpen.value = false;
  selectedUserForDelete.value = null;
}

// Function to determine if the logged-in user can delete a target user
function canDeleteUser(targetUser: UserWithRoles): boolean {
  const currentUserId = loggedInUserId.value;
  const currentUserRoles = loggedInUserRoleNames.value;

  if (!currentUserId) {
    // This case should ideally be handled by auth middleware, but good for safety.
    console.warn("canDeleteUser: Logged in user ID not found in session.");
    return false;
  }

  if (targetUser.id === currentUserId) {
    return false; // Cannot delete self
  }

  const targetIsSuperAdmin = targetUser.roles?.some((ur: { role: { name: string } }) => ur.role.name === 'Super Admin');
  
  const currentUserIsSuperAdmin = currentUserRoles.includes('Super Admin');
  const currentUserIsAdmin = currentUserRoles.includes('Admin');

  if (targetIsSuperAdmin) {
    return currentUserIsSuperAdmin; // Only Super Admin can delete Super Admin
  }

  // If target is not Super Admin (and not self)
  if (currentUserIsSuperAdmin || currentUserIsAdmin) {
    return true; // Super Admins and Admins can delete non-Super Admins
  }
  
  return false; // Default deny
}

// TODO: Fetch users using useQuery and ZenStack hooks
// TODO: Implement Add User functionality (useMutation)
// TODO: Implement Edit User functionality (useMutation)
// TODO: Implement Delete User functionality (useMutation)
// TODO: Create Delete Confirmation Modal component

</script>

<style scoped>
/* Page specific styles */
</style> 