<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Audit Logs</h1>
    </div>

    <AppTable 
      v-model:current-page="currentPage"
      title="All Log Entries"
      :columns="columns"
      :rows="auditLogs || []"
      :actions="['view']"
      :pending="isLogsLoading || isCountLoading"
      :total-items="totalLogs || 0"
      :items-per-page="itemsPerPage"
      @view="viewLogDetails"
    >
      <template #cell-user="{ value }">
        <span v-if="value">{{ value.name }} ({{ value.email }})</span>
        <span v-else class="text-gray-500">System</span>
      </template>
    </AppTable>
    
    <AppModal 
      :is-open="isDetailModalOpen" 
      width="700px"
      @close="isDetailModalOpen = false"
    >
      <template #title>Audit Log Details</template>
      <div v-if="selectedLog" class="space-y-4">
        <div><strong>Action:</strong> {{ selectedLog.action }}</div>
        <div><strong>Entity:</strong> {{ selectedLog.entityName }} #{{ selectedLog.entityId }}</div>
        <div><strong>User:</strong> {{ selectedLog.user?.name || 'System' }}</div>
        <div><strong>Timestamp:</strong> {{ new Date(selectedLog.timestamp).toLocaleString() }}</div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div>
            <h4 class="font-semibold mb-2">Old Value</h4>
            <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto">{{ JSON.stringify(selectedLog.oldValue, null, 2) }}</pre>
          </div>
          <div>
            <h4 class="font-semibold mb-2">New Value</h4>
            <pre class="bg-gray-100 p-2 rounded text-xs overflow-auto">{{ JSON.stringify(selectedLog.newValue, null, 2) }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300" @click="isDetailModalOpen = false">Close</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useFindManyAuditLog, useCountAuditLog } from '~/lib/hooks';
import type { AuditLog, User } from '@prisma-app/client';

type AuditLogWithUser = AuditLog & { user: User | null };

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const currentPage = ref(1);
const itemsPerPage = ref(15);

const query = computed(() => ({
  skip: (currentPage.value - 1) * itemsPerPage.value,
  take: itemsPerPage.value,
  orderBy: { timestamp: 'desc' as const },
  include: { user: true },
}));

const { data: auditLogs, isLoading: isLogsLoading, refetch: _refreshLogs } = useFindManyAuditLog(query);
const { data: totalLogs, isLoading: isCountLoading, refetch: _refreshCount } = useCountAuditLog();

const columns = [
  { key: 'action', label: 'Action' },
  { key: 'entityName', label: 'Entity' },
  { key: 'entityId', label: 'Entity ID' },
  { key: 'user', label: 'User' },
  { key: 'timestamp', label: 'Timestamp', format: 'datetime' as const },
];

const isDetailModalOpen = ref(false);
const selectedLog = ref<AuditLogWithUser | null>(null);

const viewLogDetails = (log: AuditLogWithUser) => {
  selectedLog.value = log;
  isDetailModalOpen.value = true;
};
</script>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 