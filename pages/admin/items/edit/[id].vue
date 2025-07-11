<template>
    <div class="p-4">
        <div v-if="item" class="p-4">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-2xl font-bold">
                    Edit Item: {{ item.name }}
                </h1>
                <UButton
                    v-if="item.quickbooksItemId"
                    icon="i-heroicons-arrow-path"
                    :loading="isSyncing"
                    @click="handleSync"
                >
                    Sync with QBO
                </UButton>
            </div>
            <UCard>
                <template #header>
                    Item Details
                </template>
                <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <UFormGroup label="Name" name="name">
                            <UInput v-model="state.name" />
                        </UFormGroup>
                        <UFormGroup label="Category" name="category">
                            <UInput v-model="state.category" />
                        </UFormGroup>
                        <UFormGroup label="Status" name="status">
                            <USelect v-model="state.status" :options="['ACTIVE', 'INACTIVE', 'ARCHIVED']" />
                        </UFormGroup>
                        <UFormGroup label="Retail Price" name="retailPrice">
                            <UInput v-model.number="state.retailPrice" type="number" step="0.01" />
                        </UFormGroup>
                        <UFormGroup label="Wholesale Price" name="wholesalePrice">
                            <UInput v-model.number="state.wholesalePrice" type="number" step="0.01" />
                        </UFormGroup>
                        <UFormGroup label="Cost" name="cost">
                            <UInput v-model.number="state.cost" type="number" step="0.01" />
                        </UFormGroup>
                    </div>
                     <UFormGroup label="Description" name="description">
                            <UTextarea v-model="state.description" />
                        </UFormGroup>

                    <UButton type="submit" :loading="isPending">
                        Save Changes
                    </UButton>
                </UForm>
            </UCard>
        </div>
        <div v-else class="text-center p-8">
            <p>Loading item...</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod';
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

const { data: item, refresh, suspense } = await useFindUniqueItem({
    where: { id: itemId.value },
});
await suspense();

if (!item.value) {
    throw showError({
        statusCode: 404,
        statusMessage: 'Item not found',
    });
}

const isSyncing = ref(false);

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().nullable(),
    category: z.string().nullable(),
    retailPrice: z.number().nullable(),
    wholesalePrice: z.number().nullable(),
    cost: z.number().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

type Schema = z.output<typeof schema>;

const state = reactive({
    name: item.value.name,
    description: item.value.description,
    category: item.value.category,
    // Prisma Decimal type needs to be converted to number for the input
    retailPrice: item.value.retailPrice?.toNumber() ?? null,
    wholesalePrice: item.value.wholesalePrice?.toNumber() ?? null,
    cost: item.value.cost?.toNumber() ?? null,
    status: item.value.status,
});

// When the data is refreshed, update the state
watch(item, (newItem) => {
    if (newItem) {
        state.name = newItem.name;
        state.description = newItem.description;
        state.category = newItem.category;
        state.retailPrice = newItem.retailPrice?.toNumber() ?? null;
        state.wholesalePrice = newItem.wholesalePrice?.toNumber() ?? null;
        state.cost = newItem.cost?.toNumber() ?? null;
        state.status = newItem.status;
    }
});

const { mutate, isPending } = useUpdateItem({
    onSuccess: () => {
        toast.add({ title: 'Success', description: 'Item updated successfully.', color: 'green' });
        router.push('/admin/items');
    },
    onError: (error: any) => {
        toast.add({ title: 'Error', description: error.message || 'Failed to update item.', color: 'red' });
    },
});

async function onSubmit() {
    mutate({
        where: { id: itemId.value },
        data: state,
    });
}

async function handleSync() {
    if (!item.value?.quickbooksItemId) {
        toast.add({ title: 'Error', description: 'This item does not have a QuickBooks ID.', color: 'red' });
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
        toast.add({ title: 'Success', description: 'Item synced with QBO.', color: 'green' });
        await refresh();
    }
    catch (e) {
        const error = e as { data?: { data?: { message?: string } } };
        toast.add({ title: 'Error', description: error.data?.data?.message || 'Failed to sync item.', color: 'red' });
    }
    finally {
        isSyncing.value = false;
        hideLoading();
    }
}
</script> 