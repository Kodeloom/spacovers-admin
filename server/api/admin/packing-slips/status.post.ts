import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'

const PackingSlipStatusSchema = z.object({
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

  // Authorization check - admins and super admins can check packing slip status
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to check packing slip status'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = PackingSlipStatusSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { orderItemIds } = result.data

  try {
    // Query print queue to check if packing slips have been printed for these order items
    const packingSlipStatuses = await prisma.printQueue.findMany({
      where: {
        orderItemId: {
          in: orderItemIds
        }
      },
      select: {
        orderItemId: true,
        isPrinted: true,
        printedAt: true,
        printedBy: true,
        addedAt: true
      }
    })

    // Create a map for quick lookup and include items not in print queue
    const statusMap = new Map(
      packingSlipStatuses.map(status => [
        status.orderItemId,
        {
          orderItemId: status.orderItemId,
          printed: status.isPrinted,
          printedAt: status.printedAt,
          printedBy: status.printedBy,
          addedToQueueAt: status.addedAt
        }
      ])
    )

    // Include all requested items, even those not in print queue
    const data = orderItemIds.map(itemId => 
      statusMap.get(itemId) || {
        orderItemId: itemId,
        printed: false,
        printedAt: null,
        printedBy: null,
        addedToQueueAt: null
      }
    )

    return {
      success: true,
      data,
      meta: {
        requestedItems: orderItemIds.length,
        foundInQueue: packingSlipStatuses.length,
        printedItems: packingSlipStatuses.filter(s => s.isPrinted).length,
        retrievedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error retrieving packing slip status:', {
      error: error.message,
      userId: sessionData.user.id,
      orderItemCount: orderItemIds.length
    })
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve packing slip status'
    })
  }
})