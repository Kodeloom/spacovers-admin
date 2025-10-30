<template>
  <div v-if="showWarning && validationResult" class="mt-2">
    <!-- Duplicate PO Warning -->
    <div v-if="validationResult.isDuplicate" class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-yellow-400" />
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-yellow-800">
            Duplicate Purchase Order Number
          </h3>
          <div class="mt-2 text-sm text-yellow-700">
            <p>This PO number is already used in:</p>
            <ul class="list-disc list-inside mt-1 space-y-1">
              <li v-for="order in validationResult.existingOrders" :key="order.id">
                Order #{{ order.salesOrderNumber }} for {{ order.customer?.name }}
                <span class="text-xs text-yellow-600">({{ new Date(order.createdAt).toLocaleDateString() }})</span>
              </li>
            </ul>
          </div>
          <div class="mt-3 flex space-x-2">
            <button
              type="button"
              class="bg-yellow-100 px-3 py-1 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200"
              @click="$emit('confirm-duplicate')"
            >
              Use Anyway
            </button>
            <button
              type="button"
              class="bg-white px-3 py-1 rounded-md text-sm font-medium text-yellow-800 border border-yellow-300 hover:bg-yellow-50"
              @click="$emit('clear-po')"
            >
              Clear PO Number
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invalid Format Warning -->
    <div v-else-if="!validationResult.isValid" class="bg-red-50 border border-red-200 rounded-md p-3">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">
            Invalid PO Number Format
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{{ validationResult.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ValidationResult {
  isValid: boolean
  isDuplicate: boolean
  message?: string
  existingOrders?: Array<{
    id: string
    salesOrderNumber: string
    customer?: { name: string }
    createdAt: string
  }>
}

interface Props {
  validationResult: ValidationResult | null
  showWarning: boolean
}

defineProps<Props>()

defineEmits<{
  'confirm-duplicate': []
  'clear-po': []
}>()
</script>