<template>
  <div class="flex min-h-screen bg-gray-100">
    <AppSidebar />
    <div class="flex-1 flex flex-col">
      <main class="flex-1 container mx-auto p-4">
        <slot />
      </main>
      <!-- You could add a footer here later if needed -->
      <!-- 
    <footer class="bg-gray-200 text-center p-4 mt-8">
      <p>&copy; {{ new Date().getFullYear() }} Warehouse Administrator</p>
    </footer> 
    -->
    </div>
  </div>
</template>

<script setup lang="ts">
// Import TheNavbar component. Nuxt 3 auto-imports components from the ~/components directory.
// So, an explicit import might not be strictly necessary if auto-import is working,
// but it can be good for clarity or if auto-import has issues.
// import TheNavbar from '~/components/TheNavbar.vue'; 

// AppSidebar should also be auto-imported if placed in ~/components
// import AppSidebar from '~/components/AppSidebar.vue';
</script>

<style scoped>
.container {
  max-width: 1280px;
}
</style> 