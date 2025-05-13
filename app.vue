<template>
  <div>
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { provideHooksContext } from '~/lib/hooks'; // Adjust path if your output is different

// Provide TanStack Query context
// Use an absolute endpoint so server-side fetch works too.
// Ensure this matches your actual API base URL if not localhost:3000 in all environments.
const runtimeConfig = useRuntimeConfig();
const baseUrl = runtimeConfig.public.appUrl || 'http://localhost:3000'; 

provideHooksContext({
    endpoint: `${baseUrl}/api/model`,
});
</script>
