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
import { ref, computed } from 'vue';
import { useRouter } from '#imports';
import { authClient } from '~/lib/auth-client';
import { useRoleBasedRouting } from '~/composables/useRoleBasedRouting';

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

const { isAdmin, isWarehouseStaff } = useRoleBasedRouting();

const menuItems = computed(() => {
  console.log('AppSidebar - isAdmin:', isAdmin.value);
  console.log('AppSidebar - isWarehouseStaff:', isWarehouseStaff.value);
  
  if (isWarehouseStaff.value) {
    // Warehouse Staff only see warehouse-related items
    return [
      { name: 'Kiosk', path: '/warehouse/kiosk', icon: 'heroicons:computer-desktop' },
      { name: 'Scanner', path: '/warehouse/scan', icon: 'heroicons:building-office-2' },
    ];
  } else if (isAdmin.value) {
    // Admin users see all admin items
    return [
      { name: 'Dashboard', path: '/', icon: 'heroicons:home' },
      { name: 'Users', path: '/admin/users', icon: 'heroicons:users' },
      { name: 'Roles', path: '/admin/roles', icon: 'heroicons:user-group' },
      { name: 'Role Types', path: '/admin/role-types', icon: 'heroicons:squares-2x2' },
      { name: 'Permissions', path: '/admin/permissions', icon: 'heroicons:key' },
      { name: 'Customers', path: '/admin/customers', icon: 'heroicons:building-storefront' },
      { name: 'Items', path: '/admin/items', icon: 'heroicons:cube' },
      { name: 'Products', path: '/admin/products', icon: 'heroicons:cube-transparent' },
      { name: 'Stations', path: '/admin/stations', icon: 'heroicons:building-office-2' },
      { name: 'Barcode Scanners', path: '/admin/barcode-scanners', icon: 'heroicons:qrcode' },
      { name: 'Estimates', path: '/admin/estimates', icon: 'heroicons:document-text' },
      { name: 'Orders', path: '/admin/orders', icon: 'heroicons:shopping-cart' },
      { name: 'Reports', path: '/admin/reports', icon: 'heroicons:chart-bar' },
      { name: 'Audit Logs', path: '/admin/audit-logs', icon: 'heroicons:book-open' },
      { name: 'Warehouse', path: '/warehouse/scan', icon: 'heroicons:building-office-2' },
      { name: 'Kiosk', path: '/warehouse/kiosk', icon: 'heroicons:computer-desktop' },
      { name: 'Settings', path: '/admin/settings', icon: 'heroicons:cog-6-tooth' },
    ];
  } else {
    // Users with no valid roles see nothing
    console.log('AppSidebar - No valid roles detected, showing no menu items');
    return [];
  }
});
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