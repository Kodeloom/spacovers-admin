import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { printQueueService } from '~/server/lib/PrintQueueService'

const RemoveFromQueueSchema = z.object({
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

  // Authorization check - office employees, admins, and super admins can remove items from queue
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to remove items from print queue'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = RemoveFromQueueSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { queueItemIds } = result.data

  try {
    // Remove items from print queue
    await printQueueService.removeFromQueue(queueItemIds)

    return {
      success: true,
      message: 'Items removed from print queue',
      meta: {
        removedCount: queueItemIds.length,
        removedBy: sessionData.user.id,
        removedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error removing items from print queue:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove items from print queue'
    })
  }
})