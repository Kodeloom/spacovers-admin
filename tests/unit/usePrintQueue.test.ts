import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { usePrintQueue } from '~/composables/usePrintQueue'
import type { OrderItemWithRelations, QueuedLabel } from '~/composables/usePrintQueue'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Setup global mocks
beforeEach(() => {
  // Mock localStorage
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  })

  // Mock process.client
  Object.defineProperty(process, 'client', {
    value: true,
    writable: true
  })

  // Mock window object for client-side checks
  Object.defineProperty(global, 'window', {
    value: { localStorage: localStorageMock },
    writable: true
  })
})

// Mock order item data
const createMockOrderItem = (id: string = 'test-item-1'): OrderItemWithRelations => ({
  id,
  orderId: 'test-order-1',
  itemId: 'test-item-id',
  quickbooksOrderLineId: null,
  quantity: 1,
  pricePerItem: 100.00,
  lineDescription: 'Test item description',
  itemStatus: 'NOT_STARTED_PRODUCTION',
  notes: null,
  productId: null,
  isProduct: false,
  productType: null,
  size: '8x8',
  shape: 'Rectangle',
  radiusSize: null,
  skirtLength: '6',
  skirtType: null,
  tieDownsQty: '4',
  tieDownPlacement: null,
  distance: '0',
  foamUpgrade: '1/4 inch',
  doublePlasticWrapUpgrade: 'No',
  webbingUpgrade: 'Yes',
  metalForLifterUpgrade: 'No',
  steamStopperUpgrade: 'No',
  fabricUpgrade: 'No',
  extraHandleQty: '0',
  extraLongSkirt: null,
  packaging: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  order: {
    id: 'test-order-1',
    quickbooksOrderId: null,
    customerId: 'test-customer-1',
    salesOrderNumber: 'SO-001',
    purchaseOrderNumber: null,
    estimateId: null,
    transactionDate: new Date(),
    dueDate: null,
    shipDate: null,
    trackingNumber: null,
    totalAmount: 100.00,
    balance: 0,
    totalTax: 0,
    emailStatus: null,
    customerMemo: null,
    contactEmail: 'test@example.com',
    contactPhoneNumber: null,
    billingAddressLine1: null,
    billingAddressLine2: null,
    billingCity: null,
    billingState: null,
    billingZipCode: null,
    billingCountry: null,
    shippingAddressLine1: null,
    shippingAddressLine2: null,
    shippingCity: null,
    shippingState: null,
    shippingZipCode: null,
    shippingCountry: null,
    orderStatus: 'PENDING',
    priority: 'MEDIUM',
    barcode: null,
    approvedAt: null,
    readyToShipAt: null,
    shippedAt: null,
    archivedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: {
      id: 'test-customer-1',
      quickbooksCustomerId: null,
      name: 'Test Customer',
      contactNumber: null,
      email: 'customer@example.com',
      type: 'RETAILER',
      status: 'ACTIVE',
      shippingAddressLine1: null,
      shippingAddressLine2: null,
      shippingCity: null,
      shippingState: null,
      shippingZipCode: null,
      shippingCountry: null,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingZipCode: null,
      billingCountry: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  },
  item: {
    id: 'test-item-id',
    quickbooksItemId: null,
    name: 'Spa Cover',
    imageUrl: null,
    category: 'Covers',
    wholesalePrice: 80.00,
    retailPrice: 100.00,
    cost: 60.00,
    description: 'Standard spa cover',
    status: 'ACTIVE',
    isSpacoverProduct: true,
    productType: 'SPA_COVER',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  product: null,
  productAttributes: null
} as any)

describe('usePrintQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty queue when no localStorage data', () => {
      const { queue } = usePrintQueue()
      expect(queue.value).toEqual([])
    })

    it('should load queue from localStorage on initialization', () => {
      const mockData = [
        {
          id: 'label-1',
          orderItemId: 'item-1',
          orderNumber: 'SO-001',
          customerName: 'Test Customer',
          itemName: 'Spa Cover',
          labelData: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          position: 0
        }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockData))

      const { queue } = usePrintQueue()
      expect(queue.value).toHaveLength(1)
      expect(queue.value[0].id).toBe('label-1')
      expect(queue.value[0].createdAt).toBeInstanceOf(Date)
    })

    it('should handle localStorage parsing errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      const { queue, error } = usePrintQueue()
      expect(queue.value).toEqual([])
      expect(error.value?.type).toBe('STORAGE_ERROR')
    })
  })

  describe('addToQueue', () => {
    it('should add valid order item to queue', async () => {
      const { addToQueue, queue } = usePrintQueue()
      const orderItem = createMockOrderItem()

      const result = await addToQueue(orderItem)

      expect(result).toBe(true)
      expect(queue.value).toHaveLength(1)
      expect(queue.value[0].orderItemId).toBe('test-item-1')
      expect(queue.value[0].customerName).toBe('Test Customer')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should generate correct label data with upgrades', async () => {
      const { addToQueue, queue } = usePrintQueue()
      const orderItem = createMockOrderItem()

      await addToQueue(orderItem)

      const labelData = queue.value[0].labelData
      expect(labelData.customer).toBe('Test Customer')
      expect(labelData.thickness).toBe('1/4 inch')
      expect(labelData.size).toBe('8x8')
      expect(labelData.type).toBe('Spa Cover')
      expect(labelData.upgrades).toContain('Foam: 1/4 inch')
      expect(labelData.upgrades).toContain('Webbing')
      expect(labelData.barcode).toBe('test-item-1')
    })

    it('should reject duplicate order items', async () => {
      const { addToQueue, queue, error } = usePrintQueue()
      const orderItem = createMockOrderItem()

      // Add first time
      await addToQueue(orderItem)
      expect(queue.value).toHaveLength(1)

      // Try to add same item again
      const result = await addToQueue(orderItem)
      
      expect(result).toBe(false)
      expect(queue.value).toHaveLength(1)
      expect(error.value?.type).toBe('DUPLICATE_ITEM')
    })

    it('should reject when queue is full', async () => {
      const { addToQueue, queue, error, MAX_QUEUE_SIZE } = usePrintQueue()

      // Fill queue to max capacity
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        const orderItem = createMockOrderItem(`item-${i}`)
        await addToQueue(orderItem)
      }

      expect(queue.value).toHaveLength(MAX_QUEUE_SIZE)

      // Try to add one more
      const extraItem = createMockOrderItem('extra-item')
      const result = await addToQueue(extraItem)

      expect(result).toBe(false)
      expect(queue.value).toHaveLength(MAX_QUEUE_SIZE)
      expect(error.value?.type).toBe('MAX_SIZE_EXCEEDED')
    })

    it('should validate order item data', async () => {
      const { addToQueue, error } = usePrintQueue()
      const invalidOrderItem = createMockOrderItem()
      invalidOrderItem.order.customer.name = '' // Invalid customer name

      const result = await addToQueue(invalidOrderItem)

      expect(result).toBe(false)
      expect(error.value?.type).toBe('INVALID_DATA')
    })
  })

  describe('removeFromQueue', () => {
    it('should remove item from queue by ID', async () => {
      const { addToQueue, removeFromQueue, queue } = usePrintQueue()
      const orderItem = createMockOrderItem()

      await addToQueue(orderItem)
      const labelId = queue.value[0].id

      const result = removeFromQueue(labelId)

      expect(result).toBe(true)
      expect(queue.value).toHaveLength(0)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2) // Once for add, once for remove
    })

    it('should update positions after removal', async () => {
      const { addToQueue, removeFromQueue, queue } = usePrintQueue()
      
      // Add multiple items
      await addToQueue(createMockOrderItem('item-1'))
      await addToQueue(createMockOrderItem('item-2'))
      await addToQueue(createMockOrderItem('item-3'))

      // Remove middle item
      const middleLabelId = queue.value[1].id
      removeFromQueue(middleLabelId)

      expect(queue.value).toHaveLength(2)
      expect(queue.value[0].position).toBe(0)
      expect(queue.value[1].position).toBe(1)
    })

    it('should handle invalid label ID', () => {
      const { removeFromQueue, error } = usePrintQueue()

      const result = removeFromQueue('non-existent-id')

      expect(result).toBe(false)
      expect(error.value?.type).toBe('INVALID_DATA')
    })
  })

  describe('clearQueue', () => {
    it('should clear all items from queue', async () => {
      const { addToQueue, clearQueue, queue } = usePrintQueue()
      
      // Add multiple items
      await addToQueue(createMockOrderItem('item-1'))
      await addToQueue(createMockOrderItem('item-2'))

      const result = clearQueue()

      expect(result).toBe(true)
      expect(queue.value).toHaveLength(0)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('spacovers_print_queue', '[]')
    })
  })

  describe('reorderQueue', () => {
    it('should reorder items correctly', async () => {
      const { addToQueue, reorderQueue, queue } = usePrintQueue()
      
      // Add items
      await addToQueue(createMockOrderItem('item-1'))
      await addToQueue(createMockOrderItem('item-2'))
      await addToQueue(createMockOrderItem('item-3'))

      const originalOrder = queue.value.map(item => item.orderItemId)
      expect(originalOrder).toEqual(['item-1', 'item-2', 'item-3'])

      // Move first item to last position
      const result = reorderQueue(0, 2)

      expect(result).toBe(true)
      const newOrder = queue.value.map(item => item.orderItemId)
      expect(newOrder).toEqual(['item-2', 'item-3', 'item-1'])
      
      // Check positions are updated
      expect(queue.value[0].position).toBe(0)
      expect(queue.value[1].position).toBe(1)
      expect(queue.value[2].position).toBe(2)
    })

    it('should handle invalid indices', () => {
      const { reorderQueue, error } = usePrintQueue()

      const result = reorderQueue(-1, 0)

      expect(result).toBe(false)
      expect(error.value?.type).toBe('INVALID_DATA')
    })
  })

  describe('getQueueStatus', () => {
    it('should return correct status for empty queue', () => {
      const { getQueueStatus } = usePrintQueue()
      const status = getQueueStatus()

      expect(status.value.count).toBe(0)
      expect(status.value.isEmpty).toBe(true)
      expect(status.value.isFull).toBe(false)
      expect(status.value.canPrintWithoutWarning).toBe(false)
      expect(status.value.hasPartialBatch).toBe(false)
    })

    it('should return correct status for partial queue', async () => {
      const { addToQueue, getQueueStatus } = usePrintQueue()
      
      await addToQueue(createMockOrderItem('item-1'))
      await addToQueue(createMockOrderItem('item-2'))

      const status = getQueueStatus()

      expect(status.value.count).toBe(2)
      expect(status.value.isEmpty).toBe(false)
      expect(status.value.isFull).toBe(false)
      expect(status.value.canPrintWithoutWarning).toBe(false)
      expect(status.value.hasPartialBatch).toBe(true)
    })

    it('should return correct status for full queue', async () => {
      const { addToQueue, getQueueStatus, MAX_QUEUE_SIZE } = usePrintQueue()
      
      // Fill queue to capacity
      for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
        await addToQueue(createMockOrderItem(`item-${i}`))
      }

      const status = getQueueStatus()

      expect(status.value.count).toBe(MAX_QUEUE_SIZE)
      expect(status.value.isEmpty).toBe(false)
      expect(status.value.isFull).toBe(true)
      expect(status.value.canPrintWithoutWarning).toBe(true)
      expect(status.value.hasPartialBatch).toBe(false)
    })
  })

  describe('utility functions', () => {
    it('should check if item is queued', async () => {
      const { addToQueue, isItemQueued } = usePrintQueue()
      const orderItem = createMockOrderItem()

      expect(isItemQueued('test-item-1')).toBe(false)

      await addToQueue(orderItem)

      expect(isItemQueued('test-item-1')).toBe(true)
      expect(isItemQueued('non-existent')).toBe(false)
    })

    it('should get label by order item ID', async () => {
      const { addToQueue, getLabelByOrderItemId } = usePrintQueue()
      const orderItem = createMockOrderItem()

      await addToQueue(orderItem)

      const label = getLabelByOrderItemId('test-item-1')
      expect(label).toBeDefined()
      expect(label?.orderItemId).toBe('test-item-1')

      const nonExistent = getLabelByOrderItemId('non-existent')
      expect(nonExistent).toBeUndefined()
    })

    it('should clear errors', () => {
      const { clearError, error } = usePrintQueue()
      
      // Simulate an error
      error.value = {
        type: 'STORAGE_ERROR',
        message: 'Test error'
      }

      expect(error.value).toBeDefined()

      clearError()

      expect(error.value).toBeNull()
    })
  })

  describe('localStorage integration', () => {
    it('should handle localStorage setItem errors', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const { addToQueue, error } = usePrintQueue()
      const orderItem = createMockOrderItem()

      const result = await addToQueue(orderItem)

      expect(result).toBe(false)
      expect(error.value?.type).toBe('STORAGE_ERROR')
    })

    it('should work when localStorage is not available', () => {
      // Mock process.client as false (server-side)
      Object.defineProperty(process, 'client', { value: false })

      const { queue } = usePrintQueue()
      expect(queue.value).toEqual([])

      // Reset for other tests
      Object.defineProperty(process, 'client', { value: true })
    })
  })
})