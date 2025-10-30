import { orderApprovalService } from '~/server/lib/OrderApprovalService'
import { auth } from '~/server/lib/auth'

/**
 * Middleware to handle order approval workflow
 * This middleware intercepts order updates and triggers the approval workflow
 * when an order status changes to APPROVED
 */
export default defineEventHandler(async (event) => {
  // Only process PUT requests to the Order model API
  if (event.method !== 'PUT' || !event.path.includes('/api/model/Order/')) {
    return
  }

  try {
    // Get session data for user context
    const sessionData = await auth.api.getSession({ headers: event.headers })
    const userId = sessionData?.user?.id

    // Extract order ID from the path
    const pathParts = event.path.split('/')
    const orderIdIndex = pathParts.findIndex(part => part === 'Order') + 1
    const orderId = pathParts[orderIdIndex]

    if (!orderId) {
      return // No order ID found, let the request continue
    }

    // Read the request body to check for status changes
    const body = await readBody(event)
    const updateData = body?.data || body

    // Check if this is a status update to APPROVED
    if (updateData?.orderStatus === 'APPROVED') {
      console.log(`Order approval middleware triggered for order ${orderId}`)

      // We'll handle the approval workflow after the order is updated
      // Store the approval trigger in the event context
      event.context.triggerOrderApproval = {
        orderId,
        userId
      }
    }

  } catch (error) {
    console.error('Error in order approval middleware:', error)
    // Don't block the request on middleware errors
  }
})

/**
 * Post-processing middleware to handle approval workflow after order update
 * This runs after the order has been successfully updated
 */
export const handlePostOrderUpdate = defineEventHandler(async (event) => {
  // Only process responses from Order model API updates
  if (event.method !== 'PUT' || !event.path.includes('/api/model/Order/')) {
    return
  }

  // Check if we need to trigger approval workflow
  const approvalTrigger = event.context.triggerOrderApproval
  if (!approvalTrigger) {
    return
  }

  try {
    console.log(`Executing post-update approval workflow for order ${approvalTrigger.orderId}`)

    // Trigger the approval workflow
    const approvalResult = await orderApprovalService.handleOrderApproval(
      approvalTrigger.orderId,
      approvalTrigger.userId,
      event
    )

    if (approvalResult.success) {
      console.log(`Order approval workflow completed successfully for order ${approvalTrigger.orderId}`, {
        printQueueItemsAdded: approvalResult.printQueueItemsAdded
      })
    } else {
      console.error(`Order approval workflow failed for order ${approvalTrigger.orderId}:`, approvalResult.error)
    }

    // Add approval result to response context for potential use by client
    event.context.approvalResult = approvalResult

  } catch (error) {
    console.error(`Error in post-order-update approval workflow for order ${approvalTrigger.orderId}:`, error)
    // Don't fail the response on approval workflow errors
  }
})