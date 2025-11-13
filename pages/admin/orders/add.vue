<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Create New Order</h1>
      <form @submit.prevent="handleSubmit">
        <!-- Order Information -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Order Information</h2>
          <!-- First row: Order Number, Date, Total -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="salesOrderNumber" class="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <div class="flex space-x-2">
                <input id="salesOrderNumber" v-model="orderData.salesOrderNumber" type="text" inputmode="numeric" pattern="[0-9]*"
                  @input="enforceNumericOnly($event, 'salesOrderNumber')"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Auto-generated">
                <button type="button"
                  class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
                  :disabled="isGeneratingOrderNumber" @click="generateOrderNumber">
                  {{ isGeneratingOrderNumber ? 'Generating...' : 'Generate' }}
                </button>
              </div>
            </div>
            <div>
              <label for="transactionDate" class="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <input id="transactionDate" v-model="orderData.transactionDate" type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
          </div>

          <!-- Second row: Priority and Purchase Order Number -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select id="priority" v-model="orderData.priority"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="NO_PRIORITY">No Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label for="purchaseOrderNumber" class="block text-sm font-medium text-gray-700 mb-1">
                Purchase Order Number
                <span v-if="isValidatingPO" class="text-xs text-blue-600 ml-1">(validating...)</span>
              </label>
              <input id="purchaseOrderNumber" v-model="orderData.purchaseOrderNumber" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Optional PO number" @input="onPONumberChange">
              <!-- PO Validation Warning -->
              <POValidationWarning :validation-result="poValidationResult"
                :show-warning="!!poValidationResult && !!orderData.purchaseOrderNumber"
                @confirm-duplicate="onConfirmDuplicate" @clear-po="onClearPO" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            <AppAutocomplete id="customerId" v-model="selectedCustomer" :options="customers || []"
              placeholder="Search customers..." required display-key="name" value-key="id"
              :search-keys="['name', 'email', 'contactNumber', 'type']" @update:model-value="onCustomerSelect" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="contactEmail" class="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
              <input id="contactEmail" v-model="orderData.contactEmail" type="email" required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
            <div>
              <label for="contactPhoneNumber" class="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input id="contactPhoneNumber" v-model="orderData.contactPhoneNumber" type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            </div>
          </div>
        </div>

        <!-- Addresses -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-700 mb-3">Addresses</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Shipping Address -->
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-3">Shipping Address</h3>
              <div class="space-y-3">
                <input v-model="orderData.shippingAddressLine1" type="text" placeholder="Address Line 1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <input v-model="orderData.shippingAddressLine2" type="text" placeholder="Address Line 2 (Optional)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="orderData.shippingCity" type="text" placeholder="City"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <input v-model="orderData.shippingState" type="text" placeholder="State"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <input v-model="orderData.shippingZipCode" type="text" placeholder="ZIP"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>
            </div>

            <!-- Billing Address -->
            <div>
              <h3 class="text-lg font-medium text-gray-700 mb-3">Billing Address</h3>
              <div class="space-y-3">
                <input v-model="orderData.billingAddressLine1" type="text" placeholder="Address Line 1"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <input v-model="orderData.billingAddressLine2" type="text" placeholder="Address Line 2 (Optional)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <div class="grid grid-cols-3 gap-2">
                  <input v-model="orderData.billingCity" type="text" placeholder="City"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <input v-model="orderData.billingState" type="text" placeholder="State"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  <input v-model="orderData.billingZipCode" type="text" placeholder="ZIP"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Products -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-3">
            <h2 class="text-xl font-semibold text-gray-700">Products</h2>
            <button type="button"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              @click="addOrderItem">
              <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
              Add Product
            </button>
          </div>

          <div v-if="orderItems.length === 0" class="text-center py-8 text-gray-500">
            <Icon name="heroicons:cube" class="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p class="text-lg font-medium text-gray-900 mb-2">No products added yet</p>
            <p class="text-gray-500 mb-4">Add products to this order to get started.</p>
            <button type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              @click="addOrderItem">
              <Icon name="heroicons:plus" class="mr-2 h-4 w-4" />
              Add First Product
            </button>
          </div>

          <div v-for="(item, index) in orderItems" :key="index" class="border border-gray-200 rounded-md p-4 mb-3">
            <!-- Main product row -->
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div class="md:col-span-2">
                <label :for="`item-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select :id="`item-${index}`" v-model="item.itemId" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @change="onItemChange(index)">
                  <option value="">Select a product...</option>
                  <option v-for="availableItem in items" :key="availableItem.id" :value="availableItem.id">
                    {{ availableItem.name }} - ${{ availableItem.retailPrice || availableItem.wholesalePrice || 0 }}
                  </option>
                </select>
              </div>

              <div>
                <label :for="`quantity-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Quantity
                  *</label>
                <input :id="`quantity-${index}`" v-model.number="item.quantity" type="number" min="1" required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @input="updateItemTotal(index)">
              </div>

              <div>
                <label :for="`price-${index}`" class="block text-sm font-medium text-gray-700 mb-1">Price per Product
                  *</label>
                <input :id="`price-${index}`" v-model.number="item.pricePerItem" type="number" step="0.01" min="0"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  @input="updateItemTotal(index)">
              </div>

              <div class="flex items-center space-x-2">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total</label>
                  <div class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
                    ${{ (item.quantity * item.pricePerItem).toFixed(2) }}
                  </div>
                </div>
                <button type="button" class="px-2 py-2 text-red-600 hover:text-red-800" @click="removeOrderItem(index)">
                  <Icon name="heroicons:trash" class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Product attributes toggle -->
            <div class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex justify-between items-center">
                <button type="button"
                  class="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  @click="toggleProductAttributes(index)">
                  <Icon :name="item.showAttributes ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                    class="w-4 h-4 mr-2" />
                  {{ item.showAttributes ? 'Hide' : 'Configure' }} Product Attributes
                </button>
              </div>
            </div>

            <!-- Production Item Notice -->
            <div class="mt-3 pt-3 border-t border-gray-100">
              <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div class="flex">
                  <Icon name="heroicons:information-circle" class="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
                  <div class="text-sm text-blue-800">
                    <p class="font-medium">Production Item</p>
                    <p>This product will automatically be marked as a production item and will require manufacturing
                      attributes and processing.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expandable Product Attributes Section -->
            <div v-if="item.showAttributes" class="mt-4 pt-4 border-t border-gray-200">
              <div class="mb-3">
                <h4 class="text-sm font-medium text-gray-700 mb-2">Product Manufacturing Attributes</h4>
                <p class="text-xs text-gray-500">Configure the specific attributes for this production item.</p>
              </div>
              <ProductAttributesForm :model-value="item.attributes" :item-index="index"
                @update:model-value="onAttributesUpdate(index, $event)" />
            </div>

            <!-- Product Selection Row (only for Spacover items) -->
            <!-- <div v-if="isSpacoverItem(item.itemId)" class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <button type="button" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    @click="openProductSelector(index)">
                    <Icon name="heroicons:cube" class="w-4 h-4 mr-2 inline" />
                    Select Product Configuration
                  </button>
                </div>

                <div v-if="item.productId" class="flex-1 ml-4 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="text-sm font-medium text-green-800">Selected Product:</div>
                      <div class="text-xs text-green-600 mt-1">{{ getProductDisplayName(item.productId) }}</div>
                    </div>
                    <button type="button" class="text-green-600 hover:text-green-800 ml-2"
                      @click="clearProductSelection(index)">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div> -->
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end space-x-4">
          <button type="button" class="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            @click="router.push('/admin/orders')">
            Cancel
          </button>
          <button type="submit" :disabled="isSubmitting"
            class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {{ isSubmitting ? 'Creating Order...' : 'Create Order' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Product Selector Modal -->
    <ProductSelector v-model="selectedProduct" :is-open="showProductSelector" :show="showProductSelector"
      @close="showProductSelector = false" />
  </div>
</template>

<script setup lang="ts">
import { useFindManyCustomer, useFindManyItem, useCreateOrder } from '~/lib/hooks/index';
import { useQueryClient } from '@tanstack/vue-query';
import ProductSelector from '~/components/admin/ProductSelector.vue';
import POValidationWarning from '~/components/admin/POValidationWarning.vue';
import ProductAttributesForm from '~/components/admin/ProductAttributesForm.vue';


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
  purchaseOrderNumber: '', // Order-level PO number
  transactionDate: new Date().toISOString().split('T')[0], // Today's date as default
  priority: 'MEDIUM' as 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH',
  shippingAddressLine1: '',
  shippingAddressLine2: '',
  shippingCity: '',
  shippingState: '',
  shippingZipCode: '',
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: '',
  billingState: '',
  billingZipCode: '',
});

// Customer autocomplete state
const selectedCustomer = ref<any>(null);

const orderItems = ref<Array<{
  itemId: string;
  quantity: number;
  pricePerItem: number;
  productId?: string;
  showAttributes?: boolean;
  attributes?: {
    size?: string;
    shape?: string;
    radiusSize?: string;
    skirtLength?: string;
    skirtType?: string;
    tieDownsQty?: string;
    tieDownPlacement?: string;
    distance?: string;
    foamUpgrade?: string;
    doublePlasticWrapUpgrade?: string;
    webbingUpgrade?: string;
    metalForLifterUpgrade?: string;
    steamStopperUpgrade?: string;
    fabricUpgrade?: string;
    extraHandleQty?: string;
    extraLongSkirt?: string;
    packaging?: boolean;
    productType?: string;
    color?: string;
    width?: string;
    length?: string;
  };
}>>([]);

// Product selector state
const showProductSelector = ref(false);
const selectedProduct = ref<any>(null);
const currentItemIndex = ref(-1);

// Store selected products for display
const selectedProducts = ref<Record<string, any>>({});

// Order number generation state
const isGeneratingOrderNumber = ref(false);

// PO validation state
const poValidationResult = ref<any>(null);
const isValidatingPO = ref(false);
const poValidationTimeout = ref<NodeJS.Timeout | null>(null);
const duplicateConfirmed = ref(false);

// Item PO validation state
const itemPOValidationResults = ref<Record<number, any>>({});
const isValidatingItemPO = ref<Record<number, boolean>>({});
const itemPOValidationTimeouts = ref<Record<number, NodeJS.Timeout>>({});
const itemDuplicateConfirmed = ref<Record<number, boolean>>({});

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

function enforceNumericOnly(event: Event, field: string) {
  const input = event.target as HTMLInputElement;
  const value = input.value;
  // Remove any non-numeric characters
  const numericValue = value.replace(/[^0-9]/g, '');
  // Update the model
  orderData[field] = numericValue;
  // Update the input value to reflect the change
  input.value = numericValue;
}

function onCustomerSelect(customer: any) {
  if (customer) {
    orderData.customerId = customer.id;
    orderData.contactEmail = customer.email || '';
    orderData.contactPhoneNumber = customer.contactNumber || '';

    // Re-validate PO number if one exists
    if (orderData.purchaseOrderNumber) {
      validatePONumber();
    }

    // Re-validate all item PO numbers
    orderItems.value.forEach((item, index) => {
      if (item.purchaseOrderNumber) {
        validateItemPONumber(index);
      }
    });
  } else {
    orderData.customerId = '';
    orderData.contactEmail = '';
    orderData.contactPhoneNumber = '';
    poValidationResult.value = null;
    itemPOValidationResults.value = {};
  }
}

// PO validation functions
function onPONumberChange() {
  duplicateConfirmed.value = false;
  poValidationResult.value = null;

  // Clear existing timeout
  if (poValidationTimeout.value) {
    clearTimeout(poValidationTimeout.value);
  }

  // Debounce validation
  if (orderData.purchaseOrderNumber && orderData.customerId) {
    poValidationTimeout.value = setTimeout(() => {
      validatePONumber();
    }, 500);
  }
}

async function validatePONumber() {
  if (!orderData.purchaseOrderNumber || !orderData.customerId) {
    poValidationResult.value = null;
    return;
  }

  try {
    isValidatingPO.value = true;
    const response = await $fetch('/api/admin/orders/validate-po', {
      method: 'POST',
      body: {
        customerId: orderData.customerId,
        poNumber: orderData.purchaseOrderNumber
      }
    });

    poValidationResult.value = response.data;
  } catch (error) {
    console.error('PO validation error:', error);
    poValidationResult.value = {
      isValid: false,
      isDuplicate: false,
      message: 'Failed to validate PO number'
    };
  } finally {
    isValidatingPO.value = false;
  }
}

function onConfirmDuplicate() {
  duplicateConfirmed.value = true;
  poValidationResult.value = null;
}

function onClearPO() {
  orderData.purchaseOrderNumber = '';
  poValidationResult.value = null;
  duplicateConfirmed.value = false;
}

// Item PO validation functions
function onItemPONumberChange(index: number) {
  itemDuplicateConfirmed.value[index] = false;
  itemPOValidationResults.value[index] = null;

  // Clear existing timeout
  if (itemPOValidationTimeouts.value[index]) {
    clearTimeout(itemPOValidationTimeouts.value[index]);
  }

  const item = orderItems.value[index];

  // Debounce validation
  if (item.purchaseOrderNumber && orderData.customerId) {
    itemPOValidationTimeouts.value[index] = setTimeout(() => {
      validateItemPONumber(index);
    }, 500);
  }
}

async function validateItemPONumber(index: number) {
  const item = orderItems.value[index];

  if (!item.purchaseOrderNumber || !orderData.customerId) {
    itemPOValidationResults.value[index] = null;
    return;
  }

  try {
    isValidatingItemPO.value[index] = true;
    const response = await $fetch('/api/admin/orders/validate-po', {
      method: 'POST',
      body: {
        customerId: orderData.customerId,
        poNumber: item.purchaseOrderNumber
      }
    });

    itemPOValidationResults.value[index] = response.data;
  } catch (error) {
    console.error('Item PO validation error:', error);
    itemPOValidationResults.value[index] = {
      isValid: false,
      isDuplicate: false,
      message: 'Failed to validate PO number'
    };
  } finally {
    isValidatingItemPO.value[index] = false;
  }
}

function onConfirmItemDuplicate(index: number) {
  itemDuplicateConfirmed.value[index] = true;
  itemPOValidationResults.value[index] = null;
}

function onClearItemPO(index: number) {
  orderItems.value[index].purchaseOrderNumber = '';
  itemPOValidationResults.value[index] = null;
  itemDuplicateConfirmed.value[index] = false;
}

// Product attributes functions
function toggleProductAttributes(index: number) {
  orderItems.value[index].showAttributes = !orderItems.value[index].showAttributes;
}

function onAttributesUpdate(index: number, attributes: any) {
  orderItems.value[index].attributes = attributes;
}

function addOrderItem() {
  orderItems.value.push({
    itemId: '',
    quantity: 1,
    pricePerItem: 0,
    showAttributes: true, // Show attributes by default for new products
    attributes: {
      // Initialize with some default values
      size: '',
      shape: 'Rectangle',
      radiusSize: '',
      skirtLength: '5',
      skirtType: 'STANDARD',
      tieDownsQty: '6',
      tieDownPlacement: 'STANDARD',
      distance: '0',
      foamUpgrade: '',
      doublePlasticWrapUpgrade: 'No',
      webbingUpgrade: 'No',
      metalForLifterUpgrade: 'No',
      steamStopperUpgrade: 'No',
      fabricUpgrade: 'No',
      extraHandleQty: '0',
      extraLongSkirt: 'No',
      packaging: false
    },
  });
}

function removeOrderItem(index: number) {
  // Clean up validation state for this item
  if (itemPOValidationTimeouts.value[index]) {
    clearTimeout(itemPOValidationTimeouts.value[index]);
  }
  delete itemPOValidationResults.value[index];
  delete isValidatingItemPO.value[index];
  delete itemPOValidationTimeouts.value[index];
  delete itemDuplicateConfirmed.value[index];

  orderItems.value.splice(index, 1);

  // Re-index validation state for remaining items
  const newValidationResults: Record<number, any> = {};
  const newValidatingState: Record<number, boolean> = {};
  const newTimeouts: Record<number, NodeJS.Timeout> = {};
  const newConfirmed: Record<number, boolean> = {};

  Object.keys(itemPOValidationResults.value).forEach(key => {
    const oldIndex = parseInt(key);
    if (oldIndex > index) {
      const newIndex = oldIndex - 1;
      newValidationResults[newIndex] = itemPOValidationResults.value[oldIndex];
      newValidatingState[newIndex] = isValidatingItemPO.value[oldIndex];
      newTimeouts[newIndex] = itemPOValidationTimeouts.value[oldIndex];
      newConfirmed[newIndex] = itemDuplicateConfirmed.value[oldIndex];
    } else if (oldIndex < index) {
      newValidationResults[oldIndex] = itemPOValidationResults.value[oldIndex];
      newValidatingState[oldIndex] = isValidatingItemPO.value[oldIndex];
      newTimeouts[oldIndex] = itemPOValidationTimeouts.value[oldIndex];
      newConfirmed[oldIndex] = itemDuplicateConfirmed.value[oldIndex];
    }
  });

  itemPOValidationResults.value = newValidationResults;
  isValidatingItemPO.value = newValidatingState;
  itemPOValidationTimeouts.value = newTimeouts;
  itemDuplicateConfirmed.value = newConfirmed;
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
  onSuccess: async (response: any) => {
    console.log('=== ORDER CREATION SUCCESS CALLBACK TRIGGERED ===');
    try {
      // ProductAttributes are now created automatically as part of the order creation
      console.log('Order creation response:', response);
      console.log('Order created successfully with ProductAttributes included in the transaction');

      // Handle approval result if order was created as approved
      if (response?.approvalResult) {
        const { printQueueItemsAdded, approvalSuccess } = response.approvalResult;

        if (!approvalSuccess) {
          toast.warning({
            title: 'Order Created with Issues',
            message: 'Order was created and approved, but there was an issue adding items to the print queue. Please check the print queue manually.'
          });
        } else if (printQueueItemsAdded > 0) {
          toast.success({
            title: 'Order Created & Approved',
            message: `Order created successfully and ${printQueueItemsAdded} item${printQueueItemsAdded === 1 ? '' : 's'} added to the print queue.`
          });
        } else {
          toast.success({ title: 'Success', message: 'Order created successfully!' });
        }
      } else {
        toast.success({ title: 'Success', message: 'Order created successfully!' });
      }

      await queryClient.invalidateQueries();
      router.push('/admin/orders');
    } catch (error) {
      console.error('Error in post-creation processing:', error);
      // Still show success since the order was created
      toast.success({
        title: 'Order Created',
        message: 'Order created successfully, but there may have been issues with product attributes. Please check the order details.'
      });
      await queryClient.invalidateQueries();
      router.push('/admin/orders');
    }
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

  // Check for PO validation issues
  if (orderData.purchaseOrderNumber && poValidationResult.value?.isDuplicate && !duplicateConfirmed.value) {
    toast.error({ title: 'Error', message: 'Please resolve the duplicate PO number warning before submitting.' });
    return;
  }

  // Check for item PO validation issues
  for (let i = 0; i < orderItems.value.length; i++) {
    const item = orderItems.value[i];
    if (item.purchaseOrderNumber && itemPOValidationResults.value[i]?.isDuplicate && !itemDuplicateConfirmed.value[i]) {
      toast.error({ title: 'Error', message: `Please resolve the duplicate PO number warning for item ${i + 1} before submitting.` });
      return;
    }
  }

  const payload = {
    data: {
      customerId: orderData.customerId,
      contactEmail: orderData.contactEmail,
      contactPhoneNumber: orderData.contactPhoneNumber || null,
      salesOrderNumber: orderData.salesOrderNumber || null,
      purchaseOrderNumber: orderData.purchaseOrderNumber || null,
      transactionDate: orderData.transactionDate ? new Date(orderData.transactionDate) : null,
      priority: orderData.priority,
      totalAmount: orderTotal.value,
      orderStatus: 'PENDING' as const,
      shippingAddressLine1: orderData.shippingAddressLine1 || null,
      shippingAddressLine2: orderData.shippingAddressLine2 || null,
      shippingCity: orderData.shippingCity || null,
      shippingState: orderData.shippingState || null,
      shippingZipCode: orderData.shippingZipCode || null,
      billingAddressLine1: orderData.billingAddressLine1 || null,
      billingAddressLine2: orderData.billingAddressLine2 || null,
      billingCity: orderData.billingCity || null,
      billingState: orderData.billingState || null,
      billingZipCode: orderData.billingZipCode || null,
      items: {
        create: orderItems.value.flatMap(item => {
          // Create multiple OrderItems based on quantity
          const orderItemsToCreate = [];
          for (let i = 0; i < item.quantity; i++) {
            orderItemsToCreate.push({
              itemId: item.itemId,
              quantity: 1, // Each OrderItem has quantity 1
              pricePerItem: item.pricePerItem,
              productId: item.productId || null,
              isProduct: true, // Automatically mark all items as production items
              itemStatus: 'NOT_STARTED_PRODUCTION',
              // Create ProductAttribute if attributes exist
              ...(item.attributes ? {
                productAttributes: {
                  create: {
                    // Map all valid ProductAttribute fields
                    productType: item.attributes.productType,
                    color: item.attributes.color,
                    size: item.attributes.size,
                    shape: item.attributes.customShapeValue || item.attributes.shape, // Use customShapeValue if present, otherwise shape
                    radiusSize: item.attributes.radiusSize,
                    length: item.attributes.length,
                    width: item.attributes.width,
                    skirtLength: item.attributes.skirtLength,
                    skirtType: item.attributes.skirtType,
                    tieDownsQty: item.attributes.tieDownsQty,
                    tieDownPlacement: item.attributes.tieDownPlacement,
                    distance: item.attributes.distance,
                    tieDownLength: item.attributes.tieDownLength, // This IS a valid field
                    poNumber: item.attributes.poNumber,
                    notes: item.attributes.notes,
                    foamUpgrade: item.attributes.customFoamUpgradeValue || item.attributes.foamUpgrade, // Use customFoamUpgradeValue if present, otherwise foamUpgrade
                    doublePlasticWrapUpgrade: item.attributes.doublePlasticWrapUpgrade,
                    webbingUpgrade: item.attributes.webbingUpgrade,
                    metalForLifterUpgrade: item.attributes.metalForLifterUpgrade,
                    steamStopperUpgrade: item.attributes.steamStopperUpgrade,
                    fabricUpgrade: item.attributes.fabricUpgrade,
                    extraHandleQty: item.attributes.extraHandleQty,
                    extraLongSkirt: item.attributes.extraLongSkirt,
                    packaging: item.attributes.packaging,
                    verified: false
                  }
                }
              } : {})
            });
          }
          return orderItemsToCreate;
        })
      }
    }
  };

  createOrder(payload);
};
</script>