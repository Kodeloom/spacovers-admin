<template>
  <aside class="w-64 bg-gray-800 text-white min-h-screen p-4 shadow-xl">
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
        <li class="mt-2">
          <NuxtLink to="/admin/orders" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
            <Icon name="heroicons:shopping-bag-solid" class="mr-3 h-5 w-5" />
            Orders
          </NuxtLink>
        </li>
        <li class="mt-2">
          <NuxtLink to="/admin/items" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
            <Icon name="heroicons:cube-solid" class="mr-3 h-5 w-5" />
            Items
          </NuxtLink>
        </li>
        <li class="mt-2">
          <NuxtLink to="/admin/users" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
            <Icon name="heroicons:users-solid" class="mr-3 h-5 w-5" />
            Users
          </NuxtLink>
        </li>
        <li class="mt-2">
          <NuxtLink to="/admin/roles" class="flex items-center py-2.5 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200" active-class="bg-indigo-600 text-white font-semibold">
            <Icon name="heroicons:shield-check-solid" class="mr-3 h-5 w-5" />
            Roles
          </NuxtLink>
        </li>
        <!-- Add more items as needed -->
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
// Nuxt Icon component is auto-imported
// If you need specific logic, add it here
</script>

<style scoped>
/* Add any specific styles for the sidebar if necessary */
.min-h-screen {
  min-height: 100vh; /* Ensure sidebar takes full viewport height */
}
</style> 