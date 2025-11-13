<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <h3 class="text-lg font-medium text-gray-900">{{ headerText }}</h3>
        <div v-if="showOverrideIndicator" 
             class="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
          SUPER ADMIN OVERRIDE
        </div>
      </div>
    </div>

    <!-- Verification Status -->
    <div v-if="isVerified" class="bg-green-50 border border-green-200 rounded-md p-3 mb-6">
      <div class="flex items-center">
        <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-400 mr-2" />
        <span class="text-sm font-medium text-green-800">
          This item has been verified and is ready for production
        </span>
        <span v-if="!isSuperAdminOverride" class="ml-2 text-xs text-green-600">
          (Read-only - contact Super Admin to modify)
        </span>
      </div>
    </div>

    <div class="space-y-6">
      <!-- Product Type Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
        <select v-model="formData.productType" required :disabled="isReadOnly"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            @change="handleProductTypeChange">
            <option value="">Select Product Type</option>
            <option value="SPA_COVER">Spa Cover</option>
            <option value="COVER_FOR_COVER">Cover for Cover</option>
        </select>
      </div>

      <!-- Core Attributes -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <input v-model="formData.color" type="text" placeholder="e.g., Dark Gray, Navy Blue"
              :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
          <input v-model="formData.size" type="text" placeholder="e.g., 93X93"
              :disabled="formData.shape === 'Rectangle' || isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Shape</label>
          <select v-model="formData.shape" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Select Shape</option>
              <option value="Round">Round</option>
              <option value="Octagon">Octagon</option>
              <option value="Square">Square</option>
              <option value="Rectangle">Rectangle</option>
              <option value="custom">Custom (specify below)</option>
          </select>
          <div v-if="formData.shape" class="mt-1 text-sm text-gray-600">
            <span class="font-medium">Current:</span> {{ currentShapeValue }}
          </div>
          <input v-if="formData.shape === 'custom'" ref="customShapeInput" v-model="customShape"
              type="text" placeholder="Enter custom shape" :disabled="isReadOnly"
              class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Radius Size</label>
          <input v-model="formData.radiusSize" type="text"
              :disabled="formData.shape === 'Round' || formData.shape === 'Octagon' || isReadOnly"
              :placeholder="formData.shape === 'Round' || formData.shape === 'Octagon' ? 'Radius 0' : 'e.g., 12'"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div v-if="showLengthWidthFields">
          <label class="block text-sm font-medium text-gray-700 mb-2">Length</label>
          <input v-model="formData.length" type="text" placeholder="e.g., 12" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div v-if="showLengthWidthFields">
          <label class="block text-sm font-medium text-gray-700 mb-2">Width</label>
          <input v-model="formData.width" type="text" placeholder="e.g., 8" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Length</label>
          <input v-model="formData.skirtLength" type="text" placeholder="e.g., 5" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Type</label>
          <select v-model="formData.skirtType" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Select Skirt Type</option>
              <option value="CONN">Connected</option>
              <option v-if="formData.shape !== 'Round'" value="SLIT">Slit</option>
              <option value="NONE">None</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tie Downs Quantity</label>
          <input v-model="formData.tieDownsQty" type="text" placeholder="e.g., 6" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Placement</label>
          <select v-model="formData.tieDownPlacement" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Select Placement</option>
              <option value="HANDLE_SIDE">Handle Side</option>
              <option value="CORNER_SIDE">Corner Side</option>
              <option value="FOLD_SIDE">Fold Side</option>
              <option value="NONE">None</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Length</label>
          <input v-model="formData.tieDownLength" type="text" placeholder="e.g., 18 inches" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
          <input v-model="formData.poNumber" type="text" placeholder="e.g., PO-12345" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Distance</label>
          <input v-model="formData.distance" type="text" placeholder="e.g., 0" :disabled="isReadOnly"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>
      </div>

      <!-- Upgrades Section -->
      <div>
        <h4 class="text-md font-medium text-gray-900 mb-3">Upgrades</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Foam Upgrade</label>
            <select v-model="formData.foamUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="">No Foam Upgrade</option>
                <option value="2#">2#</option>
                <option value="5-2.5">5-2.5</option>
                <option value="6-4">6-4</option>
                <option value="4-5-4">4-5-4</option>
                <option value="54&quot;">54"</option>
                <option value="custom">Custom (specify below)</option>
            </select>
            <div v-if="formData.foamUpgrade" class="mt-1 text-sm text-gray-600">
              <span class="font-medium">Current:</span> {{ currentFoamUpgradeValue }}
            </div>
            <input v-if="formData.foamUpgrade === 'custom'" ref="customFoamUpgradeInput"
                v-model="customFoamUpgrade" type="text" placeholder="Enter custom foam upgrade specification" :disabled="isReadOnly"
                class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                @input="updateCustomFoamUpgrade" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Double Plastic Wrap</label>
            <select v-model="formData.doublePlasticWrapUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Webbing Upgrade</label>
            <select v-model="formData.webbingUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Metal for Lifter</label>
            <select v-model="formData.metalForLifterUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Steam Stopper</label>
            <select v-model="formData.steamStopperUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Fabric Upgrade</label>
            <select v-model="formData.fabricUpgrade" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Special Attributes -->
      <div>
        <h4 class="text-md font-medium text-gray-900 mb-3">Special Attributes</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Extra Handle Quantity</label>
            <input v-model="formData.extraHandleQty" type="text" placeholder="e.g., 0" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Extra Long Skirt</label>
            <select v-model="formData.extraLongSkirt" :disabled="isReadOnly"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                <option value="">Auto-calculated</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Notes Section -->
      <div class="mt-6">
        <h4 class="text-md font-medium text-gray-900 mb-3">Notes</h4>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Product Notes</label>
          <textarea v-model="formData.notes" rows="3" :disabled="isReadOnly"
              placeholder="Enter any additional notes for this product..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end space-x-3 pt-4 border-t">
        <button v-if="!isReadOnly" type="button" @click="saveAttributes"
            :disabled="loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <span v-if="loading">Saving...</span>
          <span v-else>{{ initialAttributes ? 'Update' : 'Save' }} Attributes</span>
        </button>
      </div>

      <!-- Success/Error Messages -->
      <div v-if="success" class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
        <p class="text-sm text-green-800">Attributes saved successfully!</p>
      </div>
      <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-800">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePackingSlipStatus } from '~/composables/usePackingSlipStatus'

interface Props {
  orderItemId: string
  lineDescription?: string
  initialAttributes?: any
  isSuperAdminOverride?: boolean
}

interface Emits {
  (e: 'attributes-saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const { hasPackingSlipPrinted, fetchPackingSlipStatus } = usePackingSlipStatus()

// Reactive state
const formData = ref({})
const customShape = ref('')
const customFoamUpgrade = ref('')
const loading = ref(false)
const success = ref(false)
const error = ref('')

// Computed properties
const headerText = computed(() => {
  if (props.isSuperAdminOverride) {
    return props.initialAttributes ? 'Override Edit Product Attributes' : 'Add Product Attributes'
  }
  return props.initialAttributes ? 'Edit Product Attributes' : 'Add Product Attributes'
})

const showOverrideIndicator = computed(() => {
  return props.isSuperAdminOverride && props.initialAttributes
})

const isVerified = computed(() => {
  return props.initialAttributes?.verified || false
})

const isReadOnly = computed(() => {
  // This component is only shown when editing is allowed
  // Read-only logic is handled by the parent component
  return false
})

const showLengthWidthFields = computed(() => {
  return formData.value.shape === 'Rectangle'
})

const currentShapeValue = computed(() => {
  if (formData.value.shape === 'custom') {
    return customShape.value || formData.value.customShapeValue || 'Custom shape not specified'
  }
  return formData.value.shape
})

const currentFoamUpgradeValue = computed(() => {
  if (formData.value.foamUpgrade === 'custom') {
    return customFoamUpgrade.value || formData.value.customFoamUpgradeValue || 'Custom foam upgrade not specified'
  }
  return formData.value.foamUpgrade
})

// Initialize form data with enhanced support for existing attributes
function initializeFormData() {
  if (props.initialAttributes) {
    // Deep clone to avoid mutations affecting the original data
    formData.value = JSON.parse(JSON.stringify(props.initialAttributes))
    
    // Handle custom shape detection and initialization
    const predefinedShapes = ['Round', 'Octagon', 'Square', 'Rectangle', 'custom']
    if (props.initialAttributes.shape && !predefinedShapes.includes(props.initialAttributes.shape)) {
      // Auto-detect custom shape: if shape value is not in predefined list, treat as custom
      customShape.value = props.initialAttributes.shape
      formData.value.shape = 'custom'
      formData.value.customShapeValue = props.initialAttributes.shape
    } else if (props.initialAttributes.shape === 'custom' && props.initialAttributes.customShapeValue) {
      // Handle existing custom shape
      customShape.value = props.initialAttributes.customShapeValue
    }

    // Handle custom foam upgrade detection and initialization
    const predefinedFoamUpgrades = ['2#', '5-2.5', '6-4', '4-5-4', '54"', 'custom']
    if (props.initialAttributes.foamUpgrade && !predefinedFoamUpgrades.includes(props.initialAttributes.foamUpgrade)) {
      // Auto-detect custom foam upgrade: if value is not in predefined list, treat as custom
      customFoamUpgrade.value = props.initialAttributes.foamUpgrade
      formData.value.foamUpgrade = 'custom'
      formData.value.customFoamUpgradeValue = props.initialAttributes.foamUpgrade
    } else if (props.initialAttributes.foamUpgrade === 'custom' && props.initialAttributes.customFoamUpgradeValue) {
      // Handle existing custom foam upgrade
      customFoamUpgrade.value = props.initialAttributes.customFoamUpgradeValue
    }

    // Ensure all boolean fields have proper values
    const booleanFields = ['doublePlasticWrapUpgrade', 'webbingUpgrade', 'metalForLifterUpgrade', 'steamStopperUpgrade', 'fabricUpgrade']
    booleanFields.forEach(field => {
      if (formData.value[field] === undefined || formData.value[field] === null) {
        formData.value[field] = 'No'
      }
    })

    // Handle packaging field for Cover for Cover products
    if (formData.value.productType === 'COVER_FOR_COVER' && formData.value.packaging === undefined) {
      formData.value.packaging = true
    }

    console.log('Initialized form data with existing attributes:', formData.value)
  } else {
    // Initialize with default values for new attributes
    formData.value = {
      productType: '',
      color: '',
      size: '',
      shape: '',
      radiusSize: '',
      length: '',
      width: '',
      skirtLength: '',
      skirtType: '',
      tieDownsQty: '',
      tieDownPlacement: '',
      tieDownLength: '',
      poNumber: '',
      distance: '',
      foamUpgrade: '',
      doublePlasticWrapUpgrade: 'No',
      webbingUpgrade: 'No',
      metalForLifterUpgrade: 'No',
      steamStopperUpgrade: 'No',
      fabricUpgrade: 'No',
      extraHandleQty: '',
      extraLongSkirt: '',
      notes: ''
    }
    console.log('Initialized form data for new attributes')
  }
}

// Handle product type change
const handleProductTypeChange = () => {
  if (formData.value.productType === 'COVER_FOR_COVER') {
    formData.value.packaging = true
  }
}

// Handle custom foam upgrade
const updateCustomFoamUpgrade = () => {
  if (formData.value.foamUpgrade === 'custom') {
    formData.value.customFoamUpgradeValue = customFoamUpgrade.value
  }
}

// Enhanced save attributes function with audit logging support
async function saveAttributes() {
  try {
    loading.value = true
    error.value = ''
    success.value = false

    // Validate required fields
    if (!formData.value.productType) {
      error.value = 'Product Type is required'
      return
    }

    // Get packing slip status for audit logging
    const packingSlipPrinted = hasPackingSlipPrinted(props.orderItemId)

    // Prepare enhanced payload with audit information
    const payload = {
      ...formData.value,
      // Super admin override information
      isSuperAdminOverride: props.isSuperAdminOverride || false,
      // Packing slip status for audit purposes
      packingSlipPrinted,
      // Previous attributes for audit trail (if editing existing)
      previousAttributes: props.initialAttributes || null,
      // Timestamp for audit
      editTimestamp: new Date().toISOString(),
      // Additional context for audit logging
      editContext: {
        isNewAttribute: !props.initialAttributes,
        wasVerified: props.initialAttributes?.verified || false,
        lineDescription: props.lineDescription,
        overrideReason: props.isSuperAdminOverride ? 'Super admin override of verified attributes' : null
      }
    }

    console.log('Saving attributes with enhanced payload:', {
      orderItemId: props.orderItemId,
      isSuperAdminOverride: payload.isSuperAdminOverride,
      packingSlipPrinted: payload.packingSlipPrinted,
      hasInitialAttributes: !!props.initialAttributes
    })

    // Make API call with enhanced payload
    const response = await $fetch(`/api/admin/order-items/${props.orderItemId}/attributes`, {
      method: 'PUT',
      body: payload
    })

    console.log('Attributes saved successfully:', response)
    success.value = true
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      success.value = false
    }, 3000)

    emit('attributes-saved')
  } catch (err: any) {
    console.error('Save error:', err)
    
    // Handle specific error types for better user experience
    if (err.status === 403) {
      error.value = 'Permission denied: You do not have sufficient privileges to edit these attributes'
    } else if (err.status === 409) {
      error.value = 'Conflict: These attributes have been modified by another user. Please refresh and try again.'
    } else if (err.status === 422) {
      error.value = err.data?.message || 'Validation error: Please check your input and try again.'
    } else if (err.data?.message) {
      error.value = err.data.message
    } else {
      error.value = 'Failed to save attributes. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

// Watchers
watch(customShape, (newValue) => {
  if (formData.value.shape === 'custom') {
    formData.value.customShapeValue = newValue
  }
})

watch(customFoamUpgrade, (newValue) => {
  if (formData.value.foamUpgrade === 'custom') {
    formData.value.customFoamUpgradeValue = newValue
  }
})

// Auto-calculate size for Rectangle shape
watch([() => formData.value.length, () => formData.value.width, () => formData.value.shape], () => {
  if (formData.value.shape === 'Rectangle' && formData.value.length && formData.value.width) {
    formData.value.size = `${formData.value.length}X${formData.value.width}`
  }
})

// Auto-set radius to 0 for Round and Octagon shapes
watch(() => formData.value.shape, (newShape) => {
  if (newShape === 'Round' || newShape === 'Octagon') {
    formData.value.radiusSize = '0'
  }

  if (newShape === 'Round') {
    formData.value.skirtType = 'CONN'
  }
})

// Watch for changes to initialAttributes prop
watch(() => props.initialAttributes, (newAttributes) => {
  if (newAttributes) {
    console.log('Initial attributes changed, reinitializing form:', newAttributes)
    initializeFormData()
  }
}, { immediate: true, deep: true })

// Initialize on mount
onMounted(async () => {
  initializeFormData()
  
  // Fetch packing slip status for audit logging
  if (props.orderItemId) {
    try {
      await fetchPackingSlipStatus([props.orderItemId])
    } catch (err) {
      console.warn('Failed to fetch packing slip status:', err)
      // Don't block component initialization if packing slip status fails
    }
  }
})
</script>