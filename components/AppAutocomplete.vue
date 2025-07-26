<template>
  <div class="relative">
    <!-- Input Field -->
    <input
      :id="id"
      v-model="searchQuery"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      type="text"
      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      @focus="showDropdown = true"
      @blur="handleBlur"
      @keydown="handleKeydown"
    >
    
    <!-- Selected Value Display -->
    <div v-if="modelValue && !searchQuery" class="absolute inset-0 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md">
      <div class="flex flex-col">
        <div class="flex items-center justify-between">
          <div class="font-medium">{{ getDisplayValue(modelValue) }}</div>
          <div
v-if="modelValue.type" class="text-xs px-2 py-1 rounded-full" :class="{
            'bg-blue-100 text-blue-800': modelValue.type === 'RETAILER',
            'bg-green-100 text-green-800': modelValue.type === 'WHOLESALER'
          }">
            {{ modelValue.type }}
          </div>
        </div>
        <div v-if="modelValue.email || modelValue.contactNumber" class="text-xs text-gray-500">
          {{ [modelValue.email, modelValue.contactNumber].filter(Boolean).join(' • ') }}
        </div>
      </div>
    </div>
    
    <!-- Clear Button -->
    <button
      v-if="modelValue && !disabled"
      type="button"
      class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
      @click="clearSelection"
    >
      <Icon name="heroicons:x-mark-20-solid" class="h-4 w-4" />
    </button>
    
    <!-- Dropdown -->
    <div
      v-if="showDropdown && filteredOptions.length > 0"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
    >
      <div
        v-for="(option, index) in filteredOptions"
        :key="getOptionValue(option)"
        :class="[
          'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100',
          { 'bg-indigo-50 text-indigo-900': index === highlightedIndex }
        ]"
        @click="selectOption(option)"
        @mouseenter="highlightedIndex = index"
      >
        <div class="flex flex-col">
          <div class="flex items-center justify-between">
            <div class="font-medium">{{ getDisplayValue(option) }}</div>
            <div
v-if="option.type" class="text-xs px-2 py-1 rounded-full" :class="{
              'bg-blue-100 text-blue-800': option.type === 'RETAILER',
              'bg-green-100 text-green-800': option.type === 'WHOLESALER'
            }">
              {{ option.type }}
            </div>
          </div>
          <div v-if="option.email || option.contactNumber" class="text-xs text-gray-500">
            {{ [option.email, option.contactNumber].filter(Boolean).join(' • ') }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Results -->
    <div
      v-if="showDropdown && searchQuery && filteredOptions.length === 0"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
    >
      <div class="px-3 py-2 text-sm text-gray-500">
        No results found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue?: any
  options: any[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  id?: string
  displayKey?: string
  valueKey?: string
  searchKeys?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search...',
  required: false,
  disabled: false,
  displayKey: 'name',
  valueKey: 'id',
  searchKeys: () => ['name']
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

// State
const searchQuery = ref('')
const showDropdown = ref(false)
const highlightedIndex = ref(-1)

// Computed
const filteredOptions = computed(() => {
  if (!searchQuery.value) {
    return props.options.slice(0, 10) // Show first 10 when no search
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(option => {
    return props.searchKeys.some(key => {
      const value = option[key]
      return value && value.toLowerCase().includes(query)
    })
  }).slice(0, 10) // Limit to 10 results
})

// Methods
const getDisplayValue = (option: any) => {
  if (!option) return ''
  
  if (typeof option === 'string') {
    return option
  }
  
  return option[props.displayKey] || ''
}

const getOptionValue = (option: any) => {
  if (!option) return ''
  
  if (typeof option === 'string') {
    return option
  }
  
  return option[props.valueKey] || option[props.displayKey] || ''
}

const selectOption = (option: any) => {
  emit('update:modelValue', option)
  searchQuery.value = ''
  showDropdown.value = false
  highlightedIndex.value = -1
}

const clearSelection = () => {
  emit('update:modelValue', null)
  searchQuery.value = ''
  showDropdown.value = false
  highlightedIndex.value = -1
}

const handleBlur = () => {
  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false
    highlightedIndex.value = -1
  }, 150)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!showDropdown.value || filteredOptions.value.length === 0) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredOptions.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (highlightedIndex.value >= 0) {
        selectOption(filteredOptions.value[highlightedIndex.value])
      }
      break
    case 'Escape':
      showDropdown.value = false
      highlightedIndex.value = -1
      break
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    searchQuery.value = getDisplayValue(newValue)
  } else {
    searchQuery.value = ''
  }
}, { immediate: true })

watch(searchQuery, (newQuery) => {
  if (!newQuery) {
    highlightedIndex.value = -1
  }
})
</script>