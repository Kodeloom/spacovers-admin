<template>
  <nav class="bg-gray-800 text-white p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <NuxtLink to="/" class="text-xl font-semibold hover:text-gray-300">Warehouse Admin</NuxtLink>
      
      <div class="space-x-4 flex items-center">
        <NuxtLink to="/" class="hover:text-gray-300" active-class="font-bold text-indigo-400">Dashboard</NuxtLink>
        <NuxtLink to="/admin/roles" class="hover:text-gray-300" active-class="font-bold text-indigo-400">Roles</NuxtLink>
        <!-- Add more links as sections are built -->
        <!-- e.g., <NuxtLink to="/admin/users" class="hover:text-gray-300">Users</NuxtLink> -->

        <button 
          v-if="isAuthenticated" 
          class="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md text-sm font-medium"
          @click="handleLogout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { authClient } from '~/lib/auth-client';

const router = useRouter();

// Use authClient.status for reactivity if it's a ref, or derive from session
// Assuming authClient.useSession() gives us the most reliable reactive state for UI.
const sessionState = authClient.useSession();
const isAuthenticated = computed(() => !!sessionState.value?.data?.user);

async function handleLogout() {
  try {
    await authClient.signOut();
    // After successful sign out, Better-Auth typically clears the session cookie.
    // Redirect to login page.
    router.push('/login');
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}
</script>

<style scoped>
.container {
  max-width: 1280px;
}
</style> 