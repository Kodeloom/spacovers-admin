<template>
    <div class="p-6 bg-gray-50 min-h-screen">
        <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <header class="mb-6">
                <h1 class="text-3xl font-bold text-gray-800">
                    Add New Item
                </h1>
                <p class="text-gray-500 mt-1">
                    Create a new product or service in the local database.
                </p>
            </header>

            <form class="space-y-6" @submit.prevent="onSubmit">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-1">
                        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
                        <input id="name" v-model="state.name" type="text" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                        <input id="category" v-model="state.category" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                </div>

                <div class="space-y-1">
                    <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="description" v-model="state.description" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"/>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="space-y-1">
                        <label for="retailPrice" class="block text-sm font-medium text-gray-700">Retail Price</label>
                        <input id="retailPrice" v-model.number="state.retailPrice" type="number" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="wholesalePrice" class="block text-sm font-medium text-gray-700">Wholesale Price</label>
                        <input id="wholesalePrice" v-model.number="state.wholesalePrice" type="number" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="cost" class="block text-sm font-medium text-gray-700">Cost</label>
                        <input id="cost" v-model.number="state.cost" type="number" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                </div>

                <div class="space-y-1">
                    <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" v-model="state.status" required class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <option v-for="option in itemStatusOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                </div>
                
                <div class="flex justify-end space-x-4 pt-6">
                    <NuxtLink to="/admin/items" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition duration-150 ease-in-out">
                        Cancel
                    </NuxtLink>
                    <button type="submit" :disabled="createItem.isPending.value" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        <Icon v-if="createItem.isPending.value" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                        Save Item
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod';
import { useCreateItem } from '~/lib/hooks';
import { ItemStatus } from '@prisma-app/client';

definePageMeta({
    layout: 'default',
    middleware: 'auth-admin-only',
});

const itemStatusOptions = Object.values(ItemStatus);

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    category: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    retailPrice: z.number().nullable().optional(),
    wholesalePrice: z.number().nullable().optional(),
    cost: z.number().nullable().optional(),
    status: z.nativeEnum(ItemStatus),
});

type Schema = z.output<typeof schema>;

const router = useRouter();
const toast = useToast();
const createItem = useCreateItem();

const state = reactive<Schema>({
    name: '',
    category: null,
    description: null,
    retailPrice: null,
    wholesalePrice: null,
    cost: null,
    status: ItemStatus.ACTIVE,
});

async function onSubmit() {
    const result = schema.safeParse(state);
    if (!result.success) {
        const firstError = result.error.errors[0];
        toast.error({
            title: 'Validation Error',
            message: `${firstError.path.join('.')} - ${firstError.message}`,
        });
        return;
    }

    try {
        await createItem.mutateAsync({ data: result.data });
        toast.success({
            title: 'Item Created',
            message: 'The new item has been added successfully.',
        });
        router.push('/admin/items');
    }
    catch (error) {
        const err = error as { message?: string };
        console.error("Failed to create item:", err);
        toast.error({
            title: 'Creation Failed',
            message: err.message || 'An unexpected error occurred.',
        });
    }
}
</script> 