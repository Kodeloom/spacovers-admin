<template>
  <aside class="w-64 bg-gray-800 text-white min-h-screen p-4 shadow-xl flex flex-col">
    <div>
      <div class="mb-8 text-center">
        <NuxtLink to="/" class="text-2xl font-bold hover:text-indigo-400 transition-colors duration-200">Spacovers Admin</NuxtLink>
      </div>
      <nav>
        <ul>
          <li>
            <NuxtLink to="/" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:home-solid" class="mr-3 h-5 w-5" />
              Dashboard
            </NuxtLink>
          </li>
          <li v-if="isAdmin" class="mt-2">
            <NuxtLink to="/admin/orders" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:shopping-bag-solid" class="mr-3 h-5 w-5" />
              Orders
            </NuxtLink>
          </li>
          <li v-if="isAdmin" class="mt-2">
            <NuxtLink to="/admin/items" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:cube-solid" class="mr-3 h-5 w-5" />
              Items
            </NuxtLink>
          </li>
          <li v-if="isAdmin" class="mt-2">
            <NuxtLink to="/admin/users" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:users-solid" class="mr-3 h-5 w-5" />
              Users
            </NuxtLink>
          </li>
          <li v-if="isAdmin" class="mt-2">
            <NuxtLink to="/admin/roles" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:shield-check-solid" class="mr-3 h-5 w-5" />
              Roles
            </NuxtLink>
          </li>
          <li v-if="isAdmin" class="mt-2">
            <NuxtLink to="/admin/permissions" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
              <Icon name="heroicons:key-solid" class="mr-3 h-5 w-5" />
              Permissions
            </NuxtLink>
          </li>
          <!-- Add more items as needed -->
        </ul>
      </nav>
    </div>
    <div class="mt-auto">
      <button 
        class="flex items-center justify-center w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 transition-colors duration-200 text-white font-semibold"
        @click="handleLogout"
      >
        <Icon name="heroicons:arrow-left-on-rectangle-solid" class="mr-3 h-5 w-5" />
        Logout
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client';

// Define minimal types for session data structure
interface UserRoleInSession {
  role: {
    name: string;
  };
}

interface UserInSession {
  roles?: UserRoleInSession[];
  // other user properties if needed
}

interface SessionData {
  user: UserInSession | null;
}

const session = authClient.useSession() as { value: { data: SessionData | null } }; // Adjusted type for session value
const router = useRouter();

const isAdmin = computed(() => {
  const user = session.value?.data?.user;
  if (user && user.roles && Array.isArray(user.roles)) {
    return user.roles.some((userRole: UserRoleInSession) => userRole.role?.name === 'Admin' || userRole.role?.name === 'Super Admin');
  }
  return false;
});

const handleLogout = async () => {
  try {
    await authClient.signOut();
    router.push('/login');
  } catch (error) {
    console.error("Logout failed:", error);
    // Optionally, show an error message to the user
  }
};

</script>

<style scoped>
/* Add any specific styles for the sidebar if necessary */
.min-h-screen {
  min-height: 100vh; /* Ensure sidebar takes full viewport height */
}
.mt-auto {
  margin-top: auto;
}
</style> 