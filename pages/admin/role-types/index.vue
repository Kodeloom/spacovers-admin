<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Role Types</h1>
      <p class="text-gray-600">Manage role templates and categories</p>
    </div>

    <div v-if="isLoading" class="text-center py-10">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-500 mx-auto" />
      <p class="text-gray-500 mt-2">Loading role types...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-600">Error loading role types: {{ error.message }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="roleType in data" 
        :key="roleType.id"
        class="bg-white rounded-lg shadow-md border hover:shadow-lg transition-shadow duration-200"
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div 
                v-if="roleType.color"
                :style="{ backgroundColor: roleType.color }" 
                class="w-6 h-6 rounded-full"
              />
              <h3 class="text-lg font-semibold text-gray-900">{{ roleType.name }}</h3>
            </div>
            <div v-if="roleType.isSystem" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              System
            </div>
          </div>

          <p v-if="roleType.description" class="text-gray-600 text-sm mb-4">{{ roleType.description }}</p>

          <div class="space-y-2">
            <div v-if="roleType.canUseStations" class="flex items-center text-sm text-orange-600">
              <Icon name="heroicons:cog-6-tooth" class="w-4 h-4 mr-2" />
              Can access stations
            </div>
            
            <div v-if="roleType.defaultPermissions" class="flex items-center text-sm text-green-600">
              <Icon name="heroicons:shield-check" class="w-4 h-4 mr-2" />
              {{ getPermissionSummary(roleType.defaultPermissions) }}
            </div>

            <div class="flex items-center text-sm text-gray-500">
              <Icon name="heroicons:users" class="w-4 h-4 mr-2" />
              {{ roleType.roles?.length || 0 }} role{{ (roleType.roles?.length || 0) !== 1 ? 's' : '' }} using this type
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isLoading && !error && (!data || data.length === 0)" class="text-center py-10">
      <Icon name="heroicons:user-group" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500">No role types found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyRoleType } from '~/lib/hooks'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
})

const toast = useToast()

// Simplified data fetching
const { data, isLoading, error } = useFindManyRoleType({
  include: {
    roles: {
      select: { id: true, name: true }
    }
  },
  orderBy: { displayOrder: 'asc' }
})

// Helper function to summarize permissions
const getPermissionSummary = (defaultPermissions: unknown) => {
  if (!defaultPermissions || typeof defaultPermissions !== 'object') return 'No defaults'
  
  const perms = defaultPermissions as { subjects?: string[], actions?: string[] }
  const subjects = perms.subjects || []
  const actions = perms.actions || []
  
  if (subjects.length === 0 || actions.length === 0) return 'No defaults'
  
  return `${actions.length} action${actions.length !== 1 ? 's' : ''} on ${subjects.length} module${subjects.length !== 1 ? 's' : ''}`
}

// Handle errors
if (error.value) {
  toast.error({ title: 'Error', message: 'Failed to load role types' })
}
</script> 