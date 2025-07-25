<template>
  <AppModal
    :is-open="show"
    title="Select Product"
    @close="$emit('close')"
  >
    <div class="space-y-4">
    <!-- Product Selection Options -->
    <div class="space-y-3">
      <div class="flex items-center space-x-4">
        <label class="flex items-center">
          <input
            v-model="selectionMode"
            type="radio"
            value="existing"
            class="mr-2"
          >
          <span class="text-sm font-medium">Select Existing Product</span>
        </label>
        <label class="flex items-center">
          <input
            v-model="selectionMode"
            type="radio"
            value="manual"
            class="mr-2"
          >
          <span class="text-sm font-medium">Create Product Manually</span>
        </label>
        <label class="flex items-center">
          <input
            v-model="selectionMode"
            type="radio"
            value="description"
            class="mr-2"
          >
          <span class="text-sm font-medium">Create from Description</span>
        </label>
      </div>
    </div>

    <!-- Existing Product Selection -->
    <div v-if="selectionMode === 'existing'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Search Products</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by size, shape, color..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          @input="handleSearch"
        >
      </div>
      
      <div v-if="isLoading" class="text-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"/>
        <p class="mt-2 text-sm text-gray-600">Loading products...</p>
      </div>
      
      <div v-else-if="products.length === 0" class="text-center py-4">
        <p class="text-sm text-gray-600">No products found.</p>
      </div>
      
      <div v-else class="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
        <div
          v-for="product in products"
          :key="product.id"
          class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
          :class="{ 'bg-blue-50 border-blue-200': selectedProduct?.id === product.id }"
          @click="selectProduct(product)"
        >
          <div class="font-medium text-sm">{{ product.displayName }}</div>
          <div class="text-xs text-gray-500 mt-1">{{ product.fullDescription }}</div>
        </div>
      </div>
    </div>

    <!-- Manual Product Creation -->
    <div v-if="selectionMode === 'manual'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <input
            v-model="manualProduct.size"
            type="text"
            placeholder="e.g., 93X93"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Shape</label>
          <input
            v-model="manualProduct.shape"
            type="text"
            placeholder="e.g., Round"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Pieces</label>
          <input
            v-model.number="manualProduct.pieces"
            type="number"
            placeholder="e.g., 8"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input
            v-model="manualProduct.color"
            type="text"
            placeholder="e.g., BLACK (VINYL)"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Foam Thickness</label>
        <input
          v-model="manualProduct.foamThickness"
          type="text"
          placeholder="e.g., 5-2.5 STEAM STOPPER"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Skit</label>
        <input
          v-model="manualProduct.skit"
          type="text"
          placeholder="e.g., 5-FL-SLIT"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tiedown</label>
        <input
          v-model="manualProduct.tiedown"
          type="text"
          placeholder="e.g., 6-TD"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
      </div>
      
      <button
        :disabled="isCreating || !isManualProductValid"
        class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="createManualProduct"
      >
        {{ isCreating ? 'Creating...' : 'Create Product' }}
      </button>
    </div>

    <!-- Description-based Product Creation -->
    <div v-if="selectionMode === 'description'" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
        <textarea
          v-model="descriptionText"
          rows="7"
          placeholder="Paste the product description from QuickBooks here...
Example:
93X93
Round
8
5-2.5 STEAM STOPPER
5-FL-SLIT
6-TD
BLACK (VINYL)"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <p class="text-xs text-gray-500 mt-1">
          Format: Size, Shape, Pieces, Foam Thickness, Skit, Tiedown, Color (one per line)
        </p>
      </div>
      
      <button
        :disabled="isCreating || !descriptionText.trim()"
        class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="createFromDescription"
      >
        {{ isCreating ? 'Creating...' : 'Create Product from Description' }}
      </button>
    </div>

    <!-- Selected Product Display -->
    <div v-if="selectedProduct" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-medium text-green-900">Selected Product</h4>
          <p class="text-sm text-green-700 mt-1">{{ selectedProduct.displayName }}</p>
          <pre class="text-xs text-green-600 mt-2 whitespace-pre-wrap">{{ selectedProduct.fullDescription }}</pre>
        </div>
        <button
          class="text-green-600 hover:text-green-800"
          @click="clearSelection"
        >
          <Icon name="heroicons:x-mark" class="w-4 h-4" />
        </button>
      </div>
    </div>
      </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          v-if="selectedProduct"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          @click="confirmSelection"
        >
          Select Product
        </button>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from '#imports'

const props = defineProps<{
  show: boolean
  modelValue?: any
}>()

const emit = defineEmits<{
  'close': []
  'update:modelValue': [value: any]
}>()

const toast = useToast()

// Data
const selectionMode = ref('existing')
const searchQuery = ref('')
const products = ref<any[]>([])
const selectedProduct = ref<any>(props.modelValue || null)
const isLoading = ref(false)
const isCreating = ref(false)

// Manual product form
const manualProduct = ref({
  size: '',
  shape: '',
  pieces: 0,
  foamThickness: '',
  skit: '',
  tiedown: '',
  color: ''
})

// Description text
const descriptionText = ref('')

// Computed
const isManualProductValid = computed(() => {
  const { size, shape, pieces, foamThickness, skit, tiedown, color } = manualProduct.value
  return size && shape && pieces > 0 && foamThickness && skit && tiedown && color
})

// Methods
const loadProducts = async () => {
  isLoading.value = true
  
  try {
    const params = new URLSearchParams({
      skip: '0',
      take: '50'
    })
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }
    
    const response = await $fetch(`/api/admin/products?${params}`)
    products.value = response.products
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: 'Failed to load products',
      color: 'red'
    })
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  if (selectionMode.value === 'existing') {
    loadProducts()
  }
}

const selectProduct = (product: any) => {
  selectedProduct.value = product
  emit('update:modelValue', product)
}

const clearSelection = () => {
  selectedProduct.value = null
  emit('update:modelValue', null)
}

const confirmSelection = () => {
  if (selectedProduct.value) {
    emit('update:modelValue', selectedProduct.value)
    emit('close')
  }
}

const createManualProduct = async () => {
  if (!isManualProductValid.value) return

  isCreating.value = true
  
  try {
    const description = [
      manualProduct.value.size,
      manualProduct.value.shape,
      manualProduct.value.pieces.toString(),
      manualProduct.value.foamThickness,
      manualProduct.value.skit,
      manualProduct.value.tiedown,
      manualProduct.value.color
    ].join('\n')

    const response = await $fetch('/api/admin/products/create-from-description', {
      method: 'POST',
      body: { description }
    })

    toast.add({
      title: 'Success',
      description: response.message,
      color: 'green'
    })

    // Select the created product
    selectProduct(response.product)
    
    // Reset form
    manualProduct.value = {
      size: '',
      shape: '',
      pieces: 0,
      foamThickness: '',
      skit: '',
      tiedown: '',
      color: ''
    }
    
    // Switch back to existing selection
    selectionMode.value = 'existing'
    loadProducts()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to create product',
      color: 'red'
    })
  } finally {
    isCreating.value = false
  }
}

const createFromDescription = async () => {
  if (!descriptionText.value.trim()) return

  isCreating.value = true
  
  try {
    const response = await $fetch('/api/admin/products/create-from-description', {
      method: 'POST',
      body: { description: descriptionText.value }
    })

    toast.add({
      title: 'Success',
      description: response.message,
      color: 'green'
    })

    // Select the created product
    selectProduct(response.product)
    
    // Reset form
    descriptionText.value = ''
    
    // Switch back to existing selection
    selectionMode.value = 'existing'
    loadProducts()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to create product from description',
      color: 'red'
    })
  } finally {
    isCreating.value = false
  }
}

// Watch for mode changes
watch(selectionMode, (newMode) => {
  if (newMode === 'existing') {
    loadProducts()
  }
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  selectedProduct.value = newValue
})

// Initial load
onMounted(() => {
  if (selectionMode.value === 'existing') {
    loadProducts()
  }
})
</script> 