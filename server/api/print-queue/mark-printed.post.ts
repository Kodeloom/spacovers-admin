import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { printQueueService } from '~/server/lib/PrintQueueService'

const MarkPrintedSchema = z.object({
  queueItemIds: z.array(z.string().cuid2('Invalid queue item ID format')).min(1, 'At least one queue item ID is required'),
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

  // Authorization check - office employees, admins, and super admins can mark items as printed
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to mark items as printed'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = MarkPrintedSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { queueItemIds } = result.data

  try {
    // Mark items as printed and remove from queue with enhanced error handling
    await printQueueService.markBatchPrinted(queueItemIds, sessionData.user.id)

    return {
      success: true,
      message: 'Items marked as printed and removed from queue',
      meta: {
        requestedCount: queueItemIds.length,
        printedBy: sessionData.user.id,
        printedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error marking items as printed:', {
      error: error.message,
      userId: sessionData.user.id,
      queueItemCount: queueItemIds.length
    })
    
    // Determine appropriate error response based on error type
    let statusCode = 500
    let statusMessage = 'Failed to mark items as printed'
    
    if (error.message.includes('Invalid')) {
      statusCode = 400
      statusMessage = 'Invalid request data'
    } else if (error.message.includes('not in the print queue') || error.message.includes('not found')) {
      statusCode = 404
      statusMessage = 'Items not found in print queue'
    } else if (error.message.includes('timeout')) {
      statusCode = 504
      statusMessage = 'Request timed out - please try again'
    } else if (error.message.includes('already printed')) {
      statusCode = 409
      statusMessage = 'Items have already been marked as printed'
    }
    
    throw createError({
      statusCode,
      statusMessage,
      data: {
        retryable: statusCode >= 500,
        suggestions: statusCode === 400 
          ? ['Check that all queue item IDs are valid', 'Ensure the request format is correct']
          : statusCode === 404
          ? ['Refresh the print queue and try again', 'Items may have already been processed']
          : statusCode === 409
          ? ['Refresh the print queue to see current status', 'Items have already been marked as printed']
          : ['Try again in a few moments', 'Contact support if the problem persists']
      }
    })
  }
})