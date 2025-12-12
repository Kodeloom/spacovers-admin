<template>
  <AppModal
    :is-open="isOpen"
    :title="`Product Attributes - ${orderItem?.item?.name || 'Unknown Item'}`"
    size="xl"
    @close="handleClose"
  >
    <div v-if="orderItem" class="space-y-6">
      <!-- Order Item Info -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-medium text-gray-900">{{ orderItem.productNumber ? `P${String(orderItem.productNumber).padStart(5, '0')}` : (orderItem.item?.name || 'Unknown Item') }}</h4>
            <p class="text-xs text-gray-600 mt-1">
              Order #{{ orderItem.order?.salesOrderNumber || orderItem.order?.id?.slice(-8) }}
              • Quantity: {{ orderItem.quantity }}
            </p>
          </div>
          <div class="text-right">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {{ orderItem.itemStatus || 'Not Started' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Read-only Warning for Verified Items -->
      <div v-if="isVerified && userRole !== 'Super Admin'" class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center">
          <Icon name="heroicons:lock-closed" class="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <h4 class="text-sm font-medium text-blue-900">Attributes Locked (Verified)</h4>
            <p class="text-sm text-blue-800">These product attributes have been verified and cannot be modified to ensure production accuracy.</p>
          </div>
        </div>
      </div>

      <!-- Super Admin Override Warning -->
      <div v-else-if="isVerified && userRole === 'Super Admin'" class="p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div class="flex items-center">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-orange-600 mr-3" />
          <div>
            <h4 class="text-sm font-medium text-orange-900">Super Admin Override Active</h4>
            <p class="text-sm text-orange-800">You are editing verified attributes on an approved order. This action will be logged for audit purposes.</p>
          </div>
        </div>
      </div>

      <!-- Product Attributes Form or Display -->
      <div v-if="isReadOnlyMode">
        <ProductAttributesDisplay 
          :attributes="orderItem.productAttributes || {}"
          :is-read-only="true"
          :read-only-reason="'verified-approved'"
        />
      </div>
      <div v-else>
        <ProductAttributesForm
          v-model="attributesForm"
          :item-index="0"
          :customer-id="orderItem.order?.customerId"
          :is-verified="isVerified"
          :user-role="userRole"
          @validation-change="handleValidationChange"
          @po-duplicate-confirmed="handlePODuplicateConfirmed"
        />
      </div>

      <!-- Save Status -->
      <div v-if="saveStatus?.message" class="p-4 rounded-lg" :class="saveStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
        <div class="flex items-center">
          <Icon 
            :name="saveStatus.type === 'success' ? 'heroicons:check-circle' : 'heroicons:exclamation-triangle'" 
            :class="saveStatus.type === 'success' ? 'text-green-400' : 'text-red-400'"
            class="w-5 h-5 mr-3" 
          />
          <div :class="saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'" class="text-sm">
            {{ saveStatus.message }}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          v-if="!isVerified || userRole === 'Super Admin'"
          type="button"
          :disabled="isSaving || !isFormValid"
          class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleSave"
        >
          <Icon v-if="isSaving" name="heroicons:arrow-path" class="w-4 h-4 mr-2 animate-spin" />
          {{ isSaving ? 'Saving...' : 'Save Attributes' }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import ProductAttributesForm from '~/components/admin/ProductAttributesForm.vue'
import { authClient } from '~/lib/auth-client'

interface OrderItem {
  id: string
  quantity: number
  itemStatus?: string
  item?: {
    id: string
    name: string
  }
  order?: {
    id: string
    salesOrderNumber?: string
    customerId: string
  }
  productAttributes?: {
    id: string
    size?: string
    shape?: string
    radiusSize?: string
    skirtLength?: string
    skirtType?: string
    tieDownsQty?: string
    tieDownPlacement?: string
    tieDownLength?: string
    distance?: string
    foamUpgrade?: string
    doublePlasticWrapUpgrade?: string
    webbingUpgrade?: string
    metalForLifterUpgrade?: string
    steamStopperUpgrade?: string
    fabricUpgrade?: string
    extraHandleQty?: string
    extraLongSkirt?: string
    packaging?: boolean
    poNumber?: string
  }
}

interface Props {
  isOpen: boolean
  orderItem?: OrderItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  saved: [orderItem: OrderItem]
  viewOrder: [orderId: string]
}>()

// Form state
const attributesForm = ref({})
const isFormValid = ref(true)
const validationErrors = ref<string[]>([])
const isSaving = ref(false)
const saveStatus = ref<{ type: 'success' | 'error', message: string } | null>(null)

// Get user session data
const sessionState = authClient.useSession()
const userRole = computed(() => {
  const user = sessionState.value?.data?.user
  if (user?.roles && Array.isArray(user.roles)) {
    const adminRole = user.roles.find((userRole: any) => 
      ['Super Admin', 'Admin', 'Manager'].includes(userRole.role?.name)
    )
    return adminRole?.role?.name || 'User'
  }
  return 'User'
})

// Check if item is verified
const isVerified = computed(() => {
  return props.orderItem?.productAttributes?.verified || false
})

// Check if modal should be in read-only mode
const isReadOnlyMode = computed(() => {
  return isVerified.value && userRole.value !== 'Super Admin'
})

// Watch for orderItem changes and populate form
watch(() => props.orderItem, (newOrderItem) => {
  if (newOrderItem?.productAttributes) {
    attributesForm.value = { ...newOrderItem.productAttributes }
  } else {
    attributesForm.value = {}
  }
  saveStatus.value = null
}, { immediate: true })

// Handle validation changes from the form
const handleValidationChange = (isValid: boolean, errors: string[]) => {
  isFormValid.value = isValid
  validationErrors.value = errors
}

// Handle PO duplicate confirmation
const handlePODuplicateConfirmed = (poNumber: string) => {
  console.log('PO duplicate confirmed for:', poNumber)
  // The form will continue with the save process
}

// Handle view order request
const handleViewOrder = (orderId: string) => {
  emit('viewOrder', orderId)
}

// Handle save action
const handleSave = async () => {
  if (!props.orderItem || !isFormValid.value) {
    return
  }

  isSaving.value = true
  saveStatus.value = null

  try {
    // Process custom values before saving
    const processedAttributes = { ...attributesForm.value }
    
    // Handle custom shape: if shape is 'custom', use the customShapeValue as the actual shape
    if (processedAttributes.shape === 'custom' && processedAttributes.customShapeValue) {
      processedAttributes.shape = processedAttributes.customShapeValue
      delete processedAttributes.customShapeValue
    }
    
    // Handle custom foam upgrade: if foamUpgrade is 'custom', use the customFoamUpgradeValue as the actual foamUpgrade
    if (processedAttributes.foamUpgrade === 'custom' && processedAttributes.customFoamUpgradeValue) {
      processedAttributes.foamUpgrade = processedAttributes.customFoamUpgradeValue
      delete processedAttributes.customFoamUpgradeValue
    }

    // Call API to save/update product attributes
    const response = await $fetch('/api/admin/product-attributes', {
      method: 'POST',
      body: {
        orderItemId: props.orderItem.id,
        attributes: processedAttributes
      }
    })

    saveStatus.value = {
      type: 'success',
      message: 'Product attributes saved successfully!'
    }

    // Emit saved event with updated order item
    const updatedOrderItem: OrderItem = {
      ...props.orderItem,
      productAttributes: response.productAttributes
    }
    
    emit('saved', updatedOrderItem)

    // Auto-close after successful save
    setTimeout(() => {
      handleClose()
    }, 1500)

  } catch (error) {
    console.error('Error saving product attributes:', error)
    
    let errorMessage = 'Failed to save product attributes. Please try again.'
    
    if (error && typeof error === 'object' && 'data' in error) {
      const errorData = error.data as any
      if (errorData?.message) {
        errorMessage = errorData.message
      }
    }

    saveStatus.value = {
      type: 'error',
      message: errorMessage
    }
  } finally {
    isSaving.value = false
  }
}

// Handle modal close
const handleClose = () => {
  // Reset form state
  attributesForm.value = {}
  isFormValid.value = true
  validationErrors.value = []
  saveStatus.value = null
  
  emit('close')
}

// Reset save status when form changes
watch(attributesForm, () => {
  if (saveStatus.value?.type === 'success') {
    saveStatus.value = null
  }
}, { deep: true })
</script>