<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFindManyStation, useCountStation, useDeleteStation } from '~/lib/hooks';

definePageMeta({
    layout: 'default',
    middleware: ['auth-admin-only'],
});

const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', sortable: false },
    { key: 'barcode', label: 'Barcode', sortable: false },
    { key: 'createdAt', label: 'Created At', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
];

const toast = useToast();
const isDeleting = ref(false);
const stationToDelete = ref<{ id: string, name: string } | null>(null);

const page = ref(1);
const limit = ref(15);
const sort = ref({ column: 'name', direction: 'asc' as 'asc' | 'desc' });

const query = computed(() => ({
    skip: (page.value - 1) * limit.value,
    take: limit.value,
    orderBy: { [sort.value.column]: sort.value.direction },
    include: {
        roles: {
            include: {
                role: true
            }
        }
    }
}));

const { data: stationsData, isLoading: pending, refetch: refreshStations } = useFindManyStation(query);
const { data: totalCount, refetch: refreshCount } = useCountStation();

const totalPages = computed(() => {
    const count = totalCount.value ?? 0;
    if (count === 0) return 1;
    return Math.ceil(count / limit.value);
});

const deleteMutation = useDeleteStation({
    onSuccess: () => {
        toast.success({ title: 'Success', message: 'Station deleted successfully.' });
        refreshStations();
        refreshCount();
    },
    onError: (error: unknown) => {
        const err = error as { data?: { data?: { message?: string } } };
        const errorMessage = err?.data?.data?.message || 'Failed to delete station.';
        toast.error({ title: 'Error', message: errorMessage });
    },
    onSettled: () => {
        isDeleting.value = false;
        stationToDelete.value = null;
    },
});

function confirmDelete(station: { id: string; name: string }) {
    stationToDelete.value = station;
}

function handleDelete() {
    if (stationToDelete.value) {
        isDeleting.value = true;
        deleteMutation.mutate({ where: { id: stationToDelete.value.id } });
    }
}
</script>

<template>
    <div class="p-4">
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-semibold">
                Stations
            </h1>
            <NuxtLink
                to="/admin/stations/add"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
                <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
                Add Station
            </NuxtLink>
        </div>
        <div class="bg-white shadow rounded-lg">
            <AppTable
                v-model:sort="sort"
                :rows="stationsData ?? []"
                :columns="columns"
                :pending="pending"
            >
                <template #barcode-data="{ row }">
                    <span v-if="row.barcode" class="font-mono text-sm">{{ row.barcode }}</span>
                    <span v-else class="text-gray-400">-</span>
                </template>
                <template #createdAt-data="{ row }">
                    {{ new Date(row.createdAt).toLocaleDateString() }}
                </template>
                <template #actions-data="{ row }">
                    <div class="flex space-x-2">
                        <NuxtLink :to="`/admin/stations/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
                            <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
                        </NuxtLink>
                        <button class="text-red-600 hover:text-red-900" @click="confirmDelete({ id: row.id, name: row.name })">
                            <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
                        </button>
                    </div>
                </template>
            </AppTable>
            <div
                v-if="totalCount && totalCount > 0"
                class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
            >
                 <p class="text-sm text-gray-700">
                    Showing
                    <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
                    to
                    <span class="font-medium">{{ Math.min(page * limit, totalCount) }}</span>
                    of
                    <span class="font-medium">{{ totalCount }}</span>
                    results
                </p>
                <div class="flex-1 flex justify-end">
                    <button
                        :disabled="page === 1"
                        class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        @click="page--"
                    >
                        Previous
                    </button>
                    <button
                        :disabled="page === totalPages"
                        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        @click="page++"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
        <AppModal :is-open="!!stationToDelete" title="Confirm Deletion" @close="stationToDelete = null">
            <p>Are you sure you want to delete the station '<strong>{{ stationToDelete?.name }}</strong>'? This action cannot be undone.</p>
            <div class="flex justify-end space-x-2 mt-4">
                <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="stationToDelete = null">
                    Cancel
                </button>
                <button
                    class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    :disabled="isDeleting"
                    @click="handleDelete"
                >
                    <Icon v-if="isDeleting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                    Delete
                </button>
            </div>
        </AppModal>
    </div>
</template>

<style scoped>
/* Add any page-specific styles here if needed */
</style> 