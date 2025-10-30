<template>
  <div class="p-4">
    <!-- Breadcrumb Navigation -->
    <AppBreadcrumb :items="breadcrumbItems" />

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">
        Print Queue Management
      </h1>
      <div class="text-sm text-gray-600">
        Shared queue with FIFO ordering
      </div>
    </div>

    <!-- Print Queue Manager Component -->
    <PrintQueueManager />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth-office-admin'],
})

// Breadcrumb navigation
const breadcrumbItems = [
  { name: 'Dashboard', path: '/', icon: 'heroicons:home' },
  { name: 'Print Queue', path: '/admin/print-queue-new' }
]
</script>