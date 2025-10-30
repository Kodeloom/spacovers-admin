import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - only office employees, admins, and super admins
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to add items to print queue'
    })
  }

  const body = await readBody(event)
  const { orderItemId } = body

  if (!orderItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order item ID is required'
    })
  }

  try {
    const prisma = await getEnhancedPrismaClient(event)
    const userId = sessionData.user.id

    // Check if order item exists and is a production item
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        productAttributes: true,
        order: {
          select: {
            id: true,
            orderStatus: true
          }
        }
      }
    })

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      })
    }

    // Check if it's a production item (has productAttributes or isProduct flag)
    if (!orderItem.productAttributes && !orderItem.isProduct) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only production items can be added to print queue'
      })
    }

    // Check if item already exists in print queue
    const existingPrintQueueItem = await prisma.printQueue.findFirst({
      where: {
        orderItemId: orderItemId
      }
    })

    if (existingPrintQueueItem) {
      // If item exists but is printed, reset it to not printed
      if (existingPrintQueueItem.isPrinted) {
        const updatedItem = await prisma.printQueue.update({
          where: { id: existingPrintQueueItem.id },
          data: {
            isPrinted: false,
            printedAt: null,
            printedBy: null,
            addedAt: new Date(),
            addedBy: userId
          }
        })
        
        return {
          success: true,
          message: 'Item re-added to print queue',
          data: updatedItem
        }
      } else {
        return {
          success: false,
          message: 'Item is already in print queue'
        }
      }
    } else {
      // Create new print queue entry
      const newItem = await prisma.printQueue.create({
        data: {
          orderItemId: orderItemId,
          addedBy: userId,
          isPrinted: false
        }
      })

      return {
        success: true,
        message: 'Item added to print queue',
        data: newItem
      }
    }

  } catch (error) {
    console.error('Error adding item to print queue:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add item to print queue'
    })
  }
})