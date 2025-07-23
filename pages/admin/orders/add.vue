<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Create New Order</h1>
      <form @submit.prevent="handleSubmit">
        <!-- Customer Selection -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Customer Information</h2>
          <div class="mb-4">
            <label for="customerId" class="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              id="customerId"
              v-model="orderData.customerId"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              @change="onCustomerChange"
            >
              <option value="">Select a customer...</option>
              <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                {{ customer.name }} ({{ customer.type }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="contactEmail" class="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
              <input
                id="contactEmail"
                v-model="orderData.contactEmail"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label for="contactPhoneNumber" class="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                id="contactPhoneNumber"
                v-model="orderData.contactPhoneNumber"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-xl font-semibold text-gray-700">Order Items</h2>
            <button
              type="button"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              @click="addOrderItem"
            >
              Add Item
            </button>
          </div>
          
          <div v-if="orderItems.length === 0" class="text-gray-500 text-center py-4">
            No items added yet. Click "Add Item" to start.
          </div>
          
          <div v-for="(item, index) in orderItems" :key="index" class="border border-gray-200 rounded-md p-4 mb-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div class="md:col-span-2">
                <label :for="`item-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Item *</label>
                <select
                  :id="`item-${index}`"
                  v-model="item.itemId"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @change="onItemChange(index)"
                >
                  <option value="">Select an item...</option>
                  <option v-for="availableItem in items" :key="availableItem.id" :value="availableItem.id">
                    {{ availableItem.name }} - ${{ availableItem.retailPrice || availableItem.wholesalePrice || 0 }}
                  </option>
                </select>
              </div>
              <div>
                <label :for="`quantity-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  :id="`quantity-${index}`"
                  v-model.number="item.quantity"
                  type="number"
                  min="1"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-700">Total: ${{ (item.quantity * item.pricePerItem).toFixed(2) }}</span>
                <button
                  type="button"
                  class="text-red-600 hover:text-red-900"
                  @click="removeOrderItem(index)"
                >
                  <Icon name="heroicons:x-mark-20-solid" class="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="orderItems.length > 0" class="text-right mt-4">
            <span class="text-lg font-semibold">Order Total: ${{ orderTotal.toFixed(2) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-4 mt-8">
          <NuxtLink
            to="/admin/orders"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition duration-150 ease-in-out"
          >
            Cancel
          </NuxtLink>
          <button
            type="submit"
            :disabled="isSubmitting || orderItems.length === 0"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition duration-150 ease-in-out"
          >
            <Icon v-if="isSubmitting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4 inline-block" />
            {{ isSubmitting ? 'Creating...' : 'Create Order' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFindManyCustomer, useFindManyItem } from '~/lib/hooks/index';
import { useMutation, useQueryClient } from '@tanstack/vue-query';

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin-only'],
});

const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();

const orderData = reactive({
  customerId: '',
  contactEmail: '',
  contactPhoneNumber: '',
});

const orderItems = ref<Array<{
  itemId: string;
  quantity: number;
  pricePerItem: number;
}>>([]);

// Fetch customers and items
const { data: customers } = useFindManyCustomer({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

const { data: items } = useFindManyItem({
  where: { status: 'ACTIVE' },
  orderBy: { name: 'asc' }
});

// Calculate order total
const orderTotal = computed(() => {
  return orderItems.value.reduce((total, item) => {
    return total + (item.quantity * item.pricePerItem);
  }, 0);
});

function onCustomerChange() {
  if (orderData.customerId && customers.value) {
    const selectedCustomer = customers.value.find((c: { id: string; email?: string }) => c.id === orderData.customerId);
    if (selectedCustomer) {
      orderData.contactEmail = selectedCustomer.email || '';
    }
  }
}

function addOrderItem() {
  orderItems.value.push({
    itemId: '',
    quantity: 1,
    pricePerItem: 0,
  });
}

function removeOrderItem(index: number) {
  orderItems.value.splice(index, 1);
}

function onItemChange(index: number) {
  const item = orderItems.value[index];
  if (item.itemId && items.value) {
    const selectedItem = items.value.find((i: { id: string; retailPrice?: number; wholesalePrice?: number }) => i.id === item.itemId);
    if (selectedItem) {
      item.pricePerItem = parseFloat(String(selectedItem.retailPrice || selectedItem.wholesalePrice || 0));
    }
  }
}

const { mutate: createOrder, isPending: isSubmitting } = useMutation({
  mutationFn: (payload: Record<string, unknown>) => {
    return $fetch('/api/model/Order', {
      method: 'POST',
      body: payload,
    });
  },
  onSuccess: async () => {
    toast.success({ title: 'Success', message: 'Order created successfully!' });
    await queryClient.invalidateQueries();
    router.push('/admin/orders');
  },
  onError: (err) => {
    const fetchError = err as {
      data?: {
        statusMessage?: string;
        message?: string;
      },
      message?: string
    };
    const message = fetchError.data?.statusMessage || fetchError.data?.message || fetchError.message || 'An unexpected error occurred.';
    toast.error({ title: 'Error Creating Order', message });
  },
});

const handleSubmit = () => {
  if (!orderData.customerId || !orderData.contactEmail || orderItems.value.length === 0) {
    toast.error({ title: 'Error', message: 'Please fill in all required fields and add at least one item.' });
    return;
  }

  const payload = {
    customerId: orderData.customerId,
    contactEmail: orderData.contactEmail,
    contactPhoneNumber: orderData.contactPhoneNumber || null,
    orderStatus: 'PENDING',
    items: {
      create: orderItems.value.map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
        pricePerItem: item.pricePerItem,
      }))
    }
  };

  createOrder(payload);
};
</script> 