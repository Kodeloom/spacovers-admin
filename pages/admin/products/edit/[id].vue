<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p class="text-gray-600 mt-1">Update product specifications</p>
        </div>
        <NuxtLink
          to="/admin/products"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Icon name="heroicons:arrow-left" class="w-4 h-4 mr-2" />
          Back to Products
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="bg-white shadow rounded-lg p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"/>
        <p class="mt-2 text-gray-600">Loading product...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg p-8 text-center">
        <p class="text-red-600">{{ error }}</p>
        <NuxtLink
          to="/admin/products"
          class="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Products
        </NuxtLink>
      </div>

      <!-- Edit Form -->
      <div v-else-if="product" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-6">Product Specifications</h2>
        
        <form class="space-y-6" @submit.prevent="updateProduct">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Size *</label>
              <input
                v-model="productData.size"
                type="text"
                placeholder="e.g., 93X93"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Shape *</label>
              <input
                v-model="productData.shape"
                type="text"
                placeholder="e.g., Round"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Pieces *</label>
              <input
                v-model.number="productData.pieces"
                type="number"
                placeholder="e.g., 8"
                required
                min="1"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Color *</label>
              <input
                v-model="productData.color"
                type="text"
                placeholder="e.g., BLACK (VINYL)"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Foam Thickness *</label>
            <input
              v-model="productData.foamThickness"
              type="text"
              placeholder="e.g., 5-2.5 STEAM STOPPER"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Skit *</label>
            <input
              v-model="productData.skit"
              type="text"
              placeholder="e.g., 5-FL-SLIT"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tiedown *</label>
            <input
              v-model="productData.tiedown"
              type="text"
              placeholder="e.g., 6-TD"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <!-- Preview -->
          <div class="bg-gray-50 p-4 rounded-md">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <div class="text-sm text-gray-600">
              <p><strong>Display Name:</strong> {{ previewDisplayName }}</p>
              <pre class="mt-2 text-xs bg-white p-2 rounded border whitespace-pre-wrap">{{ previewFullDescription }}</pre>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end space-x-3 pt-6 border-t">
            <NuxtLink
              to="/admin/products"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </NuxtLink>
            <button
              type="submit"
              :disabled="isUpdating || !isFormValid"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isUpdating ? 'Updating...' : 'Update Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()

// Data
const product = ref<any>(null)
const isLoading = ref(true)
const isUpdating = ref(false)
const error = ref('')

// Form data
const productData = ref({
  size: '',
  shape: '',
  pieces: 0,
  foamThickness: '',
  skit: '',
  tiedown: '',
  color: ''
})

// Computed
const isFormValid = computed(() => {
  const { size, shape, pieces, foamThickness, skit, tiedown, color } = productData.value
  return size && shape && pieces > 0 && foamThickness && skit && tiedown && color
})

const previewDisplayName = computed(() => {
  const { size, shape, color } = productData.value
  if (size && shape && color) {
    return `${size} ${shape} ${color}`
  }
  return 'Preview will appear here...'
})

const previewFullDescription = computed(() => {
  const { size, shape, pieces, foamThickness, skit, tiedown, color } = productData.value
  if (size && shape && pieces && foamThickness && skit && tiedown && color) {
    return `${size}\n${shape}\n${pieces}\n${foamThickness}\n${skit}\n${tiedown}\n${color}`
  }
  return 'Preview will appear here...'
})

// Methods
const loadProduct = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const productId = route.params.id as string
    const response = await $fetch(`/api/admin/products/${productId}`)
    product.value = response
    
    // Populate form data
    productData.value = {
      size: response.size,
      shape: response.shape,
      pieces: response.pieces,
      foamThickness: response.foamThickness,
      skit: response.skit,
      tiedown: response.tiedown,
      color: response.color
    }
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load product'
  } finally {
    isLoading.value = false
  }
}

const updateProduct = async () => {
  if (!isFormValid.value) return

  isUpdating.value = true
  
  try {
    const productId = route.params.id as string
    const description = [
      productData.value.size,
      productData.value.shape,
      productData.value.pieces.toString(),
      productData.value.foamThickness,
      productData.value.skit,
      productData.value.tiedown,
      productData.value.color
    ].join('\n')

    const response = await $fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      body: { description }
    })

    // Show success message
    alert('Product updated successfully!')
    
    // Redirect to products list
    router.push('/admin/products')
  } catch (err: any) {
    alert(err.data?.message || 'Failed to update product')
  } finally {
    isUpdating.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadProduct()
})
</script> 