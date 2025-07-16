<template>
  <div v-if="order" class="p-4">
    <header class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">
          Order #{{ order.salesOrderNumber }}
        </h1>
        <p class="text-gray-500 mt-1">
          For <span class="font-medium text-gray-700">{{ order.customer?.name }}</span>
          <span class="mx-2 text-gray-300">|</span>
          Created on {{ new Date(order.createdAt).toLocaleDateString() }}
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          :disabled="isSyncing"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          @click="syncOrder"
        >
          <Icon v-if="isSyncing" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          Sync with QBO
        </button>
        <button v-if="order.estimate" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200" @click="goToEstimate">
            View Linked Estimate
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Read-only details -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Order Items -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Order Items</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Status</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="item in order.items" :key="item.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.item?.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.quantity }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${{ Number(item.pricePerItem).toFixed(2) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.itemStatus }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Financial & Address Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Financials</h3>
                <dl class="space-y-2">
                    <div class="flex justify-between"><dt>Total Amount:</dt><dd class="font-mono">${{ Number(order.totalAmount).toFixed(2) }}</dd></div>
                    <div class="flex justify-between"><dt>Balance Due:</dt><dd class="font-mono">${{ Number(order.balance).toFixed(2) }}</dd></div>
                    <div class="flex justify-between"><dt>Total Tax:</dt><dd class="font-mono">${{ Number(order.totalTax).toFixed(2) }}</dd></div>
                </dl>
            </div>
            <div class="bg-white p-6 rounded-lg shadow">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h3>
                <address class="not-italic text-gray-600">
                    {{ order.shippingAddressLine1 }}<br>
                    <template v-if="order.shippingAddressLine2">{{ order.shippingAddressLine2 }}<br></template>
                    {{ order.shippingCity }}, {{ order.shippingState }} {{ order.shippingZipCode }}
                </address>
            </div>
        </div>

      </div>

      <!-- Right Column: Editable fields -->
      <div class="bg-white p-6 rounded-lg shadow h-fit">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Update Status</h2>
        <form class="space-y-4" @submit.prevent="saveChanges">
          <div>
            <label for="orderStatus" class="block text-sm font-medium text-gray-700">Order Status</label>
            <select id="orderStatus" v-model="form.orderStatus" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option v-for="status in orderSystemStatusOptions" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="notes" v-model="form.notes" rows="4" class="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"/>
          </div>
          <div class="pt-4">
            <button
              type="submit"
              :disabled="isSaving"
              class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Icon v-if="isSaving" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
   <div v-else class="p-4">
    <p>Loading order details...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useFindUniqueOrder, useUpdateOrder } from '~/lib/hooks';
import { OrderSystemStatus } from '@prisma-app/client';
import { useRouter } from 'vue-router';

definePageMeta({
  layout: 'default',
  middleware: 'auth-admin-only',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const orderId = route.params.id as string;
const isSyncing = ref(false);

// Data fetching
const { data: order, refetch: refetchOrder } = useFindUniqueOrder({
  where: { id: orderId },
  include: { 
    customer: true, 
    items: {
      include: {
        item: true, // Also include the item details for each order item
      }
    },
    estimate: true, // Include the full estimate object
  },
});

// Form state
const form = ref({
  orderStatus: order.value?.orderStatus,
  notes: order.value?.notes,
});

const orderSystemStatusOptions = Object.values(OrderSystemStatus);

watch(order, (newOrder) => {
  if (newOrder) {
    form.value.orderStatus = newOrder.orderStatus;
    form.value.notes = newOrder.notes;
  }
}, { immediate: true });

// Update logic
const updateOrderMutation = useUpdateOrder();
const isSaving = ref(false);

async function saveChanges() {
  if (!order.value) return;
  isSaving.value = true;
  try {
    await updateOrderMutation.mutateAsync({
      where: { id: orderId },
      data: {
        orderStatus: form.value.orderStatus,
        notes: form.value.notes,
      },
    });
    toast.success({ title: 'Order Updated', message: 'Order details have been saved successfully.' });
    refetchOrder();
  } catch (error) {
    const e = error as Error;
    toast.error({ title: 'Update Failed', message: e.message || 'Could not save order details.' });
  } finally {
    isSaving.value = false;
  }
}

async function syncOrder() {
  if (!order.value?.quickbooksOrderId) {
    toast.error({ title: 'Sync Failed', message: 'This order does not have a QuickBooks ID.' });
    return;
  }

  isSyncing.value = true;
  toast.info({ title: 'Sync Started', message: `Syncing Order #${order.value.salesOrderNumber} with QuickBooks...`});
  try {
    await $fetch('/api/qbo/sync/single', {
      method: 'POST',
      body: {
        resourceType: 'Invoice',
        resourceId: order.value.quickbooksOrderId,
      },
    });
    toast.success({ title: 'Sync Complete', message: 'Order data has been updated from QuickBooks.' });
    refetchOrder();
  } catch (error) {
    const e = error as Error & { data?: { data?: { message?: string } } };
    console.error('Failed to sync order:', e);
    toast.error({ title: 'Sync Failed', message: e.data?.data?.message || 'An unexpected error occurred.' });
  } finally {
    isSyncing.value = false;
  }
}

function goToEstimate() {
  if (order.value?.estimate?.id) {
    router.push(`/admin/estimates/view/${order.value.estimate.id}`);
  }
}
</script> 