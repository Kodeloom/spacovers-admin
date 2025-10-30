<template>
  <div class="print-queue-status bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-medium text-gray-900">Print Queue Status</h2>
          <p class="text-sm text-gray-600 mt-1">
            {{ statusMessage }}
          </p>
        </div>
        <div class="flex items-center space-x-4">
          <!-- Queue Status Indicator -->
          <div class="text-center">
            <div class="text-2xl font-bold" :class="statusColor">
              {{ totalItems }}
            </div>
            <div class="text-xs text-gray-500">Items</div>
          </div>
          
          <!-- Batch Progress Indicator -->
          <div class="text-center">
            <div class="text-lg font-medium" :class="batchProgressColor">
              {{ readyToPrint }} / {{ standardBatchSize }}
            </div>
            <div class="text-xs text-gray-500">Batch</div>
          </div>
          
          <!-- Warning Indicator -->
          <div v-if="requiresWarning" class="flex items-center text-yellow-600">
            <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 mr-1" />
            <span class="text-sm">{{ warningType }}</span>
          </div>
          
          <!-- Ready Indicator -->
          <div v-else-if="isReady" class="flex items-center text-green-600">
            <Icon name="heroicons:check-circle" class="h-5 w-5 mr-1" />
            <span class="text-sm">Ready</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Batch Progress Bar -->
    <div class="px-6 py-3 bg-gray-50">
      <div class="flex items-center justify-between text-sm mb-2">
        <span class="text-gray-600">Batch Progress</span>
        <span class="font-medium">{{ Math.min(readyToPrint, standardBatchSize) }} / {{ standardBatchSize }}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="h-2 rounded-full transition-all duration-300"
          :class="progressBarColor"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      
      <!-- Progress Labels -->
      <div class="flex justify-between text-xs text-gray-500 mt-1">
        <span>Empty</span>
        <span>Partial</span>
        <span>Full Batch</span>
      </div>
    </div>

    <!-- Detailed Status Information -->
    <div v-if="showDetails" class="px-6 py-4 border-t border-gray-200">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Queue Statistics -->
        <div class="text-center">
          <div class="text-lg font-semibold text-gray-900">{{ totalItems }}</div>
          <div class="text-sm text-gray-600">Total Items</div>
        </div>
        
        <!-- Batch Information -->
        <div class="text-center">
          <div class="text-lg font-semibold" :class="batchStatusColor">
            {{ Math.floor(totalItems / standardBatchSize) }}
          </div>
          <div class="text-sm text-gray-600">Full Batches</div>
        </div>
        
        <!-- Remaining Items -->
        <div class="text-center">
          <div class="text-lg font-semibold text-gray-900">
            {{ totalItems % standardBatchSize }}
          </div>
          <div class="text-sm text-gray-600">Remaining</div>
        </div>
      </div>
      
      <!-- Recommendations -->
      <div v-if="recommendations.length > 0" class="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 class="text-sm font-medium text-blue-900 mb-2">Recommendations:</h4>
        <ul class="text-sm text-blue-800 space-y-1">
          <li v-for="recommendation in recommendations" :key="recommendation" class="flex items-start">
            <Icon name="heroicons:light-bulb" class="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            {{ recommendation }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  totalItems: number
  readyToPrint: number
  requiresWarning: boolean
  standardBatchSize?: number
  showDetails?: boolean
  recommendations?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  standardBatchSize: 4,
  showDetails: false,
  recommendations: () => []
})

// Computed properties
const statusMessage = computed(() => {
  const total = props.totalItems
  const batchSize = props.standardBatchSize
  
  if (total === 0) {
    return 'Queue is empty. Items will be added automatically when orders are approved.'
  } else if (total >= batchSize) {
    const fullBatches = Math.floor(total / batchSize)
    const remaining = total % batchSize
    if (remaining === 0) {
      return `Ready to print! ${fullBatches} full batch${fullBatches !== 1 ? 'es' : ''} available.`
    } else {
      return `${fullBatches} full batch${fullBatches !== 1 ? 'es' : ''} ready, ${remaining} item${remaining !== 1 ? 's' : ''} remaining.`
    }
  } else {
    return `${batchSize - total} more item${batchSize - total !== 1 ? 's' : ''} needed for a full batch.`
  }
})

const statusColor = computed(() => {
  const total = props.totalItems
  const batchSize = props.standardBatchSize
  
  if (total === 0) return 'text-gray-400'
  if (total >= batchSize) return 'text-green-600'
  return 'text-yellow-600'
})

const batchProgressColor = computed(() => {
  const ready = Math.min(props.readyToPrint, props.standardBatchSize)
  const batchSize = props.standardBatchSize
  
  if (ready === 0) return 'text-gray-400'
  if (ready === batchSize) return 'text-green-600'
  return 'text-yellow-600'
})

const progressPercentage = computed(() => {
  const ready = Math.min(props.readyToPrint, props.standardBatchSize)
  return Math.min((ready / props.standardBatchSize) * 100, 100)
})

const progressBarColor = computed(() => {
  const percentage = progressPercentage.value
  
  if (percentage === 0) return 'bg-gray-300'
  if (percentage === 100) return 'bg-green-500'
  if (percentage >= 75) return 'bg-yellow-500'
  if (percentage >= 50) return 'bg-orange-500'
  return 'bg-red-500'
})

const isReady = computed(() => {
  return props.totalItems >= props.standardBatchSize
})

const warningType = computed(() => {
  if (props.totalItems === 0) return 'Empty'
  if (props.totalItems < props.standardBatchSize) return 'Partial'
  return 'Warning'
})

const batchStatusColor = computed(() => {
  const fullBatches = Math.floor(props.totalItems / props.standardBatchSize)
  if (fullBatches === 0) return 'text-gray-400'
  return 'text-green-600'
})
</script>

<style scoped>
.print-queue-status {
  @apply transition-all duration-200;
}

.print-queue-status:hover {
  @apply shadow-md;
}
</style>