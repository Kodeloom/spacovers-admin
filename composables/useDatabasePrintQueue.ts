import { ref, computed } from 'vue'
import { useFindManyPrintQueue } from '~/lib/hooks'

/**
 * Composable for database print queue operations
 * This works with the shared database print queue instead of localStorage
 */
export const useDatabasePrintQueue = () => {
  // Fetch print queue items from database
  const { data: dbPrintQueue, refetch: refetchPrintQueue } = useFindManyPrintQueue({
    where: { isPrinted: false },
    include: {
      orderItem: {
        include: {
          order: {
            include: {
              customer: true
            }
          },
          item: true,
          productAttributes: true
        }
      }
    },
    orderBy: { addedAt: 'asc' }
  })

  // Check if an item is in the database print queue
  const isItemQueued = (orderItemId: string): boolean => {
    if (!dbPrintQueue.value) return false
    return dbPrintQueue.value.some(item => item.orderItemId === orderItemId)
  }

  // Get queue status
  const getQueueStatus = () => {
    return computed(() => {
      const count = dbPrintQueue.value?.length || 0
      return {
        count,
        isEmpty: count === 0,
        isFull: count >= 4 // Assuming batch size of 4
      }
    })
  }

  // Add item to database print queue
  const addToQueue = async (orderItemId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await $fetch<{ success: boolean; message: string }>('/api/admin/print-queue/add-item', {
        method: 'POST',
        body: { orderItemId }
      })

      if (response.success) {
        // Refetch the queue to update the UI
        await refetchPrintQueue()
      }

      return {
        success: response.success,
        message: response.message
      }
    } catch (error) {
      console.error('Error adding item to print queue:', error)
      return {
        success: false,
        message: 'Failed to add item to print queue'
      }
    }
  }

  // Remove item from database print queue (mark as printed)
  const removeFromQueue = async (printQueueId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await $fetch<{ success: boolean; data?: any }>(`/api/admin/print-queue/${printQueueId}`, {
        method: 'PATCH',
        body: { isPrinted: true }
      })

      if (response.success) {
        // Refetch the queue to update the UI
        await refetchPrintQueue()
      }

      return {
        success: response.success,
        message: 'Item removed from print queue'
      }
    } catch (error) {
      console.error('Error removing item from print queue:', error)
      return {
        success: false,
        message: 'Failed to remove item from print queue'
      }
    }
  }

  return {
    // Data
    dbPrintQueue,
    
    // Functions
    isItemQueued,
    getQueueStatus,
    addToQueue,
    removeFromQueue,
    refetchPrintQueue
  }
}