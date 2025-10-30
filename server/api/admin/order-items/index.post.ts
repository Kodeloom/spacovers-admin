import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'
import { z } from 'zod'

const CreateOrderItemSchema = z.object({
  orderId: z.string().cuid2('Invalid order ID format'),
  itemId: z.string().cuid2('Invalid item ID format'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  pricePerItem: z.number().min(0, 'Price must be non-negative'),
  lineDescription: z.string().optional().nullable(),
  isProduct: z.boolean().default(false)
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

  const body = await readBody(event)
  const result = CreateOrderItemSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request data',
      data: result.error.issues
    })
  }

  const { orderId, itemId, quantity, pricePerItem, lineDescription, isProduct } = result.data

  try {
    // Verify the order exists and is in PENDING status
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    if (order.orderStatus !== 'PENDING') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot add products to orders that are not in pending status'
      })
    }

    // Verify the item exists
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found'
      })
    }

    // Create the order item
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        itemId,
        quantity,
        pricePerItem,
        lineDescription,
        isProduct,
        itemStatus: 'NOT_STARTED_PRODUCTION'
      },
      include: {
        item: true,
        order: true
      }
    })

    // If this is a production item, create empty product attributes
    if (isProduct) {
      await prisma.productAttribute.create({
        data: {
          orderItemId: orderItem.id,
          verified: false
        }
      })
    }

    // Record audit log for order item creation (log to Order entity so it shows in order activity)
    await recordAuditLog(event, {
      action: 'ORDER_ITEM_ADDED',
      entityName: 'Order',
      entityId: orderItem.orderId,
      oldValue: null,
      newValue: {
        orderItemId: orderItem.id,
        itemId: orderItem.itemId,
        itemName: item.name,
        quantity: orderItem.quantity,
        pricePerItem: orderItem.pricePerItem,
        isProduct: orderItem.isProduct
      },
    }, sessionData.user.id)

    return {
      success: true,
      data: orderItem
    }
  } catch (error) {
    console.error('Error creating order item:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create order item'
    })
  }
})