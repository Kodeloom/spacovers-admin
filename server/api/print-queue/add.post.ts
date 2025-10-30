import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { printQueueService } from '~/server/lib/PrintQueueService'

const AddToPrintQueueSchema = z.object({
  orderItemIds: z.array(z.string().cuid2('Invalid order item ID format')).min(1, 'At least one order item ID is required'),
})

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - office employees, admins, and super admins can add to print queue
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to add items to print queue'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = AddToPrintQueueSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { orderItemIds } = result.data

  try {
    // Add items to print queue with enhanced error handling
    const addedItems = await printQueueService.addToQueue(orderItemIds, sessionData.user.id)

    return {
      success: true,
      data: addedItems,
      meta: {
        addedCount: addedItems.length,
        requestedCount: orderItemIds.length,
        addedBy: sessionData.user.id,
        addedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error adding items to print queue:', {
      error: error.message,
      userId: sessionData.user.id,
      orderItemCount: orderItemIds.length
    })
    
    // Determine appropriate error response based on error type
    let statusCode = 500
    let statusMessage = 'Failed to add items to print queue'
    
    if (error.message.includes('Invalid')) {
      statusCode = 400
      statusMessage = 'Invalid request data'
    } else if (error.message.includes('not found') || error.message.includes('not in')) {
      statusCode = 404
      statusMessage = 'One or more order items not found'
    } else if (error.message.includes('timeout')) {
      statusCode = 504
      statusMessage = 'Request timed out - please try again'
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      statusCode = 403
      statusMessage = 'Insufficient permissions'
    }
    
    throw createError({
      statusCode,
      statusMessage,
      data: {
        retryable: statusCode >= 500 || statusCode === 404,
        suggestions: statusCode === 400 
          ? ['Check that all order item IDs are valid', 'Ensure the request format is correct']
          : statusCode === 404
          ? ['Refresh the page and try again', 'Verify the order items still exist']
          : ['Try again in a few moments', 'Contact support if the problem persists']
      }
    })
  }
})