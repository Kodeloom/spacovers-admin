<template>
  <div class="print-queue-test-page">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-6">Print Layout Test</h1>
      
      <div class="mb-6">
        <h2 class="text-lg font-semibold mb-4">Test Labels</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div
            v-for="(label, index) in testLabels"
            :key="label.id"
            class="border rounded-lg p-4 bg-white shadow"
          >
            <h3 class="font-medium mb-2">Test Label {{ index + 1 }}</h3>
            <p class="text-sm text-gray-600 mb-2">{{ label.orderItem.item?.name }}</p>
            <button
              @click="addToQueue(label)"
              class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              :disabled="isInQueue(label.id)"
            >
              {{ isInQueue(label.id) ? 'In Queue' : 'Add to Queue' }}
            </button>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Print Queue ({{ queuedLabels.length }}/4)</h2>
          <button
            @click="clearQueue"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            :disabled="queuedLabels.length === 0"
          >
            Clear Queue
          </button>
        </div>
        
        <div v-if="queuedLabels.length === 0" class="text-gray-500 text-center py-8">
          No labels in queue. Add some test labels above.
        </div>
        
        <div v-else class="space-y-4">
          <div
            v-for="label in queuedLabels"
            :key="label.id"
            class="flex justify-between items-center p-3 bg-gray-50 rounded"
          >
            <div>
              <span class="font-medium">{{ label.orderItem.item?.name }}</span>
              <span class="text-gray-600 ml-2">- {{ label.order.customer?.name }}</span>
            </div>
            <button
              @click="removeFromQueue(label.id)"
              class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Print Layout Component -->
      <div class="border-t pt-6">
        <h2 class="text-lg font-semibold mb-4">Print Layout</h2>
        <PrintLayout
          :labels="queuedLabels"
          @print="handlePrint"
          @preview-toggled="handlePreviewToggled"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PrintLayout from '~/components/admin/PrintLayout.vue'

// Test data
const testLabels = ref([
  {
    id: 'test-1',
    orderItemId: 'item-1',
    orderNumber: 'SO-001',
    orderItem: {
      id: 'item-1',
      item: { name: 'Premium Cover' },
      productAttributes: {
        thickness: '1/4"',
        size: '8x10',
        color: 'Forest Green',
        foamUpgrade: true,
        webbingUpgrade: true,
      }
    },
    order: {
      id: 'order-1',
      salesOrderNumber: 'SO-001',
      customer: { name: 'Test Customer 1' },
      createdAt: new Date('2024-01-15')
    },
    createdAt: new Date()
  },
  {
    id: 'test-2',
    orderItemId: 'item-2',
    orderNumber: 'SO-002',
    orderItem: {
      id: 'item-2',
      item: { name: 'Standard Cover' },
      productAttributes: {
        thickness: '1/2"',
        size: '12x16',
        color: 'Navy Blue',
        extraHandleQty: '2',
      }
    },
    order: {
      id: 'order-2',
      salesOrderNumber: 'SO-002',
      customer: { name: 'Another Customer Corp' },
      createdAt: new Date('2024-01-16')
    },
    createdAt: new Date()
  },
  {
    id: 'test-3',
    orderItemId: 'item-3',
    orderNumber: 'SO-003',
    orderItem: {
      id: 'item-3',
      item: { name: 'Heavy Duty Cover' },
      productAttributes: {
        thickness: '3/4"',
        size: '20x24',
        color: 'Charcoal',
        metalForLifterUpgrade: true,
        steamStopperUpgrade: true,
        fabricUpgrade: true,
      }
    },
    order: {
      id: 'order-3',
      salesOrderNumber: 'SO-003',
      customer: { name: 'Big Manufacturing LLC' },
      createdAt: new Date('2024-01-17')
    },
    createdAt: new Date()
  },
  {
    id: 'test-4',
    orderItemId: 'item-4',
    orderNumber: 'SO-004',
    orderItem: {
      id: 'item-4',
      item: { name: 'Custom Cover' },
      productAttributes: {
        thickness: '1"',
        size: '36x48',
        color: 'Royal Blue',
        doublePlasticWrapUpgrade: true,
        extraLongSkirt: true,
      }
    },
    order: {
      id: 'order-4',
      salesOrderNumber: 'SO-004',
      customer: { name: 'Custom Solutions Inc' },
      createdAt: new Date('2024-01-18')
    },
    createdAt: new Date()
  },
  {
    id: 'test-5',
    orderItemId: 'item-5',
    orderNumber: 'SO-005',
    orderItem: {
      id: 'item-5',
      item: { name: 'Lightweight Cover' },
      productAttributes: {
        thickness: '1/8"',
        size: '6x8',
        color: 'Light Gray',
      }
    },
    order: {
      id: 'order-5',
      salesOrderNumber: 'SO-005',
      customer: { name: 'Small Business Co' },
      createdAt: new Date('2024-01-19')
    },
    createdAt: new Date()
  }
])

const queuedLabels = ref<any[]>([])

function addToQueue(label: any) {
  if (queuedLabels.value.length < 4 && !isInQueue(label.id)) {
    queuedLabels.value.push(label)
  }
}

function removeFromQueue(labelId: string) {
  const index = queuedLabels.value.findIndex(label => label.id === labelId)
  if (index !== -1) {
    queuedLabels.value.splice(index, 1)
  }
}

function clearQueue() {
  queuedLabels.value = []
}

function isInQueue(labelId: string) {
  return queuedLabels.value.some(label => label.id === labelId)
}

function handlePrint(labels: any[]) {
  console.log('Printing labels:', labels)
  // In a real implementation, this would clear the queue after successful printing
  // clearQueue()
}

function handlePreviewToggled(showing: boolean) {
  console.log('Preview toggled:', showing)
}

// Set page layout
definePageMeta({
  layout: 'admin',
  middleware: 'auth-office-admin'
})
</script>

<style scoped>
.print-queue-test-page {
  min-height: 100vh;
  background: #f9fafb;
}
</style>