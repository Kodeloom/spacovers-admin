<template>
  <div v-if="estimate" class="p-4">
    <header class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">
          Estimate #{{ estimate.estimateNumber }}
        </h1>
        <p class="text-gray-500 mt-1">
          For <span class="font-medium text-gray-700">{{ estimate.customer?.name }}</span>
          <span class="mx-2 text-gray-300">|</span>
          Created on {{ new Date(estimate.createdAt).toLocaleDateString() }}
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          :disabled="isSyncing"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          @click="syncEstimate"
        >
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          Sync with QBO
        </button>
        <NuxtLink v-if="estimate.linkedOrder" :to="`/admin/orders/edit/${estimate.linkedOrder.id}`" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
            View Linked Invoice
        </NuxtLink>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Items -->
      <div class="lg:col-span-2">
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Estimate Items</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="item in estimate.items" :key="item.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.item?.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.lineDescription }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.quantity }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${{ Number(item.pricePerItem).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Right Column: Details -->
      <div class="bg-white p-6 rounded-lg shadow h-fit">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Details</h2>
        <dl class="space-y-2">
            <div class="flex justify-between"><dt>Total Amount:</dt><dd class="font-mono">${{ Number(estimate.totalAmount).toFixed(2) }}</dd></div>
            <div class="flex justify-between"><dt>Transaction Date:</dt><dd>{{ estimate.transactionDate ? new Date(estimate.transactionDate).toLocaleDateString() : '-' }}</dd></div>
            <div class="flex justify-between"><dt>Expiration Date:</dt><dd>{{ estimate.expirationDate ? new Date(estimate.expirationDate).toLocaleDateString() : '-' }}</dd></div>
        </dl>
      </div>
    </div>
  </div>
  <div v-else class="p-4">
    <p>Loading estimate details...</p>
  </div>
</template>

<script setup lang="ts">
import { useFindUniqueEstimate } from '~/lib/hooks';
import { ref } from 'vue';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const route = useRoute();
const toast = useToast();
const estimateId = route.params.id as string;
const isSyncing = ref(false);

const { data: estimate, refetch: refetchEstimate } = useFindUniqueEstimate({
  where: { id: estimateId },
  include: { 
    customer: true, 
    linkedOrder: true,
    items: {
      include: {
        item: true,
      }
    } 
  },
});

async function syncEstimate() {
  if (!estimate.value?.quickbooksEstimateId) {
    toast.error({ title: 'Sync Failed', message: 'This estimate does not have a QuickBooks ID.' });
    return;
  }

  isSyncing.value = true;
  toast.info({ title: 'Sync Started', message: `Syncing Estimate #${estimate.value.estimateNumber} and related invoices with QuickBooks...`});
  try {
    const result = await $fetch('/api/qbo/sync/single', {
      method: 'POST',
      body: {
        resourceType: 'EstimateWithInvoices',
        resourceId: estimate.value.quickbooksEstimateId,
      },
    }) as { message?: string };
    
    const message = result?.message || 'Estimate and related invoices have been updated from QuickBooks.';
    toast.success({ title: 'Sync Complete', message });
    refetchEstimate();
  } catch (error) {
    const e = error as Error & { data?: { data?: { message?: string } } };
    console.error('Failed to sync estimate:', e);
    toast.error({ title: 'Sync Failed', message: e.data?.data?.message || 'An unexpected error occurred.' });
  } finally {
    isSyncing.value = false;
  }
}
</script> 