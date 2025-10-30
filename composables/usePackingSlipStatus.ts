interface PackingSlipStatus {
  orderItemId: string
  printed: boolean
  printedAt?: Date | null
  printedBy?: string | null
  addedToQueueAt?: Date | null
}

interface PackingSlipStatusResponse {
  success: boolean
  data: PackingSlipStatus[]
  meta: {
    requestedItems: number
    foundInQueue: number
    printedItems: number
    retrievedAt: string
  }
}

export const usePackingSlipStatus = () => {
  // Reactive state for packing slip status data
  const packingSlipStatus = ref<Record<string, PackingSlipStatus>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch packing slip status for multiple order items
   * @param orderItemIds - Array of order item IDs to check
   * @returns Promise that resolves when data is fetched
   */
  const fetchPackingSlipStatus = async (orderItemIds: string[]): Promise<void> => {
    if (!orderItemIds || orderItemIds.length === 0) {
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<PackingSlipStatusResponse>('/api/admin/packing-slips/status', {
        method: 'POST',
        body: { orderItemIds }
      })

      if (response.success) {
        // Update the reactive state with new data
        const newStatus = response.data.reduce((acc, item) => {
          acc[item.orderItemId] = {
            ...item,
            // Convert date strings to Date objects if they exist
            printedAt: item.printedAt ? new Date(item.printedAt) : null,
            addedToQueueAt: item.addedToQueueAt ? new Date(item.addedToQueueAt) : null
          }
          return acc
        }, {} as Record<string, PackingSlipStatus>)

        // Merge with existing status data
        packingSlipStatus.value = {
          ...packingSlipStatus.value,
          ...newStatus
        }
      } else {
        throw new Error('Failed to fetch packing slip status')
      }
    } catch (err) {
      console.error('Error fetching packing slip status:', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch packing slip status'
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if a packing slip has been printed for a specific order item
   * @param orderItemId - The order item ID to check
   * @returns Boolean indicating if packing slip was printed
   */
  const hasPackingSlipPrinted = (orderItemId: string): boolean => {
    const status = packingSlipStatus.value[orderItemId]
    return status?.printed || false
  }

  /**
   * Get the full packing slip status for a specific order item
   * @param orderItemId - The order item ID to get status for
   * @returns PackingSlipStatus object or null if not found
   */
  const getPackingSlipStatus = (orderItemId: string): PackingSlipStatus | null => {
    return packingSlipStatus.value[orderItemId] || null
  }

  /**
   * Check if a packing slip was printed after a specific date
   * @param orderItemId - The order item ID to check
   * @param afterDate - Date to compare against
   * @returns Boolean indicating if printed after the specified date
   */
  const wasPrintedAfter = (orderItemId: string, afterDate: Date): boolean => {
    const status = packingSlipStatus.value[orderItemId]
    if (!status?.printed || !status.printedAt) {
      return false
    }
    return status.printedAt > afterDate
  }

  /**
   * Get all order items that have printed packing slips
   * @returns Array of order item IDs with printed packing slips
   */
  const getPrintedItems = (): string[] => {
    return Object.keys(packingSlipStatus.value).filter(itemId => 
      packingSlipStatus.value[itemId]?.printed
    )
  }

  /**
   * Get all order items that are in the print queue but not yet printed
   * @returns Array of order item IDs in queue but not printed
   */
  const getQueuedItems = (): string[] => {
    return Object.keys(packingSlipStatus.value).filter(itemId => {
      const status = packingSlipStatus.value[itemId]
      return status?.addedToQueueAt && !status.printed
    })
  }

  /**
   * Clear cached status data for specific order items
   * @param orderItemIds - Optional array of order item IDs to clear. If not provided, clears all
   */
  const clearStatus = (orderItemIds?: string[]): void => {
    if (orderItemIds) {
      orderItemIds.forEach(itemId => {
        delete packingSlipStatus.value[itemId]
      })
    } else {
      packingSlipStatus.value = {}
    }
  }

  /**
   * Refresh status for items that are already cached
   * @returns Promise that resolves when refresh is complete
   */
  const refreshCachedStatus = async (): Promise<void> => {
    const cachedItemIds = Object.keys(packingSlipStatus.value)
    if (cachedItemIds.length > 0) {
      await fetchPackingSlipStatus(cachedItemIds)
    }
  }

  /**
   * Get summary statistics for cached packing slip data
   * @returns Object with summary statistics
   */
  const getStatusSummary = () => {
    const allItems = Object.values(packingSlipStatus.value)
    return {
      totalItems: allItems.length,
      printedItems: allItems.filter(item => item.printed).length,
      queuedItems: allItems.filter(item => item.addedToQueueAt && !item.printed).length,
      notInQueue: allItems.filter(item => !item.addedToQueueAt).length
    }
  }

  return {
    // Reactive state (read-only)
    packingSlipStatus: readonly(packingSlipStatus),
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    fetchPackingSlipStatus,
    hasPackingSlipPrinted,
    getPackingSlipStatus,
    wasPrintedAfter,
    getPrintedItems,
    getQueuedItems,
    clearStatus,
    refreshCachedStatus,
    getStatusSummary
  }
}