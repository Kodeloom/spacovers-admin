<template>
  <div class="print-layout-container">
    <!-- Print Preview Section -->
    <div v-if="showPreview" class="print-preview-section">
      <div class="preview-header">
        <h3 class="text-lg font-semibold mb-4">Print Preview</h3>
        <div class="preview-controls">
          <button
            @click="togglePreview"
            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Hide Preview
          </button>
          <button
            @click="printLabels"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ml-2"
            :disabled="labels.length === 0"
          >
            Print {{ labels.length }} Label{{ labels.length !== 1 ? 's' : '' }}
          </button>
        </div>
      </div>
      
      <!-- Preview of the print layout -->
      <div class="print-preview-wrapper">
        <div class="print-page-preview" ref="printPreview">
          <div class="label-grid">
            <div
              v-for="(label, index) in gridLabels"
              :key="label?.id || `empty-${index}`"
              class="label-position"
              :class="`position-${index + 1}`"
            >
              <div v-if="label" class="label-content">
                <SplitLabel
                  :order-item="label.orderItem"
                  :order="label.order"
                  :show-preview="false"
                  :is-print-mode="false"
                />
              </div>
              <div v-else class="empty-label-slot">
                <span class="text-gray-400 text-sm">Empty Slot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Controls -->
    <div v-if="!showPreview" class="print-controls">
      <button
        @click="togglePreview"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        :disabled="labels.length === 0"
      >
        Show Print Preview
      </button>
    </div>

    <!-- Hidden print layout for actual printing -->
    <div class="print-only-layout" ref="printLayout">
      <div class="print-page">
        <div class="label-grid">
          <div
            v-for="(label, index) in gridLabels"
            :key="label?.id || `print-${index}`"
            class="label-position"
            :class="`position-${index + 1}`"
          >
            <div v-if="label" class="label-content">
              <SplitLabel
                :order-item="label.orderItem"
                :order="label.order"
                :show-preview="false"
                :is-print-mode="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import SplitLabel from './SplitLabel.vue'

interface QueuedLabel {
  id: string
  orderItemId: string
  orderNumber: string
  orderItem: any
  order: any
  createdAt: Date
}

interface Props {
  labels: QueuedLabel[]
  maxLabelsPerSheet?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLabelsPerSheet: 4
})

const emit = defineEmits<{
  print: [labels: QueuedLabel[]]
  previewToggled: [showing: boolean]
}>()

const showPreview = ref(false)
const printPreview = ref<HTMLElement>()
const printLayout = ref<HTMLElement>()

// Create a 2x2 grid with empty slots filled
const gridLabels = computed(() => {
  const grid = new Array(props.maxLabelsPerSheet).fill(null)
  props.labels.forEach((label, index) => {
    if (index < props.maxLabelsPerSheet) {
      grid[index] = label
    }
  })
  return grid
})

const togglePreview = () => {
  showPreview.value = !showPreview.value
  emit('previewToggled', showPreview.value)
}

const printLabels = () => {
  if (props.labels.length === 0) return
  
  // Use the browser's print functionality
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  
  const printContent = printLayout.value?.innerHTML || ''
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Label Print</title>
        <style>
          ${getPrintStyles()}
        </style>
      </head>
      <body>
        ${printContent}
      </body>
    </html>
  `)
  
  printWindow.document.close()
  printWindow.focus()
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
    emit('print', props.labels)
  }, 500)
}

const getPrintStyles = () => {
  return `
    @page {
      size: 8.5in 11in;
      margin: 0.5in 1.25in;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    
    .print-page {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .label-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 0.25in;
      width: 100%;
      height: 100%;
      max-width: 6in;
      max-height: 10in;
    }
    
    .label-position {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #ccc;
    }
    
    .label-content {
      width: 100%;
      height: 100%;
    }
    
    /* Hide empty slots in print */
    .empty-label-slot {
      display: none;
    }
    
    @media print {
      .print-preview-section,
      .print-controls {
        display: none !important;
      }
      
      .print-only-layout {
        display: block !important;
      }
      
      .label-position {
        border: none;
        page-break-inside: avoid;
      }
    }
  `
}

onMounted(() => {
  // Initialize any necessary setup
})
</script>

<style scoped>
.print-layout-container {
  width: 100%;
}

.print-preview-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-controls {
  display: flex;
  gap: 0.5rem;
}

.print-preview-wrapper {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #f9fafb;
}

.print-page-preview {
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  /* 8.5" x 11" aspect ratio scaled down */
  width: 425px;
  height: 550px;
  padding: 25px 62.5px; /* 0.5" top/bottom, 1.25" left/right scaled */
  position: relative;
}

.label-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px; /* 0.25" scaled */
  width: 100%;
  height: 100%;
}

.label-position {
  border: 2px dashed #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fefefe;
  position: relative;
}

.label-content {
  width: 100%;
  height: 100%;
  padding: 4px;
}

.empty-label-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f3f4f6;
  border-radius: 2px;
}

.print-controls {
  padding: 1rem;
  text-align: center;
}

/* Hide print-only layout by default */
.print-only-layout {
  display: none;
}

/* Print-specific styles */
@media print {
  .print-preview-section,
  .print-controls {
    display: none !important;
  }
  
  .print-only-layout {
    display: block !important;
  }
  
  .print-page {
    width: 8.5in;
    height: 11in;
    margin: 0;
    padding: 0.5in 1.25in;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .label-grid {
    width: 6in; /* 8.5" - 2.5" margins */
    height: 10in; /* 11" - 1" margins */
    gap: 0.25in;
  }
  
  .label-position {
    border: none;
    page-break-inside: avoid;
  }
  
  .empty-label-slot {
    display: none;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .print-page-preview {
    width: 340px;
    height: 440px;
    padding: 20px 50px;
  }
  
  .preview-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .preview-controls {
    justify-content: center;
  }
}
</style>