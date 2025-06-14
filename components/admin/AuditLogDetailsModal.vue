<!-- components/admin/AuditLogDetailsModal.vue -->
<template>
    <AppModal :show="isOpen" @close="closeModal">
        <template #title>
             <h3 class="text-lg font-medium leading-6 text-gray-900">Audit Log Details</h3>
        </template>
        
        <div v-if="log">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Old Value Column -->
                <div>
                    <h4 class="font-medium text-gray-800">Old Value</h4>
                    <div v-if="log.oldValue" class="mt-2 p-3 bg-gray-100 rounded-md text-xs">
                        <pre class="whitespace-pre-wrap break-all">{{ formatJson(log.oldValue) }}</pre>
                    </div>
                    <div v-else class="mt-2 text-sm text-gray-500 italic">
                        No previous data (create operation).
                    </div>
                </div>

                <!-- New Value Column -->
                <div>
                    <h4 class="font-medium text-gray-800">New Value</h4>
                     <div v-if="log.newValue" class="mt-2 p-3 bg-blue-50 rounded-md text-xs">
                        <pre class="whitespace-pre-wrap break-all">{{ formatJson(log.newValue) }}</pre>
                    </div>
                    <div v-else class="mt-2 text-sm text-gray-500 italic">
                        No new data (delete operation).
                    </div>
                </div>
            </div>

            <div class="mt-6 border-t pt-4">
                <dl class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Action</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ log.action }}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">User</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ log.user?.name || 'System/Unknown' }}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Entity</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ log.entityName }}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Entity ID</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ log.entityId }}</dd>
                    </div>
                     <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">IP Address</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ log.ipAddress || 'N/A' }}</dd>
                    </div>
                    <div class="sm:col-span-1">
                        <dt class="text-sm font-medium text-gray-500">Timestamp</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ new Date(log.timestamp).toLocaleString() }}</dd>
                    </div>
                </dl>
            </div>
        </div>

        <template #footer>
            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                 <button
                    type="button"
                    class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                    @click="closeModal"
                >
                    Close
                </button>
            </div>
        </template>
    </AppModal>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PropType } from 'vue';
import type { AuditLog, User } from '@prisma-app/client';

type AuditLogWithUser = AuditLog & { user: User | null };

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true,
    },
    log: {
        type: Object as PropType<AuditLogWithUser | null>,
        required: true,
    },
});

const emit = defineEmits(['close']);

const closeModal = () => {
    emit('close');
};

const formatJson = (data: unknown) => {
    if (data === null || data === undefined) return '';
    return JSON.stringify(data, null, 2);
};
</script> 