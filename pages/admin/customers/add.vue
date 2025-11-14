<template>
    <div class="p-6 bg-gray-50 min-h-screen">
        <div class="max-w-4xl mx-auto p-8 rounded-lg shadow-md">
            <header class="mb-6">
                <h1 class="text-3xl font-bold text-gray-800">
                    Add New Customer
                </h1>
                <p class="text-gray-500 mt-1">
                    Create a new customer record in the local database.
                </p>
            </header>

            <form class="space-y-6" @submit.prevent="onSubmit">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-1">
                        <label for="name" class="block text-sm font-medium text-gray-700">Full Name</label>
                        <input id="name" v-model="state.name" type="text" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
                        <input id="email" v-model="state.email" type="email" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                </div>

                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-1">
                        <label for="contactNumber" class="block text-sm font-medium text-gray-700">Contact Number</label>
                        <input id="contactNumber" v-model="state.contactNumber" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                 </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-1">
                        <label for="type" class="block text-sm font-medium text-gray-700">Type</label>
                        <select id="type" v-model="state.type" required class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option v-for="option in customerTypeOptions" :key="option" :value="option">{{ option }}</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
                        <select id="status" v-model="state.status" required class="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option v-for="option in customerStatusOptions" :key="option" :value="option">{{ option }}</option>
                        </select>
                    </div>
                </div>
                
                <h3 class="text-lg font-semibold border-b pt-4 pb-2 text-gray-700">
                    Shipping Address
                </h3>
                
                <div class="space-y-1">
                    <label for="shippingAddressLine1" class="block text-sm font-medium text-gray-700">Address Line 1</label>
                    <input id="shippingAddressLine1" v-model="state.shippingAddressLine1" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                </div>
                <div class="space-y-1">
                    <label for="shippingAddressLine2" class="block text-sm font-medium text-gray-700">Address Line 2</label>
                    <input id="shippingAddressLine2" v-model="state.shippingAddressLine2" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="space-y-1">
                        <label for="shippingCity" class="block text-sm font-medium text-gray-700">City</label>
                        <input id="shippingCity" v-model="state.shippingCity" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="shippingState" class="block text-sm font-medium text-gray-700">State</label>
                        <input id="shippingState" v-model="state.shippingState" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                    <div class="space-y-1">
                        <label for="shippingZipCode" class="block text-sm font-medium text-gray-700">Zip Code</label>
                        <input id="shippingZipCode" v-model="state.shippingZipCode" type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" >
                    </div>
                </div>

                <div class="flex justify-end space-x-4 pt-6">
                    <NuxtLink to="/admin/customers" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition duration-150 ease-in-out">
                        Cancel
                    </NuxtLink>
                    <button type="submit" :disabled="createCustomer.isPending.value" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        <Icon v-if="createCustomer.isPending.value" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
                        Save Customer
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod';
import { useCreateCustomer } from '~/lib/hooks';
import { CustomerStatus, CustomerType } from '@prisma-app/client';

definePageMeta({
    layout: 'default',
    middleware: 'auth-office-admin',
});

const customerTypeOptions = Object.values(CustomerType);
const customerStatusOptions = Object.values(CustomerStatus);

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email format').nullable().optional(),
    contactNumber: z.string().nullable().optional(),
    type: z.nativeEnum(CustomerType),
    status: z.nativeEnum(CustomerStatus),
    shippingAddressLine1: z.string().nullable().optional(),
    shippingAddressLine2: z.string().nullable().optional(),
    shippingCity: z.string().nullable().optional(),
    shippingState: z.string().nullable().optional(),
    shippingZipCode: z.string().nullable().optional(),
});

type Schema = z.output<typeof schema>;

const router = useRouter();
const toast = useToast();
const createCustomer = useCreateCustomer();

const state = reactive<Schema>({
    name: '',
    email: null,
    contactNumber: null,
    type: CustomerType.RETAILER,
    status: CustomerStatus.ACTIVE,
    shippingAddressLine1: null,
    shippingAddressLine2: null,
    shippingCity: null,
    shippingState: null,
    shippingZipCode: null,
});

async function onSubmit() {
    const result = schema.safeParse(state);
    if (!result.success) {
        // Simple validation feedback, can be improved
        const firstError = result.error.errors[0];
        toast.error({
            title: 'Validation Error',
            message: `${firstError.path.join('.')} - ${firstError.message}`,
        });
        return;
    }

    try {
        await createCustomer.mutateAsync({ data: result.data });
        toast.success({
            title: 'Customer Created',
            message: 'The new customer has been added successfully.',
        });
        router.push('/admin/customers');
    }
    catch (error) {
        const err = error as { message?: string };
        console.error("Failed to create customer:", err);
        toast.error({
            title: 'Creation Failed',
            message: err.message || 'An unexpected error occurred.',
        });
    }
}
</script> 