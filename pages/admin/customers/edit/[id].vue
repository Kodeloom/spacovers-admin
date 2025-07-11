<script setup lang="ts">
import { z } from 'zod';
import { useFindUniqueCustomer, useUpdateOneCustomer } from '~/lib/hooks';

definePageMeta({
    layout: 'default',
    middleware: 'auth-admin-only',
});

const { showLoading, hideLoading } = useGlobalLoading();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const customerId = computed(() => route.params.id as string);

const { data: customer, refresh, suspense } = await useFindUniqueCustomer({
    where: { id: customerId.value },
});
await suspense();

if (!customer.value) {
    throw showError({
        statusCode: 404,
        statusMessage: 'Customer not found',
    });
}

const isSyncing = ref(false);

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().nullable(),
    contactNumber: z.string().nullable(),
    type: z.enum(['RETAILER', 'WHOLESALER']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
    shippingAddressLine1: z.string().nullable(),
    shippingAddressLine2: z.string().nullable(),
    shippingCity: z.string().nullable(),
    shippingState: z.string().nullable(),
    shippingZipCode: z.string().nullable(),
    shippingCountry: z.string().nullable(),
    billingAddressLine1: z.string().nullable(),
    billingAddressLine2: z.string().nullable(),
    billingCity: z.string().nullable(),
    billingState: z.string().nullable(),
    billingZipCode: z.string().nullable(),
    billingCountry: z.string().nullable(),
});

type Schema = z.output<typeof schema>;
const state = reactive<Schema>({
    ...customer.value,
});

// When the data is refreshed, update the state
watch(customer, (newCustomer) => {
    if (newCustomer) {
        state.name = newCustomer.name;
        state.email = newCustomer.email;
        state.contactNumber = newCustomer.contactNumber;
        state.type = newCustomer.type;
        state.status = newCustomer.status;
        state.shippingAddressLine1 = newCustomer.shippingAddressLine1;
        state.shippingAddressLine2 = newCustomer.shippingAddressLine2;
        state.shippingCity = newCustomer.shippingCity;
        state.shippingState = newCustomer.shippingState;
        state.shippingZipCode = newCustomer.shippingZipCode;
        state.shippingCountry = newCustomer.shippingCountry;
        state.billingAddressLine1 = newCustomer.billingAddressLine1;
        state.billingAddressLine2 = newCustomer.billingAddressLine2;
        state.billingCity = newCustomer.billingCity;
        state.billingState = newCustomer.billingState;
        state.billingZipCode = newCustomer.billingZipCode;
        state.billingCountry = newCustomer.billingCountry;
    }
});

const { mutate, isPending } = useUpdateOneCustomer({
    onSuccess: () => {
        toast.add({ title: 'Success', description: 'Customer updated successfully.', color: 'green' });
        router.push('/admin/customers');
    },
    onError: (error: any) => {
        toast.add({ title: 'Error', description: error.message || 'Failed to update customer.', color: 'red' });
    },
});

async function onSubmit() {
    mutate({
        where: { id: customerId.value },
        data: state,
    });
}

async function handleSync() {
    if (!customer.value?.quickbooksCustomerId) {
        toast.add({ title: 'Error', description: 'This customer does not have a QuickBooks ID.', color: 'red' });
        return;
    }
    isSyncing.value = true;
    showLoading();
    try {
        await $fetch('/api/qbo/sync/single', {
            method: 'POST',
            body: {
                resourceType: 'Customer',
                resourceId: customer.value.quickbooksCustomerId,
            },
        });
        toast.add({ title: 'Success', description: 'Customer synced with QBO.', color: 'green' });
        await refresh();
    }
    catch (e) {
        const error = e as { data?: { data?: { message?: string } } };
        toast.add({ title: 'Error', description: error.data?.data?.message || 'Failed to sync customer.', color: 'red' });
    }
    finally {
        isSyncing.value = false;
        hideLoading();
    }
}
</script>

<template>
    <div class="p-4">
        <div v-if="customer" class="p-4">
            <div class="flex justify-between items-center mb-4">
                <h1 class="text-2xl font-bold">
                    Edit Customer: {{ customer.name }}
                </h1>
                <UButton
                    v-if="customer.quickbooksCustomerId"
                    icon="i-heroicons-arrow-path"
                    :loading="isSyncing"
                    @click="handleSync"
                >
                    Sync with QBO
                </UButton>
            </div>
            <UCard>
                <template #header>
                    Customer Details
                </template>
                <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <UFormGroup label="Name" name="name">
                            <UInput v-model="state.name" />
                        </UFormGroup>
                        <UFormGroup label="Email" name="email">
                            <UInput v-model="state.email" />
                        </UFormGroup>
                        <UFormGroup label="Contact Number" name="contactNumber">
                            <UInput v-model="state.contactNumber" />
                        </UFormGroup>
                        <UFormGroup label="Type" name="type">
                            <USelect v-model="state.type" :options="['RETAILER', 'WHOLESALER']" />
                        </UFormGroup>
                        <UFormGroup label="Status" name="status">
                            <USelect v-model="state.status" :options="['ACTIVE', 'INACTIVE', 'ARCHIVED']" />
                        </UFormGroup>
                    </div>

                    <UDivider label="Shipping Address" />

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <UFormGroup label="Address Line 1" name="shippingAddressLine1">
                            <UInput v-model="state.shippingAddressLine1" />
                        </UFormGroup>
                        <UFormGroup label="Address Line 2" name="shippingAddressLine2">
                            <UInput v-model="state.shippingAddressLine2" />
                        </UFormGroup>
                        <UFormGroup label="City" name="shippingCity">
                            <UInput v-model="state.shippingCity" />
                        </UFormGroup>
                        <UFormGroup label="State" name="shippingState">
                            <UInput v-model="state.shippingState" />
                        </UFormGroup>
                        <UFormGroup label="Zip Code" name="shippingZipCode">
                            <UInput v-model="state.shippingZipCode" />
                        </UFormGroup>
                        <UFormGroup label="Country" name="shippingCountry">
                            <UInput v-model="state.shippingCountry" />
                        </UFormGroup>
                    </div>

                    <UDivider label="Billing Address" />

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <UFormGroup label="Address Line 1" name="billingAddressLine1">
                            <UInput v-model="state.billingAddressLine1" />
                        </UFormGroup>
                        <UFormGroup label="Address Line 2" name="billingAddressLine2">
                            <UInput v-model="state.billingAddressLine2" />
                        </UFormGroup>
                        <UFormGroup label="City" name="billingCity">
                            <UInput v-model="state.billingCity" />
                        </UFormGroup>
                        <UFormGroup label="State" name="billingState">
                            <UInput v-model="state.billingState" />
                        </UFormGroup>
                        <UFormGroup label="Zip Code" name="billingZipCode">
                            <UInput v-model="state.billingZipCode" />
                        </UFormGroup>
                        <UFormGroup label="Country" name="billingCountry">
                            <UInput v-model="state.billingCountry" />
                        </UFormGroup>
                    </div>

                    <UButton type="submit" :loading="isPending">
                        Save Changes
                    </UButton>
                </UForm>
            </UCard>
        </div>
        <div v-else class="text-center p-8">
            <p>Loading customer...</p>
        </div>
    </div>
</template>