<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Create New Order</h1>
      <form @submit.prevent="handleSubmit">
        <!-- Order Information -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Order Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="salesOrderNumber" class="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <div class="flex space-x-2">
                <input
                  id="salesOrderNumber"
                  v-model="orderData.salesOrderNumber"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Auto-generated"
                >
                <button
                  type="button"
                  class="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  :disabled="isGeneratingOrderNumber"
                  @click="generateOrderNumber"
                >
                  {{ isGeneratingOrderNumber ? 'Generating...' : 'Generate' }}
                </button>
              </div>
            </div>
            <div>
              <label for="transactionDate" class="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input
                id="transactionDate"
                v-model="orderData.transactionDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <div class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-lg font-semibold text-gray-900">
                ${{ orderTotal.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Customer Selection -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Customer Information</h2>
          <div class="mb-4">
            <label for="customerId" class="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <AppAutocomplete
              id="customerId"
              v-model="selectedCustomer"
              :options="customers || []"
              placeholder="Search customers..."
              required
              display-key="name"
              value-key="id"
              :search-keys="['name', 'email', 'contactNumber', 'type']"
              @update:model-value="onCustomerSelect"
            />
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
            <div class="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
                  @input="updateItemTotal(index)"
                >
              </div>
              
              <div>
                <label :for="`price-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Price per Item *</label>
                <input
                  :id="`price-${index}`"
                  v-model.number="item.pricePerItem"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @input="updateItemTotal(index)"
                >
              </div>
              
              <div class="flex items-center space-x-2">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total</label>
                  <div class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                    ${{ (item.quantity * item.pricePerItem).toFixed(2) }}
                  </div>
                </div>
                <button
                  type="button"
                  class="px-2 py-2 text-red-600 hover:text-red-800"
                  @click="removeOrderItem(index)"
                >
                  <Icon name="heroicons:trash" class="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <!-- Product Selection Row (only for Spacover items) -->
            <div v-if="isSpacoverItem(item.itemId)" class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    @click="openProductSelector(index)"
                  >
                    <Icon name="heroicons:cube" class="w-4 h-4 mr-2 inline" />
                    Select Product Configuration
                  </button>
                </div>
                
                <!-- Selected Product Display -->
                <div v-if="item.productId" class="flex-1 ml-4 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="text-sm font-medium text-green-800">Selected Product:</div>
                      <div class="text-xs text-green-600 mt-1">{{ getProductDisplayName(item.productId) }}</div>
                    </div>
                    <button
                      type="button"
                      class="text-green-600 hover:text-green-800 ml-2"
                      @click="clearProductSelection(index)"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-4">
          <button
            type="button"
            class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            @click="router.push('/admin/orders')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Creating Order...' : 'Create Order' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Product Selector Modal -->
    <ProductSelector
      v-model="selectedProduct"
      :is-open="showProductSelector"
      @close="showProductSelector = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useFindManyCustomer, useFindManyItem, useCreateOrder } from '~/lib/hooks/index';
import { useQueryClient } from '@tanstack/vue-query';
import ProductSelector from '~/components/admin/ProductSelector.vue';

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
  salesOrderNumber: '',
  transactionDate: new Date().toISOString().split('T')[0], // Today's date as default
});

// Customer autocomplete state
const selectedCustomer = ref<any>(null);

const orderItems = ref<Array<{
  itemId: string;
  quantity: number;
  pricePerItem: number;
  productId?: string;
}>>([]);

// Product selector state
const showProductSelector = ref(false);
const selectedProduct = ref<any>(null);
const currentItemIndex = ref(-1);

// Store selected products for display
const selectedProducts = ref<Record<string, any>>({});

// Order number generation state
const isGeneratingOrderNumber = ref(false);

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

// Generate order number
async function generateOrderNumber() {
  try {
    isGeneratingOrderNumber.value = true;
    const response = await $fetch('/api/admin/orders/last-order-number');
    orderData.salesOrderNumber = response.nextOrderNumber;
    toast.success({ title: 'Success', message: 'Order number generated successfully!' });
  } catch (error) {
    toast.error({ title: 'Error', message: 'Failed to generate order number' });
  } finally {
    isGeneratingOrderNumber.value = false;
  }
}

function onCustomerSelect(customer: any) {
  if (customer) {
    orderData.customerId = customer.id;
    orderData.contactEmail = customer.email || '';
    orderData.contactPhoneNumber = customer.contactNumber || '';
  } else {
    orderData.customerId = '';
    orderData.contactEmail = '';
    orderData.contactPhoneNumber = '';
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
    const selectedItem = items.value.find((i: any) => i.id === item.itemId);
    if (selectedItem) {
      item.pricePerItem = parseFloat(String(selectedItem.retailPrice || selectedItem.wholesalePrice || 0));
    }
  }
}

function updateItemTotal(index: number) {
  // This function is called when quantity or price changes
  // The total is calculated automatically via the computed property
}

function isSpacoverItem(itemId: string): boolean {
  if (!items.value) return false;
  const item = items.value.find((i: any) => i.id === itemId);
  return item?.isSpacoverProduct || false;
}

function openProductSelector(index: number) {
  currentItemIndex.value = index;
  showProductSelector.value = true;
}

// Helper function to get product display name
function getProductDisplayName(productId: string): string {
  const product = selectedProducts.value[productId];
  return product ? product.displayName || product.fullDescription || 'Unknown Product' : 'Loading...';
}

// Helper function to clear product selection
function clearProductSelection(index: number) {
  const item = orderItems.value[index];
  if (item.productId) {
    delete selectedProducts.value[item.productId];
    item.productId = undefined;
    item.pricePerItem = 0;
  }
}

// Watch for product selection
watch(selectedProduct, (newProduct) => {
  if (newProduct && currentItemIndex.value >= 0) {
    const item = orderItems.value[currentItemIndex.value];
    item.productId = newProduct.id;
    item.pricePerItem = parseFloat(String(newProduct.price || 0));
    
    // Store the product for display
    selectedProducts.value[newProduct.id] = newProduct;
    
    selectedProduct.value = null;
    showProductSelector.value = false;
  }
});

const { mutate: createOrder, isPending: isSubmitting } = useCreateOrder({
  onSuccess: async () => {
    toast.success({ title: 'Success', message: 'Order created successfully!' });
    await queryClient.invalidateQueries();
    router.push('/admin/orders');
  },
  onError: (err: any) => {
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
    data: {
      customerId: orderData.customerId,
      contactEmail: orderData.contactEmail,
      contactPhoneNumber: orderData.contactPhoneNumber || null,
      salesOrderNumber: orderData.salesOrderNumber || null,
      transactionDate: orderData.transactionDate ? new Date(orderData.transactionDate) : null,
      totalAmount: orderTotal.value,
      orderStatus: 'PENDING' as const,
      items: {
        create: orderItems.value.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          pricePerItem: item.pricePerItem,
          productId: item.productId || null,
        }))
      }
    }
  };

  createOrder(payload);
};
</script> 