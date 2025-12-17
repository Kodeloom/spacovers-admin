<template>
  <AppModal :is-open="isOpen" title="Attribute Sewing Work" @close="$emit('close')">
    <div class="mt-4">
      <!-- Item Information -->
      <div v-if="selectedItem" class="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-3">Item Details</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="font-medium text-gray-700">Product Number:</span>
            <span class="ml-2 text-gray-900">{{ formatProductNumber(selectedItem.productNumber) }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Order:</span>
            <span class="ml-2 text-gray-900">{{ selectedItem.orderNumber }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Customer:</span>
            <span class="ml-2 text-gray-900">{{ selectedItem.customerName }}</span>
          </div>
          <div>
            <span class="font-medium text-gray-700">Current Status:</span>
            <span class="ml-2">
              <span 
                :class="getStatusBadgeClass(selectedItem.itemStatus)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              >
                {{ formatStatus(selectedItem.itemStatus) }}
              </span>
            </span>
          </div>
          <div v-if="selectedItem.stationProgression" class="col-span-2">
            <span class="font-medium text-gray-700">Station Progression:</span>
            <span class="ml-2 text-gray-900">{{ selectedItem.stationProgression }}</span>
          </div>
        </div>
      </div>

      <!-- Sewer Selection -->
      <div class="mb-6">
        <label for="sewerSelect" class="block text-sm font-medium text-gray-700 mb-2">
          Select Sewer to Attribute Work To
        </label>
        <select
          id="sewerSelect"
          v-model="selectedSewerId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          :disabled="isAttributing"
        >
          <option value="">Choose a sewer...</option>
          <option v-for="user in sewerUsers" :key="user.id" :value="user.id">
            {{ user.name }}
          </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">
          This will create a processing log entry for the selected sewer without changing the item's current status.
        </p>
      </div>

      <!-- Warning -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="text-sm font-medium text-yellow-800">Attribution Notice</h3>
            <p class="mt-1 text-sm text-yellow-700">
              This will retroactively attribute sewing work to the selected employee. The system will:
            </p>
            <ul class="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Create a processing log entry for the sewing station</li>
              <li>Calculate appropriate timing based on other processing logs</li>
              <li>Not change the item's current status or workflow</li>
              <li>Add a note indicating manual attribution</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3">
        <button
          @click="$emit('close')"
          :disabled="isAttributing"
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          @click="attributeSewer"
          :disabled="!selectedSewerId || isAttributing"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
        >
          <Icon v-if="isAttributing" name="svg-spinners:180-ring-with-bg" class="h-4 w-4 mr-2" />
          {{ isAttributing ? 'Attributing...' : 'Attribute Sewing Work' }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
  selectedItem: any;
  sewerUsers: any[];
  selectedSewerId: string;
  isAttributing: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'update:selectedSewerId', value: string): void;
  (e: 'attribute', data: { itemId: string; sewerId: string }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const selectedSewerId = computed({
  get: () => props.selectedSewerId,
  set: (value) => emit('update:selectedSewerId', value)
});

function attributeSewer() {
  if (!props.selectedItem || !props.selectedSewerId) return;
  
  emit('attribute', {
    itemId: props.selectedItem.orderItemId,
    sewerId: props.selectedSewerId
  });
}

function formatProductNumber(productNumber: number | null | undefined): string {
  if (!productNumber) {
    return 'N/A';
  }
  
  // Pad with zeros to ensure at least 5 digits
  const paddedNumber = productNumber.toString().padStart(5, '0');
  return `P${paddedNumber}`;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'Not Started',
    'CUTTING': 'Cutting',
    'SEWING': 'Sewing',
    'FOAM_CUTTING': 'Foam Cutting',
    'STUFFING': 'Stuffing',
    'PACKAGING': 'Packaging',
    'PRODUCT_FINISHED': 'Finished',
    'READY': 'Ready',
    'SHIPPED': 'Shipped',
    'CANCELLED': 'Cancelled'
  };
  return statusMap[status] || status.replace(/_/g, ' ');
}

function getStatusBadgeClass(status: string): string {
  const classMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'bg-gray-100 text-gray-800',
    'CUTTING': 'bg-orange-100 text-orange-800',
    'SEWING': 'bg-blue-100 text-blue-800',
    'FOAM_CUTTING': 'bg-purple-100 text-purple-800',
    'STUFFING': 'bg-yellow-100 text-yellow-800',
    'PACKAGING': 'bg-indigo-100 text-indigo-800',
    'PRODUCT_FINISHED': 'bg-green-100 text-green-800',
    'READY': 'bg-emerald-100 text-emerald-800',
    'SHIPPED': 'bg-teal-100 text-teal-800',
    'CANCELLED': 'bg-red-100 text-red-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
}
</script>