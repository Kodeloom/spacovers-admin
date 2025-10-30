<template>
  <div class="space-y-4">
    <!-- Read-only Mode Header -->
    <div v-if="isReadOnly" class="flex items-center justify-between mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-center">
        <Icon name="heroicons:lock-closed" class="h-5 w-5 text-blue-600 mr-2" />
        <div>
          <h4 class="text-sm font-medium text-blue-900">{{ readOnlyTitle }}</h4>
          <p class="text-xs text-blue-700">{{ readOnlyMessage }}</p>
        </div>
      </div>
      <div class="flex items-center text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
        <span>Read-only Mode</span>
      </div>
    </div>

    <!-- Editable Mode Header -->
    <div v-else-if="showEditableHeader" class="flex items-center justify-between mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-center">
        <Icon name="heroicons:pencil-square" class="h-5 w-5 text-green-600 mr-2" />
        <div>
          <h4 class="text-sm font-medium text-green-900">{{ editableTitle }}</h4>
          <p class="text-xs text-green-700">{{ editableMessage }}</p>
        </div>
      </div>
      <div class="flex items-center text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
        <span>Editable</span>
      </div>
    </div>
    <!-- Basic Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" :class="contentClasses">
      <div v-if="attributes.productType">
        <label class="block text-sm font-medium" :class="labelClasses">Product Type</label>
        <p class="text-sm text-gray-900">{{ attributes.productType }}</p>
      </div>
      
      <div v-if="attributes.color">
        <label class="block text-sm font-medium" :class="labelClasses">Color</label>
        <p class="text-sm text-gray-900">{{ attributes.color }}</p>
      </div>
      
      <div v-if="attributes.size">
        <label class="block text-sm font-medium" :class="labelClasses">Size</label>
        <p class="text-sm text-gray-900">{{ attributes.size }}</p>
      </div>
      
      <div v-if="attributes.shape">
        <label class="block text-sm font-medium" :class="labelClasses">Shape</label>
        <p class="text-sm text-gray-900">{{ attributes.shape }}</p>
      </div>
      
      <div v-if="attributes.radiusSize">
        <label class="block text-sm font-medium" :class="labelClasses">Radius Size</label>
        <p class="text-sm text-gray-900">{{ attributes.radiusSize }}</p>
      </div>
      
      <div v-if="attributes.length">
        <label class="block text-sm font-medium" :class="labelClasses">Length</label>
        <p class="text-sm text-gray-900">{{ attributes.length }}</p>
      </div>
      
      <div v-if="attributes.width">
        <label class="block text-sm font-medium" :class="labelClasses">Width</label>
        <p class="text-sm text-gray-900">{{ attributes.width }}</p>
      </div>
      
      <div v-if="attributes.skirtLength">
        <label class="block text-sm font-medium" :class="labelClasses">Skirt Length</label>
        <p class="text-sm text-gray-900">{{ attributes.skirtLength }}</p>
      </div>
      
      <div v-if="attributes.skirtType">
        <label class="block text-sm font-medium" :class="labelClasses">Skirt Type</label>
        <p class="text-sm text-gray-900">{{ attributes.skirtType }}</p>
      </div>
      
      <div v-if="attributes.tieDownsQty">
        <label class="block text-sm font-medium" :class="labelClasses">Tie Downs Quantity</label>
        <p class="text-sm text-gray-900">{{ attributes.tieDownsQty }}</p>
      </div>
      
      <div v-if="attributes.tieDownPlacement">
        <label class="block text-sm font-medium" :class="labelClasses">Tie Down Placement</label>
        <p class="text-sm text-gray-900">{{ attributes.tieDownPlacement }}</p>
      </div>
      
      <div v-if="attributes.tieDownLength">
        <label class="block text-sm font-medium" :class="labelClasses">Tie Down Length</label>
        <p class="text-sm text-gray-900">{{ attributes.tieDownLength }}</p>
      </div>
      
      <div v-if="attributes.poNumber">
        <label class="block text-sm font-medium" :class="labelClasses">PO Number</label>
        <p class="text-sm text-gray-900">{{ attributes.poNumber }}</p>
      </div>
      
      <div v-if="attributes.distance">
        <label class="block text-sm font-medium" :class="labelClasses">Distance</label>
        <p class="text-sm text-gray-900">{{ attributes.distance }}</p>
      </div>
    </div>

    <!-- Upgrades -->
    <div v-if="hasUpgrades" class="border-t pt-4" :class="[borderClasses, contentClasses]">
      <h4 class="text-sm font-medium mb-3" :class="labelClasses">Upgrades</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-if="attributes.upgradeHeatSeal">
          <label class="block text-sm font-medium" :class="labelClasses">Heat Seal</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeHeatSeal }}</p>
        </div>
        
        <div v-if="attributes.upgradeReinforcement">
          <label class="block text-sm font-medium" :class="labelClasses">Reinforcement</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeReinforcement }}</p>
        </div>
        
        <div v-if="attributes.upgradeUndersideColor">
          <label class="block text-sm font-medium" :class="labelClasses">Underside Color</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeUndersideColor }}</p>
        </div>
        
        <div v-if="attributes.upgradeHinge">
          <label class="block text-sm font-medium" :class="labelClasses">Hinge</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeHinge }}</p>
        </div>
        
        <div v-if="attributes.upgradeHingeLength">
          <label class="block text-sm font-medium" :class="labelClasses">Hinge Length</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeHingeLength }}</p>
        </div>
        
        <div v-if="attributes.upgradeHingeDistance">
          <label class="block text-sm font-medium" :class="labelClasses">Hinge Distance</label>
          <p class="text-sm text-gray-900">{{ attributes.upgradeHingeDistance }}</p>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="attributes.notes" class="border-t pt-4" :class="[borderClasses, contentClasses]">
      <label class="block text-sm font-medium mb-2" :class="labelClasses">Notes</label>
      <p class="text-sm text-gray-900 whitespace-pre-wrap">{{ attributes.notes }}</p>
    </div>

    <!-- Verification Status -->
    <div v-if="attributes.verified" class="border-t pt-4" :class="[borderClasses, contentClasses]">
      <div class="flex items-center text-green-600">
        <Icon name="heroicons:check-circle" class="h-5 w-5 mr-2" />
        <span class="text-sm font-medium">Verified for Production</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ProductAttributes {
  productType?: string
  color?: string
  size?: string
  shape?: string
  radiusSize?: string
  length?: string
  width?: string
  skirtLength?: string
  skirtType?: string
  tieDownsQty?: string
  tieDownPlacement?: string
  tieDownLength?: string
  poNumber?: string
  distance?: string
  upgradeHeatSeal?: string
  upgradeReinforcement?: string
  upgradeUndersideColor?: string
  upgradeHinge?: string
  upgradeHingeLength?: string
  upgradeHingeDistance?: string
  notes?: string
  verified?: boolean
}

const props = defineProps<{
  attributes: ProductAttributes
  isReadOnly?: boolean
  showEditableHeader?: boolean
  readOnlyReason?: 'verified-approved' | 'custom'
  customReadOnlyMessage?: string
  editingMode?: 'create' | 'edit'
}>()

const hasUpgrades = computed(() => {
  return !!(
    props.attributes.upgradeHeatSeal ||
    props.attributes.upgradeReinforcement ||
    props.attributes.upgradeUndersideColor ||
    props.attributes.upgradeHinge ||
    props.attributes.upgradeHingeLength ||
    props.attributes.upgradeHingeDistance
  )
})

// Read-only mode messaging
const readOnlyTitle = computed(() => {
  switch (props.readOnlyReason) {
    case 'verified-approved':
      return 'Product Attributes (Locked)'
    case 'custom':
      return 'Product Attributes (Read-Only)'
    default:
      return 'Product Attributes (Read-Only)'
  }
})

const readOnlyMessage = computed(() => {
  if (props.customReadOnlyMessage) {
    return props.customReadOnlyMessage
  }
  
  switch (props.readOnlyReason) {
    case 'verified-approved':
      return 'These attributes are locked because they have been verified and the order is approved'
    case 'custom':
      return 'These attributes cannot be modified at this time'
    default:
      return 'These attributes are currently read-only'
  }
})

// Editable mode messaging
const editableTitle = computed(() => {
  switch (props.editingMode) {
    case 'create':
      return 'Product Attributes (New)'
    case 'edit':
      return 'Product Attributes (Editable)'
    default:
      return 'Product Attributes'
  }
})

const editableMessage = computed(() => {
  switch (props.editingMode) {
    case 'create':
      return 'Add product specifications for this order item'
    case 'edit':
      return 'Modify existing product specifications'
    default:
      return 'These attributes can be modified'
  }
})

// Styling classes based on mode
const contentClasses = computed(() => {
  if (props.isReadOnly) {
    return 'opacity-75'
  }
  return ''
})

const borderClasses = computed(() => {
  if (props.isReadOnly) {
    return 'border-blue-200'
  }
  return 'border-gray-200'
})

const labelClasses = computed(() => {
  if (props.isReadOnly) {
    return 'text-blue-700'
  }
  return 'text-gray-700'
})
</script>