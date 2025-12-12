<template>
  <div 
    class="print-queue-item p-6 hover:bg-gray-50 transition-colors duration-200"
    :class="{ 'bg-green-50 border-l-4 border-l-green-500': isOldest }"
  >
    <div class="flex items-start space-x-4">
      <!-- Position Indicator -->
      <div class="flex-shrink-0 flex flex-col items-center">
        <div 
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
          :class="getPositionClass()"
        >
          {{ position }}
        </div>
        <div v-if="isOldest" class="mt-1 text-xs text-green-600 font-medium">
          Next
        </div>
      </div>

      <!-- Item Details -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Item Name and Order Info -->
            <h4 class="text-sm font-medium text-gray-900 truncate">
              {{ getItemName() }}
            </h4>
            
            <div class="mt-1 flex items-center space-x-4 text-sm text-gray-500">
              <span class="flex items-center">
                <Icon name="heroicons:user" class="h-4 w-4 mr-1" />
                {{ getCustomerName() }}
              </span>
              <span class="flex items-center">
                <Icon name="heroicons:document-text" class="h-4 w-4 mr-1" />
                Order #{{ getOrderNumber() }}
              </span>
              <span class="flex items-center">
                <Icon name="heroicons:clock" class="h-4 w-4 mr-1" />
                {{ formatDate(queueItem.addedAt) }}
              </span>
            </div>

            <!-- Product Attributes -->
            <div v-if="getProductAttributes()" class="mt-2 flex flex-wrap gap-2">
              <span 
                v-for="attr in getProductAttributes()" 
                :key="attr.key"
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {{ attr.label }}: {{ attr.value }}
              </span>
            </div>

            <!-- PO Number if available -->
            <div v-if="getPONumber()" class="mt-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Icon name="heroicons:hashtag" class="h-3 w-3 mr-1" />
                PO: {{ getPONumber() }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="ml-4 flex items-center space-x-2">
            <!-- Priority Indicator -->
            <div v-if="getPriority()" class="flex items-center">
              <span 
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="getPriorityClass()"
              >
                <Icon :name="getPriorityIcon()" class="h-3 w-3 mr-1" />
                {{ getPriority() }}
              </span>
            </div>

            <!-- Remove Button -->
            <button 
              @click="handleRemove"
              class="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors"
              title="Remove from queue"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Expandable Details -->
        <div class="mt-4">
          <button 
            @click="toggleExpanded"
            class="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <Icon 
              :name="isExpanded ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" 
              class="h-4 w-4 mr-1" 
            />
            {{ isExpanded ? 'Hide Details' : 'Show Details' }}
          </button>

          <!-- Expanded Content -->
          <div v-if="isExpanded" class="mt-3 p-4 bg-gray-50 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <!-- Order Details -->
              <div>
                <h5 class="font-medium text-gray-900 mb-2">Order Information</h5>
                <dl class="space-y-1">
                  <div class="flex justify-between">
                    <dt class="text-gray-600">Order ID:</dt>
                    <dd class="font-medium">{{ queueItem.orderItem?.order?.id?.slice(-8) || 'N/A' }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-600">Customer:</dt>
                    <dd class="font-medium">{{ getCustomerName() }}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-gray-600">Added to Queue:</dt>
                    <dd class="font-medium">{{ formatDateTime(queueItem.addedAt) }}</dd>
                  </div>
                  <div v-if="queueItem.addedBy" class="flex justify-between">
                    <dt class="text-gray-600">Added By:</dt>
                    <dd class="font-medium">{{ queueItem.addedBy }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Product Details -->
              <div>
                <h5 class="font-medium text-gray-900 mb-2">Product Information</h5>
                <dl class="space-y-1">
                  <div class="flex justify-between">
                    <dt class="text-gray-600">Product Number:</dt>
                    <dd class="font-medium">{{ getItemName() }}</dd>
                  </div>
                  <div v-if="props.queueItem.orderItem?.item?.name" class="flex justify-between">
                    <dt class="text-gray-600">Item Name:</dt>
                    <dd class="font-medium text-gray-600 text-xs">{{ props.queueItem.orderItem.item.name }}</dd>
                  </div>
                  <div v-if="queueItem.orderItem?.product?.displayName" class="flex justify-between">
                    <dt class="text-gray-600">Product:</dt>
                    <dd class="font-medium">{{ queueItem.orderItem.product.displayName }}</dd>
                  </div>
                  <div v-if="getProductType()" class="flex justify-between">
                    <dt class="text-gray-600">Type:</dt>
                    <dd class="font-medium">{{ getProductType() }}</dd>
                  </div>
                  <div v-if="getSize()" class="flex justify-between">
                    <dt class="text-gray-600">Size:</dt>
                    <dd class="font-medium">{{ getSize() }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Full Product Attributes -->
            <div v-if="getAllProductAttributes().length > 0" class="mt-4">
              <h5 class="font-medium text-gray-900 mb-2">All Product Attributes</h5>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div 
                  v-for="attr in getAllProductAttributes()" 
                  :key="attr.key"
                  class="flex justify-between p-2 bg-white rounded border"
                >
                  <span class="text-gray-600">{{ attr.label }}:</span>
                  <span class="font-medium">{{ attr.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Props
interface Props {
  queueItem: {
    id: string
    orderItemId: string
    orderItem: any
    isPrinted: boolean
    addedAt: Date
    printedAt?: Date
    addedBy?: string
    printedBy?: string
  }
  position: number
  isOldest: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  remove: [itemId: string]
}>()

// Local state
const isExpanded = ref(false)

// Methods
const getItemName = () => {
  // Show product number instead of item name
  const productNumber = props.queueItem.orderItem?.productNumber
  if (productNumber) {
    // Format with P prefix and zero padding
    const paddedNumber = productNumber.toString().padStart(5, '0')
    return `P${paddedNumber}`
  }
  
  // Fallback to item name if no product number
  return props.queueItem.orderItem?.item?.name || 'Unknown Item'
}

const getCustomerName = () => {
  return props.queueItem.orderItem?.order?.customer?.name || 'Unknown Customer'
}

const getOrderNumber = () => {
  return props.queueItem.orderItem?.order?.salesOrderNumber || 
         props.queueItem.orderItem?.order?.id?.slice(-8) || 
         'N/A'
}

const getPONumber = () => {
  // Check both order-level and item-level PO numbers
  return props.queueItem.orderItem?.order?.poNumber || 
         props.queueItem.orderItem?.productAttributes?.poNumber || 
         null
}

const getPriority = () => {
  const priority = props.queueItem.orderItem?.order?.priority
  if (!priority || priority === 'NO_PRIORITY') return null
  
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()
}

const getPriorityClass = () => {
  const priority = props.queueItem.orderItem?.order?.priority
  switch (priority) {
    case 'HIGH':
      return 'bg-red-100 text-red-800'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'LOW':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getPriorityIcon = () => {
  const priority = props.queueItem.orderItem?.order?.priority
  switch (priority) {
    case 'HIGH':
      return 'heroicons:arrow-up'
    case 'MEDIUM':
      return 'heroicons:minus'
    case 'LOW':
      return 'heroicons:arrow-down'
    default:
      return 'heroicons:minus'
  }
}

const getPositionClass = () => {
  if (props.isOldest) {
    return 'bg-green-100 text-green-800 border-2 border-green-300'
  } else {
    return 'bg-gray-100 text-gray-600'
  }
}

const getProductType = () => {
  const productType = props.queueItem.orderItem?.productAttributes?.productType
  if (!productType) return null
  
  switch (productType) {
    case 'SPA_COVER':
      return 'Spa Cover'
    case 'POOL_COVER':
      return 'Pool Cover'
    case 'HOT_TUB_COVER':
      return 'Hot Tub Cover'
    default:
      return productType
  }
}

const getSize = () => {
  const attrs = props.queueItem.orderItem?.productAttributes
  if (!attrs) return null
  
  // Check for width x length first
  if (attrs.width && attrs.length) {
    return `${attrs.width}" x ${attrs.length}"`
  }
  
  // Fall back to size field
  return attrs.size || null
}

const getProductAttributes = () => {
  const attrs = props.queueItem.orderItem?.productAttributes
  if (!attrs) return []
  
  const displayAttrs = []
  
  // Show key attributes that are commonly needed
  if (attrs.color && attrs.color !== 'Standard') {
    displayAttrs.push({ key: 'color', label: 'Color', value: attrs.color })
  }
  
  if (attrs.shape && attrs.shape !== 'Standard') {
    displayAttrs.push({ key: 'shape', label: 'Shape', value: attrs.shape })
  }
  
  if (attrs.tieDownLength) {
    displayAttrs.push({ key: 'tieDownLength', label: 'Tie Down Length', value: attrs.tieDownLength })
  }
  
  return displayAttrs.slice(0, 3) // Limit to 3 for compact display
}

const getAllProductAttributes = () => {
  const attrs = props.queueItem.orderItem?.productAttributes
  if (!attrs) return []
  
  const allAttrs: Array<{ key: string; label: string; value: string }> = []
  
  // Map all available attributes
  const attributeMap: Record<string, string> = {
    color: 'Color',
    shape: 'Shape',
    size: 'Size',
    width: 'Width',
    length: 'Length',
    tieDownLength: 'Tie Down Length',
    foamUpgrade: 'Foam',
    skirtType: 'Skirt Type',
    skirtLength: 'Skirt Length',
    tieDownsQty: 'Tie Downs Qty',
    tieDownPlacement: 'Tie Down Placement',
    distance: 'Distance',
    radiusSize: 'Radius Size',
    productType: 'Product Type'
  }
  
  Object.entries(attributeMap).forEach(([key, label]) => {
    const value = attrs[key]
    if (value && value !== '' && value !== 'Standard' && value !== '0') {
      let displayValue = value
      
      // Format specific values
      if (key === 'productType') {
        displayValue = getProductType() || value
      } else if (key === 'skirtType' && value === 'CONN') {
        displayValue = 'Connected'
      } else if (key === 'tieDownPlacement' && value === 'HANDLE_SIDE') {
        displayValue = 'Handle Side'
      }
      
      allAttrs.push({ key, label, value: displayValue })
    }
  })
  
  return allAttrs
}

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTime = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const handleRemove = () => {
  emit('remove', props.queueItem.id)
}
</script>

<style scoped>
.print-queue-item {
  @apply border-b border-gray-200 last:border-b-0;
}
</style>