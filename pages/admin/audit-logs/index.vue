<template>
    <div class="p-4">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">Audit Logs</h1>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-4">
            <p>Loading audit logs...</p>
            <Icon name="svg-spinners:180-ring-with-bg" class="mt-4 h-8 w-8 text-indigo-500 mx-auto" />
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p class="text-red-700">Error loading audit logs: {{ error.message }}</p>
        </div>

        <!-- Audit Logs Table -->
        <div v-else-if="auditLogs && auditLogs.length > 0" class="bg-white shadow-sm rounded-lg overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record ID</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changes</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ new Date(log.timestamp).toLocaleString() }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ log.user?.email || 'System' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ log.action }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ log.entityName }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ log.entityId }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button 
                                class="text-indigo-600 hover:text-indigo-900"
                                @click="openDetailsModal(log)"
                            >
                                View Changes
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8 bg-white rounded-lg shadow-sm">
            <p class="text-gray-500">No audit logs found.</p>
        </div>

        <!-- Details Modal -->
        <AppModal :show="isDetailsModalVisible" @close="closeDetailsModal">
            <template #title>
                Change Details
            </template>
            <template #default>
                <div v-if="selectedLog" class="space-y-4">
                    <div v-if="selectedLog.oldValue" class="mb-4">
                        <h3 class="text-sm font-medium text-gray-700 mb-2">Previous Value</h3>
                        <pre class="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">{{ JSON.stringify(selectedLog.oldValue, null, 2) }}</pre>
                    </div>
                    <div v-if="selectedLog.newValue">
                        <h3 class="text-sm font-medium text-gray-700 mb-2">New Value</h3>
                        <pre class="bg-gray-50 p-3 rounded-md text-sm overflow-x-auto">{{ JSON.stringify(selectedLog.newValue, null, 2) }}</pre>
                    </div>
                </div>
            </template>
        </AppModal>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useFindManyAuditLog } from '~/lib/hooks';
import type { AuditLog } from '@prisma-app/client';

definePageMeta({
    layout: 'default',
    middleware: ['auth-admin-only']
});

const { data: auditLogs, isLoading, error } = useFindManyAuditLog({
    include: { user: true },
    orderBy: { timestamp: 'desc' }
});

// Modal state
const isDetailsModalVisible = ref(false);
const selectedLog = ref<AuditLog | null>(null);

function openDetailsModal(log: AuditLog) {
    selectedLog.value = log;
    isDetailsModalVisible.value = true;
}

function closeDetailsModal() {
    isDetailsModalVisible.value = false;
    selectedLog.value = null;
}
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 