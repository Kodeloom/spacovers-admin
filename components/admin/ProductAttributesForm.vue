<template>
    <div class="space-y-6">
        <!-- Verification Status -->
        <div v-if="isVerified" class="bg-green-50 border border-green-200 rounded-md p-3">
            <div class="flex items-center">
                <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-400 mr-2" />
                <span class="text-sm font-medium text-green-800">
                    This item has been verified and is ready for production
                </span>
                <span v-if="userRole !== 'Super Admin'" class="ml-2 text-xs text-green-600">
                    (Read-only - contact Super Admin to modify)
                </span>
            </div>
        </div>

        <!-- Product Type Selection -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
            <select v-model="productAttributes.productType" required :disabled="isReadOnly"
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
                <input v-model="productAttributes.color" type="text" placeholder="e.g., Dark Gray, Navy Blue"
                    :disabled="isReadOnly"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Size</label>
                <input v-model="productAttributes.size" type="text" placeholder="e.g., 93X93"
                    :disabled="productAttributes.shape === 'Rectangle' || isReadOnly"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Shape</label>
                <select v-model="productAttributes.shape" :disabled="isReadOnly"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">Select Shape</option>
                    <option value="Round">Round</option>
                    <option value="Octagon">Octagon</option>
                    <option value="Square">Square</option>
                    <option value="Rectangle">Rectangle</option>
                    <option value="custom">Custom (specify below)</option>
                </select>
                <!-- Show current value -->
                <div v-if="productAttributes.shape" class="mt-1 text-sm text-gray-600">
                    <span class="font-medium">Current:</span> {{ currentShapeValue }}
                </div>
                <input v-if="productAttributes.shape === 'custom'" ref="customShapeInput" v-model="customShape"
                    type="text" placeholder="Enter custom shape" :disabled="isReadOnly"
                    class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Radius Size</label>
                <input v-model="productAttributes.radiusSize" type="text"
                    :disabled="productAttributes.shape === 'Round' || productAttributes.shape === 'Octagon' || isReadOnly"
                    :placeholder="productAttributes.shape === 'Round' || productAttributes.shape === 'Octagon' ? 'Radius 0' : 'e.g., 12'"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
            </div>

            <div v-if="showLengthWidthFields">
                <label class="block text-sm font-medium text-gray-700 mb-2">Length</label>
                <input v-model="productAttributes.length" type="text" placeholder="e.g., 12"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div v-if="showLengthWidthFields">
                <label class="block text-sm font-medium text-gray-700 mb-2">Width</label>
                <input v-model="productAttributes.width" type="text" placeholder="e.g., 8"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Length</label>
                <input v-model="productAttributes.skirtLength" type="text" placeholder="e.g., 5"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Skirt Type</label>
                <select v-model="productAttributes.skirtType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Skirt Type</option>
                    <option value="CONN">Connected</option>
                    <option v-if="productAttributes.shape !== 'Round'" value="SLIT">Slit</option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tie Downs Quantity</label>
                <input v-model="productAttributes.tieDownsQty" type="text" placeholder="e.g., 6"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Placement</label>
                <select v-model="productAttributes.tieDownPlacement"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Placement</option>
                    <option value="HANDLE_SIDE">Handle Side</option>
                    <option value="CORNER_SIDE">Corner Side</option>
                    <option value="FOLD_SIDE">Fold Side</option>
                </select>
            </div>

            <!-- NEW FIELD: Tie Down Length -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Tie Down Length</label>
                <input v-model="productAttributes.tieDownLength" type="text" placeholder="e.g., 18 inches"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <!-- NEW FIELD: PO Number -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">PO Number</label>
                <input v-model="productAttributes.poNumber" type="text" placeholder="e.g., PO-12345"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Distance</label>
                <input v-model="productAttributes.distance" type="text" placeholder="e.g., 0"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
        </div>

        <!-- Upgrades Section -->
        <div>
            <h4 class="text-md font-medium text-gray-900 mb-3">Upgrades</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Foam Upgrade</label>
                    <select v-model="productAttributes.foamUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">No Foam Upgrade</option>
                        <option value="2#">2#</option>
                        <option value="5-2.5">5-2.5</option>
                        <option value="6-4">6-4</option>
                        <option value="4-5-4">4-5-4</option>
                        <option value="54&quot;">54"</option>
                        <option value="custom">Custom (specify below)</option>
                    </select>
                    <!-- Show current value -->
                    <div v-if="productAttributes.foamUpgrade" class="mt-1 text-sm text-gray-600">
                        <span class="font-medium">Current:</span> {{ currentFoamUpgradeValue }}
                    </div>
                    <input v-if="productAttributes.foamUpgrade === 'custom'" ref="customFoamUpgradeInput"
                        v-model="customFoamUpgrade" type="text" placeholder="Enter custom foam upgrade specification"
                        class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        @input="updateCustomFoamUpgrade" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Double Plastic Wrap</label>
                    <select v-model="productAttributes.doublePlasticWrapUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Webbing Upgrade</label>
                    <select v-model="productAttributes.webbingUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Metal for Lifter</label>
                    <select v-model="productAttributes.metalForLifterUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Steam Stopper</label>
                    <select v-model="productAttributes.steamStopperUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Fabric Upgrade</label>
                    <select v-model="productAttributes.fabricUpgrade"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                    <input v-model="productAttributes.extraHandleQty" type="text" placeholder="e.g., 0"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Extra Long Skirt</label>
                    <select v-model="productAttributes.extraLongSkirt"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <textarea v-model="productAttributes.notes" rows="3"
                    placeholder="Enter any additional notes for this product..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
    modelValue?: any
    itemIndex: number
    customerId?: string
    isVerified?: boolean
    userRole?: string
}

interface Emits {
    (e: 'update:modelValue', value: any): void
    (e: 'validation-change', isValid: boolean, errors: string[]): void
    (e: 'po-duplicate-confirmed', poNumber: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Initialize productAttributes with the modelValue
const productAttributes = ref(props.modelValue || {})

// Custom shape and foam upgrade handling
const customShape = ref('')
const customFoamUpgrade = ref('')

// Computed properties for conditional fields
const showLengthWidthFields = computed(() => {
    return productAttributes.value.shape === 'Rectangle'
})

// Computed property for read-only state
const isReadOnly = computed(() => {
    return props.isVerified && props.userRole !== 'Super Admin'
})

const currentShapeValue = computed(() => {
    if (productAttributes.value.shape === 'custom') {
        return customShape.value || productAttributes.value.customShapeValue || 'Custom shape not specified'
    }
    return productAttributes.value.shape
})

const currentFoamUpgradeValue = computed(() => {
    if (productAttributes.value.foamUpgrade === 'custom') {
        return customFoamUpgrade.value || productAttributes.value.customFoamUpgradeValue || 'Custom foam upgrade not specified'
    }
    return productAttributes.value.foamUpgrade
})

// Flag to prevent recursive updates
const isUpdatingFromParent = ref(false)

// Watch for changes and emit updates
watch(productAttributes, (newValue) => {
    // Only emit if we're not currently updating from parent
    if (!isUpdatingFromParent.value) {
        emit('update:modelValue', newValue)
    }
}, { deep: true })

// Watch for modelValue changes from parent
watch(() => props.modelValue, (newValue) => {
    if (newValue && !isUpdatingFromParent.value) {
        // Set flag to prevent recursive updates
        isUpdatingFromParent.value = true
        
        // Use nextTick to ensure the update is complete before resetting flag
        nextTick(() => {
            isUpdatingFromParent.value = false
        })
        
        productAttributes.value = { ...newValue }

        // Auto-detect custom shape: if shape value is not in predefined list, treat as custom
        const predefinedShapes = ['Round', 'Octagon', 'Square', 'Rectangle', 'custom'] // Include 'custom' to prevent recursion
        if (newValue.shape && !predefinedShapes.includes(newValue.shape)) {
            customShape.value = newValue.shape
            productAttributes.value.shape = 'custom'
            productAttributes.value.customShapeValue = newValue.shape
        } else if (newValue.shape === 'custom' && newValue.customShapeValue) {
            customShape.value = newValue.customShapeValue
        }

        // Auto-detect custom foam upgrade: if foam upgrade value is not in predefined list, treat as custom
        const predefinedFoamUpgrades = ['2#', '5-2.5', '6-4', '4-5-4', '54"', 'custom'] // Include 'custom' to prevent recursion
        if (newValue.foamUpgrade && !predefinedFoamUpgrades.includes(newValue.foamUpgrade)) {
            customFoamUpgrade.value = newValue.foamUpgrade
            productAttributes.value.foamUpgrade = 'custom'
            productAttributes.value.customFoamUpgradeValue = newValue.foamUpgrade
        } else if (newValue.foamUpgrade === 'custom' && newValue.customFoamUpgradeValue) {
            customFoamUpgrade.value = newValue.customFoamUpgradeValue
        }
    }
}, { immediate: true })

// Handle product type change
const handleProductTypeChange = () => {
    // Auto-set packaging for Cover for Cover
    if (productAttributes.value.productType === 'COVER_FOR_COVER') {
        productAttributes.value.packaging = true
    }
}

// Handle custom foam upgrade
const updateCustomFoamUpgrade = () => {
    if (productAttributes.value.foamUpgrade === 'custom') {
        productAttributes.value.customFoamUpgradeValue = customFoamUpgrade.value
    }
}

// Handle custom shape - store in separate field to avoid conflicts
watch(customShape, (newValue) => {
    if (productAttributes.value.shape === 'custom' && !isUpdatingFromParent.value) {
        // Store the custom shape value in a separate field
        productAttributes.value.customShapeValue = newValue
    }
})

// Handle custom foam upgrade
watch(customFoamUpgrade, (newValue) => {
    if (productAttributes.value.foamUpgrade === 'custom' && !isUpdatingFromParent.value) {
        // Store the custom foam upgrade value in a separate field
        productAttributes.value.customFoamUpgradeValue = newValue
    }
})

// Auto-calculate size for Rectangle shape
watch([() => productAttributes.value.length, () => productAttributes.value.width, () => productAttributes.value.shape], () => {
    if (productAttributes.value.shape === 'Rectangle' && productAttributes.value.length && productAttributes.value.width && !isUpdatingFromParent.value) {
        productAttributes.value.size = `${productAttributes.value.length}X${productAttributes.value.width}`
    }
})

// Auto-set radius to 0 for Round and Octagon shapes
watch(() => productAttributes.value.shape, (newShape) => {
    if (!isUpdatingFromParent.value) {
        if (newShape === 'Round' || newShape === 'Octagon') {
            productAttributes.value.radiusSize = '0'
        }

        // For Round shape, auto-set skirt type to Connected
        if (newShape === 'Round') {
            productAttributes.value.skirtType = 'CONN'
        }
    }
})
</script>