<template>
  <aside class="w-64 bg-gray-800 text-white min-h-screen p-4 shadow-xl flex flex-col">
    <div>
      <div class="mb-8 text-center">
        <NuxtLink to="/" class="text-2xl font-bold hover:text-indigo-400 transition-colors duration-200">Spacovers Admin</NuxtLink>
      </div>
      <nav class="mt-4">
        <ul class="space-y-2">
          <template v-for="item in navigation" :key="item.name">
            <li v-if="!item.adminOnly || isAdmin">
              <NuxtLink 
                :to="item.href" 
                class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" 
                active-class="bg-indigo-600 text-white font-semibold"
              >
                <Icon :name="item.icon" class="mr-3 h-5 w-5" />
                {{ item.name }}
              </NuxtLink>
            </li>
          </template>
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
import { computed } from 'vue';
import { useRouter } from '#imports';
import { authClient } from '~/lib/auth-client';

// Define minimal types for session data structure
interface UserRoleInSession {
  role: {
    name: string;
  };
}

interface UserInSession {
  roles?: UserRoleInSession[];
}

interface SessionData {
  user: UserInSession | null;
}

const session = authClient.useSession() as { value: { data: SessionData | null } };
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
  }
};

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: 'heroicons:home-solid', adminOnly: false },
  { name: 'Orders', href: '/admin/orders', icon: 'heroicons:shopping-bag-solid', adminOnly: true },
  { name: 'Items', href: '/admin/items', icon: 'heroicons:cube-solid', adminOnly: true },
  { name: 'Users', href: '/admin/users', icon: 'heroicons:users-solid', adminOnly: true },
  { name: 'Roles', href: '/admin/roles', icon: 'heroicons:shield-check-solid', adminOnly: true },
  { name: 'Permissions', href: '/admin/permissions', icon: 'heroicons:key-solid', adminOnly: true },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: 'heroicons:queue-list', adminOnly: true },
];
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