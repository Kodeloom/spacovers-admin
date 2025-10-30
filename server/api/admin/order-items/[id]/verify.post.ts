import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - only office employees, admins, and super admins can verify order items
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to verify order items'
    })
  }

  const orderItemId = getRouterParam(event, 'id')
  if (!orderItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order item ID is required'
    })
  }

  try {
    // Get the order item with all related data
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
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

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      })
    }

    // Check if this is a production item
    if (!orderItem.isProduct) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot verify non-production items'
      })
    }

    // Validation logic for required attributes
    const validationErrors: string[] = []
    const attributes = orderItem.productAttributes

    if (!attributes) {
      validationErrors.push('Product attributes are missing')
    } else {
      // Required fields validation
      if (!attributes.productType) {
        validationErrors.push('Product type is required')
      }
      
      if (!attributes.color) {
        validationErrors.push('Color is required')
      }
      
      if (!attributes.shape) {
        validationErrors.push('Shape is required')
      }
      
      // Shape-specific validations
      if (attributes.shape === 'Rectangle') {
        if (!attributes.length) {
          validationErrors.push('Length is required for Rectangle shape')
        }
        if (!attributes.width) {
          validationErrors.push('Width is required for Rectangle shape')
        }
      }
      
      if (!attributes.size && attributes.shape !== 'Rectangle') {
        validationErrors.push('Size is required')
      }
      
      if (!attributes.skirtLength) {
        validationErrors.push('Skirt length is required')
      }
      
      if (!attributes.skirtType) {
        validationErrors.push('Skirt type is required')
      }
      
      if (!attributes.tieDownsQty) {
        validationErrors.push('Tie downs quantity is required')
      }
      
      if (!attributes.tieDownPlacement) {
        validationErrors.push('Tie down placement is required')
      }
      
      if (!attributes.distance) {
        validationErrors.push('Distance is required')
      }
    }

    // If there are validation errors, return them
    if (validationErrors.length > 0) {
      return {
        success: false,
        verified: false,
        errors: validationErrors,
        message: 'Order item verification failed - missing required attributes'
      }
    }

    // Update the product attributes to mark as verified
    const updatedAttributes = await prisma.productAttribute.update({
      where: { orderItemId: orderItemId },
      data: {
        verified: true
      }
    })

    // Get the updated order item
    const updatedOrderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
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
      action: 'ORDER_ITEM_VERIFY',
      entityName: 'OrderItem',
      entityId: orderItemId,
      oldValue: orderItem,
      newValue: updatedOrderItem
    }, sessionData.user.id)

    return {
      success: true,
      verified: true,
      data: updatedOrderItem,
      message: 'Order item verified successfully - all required attributes are present'
    }

  } catch (error) {
    console.error('Error verifying order item:', error)
    
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to verify order item'
    })
  }
})