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
              <label class="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
              <select
                v-model="productData.productType"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Product Type</option>
                <option value="SPA_COVER">Spa Cover</option>
                <option value="COVER_FOR_COVER">Cover for Cover</option>
              </select>
            </div>
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input
                v-model.number="productData.price"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 299.99"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                v-model="productData.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Link to Item (Optional)</label>
              <input
                v-model="productData.itemId"
                type="text"
                placeholder="Enter Item ID to link this product"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
              <p class="text-xs text-gray-500 mt-1">Leave empty if not linking to a specific Item</p>
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

          <!-- Additional Product Attributes -->
          <div class="border-t pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Additional Attributes</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Core Attributes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Radius Size</label>
                <input
                  v-model="productData.radiusSize"
                  type="text"
                  placeholder="e.g., 12"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Length</label>
                <input
                  v-model="productData.skirtLength"
                  type="text"
                  placeholder="e.g., 5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Type</label>
                <select
                  v-model="productData.skirtType"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Skirt Type</option>
                  <option value="CONN">Connected</option>
                  <option value="SLIT">Slit</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tie Downs Quantity</label>
                <input
                  v-model="productData.tieDownsQty"
                  type="text"
                  placeholder="e.g., 6"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Placement</label>
                <select
                  v-model="productData.tieDownPlacement"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Placement</option>
                  <option value="HANDLE_SIDE">Handle Side</option>
                  <option value="CORNER_SIDE">Corner Side</option>
                  <option value="FOLD_SIDE">Fold Side</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Distance</label>
                <input
                  v-model="productData.distance"
                  type="text"
                  placeholder="e.g., 0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
              </div>
            </div>

            <!-- Upgrades Section -->
            <div class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Upgrades</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Foam Upgrade</label>
                  <select
                    v-model="productData.foamUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Double Plastic Wrap</label>
                  <select
                    v-model="productData.doublePlasticWrapUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Webbing Upgrade</label>
                  <select
                    v-model="productData.webbingUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Metal for Lifter</label>
                  <select
                    v-model="productData.metalForLifterUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Steam Stopper</label>
                  <select
                    v-model="productData.steamStopperUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Fabric Upgrade</label>
                  <select
                    v-model="productData.fabricUpgrade"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Special Attributes -->
            <div class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Special Attributes</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Extra Handle Quantity</label>
                  <input
                    v-model="productData.extraHandleQty"
                    type="text"
                    placeholder="e.g., 0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Extra Long Skirt</label>
                  <select
                    v-model="productData.extraLongSkirt"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Auto-calculated</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Packaging</label>
                  <div class="flex items-center">
                    <input
                      v-model="productData.packaging"
                      type="checkbox"
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    >
                    <span class="ml-2 text-sm text-gray-700">Requires packaging</span>
                  </div>
                </div>
              </div>
            </div>
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
  productType: '',
  size: '',
  shape: '',
  pieces: 0,
  foamThickness: '',
  skit: '',
  tiedown: '',
  color: '',
  price: 0,
  status: 'ACTIVE',
  itemId: '',
  radiusSize: '',
  skirtLength: '',
  skirtType: '',
  tieDownsQty: '',
  tieDownPlacement: '',
  distance: '',
  foamUpgrade: 'No',
  doublePlasticWrapUpgrade: 'No',
  webbingUpgrade: 'No',
  metalForLifterUpgrade: 'No',
  steamStopperUpgrade: 'No',
  fabricUpgrade: 'No',
  extraHandleQty: '',
  extraLongSkirt: '',
  packaging: false
})

// Computed
const isFormValid = computed(() => {
  const { productType, size, shape, pieces, foamThickness, skit, tiedown, color, price, status } = productData.value
  return productType && size && shape && pieces > 0 && foamThickness && skit && tiedown && color && price >= 0 && status
})

const previewDisplayName = computed(() => {
  const { size, shape, color } = productData.value
  if (size && shape && color) {
    return `${size} ${shape} ${color}`
  }
  return 'Preview will appear here...'
})

const previewFullDescription = computed(() => {
  const { size, shape, pieces, foamThickness, skit, tiedown, color, price, status } = productData.value
  if (size && shape && pieces && foamThickness && skit && tiedown && color && price >= 0 && status) {
    return `${size}\n${shape}\n${pieces}\n${foamThickness}\n${skit}\n${tiedown}\n${color}\n${price}\n${status}`
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
      productType: response.productType,
      size: response.size,
      shape: response.shape,
      pieces: response.pieces,
      foamThickness: response.foamThickness,
      skit: response.skit,
      tiedown: response.tiedown,
      color: response.color,
      price: response.price,
      status: response.status,
      itemId: response.itemId || '',
      radiusSize: response.radiusSize || '',
      skirtLength: response.skirtLength || '',
      skirtType: response.skirtType || '',
      tieDownsQty: response.tieDownsQty || '',
      tieDownPlacement: response.tieDownPlacement || '',
      distance: response.distance || '',
      foamUpgrade: response.foamUpgrade || 'No',
      doublePlasticWrapUpgrade: response.doublePlasticWrapUpgrade || 'No',
      webbingUpgrade: response.webbingUpgrade || 'No',
      metalForLifterUpgrade: response.metalForLifterUpgrade || 'No',
      steamStopperUpgrade: response.steamStopperUpgrade || 'No',
      fabricUpgrade: response.fabricUpgrade || 'No',
      extraHandleQty: response.extraHandleQty || '',
      extraLongSkirt: response.extraLongSkirt || '',
      packaging: response.packaging || false
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
      productData.value.productType,
      productData.value.size,
      productData.value.shape,
      productData.value.pieces.toString(),
      productData.value.foamThickness,
      productData.value.skit,
      productData.value.tiedown,
      productData.value.color,
      productData.value.price.toString(),
      productData.value.status
    ].join('\n')

    const response = await $fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      body: {
        productType: productData.value.productType,
        size: productData.value.size,
        shape: productData.value.shape,
        pieces: productData.value.pieces,
        foamThickness: productData.value.foamThickness,
        skit: productData.value.skit,
        tiedown: productData.value.tiedown,
        color: productData.value.color,
        price: productData.value.price,
        status: productData.value.status,
        fullDescription: description,
        displayName: `${productData.value.size} ${productData.value.shape} ${productData.value.color}`,
        itemId: productData.value.itemId,
        radiusSize: productData.value.radiusSize,
        skirtLength: productData.value.skirtLength,
        skirtType: productData.value.skirtType,
        tieDownsQty: productData.value.tieDownsQty,
        tieDownPlacement: productData.value.tieDownPlacement,
        distance: productData.value.distance,
        foamUpgrade: productData.value.foamUpgrade,
        doublePlasticWrapUpgrade: productData.value.doublePlasticWrapUpgrade,
        webbingUpgrade: productData.value.webbingUpgrade,
        metalForLifterUpgrade: productData.value.metalForLifterUpgrade,
        steamStopperUpgrade: productData.value.steamStopperUpgrade,
        fabricUpgrade: productData.value.fabricUpgrade,
        extraHandleQty: productData.value.extraHandleQty,
        extraLongSkirt: productData.value.extraLongSkirt,
        packaging: productData.value.packaging
      }
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