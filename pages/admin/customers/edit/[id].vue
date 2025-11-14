<script setup lang="ts">
import { z } from 'zod';
import { useFindUniqueCustomer, useUpdateCustomer } from '~/lib/hooks';

definePageMeta({
    layout: 'default',
    middleware: 'auth-admin-only',
});

const { showLoading, hideLoading } = useGlobalLoading();
const route = useRoute();
const router = useRouter();

const customerId = computed(() => route.params.id as string);

const { data: customer, suspense } = await useFindUniqueCustomer({
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

const _schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email().nullable(),
    contactNumber: z.string().nullable(),
    type: z.enum(['RETAILER', 'CA_RETAIL', 'WHOLESALER', 'CA_WHOLESALE']),
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

const { mutate, isPending } = useUpdateCustomer({
    onSuccess: () => {
        alert('Customer updated successfully.');
        router.push('/admin/customers');
    },
    onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update customer.';
        alert(`Error: ${errorMessage}`);
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
        alert('This customer does not have a QuickBooks ID.');
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
        alert('Customer synced with QBO.');
        // Note: refresh() is not available, we'll reload the page instead
        await router.go(0);
    }
    catch (e) {
        const error = e as { data?: { data?: { message?: string } } };
        alert(`Error: ${error.data?.data?.message || 'Failed to sync customer.'}`);
    }
    finally {
        isSyncing.value = false;
        hideLoading();
    }
}
</script>

<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div v-if="!customer" class="text-center py-10">
      <p class="text-gray-500">Loading customer details...</p>
    </div>
    <div v-else class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-semibold">Edit Customer: {{ customer.name }}</h1>
        <button
          v-if="customer.quickbooksCustomerId"
          type="button"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          :disabled="isSyncing"
          @click="handleSync"
        >
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
          <Icon v-else name="heroicons:arrow-path" class="mr-2 h-4 w-4" />
          Sync with QBO
        </button>
      </div>

      <form class="space-y-6" @submit.prevent="onSubmit">
        <!-- Customer Details -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Customer Details</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                id="name"
                v-model="state.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                v-model="state.email"
                type="email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="contactNumber" class="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                id="contactNumber"
                v-model="state.contactNumber"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="type" class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                id="type"
                v-model="state.type"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="RETAILER">RETAILER</option>
                <option value="CA_RETAIL">CA RETAIL</option>
                <option value="WHOLESALER">WHOLESALER</option>
                <option value="CA_WHOLESALE">CA WHOLESALE</option>
              </select>
            </div>
            <div>
              <label for="status" class="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select
                id="status"
                v-model="state.status"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Shipping Address -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Shipping Address</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="shippingAddressLine1" class="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                id="shippingAddressLine1"
                v-model="state.shippingAddressLine1"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="shippingAddressLine2" class="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                id="shippingAddressLine2"
                v-model="state.shippingAddressLine2"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="shippingCity" class="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                id="shippingCity"
                v-model="state.shippingCity"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="shippingState" class="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                id="shippingState"
                v-model="state.shippingState"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="shippingZipCode" class="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                id="shippingZipCode"
                v-model="state.shippingZipCode"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="shippingCountry" class="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                id="shippingCountry"
                v-model="state.shippingCountry"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>
        </div>

        <!-- Billing Address -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-medium text-gray-900 mb-4">Billing Address</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="billingAddressLine1" class="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
              <input
                id="billingAddressLine1"
                v-model="state.billingAddressLine1"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="billingAddressLine2" class="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                id="billingAddressLine2"
                v-model="state.billingAddressLine2"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="billingCity" class="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                id="billingCity"
                v-model="state.billingCity"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="billingState" class="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                id="billingState"
                v-model="state.billingState"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="billingZipCode" class="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
              <input
                id="billingZipCode"
                v-model="state.billingZipCode"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="billingCountry" class="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                id="billingCountry"
                v-model="state.billingCountry"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3">
          <NuxtLink
            to="/admin/customers"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </NuxtLink>
          <button
            type="submit"
            :disabled="isPending"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Icon v-if="isPending" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ isPending ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>


<script>
definePageMeta({
  layout: 'default',
  middleware: 'auth-office-admin',
});
</script>
