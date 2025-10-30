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

  const orderItemId = getRouterParam(event, 'id')
  if (!orderItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order item ID is required'
    })
  }

  try {
    // Get the order item with order info
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
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

    // Check if the order is in PENDING status
    if (orderItem.order.orderStatus !== 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot remove products from orders that are not in pending status'
      })
    }

    // Delete related product attributes if they exist
    if (orderItem.productAttributes) {
      await prisma.productAttribute.delete({
        where: { orderItemId }
      })
    }

    // Record audit log before deletion (log to Order entity so it shows in order activity)
    await recordAuditLog(event, {
      action: 'ORDER_ITEM_REMOVED',
      entityName: 'Order',
      entityId: orderItem.orderId,
      oldValue: {
        orderItemId: orderItem.id,
        itemId: orderItem.itemId,
        itemName: orderItem.item?.name,
        quantity: orderItem.quantity,
        pricePerItem: orderItem.pricePerItem,
        isProduct: orderItem.isProduct
      },
      newValue: null,
    }, sessionData.user.id)

    // Delete the order item
    await prisma.orderItem.delete({
      where: { id: orderItemId }
    })

    return {
      success: true,
      message: 'Order item deleted successfully'
    }
  } catch (error) {
    console.error('Error deleting order item:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete order item'
    })
  }
})