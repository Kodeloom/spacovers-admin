<template>
  <aside class="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
    <div>
      <div class="mb-8 text-center">
        <NuxtLink to="/" class="text-2xl font-bold text-white hover:text-indigo-400 transition-colors duration-200">
            Spacovers Admin
        </NuxtLink>
      </div>
      <nav class="mt-4">
        <ul class="space-y-2">
          <li v-for="item in menuItems" :key="item.name">
            <NuxtLink
              :to="item.path"
              class="flex items-center w-full p-3 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors duration-200"
              :class="{ 'bg-indigo-600 text-white font-semibold': $route.path.startsWith(item.path) }"
            >
              <Icon :name="item.icon" class="w-6 h-6 mr-3" />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </li>
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
import { ref } from 'vue';
import { useRouter } from '#imports';
import { authClient } from '~/lib/auth-client';

const router = useRouter();

const handleLogout = async () => {
  try {
    await authClient.signOut();
    router.push('/login');
  }
  catch (error) {
    console.error('Logout failed:', error);
  }
};

const menuItems = ref([
  { name: 'Dashboard', path: '/', icon: 'heroicons:home' },
  { name: 'Users', path: '/admin/users', icon: 'heroicons:users' },
  { name: 'Roles', path: '/admin/roles', icon: 'heroicons:user-group' },
  { name: 'Permissions', path: '/admin/permissions', icon: 'heroicons:key' },
  { name: 'Customers', path: '/admin/customers', icon: 'heroicons:building-storefront' },
  { name: 'Items', path: '/admin/items', icon: 'heroicons:cube' },
  { name: 'Estimates', path: '/admin/estimates', icon: 'heroicons:document-text' },
  { name: 'Orders', path: '/admin/orders', icon: 'heroicons:shopping-cart' },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: 'heroicons:book-open' },
  { name: 'Settings', path: '/admin/settings', icon: 'heroicons:cog-6-tooth' },
]);
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