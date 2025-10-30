import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

const UpdateOrderItemSchema = z.object({
  itemStatus: z.enum([
    'NOT_STARTED_PRODUCTION',
    'CUTTING', 
    'SEWING',
    'FOAM_CUTTING',
    'STUFFING',
    'PACKAGING',
    'PRODUCT_FINISHED',
    'READY'
  ]).optional(),
  isProduct: z.boolean().optional(),
  quantity: z.number().positive().optional(),
  notes: z.string().optional()
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

  // Authorization check - only office employees, admins, and super admins can update order items
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to update order items'
    })
  }

  const orderItemId = getRouterParam(event, 'id')
  if (!orderItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order item ID is required'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = UpdateOrderItemSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData = result.data

  try {
    // Check if order item exists
    const existingOrderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            customer: true
          }
        },
        item: true
      }
    })

    if (!existingOrderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      })
    }

    // Update the order item
    const updatedOrderItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: updateData,
      include: {
        order: {
          include: {
            customer: true
          }
        },
        item: true,
        productAttributes: true
      }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'ORDER_ITEM_UPDATE',
      entityName: 'OrderItem',
      entityId: orderItemId,
      oldValue: existingOrderItem,
      newValue: updatedOrderItem
    }, sessionData.user.id)

    return {
      success: true,
      data: updatedOrderItem,
      message: 'Order item updated successfully'
    }

  } catch (error) {
    console.error('Error updating order item:', error)
    
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update order item'
    })
  }
})