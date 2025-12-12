import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'
import { z } from 'zod'

const CreateOrderWithItemsSchema = z.object({
  data: z.object({
    customerId: z.string().cuid2('Invalid customer ID format'),
    contactEmail: z.string().email('Invalid email format'),
    contactPhoneNumber: z.string().optional().nullable(),
    salesOrderNumber: z.string().optional().nullable(),
    purchaseOrderNumber: z.string().optional().nullable(),
    transactionDate: z.string().datetime().optional().nullable(),
    priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    totalAmount: z.number().min(0, 'Total amount must be non-negative'),
    orderStatus: z.enum(['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).default('PENDING'),
    shippingAddressLine1: z.string().optional().nullable(),
    shippingAddressLine2: z.string().optional().nullable(),
    shippingCity: z.string().optional().nullable(),
    shippingState: z.string().optional().nullable(),
    shippingZipCode: z.string().optional().nullable(),
    billingAddressLine1: z.string().optional().nullable(),
    billingAddressLine2: z.string().optional().nullable(),
    billingCity: z.string().optional().nullable(),
    billingState: z.string().optional().nullable(),
    billingZipCode: z.string().optional().nullable(),
    items: z.object({
      create: z.array(z.object({
        itemId: z.string().cuid2('Invalid item ID format'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        pricePerItem: z.number().min(0, 'Price must be non-negative'),
        productId: z.string().optional().nullable(),
        isProduct: z.boolean().default(true),
        itemStatus: z.enum(['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY']).default('NOT_STARTED_PRODUCTION'),
        productAttributes: z.object({
          create: z.object({
            productType: z.enum(['SPA_COVER', 'COVER_FOR_COVER']).optional(),
            color: z.string().optional(),
            size: z.string().optional(),
            shape: z.string().optional(),
            radiusSize: z.string().optional(),
            length: z.string().optional(),
            width: z.string().optional(),
            skirtLength: z.string().optional(),
            skirtType: z.enum(['CONN', 'SLIT', 'NONE']).optional(),
            tieDownsQty: z.string().optional(),
            tieDownPlacement: z.enum(['HANDLE_SIDE', 'CORNER_SIDE', 'FOLD_SIDE', 'NONE']).optional(),
            distance: z.string().optional(),
            tieDownLength: z.string().optional(),
            poNumber: z.string().optional(),
            notes: z.string().optional(),
            foamUpgrade: z.string().optional(),
            doublePlasticWrapUpgrade: z.string().optional(),
            webbingUpgrade: z.string().optional(),
            metalForLifterUpgrade: z.string().optional(),
            steamStopperUpgrade: z.string().optional(),
            fabricUpgrade: z.string().optional(),
            extraHandleQty: z.string().optional(),
            extraLongSkirt: z.string().optional(),
            packaging: z.boolean().optional(),
            verified: z.boolean().default(false)
          })
        }).optional()
      }))
    })
  })
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
  const result = CreateOrderWithItemsSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request data',
      data: result.error.issues
    })
  }

  const { data } = result.data

  try {
    // Import product number utility
    const { getNextProductNumbers } = await import('~/server/utils/productNumber')

    // Create the order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order first
      const createdOrder = await tx.order.create({
        data: {
          customerId: data.customerId,
          contactEmail: data.contactEmail,
          contactPhoneNumber: data.contactPhoneNumber,
          salesOrderNumber: data.salesOrderNumber,
          purchaseOrderNumber: data.purchaseOrderNumber,
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : null,
          priority: data.priority,
          totalAmount: data.totalAmount,
          orderStatus: data.orderStatus,
          shippingAddressLine1: data.shippingAddressLine1,
          shippingAddressLine2: data.shippingAddressLine2,
          shippingCity: data.shippingCity,
          shippingState: data.shippingState,
          shippingZipCode: data.shippingZipCode,
          billingAddressLine1: data.billingAddressLine1,
          billingAddressLine2: data.billingAddressLine2,
          billingCity: data.billingCity,
          billingState: data.billingState,
          billingZipCode: data.billingZipCode,
        }
      })

      // Get all product numbers needed for this batch at once
      const productNumbers = await getNextProductNumbers(data.items.create.length, tx)

      // Create order items with pre-allocated product numbers
      const createdItems = []
      for (let i = 0; i < data.items.create.length; i++) {
        const itemData = data.items.create[i]
        const productNumber = productNumbers[i]

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            itemId: itemData.itemId,
            quantity: itemData.quantity,
            pricePerItem: itemData.pricePerItem,
            productId: itemData.productId,
            isProduct: itemData.isProduct,
            itemStatus: itemData.itemStatus,
            productNumber, // Assign pre-allocated product number
            // Create product attributes if provided
            ...(itemData.productAttributes ? {
              productAttributes: {
                create: itemData.productAttributes.create
              }
            } : {})
          },
          include: {
            item: true,
            productAttributes: true
          }
        })

        createdItems.push(orderItem)
      }

      // Return the complete order with items
      return await tx.order.findUnique({
        where: { id: createdOrder.id },
        include: {
          customer: true,
          items: {
            include: {
              item: true,
              productAttributes: true
            }
          }
        }
      })
    })

    // Record audit log for order creation
    await recordAuditLog(event, {
      action: 'ORDER_CREATED',
      entityName: 'Order',
      entityId: order!.id,
      oldValue: null,
      newValue: {
        orderId: order!.id,
        salesOrderNumber: order!.salesOrderNumber,
        customerId: order!.customerId,
        totalAmount: order!.totalAmount,
        itemCount: order!.items.length
      },
    }, sessionData.user.id)

    return {
      success: true,
      data: order
    }
  } catch (error) {
    console.error('Error creating order with items:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create order'
    })
  }
})