<template>
  <!-- First Warning Modal -->
  <AppWarningModal
    :is-open="warningState.showFirstWarning"
    :title="currentWarningMessages.first?.title || 'Incomplete Batch Warning'"
    :message="currentWarningMessages.first?.message || 'You are about to print an incomplete batch.'"
    :confirm-button-text="currentWarningMessages.first?.confirmText || 'Continue Anyway'"
    cancel-button-text="Cancel"
    :is-loading="false"
    @confirmed="handleFirstWarningConfirm"
    @closed="handleCancel"
  >
    <template #default>
      <!-- Additional content for first warning -->
      <div class="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div class="flex items-start">
          <Icon name="heroicons:light-bulb" class="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div class="text-sm text-yellow-800">
            <p class="font-medium mb-1">Tip for efficient printing:</p>
            <p>Consider adding more labels to your queue to maximize paper usage and reduce waste.</p>
          </div>
        </div>
      </div>
      
      <!-- Paper waste visualization -->
      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 class="text-sm font-medium text-gray-900 mb-2">Paper Usage Preview</h4>
        <div class="grid grid-cols-2 gap-2">
          <div 
            v-for="i in 4" 
            :key="i"
            class="h-12 rounded border-2 border-dashed flex items-center justify-center text-xs font-medium"
            :class="i <= warningState.labelCount 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-red-100 border-red-300 text-red-700'"
          >
            {{ i <= warningState.labelCount ? `Label ${i}` : 'Wasted' }}
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-600 text-center">
          {{ paperWasteInfo.usedLabels }} used, {{ paperWasteInfo.wastedLabels }} wasted 
          ({{ paperWasteInfo.wastePercentage }}% waste)
        </div>
      </div>
    </template>
  </AppWarningModal>

  <!-- Second Warning Modal (Final Confirmation) -->
  <AppWarningModal
    :is-open="warningState.showSecondWarning"
    :title="currentWarningMessages.second?.title || 'Final Confirmation Required'"
    :message="currentWarningMessages.second?.message || 'This is your final chance to cancel before printing.'"
    :confirm-button-text="currentWarningMessages.second?.confirmText || 'Yes, Print Anyway'"
    :loading-confirm-button-text="'Printing...'"
    cancel-button-text="Cancel"
    :confirmation-phrase="currentWarningMessages.second?.confirmationPhrase"
    :is-loading="warningState.isProcessing"
    @confirmed="handleSecondWarningConfirm"
    @closed="handleCancel"
  >
    <template #default>
      <!-- Critical warning content -->
      <div class="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <div class="flex items-start">
          <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div class="text-sm text-red-800">
            <p class="font-medium mb-1">Environmental Impact Warning</p>
            <p>Printing incomplete batches contributes to unnecessary paper waste. This action cannot be undone once printing begins.</p>
          </div>
        </div>
      </div>

      <!-- Final paper waste summary -->
      <div class="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm font-medium text-gray-900 mb-3">Final Print Summary</h4>
        
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Labels to print:</span>
            <span class="font-medium text-green-700">{{ paperWasteInfo.usedLabels }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Labels wasted:</span>
            <span class="font-medium text-red-700">{{ paperWasteInfo.wastedLabels }}</span>
          </div>
          <div class="flex justify-between border-t pt-2">
            <span class="text-gray-600">Paper efficiency:</span>
            <span class="font-medium" :class="paperWasteInfo.wastePercentage > 50 ? 'text-red-700' : 'text-yellow-700'">
              {{ 100 - paperWasteInfo.wastePercentage }}%
            </span>
          </div>
        </div>

        <!-- Alternative suggestions -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-xs text-gray-600 mb-2">
            <strong>Alternative:</strong> Cancel now and add {{ 4 - paperWasteInfo.usedLabels }} more 
            {{ 4 - paperWasteInfo.usedLabels === 1 ? 'label' : 'labels' }} to achieve 100% efficiency.
          </p>
        </div>
      </div>
    </template>
  </AppWarningModal>
</template>

<script setup lang="ts">
import type { PrintWarningState } from '~/composables/usePrintWarnings'

interface Props {
  warningState: PrintWarningState
  paperWasteInfo: {
    wastedLabels: number
    wastePercentage: number
    usedLabels: number
    totalLabels: number
  }
  currentWarningMessages: {
    first?: {
      title: string
      message: string
      confirmText: string
    }
    second?: {
      title: string
      message: string
      confirmText: string
      confirmationPhrase?: string
    }
  }
}

defineProps<Props>()

const emit = defineEmits<{
  firstWarningConfirm: []
  secondWarningConfirm: []
  cancel: []
}>()

const handleFirstWarningConfirm = () => {
  emit('firstWarningConfirm')
}

const handleSecondWarningConfirm = () => {
  emit('secondWarningConfirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>