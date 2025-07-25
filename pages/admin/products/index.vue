<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-semibold">
        Products
      </h1>
      <NuxtLink
        to="/admin/products/add"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        <Icon name="heroicons:plus-solid" class="mr-2 h-5 w-5" />
        Add Product
      </NuxtLink>
    </div>

    <div class="mb-4">
      <input 
        v-model="searchQuery"
        type="text" 
        placeholder="Search products..."
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
      >
    </div>

    <div class="bg-white shadow rounded-lg">
      <AppTable
        v-model:sort="sort"
        :rows="productsData?.data ?? []"
        :columns="columns"
        :pending="pending"
      >
        <template #displayName-data="{ row }">
          <div>
            <div class="text-sm font-medium text-gray-900">{{ row.displayName }}</div>
            <div class="text-sm text-gray-500 truncate max-w-xs">{{ row.fullDescription }}</div>
          </div>
        </template>
        <template #createdAt-data="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
        <template #actions-data="{ row }">
          <div class="flex space-x-2">
            <button
              class="text-blue-600 hover:text-blue-900"
              @click="viewProduct(row)"
            >
              <Icon name="heroicons:eye-20-solid" class="h-5 w-5" />
            </button>
            <NuxtLink :to="`/admin/products/edit/${row.id}`" class="text-indigo-600 hover:text-indigo-900">
              <Icon name="heroicons:pencil-square-20-solid" class="h-5 w-5" />
            </NuxtLink>
            <button class="text-red-600 hover:text-red-900" @click="confirmDelete(row)">
              <Icon name="heroicons:trash-20-solid" class="h-5 w-5" />
            </button>
          </div>
        </template>
      </AppTable>
      <div
        v-if="productsData && productsData.count > 0"
        class="px-6 py-4 border-t border-gray-200 flex items-center justify-between"
      >
        <p class="text-sm text-gray-700">
          Showing
          <span class="font-medium">{{ (page - 1) * limit + 1 }}</span>
          to
          <span class="font-medium">{{ Math.min(page * limit, productsData.count) }}</span>
          of
          <span class="font-medium">{{ productsData.count }}</span>
          results
        </p>
        <div class="flex-1 flex justify-end">
          <button
            :disabled="page === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page--"
          >
            Previous
          </button>
          <button
            :disabled="page === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            @click="page++"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Product Details Modal -->
    <AppModal
      :is-open="showDetailsModal"
      title="Product Details"
      @close="showDetailsModal = false"
    >
      <div v-if="selectedProduct" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Display Name</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.displayName }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Size</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.size }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Shape</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.shape }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Pieces</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.pieces }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Color</label>
            <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.color }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Created</label>
            <p class="mt-1 text-sm text-gray-900">{{ formatDate(selectedProduct.createdAt) }}</p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Foam Thickness</label>
          <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.foamThickness }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Skit</label>
          <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.skit }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Tiedown</label>
          <p class="mt-1 text-sm text-gray-900">{{ selectedProduct.tiedown }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Full Description</label>
          <pre class="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded whitespace-pre-wrap">{{ selectedProduct.fullDescription }}</pre>
        </div>
      </div>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal :is-open="!!productToDelete" title="Confirm Deletion" @close="productToDelete = null">
      <p>Are you sure you want to delete the product '<strong>{{ productToDelete?.displayName }}</strong>'? This action cannot be undone.</p>
      <div class="flex justify-end space-x-2 mt-4">
        <button class="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100" @click="productToDelete = null">
          Cancel
        </button>
        <button
          class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
          :disabled="isDeleting"
          @click="handleDelete"
        >
          <Icon v-if="isDeleting" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          Delete
        </button>
      </div>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Data
const productsData = ref<any>(null)
const pending = ref(false)
const error = ref('')

// Pagination
const page = ref(1)
const limit = 10

// Search
const searchQuery = ref('')
let searchTimeout: NodeJS.Timeout | null = null

// Sorting
const sort = ref({ column: 'createdAt', direction: 'desc' as 'asc' | 'desc' })

// Modals
const showDetailsModal = ref(false)
const selectedProduct = ref<any>(null)
const productToDelete = ref<any>(null)
const isDeleting = ref(false)

// Computed
const totalPages = computed(() => {
  if (!productsData.value?.count) return 0
  return Math.ceil(productsData.value.count / limit)
})

// Table columns
const columns = [
  { key: 'displayName', label: 'Product', sortable: true },
  { key: 'size', label: 'Size', sortable: true },
  { key: 'shape', label: 'Shape', sortable: true },
  { key: 'pieces', label: 'Pieces', sortable: true },
  { key: 'color', label: 'Color', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false }
]

// Methods
const loadProducts = async () => {
  pending.value = true
  error.value = ''
  
  try {
    const skip = (page.value - 1) * limit
    const params = new URLSearchParams({
      skip: skip.toString(),
      take: limit.toString(),
      orderBy: sort.value.column,
      direction: sort.value.direction
    })
    
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }
    
    const response = await $fetch(`/api/admin/products?${params}`)
    productsData.value = response
  } catch (err: any) {
    error.value = err.data?.message || 'Failed to load products'
    console.error('Error loading products:', err)
  } finally {
    pending.value = false
  }
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadProducts()
  }, 300)
}

const viewProduct = (product: any) => {
  selectedProduct.value = product
  showDetailsModal.value = true
}

const confirmDelete = (product: any) => {
  productToDelete.value = product
}

const handleDelete = async () => {
  if (!productToDelete.value) return

  isDeleting.value = true
  
  try {
    await $fetch(`/api/admin/products/${productToDelete.value.id}`, {
      method: 'DELETE'
    })

    // Show success message
    alert('Product deleted successfully!')
    
    // Reload products
    loadProducts()
    
    // Close modal
    productToDelete.value = null
  } catch (error: any) {
    alert(error.data?.message || 'Failed to delete product')
  } finally {
    isDeleting.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Watchers
watch([page, sort], () => {
  loadProducts()
})

watch(searchQuery, () => {
  handleSearch()
})

// Lifecycle
onMounted(() => {
  loadProducts()
})
</script> 