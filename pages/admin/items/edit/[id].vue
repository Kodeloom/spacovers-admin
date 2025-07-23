<template>
    <div class="p-4">
        <div v-if="item" class="p-4">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-2xl font-bold">
                    Edit Item: {{ item.name }}
                </h1>
                <button
                    v-if="item.quickbooksItemId"
                    :disabled="isSyncing"
                    class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    @click="handleSync"
                >
                    <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                    <Icon v-else name="heroicons:arrow-path-20-solid" class="mr-2 h-5 w-5" />
                    Sync with QBO
                </button>
            </div>
            <div class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Item Details
                    </h3>
                    <form class="space-y-4" @submit.prevent="onSubmit">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    id="name"
                                    v-model="state.name"
                                    type="text"
                                    required
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                            </div>
                            <div>
                                <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                                <input
                                    id="category"
                                    v-model="state.category"
                                    type="text"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                            </div>
                            <div>
                                <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    id="status"
                                    v-model="state.status"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="ARCHIVED">ARCHIVED</option>
                                </select>
                            </div>
                            <div>
                                <label for="retailPrice" class="block text-sm font-medium text-gray-700">Retail Price</label>
                                <input
                                    id="retailPrice"
                                    v-model.number="state.retailPrice"
                                    type="number"
                                    step="0.01"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                            </div>
                            <div>
                                <label for="wholesalePrice" class="block text-sm font-medium text-gray-700">Wholesale Price</label>
                                <input
                                    id="wholesalePrice"
                                    v-model.number="state.wholesalePrice"
                                    type="number"
                                    step="0.01"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                            </div>
                            <div>
                                <label for="cost" class="block text-sm font-medium text-gray-700">Cost</label>
                                <input
                                    id="cost"
                                    v-model.number="state.cost"
                                    type="number"
                                    step="0.01"
                                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                >
                            </div>
                        </div>
                        <div>
                            <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                id="description"
                                v-model="state.description"
                                rows="3"
                                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>

                        <div class="flex justify-end">
                            <button
                                type="submit"
                                :disabled="isPending"
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                <Icon v-if="isPending" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div v-else class="text-center p-8">
            <p>Loading item...</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useFindUniqueItem, useUpdateItem } from '~/lib/hooks';

definePageMeta({
    layout: 'default',
    middleware: 'auth-admin-only',
});

const { showLoading, hideLoading } = useGlobalLoading();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const itemId = computed(() => route.params.id as string);

const { data: item, refetch } = useFindUniqueItem({
    where: { id: itemId.value },
});

// Handle loading state - don't throw error immediately if data hasn't loaded yet
watchEffect(() => {
    if (item.value === null) {
        throw showError({
            statusCode: 404,
            statusMessage: 'Item not found',
        });
    }
});

const isSyncing = ref(false);

const state = reactive({
    name: item.value?.name || '',
    description: item.value?.description || '',
    category: item.value?.category || '',
    // Prisma Decimal type needs to be converted to number for the input
    retailPrice: item.value?.retailPrice?.toNumber() ?? 0,
    wholesalePrice: item.value?.wholesalePrice?.toNumber() ?? 0,
    cost: item.value?.cost?.toNumber() ?? 0,
    status: item.value?.status || 'ACTIVE',
});

// When the data is refreshed, update the state
watch(item, (newItem) => {
    if (newItem) {
        state.name = newItem.name;
        state.description = newItem.description || '';
        state.category = newItem.category || '';
        state.retailPrice = newItem.retailPrice?.toNumber() ?? 0;
        state.wholesalePrice = newItem.wholesalePrice?.toNumber() ?? 0;
        state.cost = newItem.cost?.toNumber() ?? 0;
        state.status = newItem.status;
    }
});

const { mutate, isPending } = useUpdateItem({
    onSuccess: () => {
        toast.success({ title: 'Success', message: 'Item updated successfully.' });
        router.push('/admin/items');
    },
    onError: (error: Error) => {
        toast.error({ title: 'Error', message: error.message || 'Failed to update item.' });
    },
});

async function onSubmit() {
    mutate({
        where: { id: itemId.value },
        data: {
            name: state.name,
            description: state.description || null,
            category: state.category || null,
            retailPrice: state.retailPrice || null,
            wholesalePrice: state.wholesalePrice || null,
            cost: state.cost || null,
            status: state.status,
        },
    });
}

async function handleSync() {
    if (!item.value?.quickbooksItemId) {
        toast.error({ title: 'Error', message: 'This item does not have a QuickBooks ID.' });
        return;
    }
    isSyncing.value = true;
    showLoading();
    try {
        await $fetch('/api/qbo/sync/single', {
            method: 'POST',
            body: {
                resourceType: 'Item',
                resourceId: item.value.quickbooksItemId,
            },
        });
        toast.success({ title: 'Success', message: 'Item synced with QBO.' });
        await refetch();
    }
    catch (e) {
        const error = e as { data?: { data?: { message?: string } } };
        toast.error({ title: 'Error', message: error.data?.data?.message || 'Failed to sync item.' });
    }
    finally {
        isSyncing.value = false;
        hideLoading();
    }
}
</script> 