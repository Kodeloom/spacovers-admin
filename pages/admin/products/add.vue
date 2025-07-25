<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Add Product</h1>
          <p class="text-gray-600 mt-1">Create a new product with specifications</p>
        </div>
        <NuxtLink
          to="/admin/products"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Icon name="heroicons:arrow-left" class="w-4 h-4 mr-2" />
          Back to Products
        </NuxtLink>
      </div>

      <!-- Product Creation Options -->
      <div class="bg-white shadow rounded-lg p-6 mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Creation Method</h2>
        <div class="flex items-center space-x-6">
          <label class="flex items-center">
            <input
              v-model="creationMethod"
              type="radio"
              value="manual"
              class="mr-2"
            >
            <span class="text-sm font-medium">Create Manually</span>
          </label>
          <label class="flex items-center">
            <input
              v-model="creationMethod"
              type="radio"
              value="description"
              class="mr-2"
            >
            <span class="text-sm font-medium">Create from Description</span>
          </label>
        </div>
      </div>

      <!-- Manual Creation Form -->
      <div v-if="creationMethod === 'manual'" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-6">Product Specifications</h2>
        
        <form class="space-y-6" @submit.prevent="createProduct">
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
              :disabled="isCreating || !isFormValid"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCreating ? 'Creating...' : 'Create Product' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Description-based Creation -->
      <div v-if="creationMethod === 'description'" class="bg-white shadow rounded-lg p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-6">Create from Description</h2>
        
        <form class="space-y-6" @submit.prevent="createFromDescription">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Product Description *</label>
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
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p class="text-xs text-gray-500 mt-1">
              Format: Size, Shape, Pieces, Foam Thickness, Skit, Tiedown, Color (one per line)
            </p>
          </div>

          <!-- Preview -->
          <div v-if="parsedDescription" class="bg-gray-50 p-4 rounded-md">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Parsed Preview</h3>
            <div class="text-sm text-gray-600">
              <p><strong>Display Name:</strong> {{ parsedDescription.displayName }}</p>
              <pre class="mt-2 text-xs bg-white p-2 rounded border whitespace-pre-wrap">{{ parsedDescription.fullDescription }}</pre>
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
              :disabled="isCreating || !descriptionText.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCreating ? 'Creating...' : 'Create Product from Description' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const router = useRouter()

// Data
const creationMethod = ref('manual')
const isCreating = ref(false)

// Manual form data
const productData = ref({
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

const parsedDescription = computed(() => {
  if (!descriptionText.value.trim()) return null
  
  try {
    const lines = descriptionText.value.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length < 7) return null

    const specs = {
      size: lines[0] || '',
      shape: lines[1] || '',
      pieces: parseInt(lines[2]) || 0,
      foamThickness: lines[3] || '',
      skit: lines[4] || '',
      tiedown: lines[5] || '',
      color: lines[6] || ''
    }

    if (!specs.size || !specs.shape || specs.pieces === 0 || !specs.foamThickness || !specs.skit || !specs.tiedown || !specs.color) {
      return null
    }

    const fullDescription = lines.join('\n')
    const displayName = `${specs.size} ${specs.shape} ${specs.color}`

    return {
      specs,
      fullDescription,
      displayName
    }
  } catch (error) {
    return null
  }
})

// Methods
const createProduct = async () => {
  if (!isFormValid.value) return

  isCreating.value = true
  
  try {
    const description = [
      productData.value.size,
      productData.value.shape,
      productData.value.pieces.toString(),
      productData.value.foamThickness,
      productData.value.skit,
      productData.value.tiedown,
      productData.value.color
    ].join('\n')

    await $fetch('/api/admin/products/create-from-description', {
      method: 'POST',
      body: { description }
    })

    // Show success message
    alert('Product created successfully!')
    
    // Redirect to products list
    router.push('/admin/products')
  } catch (error: any) {
    alert(error.data?.message || 'Failed to create product')
  } finally {
    isCreating.value = false
  }
}

const createFromDescription = async () => {
  if (!descriptionText.value.trim()) return

  isCreating.value = true
  
  try {
    await $fetch('/api/admin/products/create-from-description', {
      method: 'POST',
      body: { description: descriptionText.value }
    })

    // Show success message
    alert('Product created successfully!')
    
    // Redirect to products list
    router.push('/admin/products')
  } catch (error: any) {
    alert(error.data?.message || 'Failed to create product from description')
  } finally {
    isCreating.value = false
  }
}
</script> 