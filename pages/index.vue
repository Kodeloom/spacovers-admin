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
      <p v-if="session.data.user.roles && session.data.user.roles.length > 0">
        <strong>Roles:</strong> 
        {{ session.data.user.roles.map(userRole => userRole.role.name).join(', ') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Import authClient to get session information
import { authClient } from '~/lib/auth-client';

// authClient.useSession() returns a reactive object, likely with a .data property holding the session.
const session = authClient.useSession(); 
// The type of `session` will be something like Ref<{ data: { user: ..., session: ... } | null; isPending: boolean; ... }>
// So in the template, we use session.data.user etc.

definePageMeta({
  layout: 'default', // Will use layouts/default.vue
  middleware: ['auth-admin-only'] // Protect this page, only admins can see it.
});
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 