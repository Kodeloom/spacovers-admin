<template>
  <div class="p-4">
    <h1 class="text-2xl font-semibold">Welcome to the Warehouse Administrator Dashboard</h1>
    <p class="mt-2 text-gray-600">
      This is your central hub for managing warehouse operations.
    </p>
    <p class="mt-4">
      You can navigate to different sections using the menu above.
    </p>
    
    <!-- Access session data via session.data?.user -->
    <div v-if="session?.data?.user" class="mt-6 p-4 border rounded-md bg-gray-50">
      <h2 class="text-lg font-medium">User Information:</h2>
      <p><strong>Name:</strong> {{ session.data.user.name }}</p>
      <p><strong>Email:</strong> {{ session.data.user.email }}</p>
      <p v-if="userRolesDisplay">
        <strong>Roles:</strong> 
        {{ userRolesDisplay }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { authClient } from '~/lib/auth-client';

// Define a minimal type for what we expect in user.roles for display
interface UserRoleForDisplay {
  role: {
    name: string;
  };
}

const session = authClient.useSession();

const userRolesDisplay = computed(() => {
  const user = session.value?.data?.user;
  if (user && user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    // Explicitly type userRole here
    return (user.roles as UserRoleForDisplay[])
      .map((userRole: UserRoleForDisplay) => userRole.role.name)
      .join(', ');
  }
  return '';
});

definePageMeta({
  layout: 'default', // Will use layouts/default.vue
  middleware: ['auth-required'] // Changed from auth-admin-only to auth-required
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 