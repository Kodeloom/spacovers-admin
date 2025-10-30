import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { validatePONumber } from '~/server/utils/poValidationService'
import { recordAuditLog } from '~/server/utils/auditLog'

const UpdateOrderSchema = z.object({
  customerId: z.string().cuid2('Invalid customer ID format').optional(),
  salesOrderNumber: z.string().nullish(),
  purchaseOrderNumber: z.string().nullish(),
  contactEmail: z.string().email('Invalid email format').nullish(),
  contactPhoneNumber: z.string().nullish(),
  billingAddressLine1: z.string().nullish(),
  billingAddressLine2: z.string().nullish(),
  billingCity: z.string().nullish(),
  billingState: z.string().nullish(),
  billingZipCode: z.string().nullish(),
  billingCountry: z.string().nullish(),
  shippingAddressLine1: z.string().nullish(),
  shippingAddressLine2: z.string().nullish(),
  shippingCity: z.string().nullish(),
  shippingState: z.string().nullish(),
  shippingZipCode: z.string().nullish(),
  shippingCountry: z.string().nullish(),
  orderStatus: z.enum(['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  transactionDate: z.string().datetime().nullish(),
  dueDate: z.string().datetime().nullish(),
  shipDate: z.string().datetime().nullish(),
  trackingNumber: z.string().nullish(),
  totalAmount: z.number().optional(),
  balance: z.number().optional(),
  totalTax: z.number().optional(),
  emailStatus: z.string().nullish(),
  customerMemo: z.string().nullish(),
  notes: z.string().nullish(),
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

  // Authorization check - only office employees, admins, and super admins can update orders
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to update orders'
    })
  }

  // Extract and validate order ID
  const orderId = getRouterParam(event, 'id')
  if (!orderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order ID is required'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = UpdateOrderSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const updateData = result.data
  const userId = sessionData.user.id

  try {
    const prisma = await getEnhancedPrismaClient(event)

    // Get the existing order to check for status changes
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            id: true,
            itemStatus: true,
          },
        },
      },
    })

    if (!existingOrder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order not found'
      })
    }

    // PO validation if purchaseOrderNumber is being updated
    let validationWarnings: string[] = []
    if (updateData.purchaseOrderNumber !== undefined && updateData.purchaseOrderNumber.trim() !== '') {
      const poValidation = await validatePONumber(
        updateData.customerId || existingOrder.customerId,
        updateData.purchaseOrderNumber,
        orderId // Exclude current order from validation
      )

      if (poValidation.isDuplicate) {
        validationWarnings.push(poValidation.message || 'Duplicate PO number found')

        console.log(`PO duplicate warning for order update: ${updateData.purchaseOrderNumber}`, {
          orderId,
          customerId: updateData.customerId || existingOrder.customerId,
          existingOrders: poValidation.existingUsage?.orders?.length || 0
        })
      }
    }

    // Prepare update data with proper date conversions
    const orderUpdateData = {
      ...updateData,
      transactionDate: updateData.transactionDate ? new Date(updateData.transactionDate) : undefined,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      shipDate: updateData.shipDate ? new Date(updateData.shipDate) : undefined,
    }

    // Remove undefined values to avoid overwriting with undefined
    Object.keys(orderUpdateData).forEach(key => {
      if (orderUpdateData[key as keyof typeof orderUpdateData] === undefined) {
        delete orderUpdateData[key as keyof typeof orderUpdateData]
      }
    })

    // Check if order status is changing to APPROVED
    const isBeingApproved = existingOrder.orderStatus !== 'APPROVED' && updateData.orderStatus === 'APPROVED'
    let approvalResult = null

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: orderUpdateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
            product: {
              select: {
                id: true,
                displayName: true,
              },
            },
            productAttributes: {
              select: {
                id: true,
                verified: true,
              },
            },
          },
        },
      },
    })

    // If order is being approved, automatically add verified production items to print queue
    if (isBeingApproved) {
      console.log(`Order ${orderId} is being approved - checking for verified production items`)
      try {
        const verifiedProductionItems = updatedOrder.items.filter(item =>
          item.productAttributes && item.productAttributes.verified
        )

        console.log(`Found ${verifiedProductionItems.length} verified production items:`,
          verifiedProductionItems.map(item => ({
            id: item.id,
            name: item.item?.name,
            hasAttributes: !!item.productAttributes,
            isVerified: item.productAttributes?.verified
          }))
        )

        let printQueueItemsAdded = 0

        for (const item of verifiedProductionItems) {
          try {
            // Check if item already exists in print queue (printed or not)
            const existingPrintQueueItem = await prisma.printQueue.findFirst({
              where: {
                orderItemId: item.id
              }
            })

            if (existingPrintQueueItem) {
              // If item exists but is printed, reset it to not printed
              if (existingPrintQueueItem.isPrinted) {
                await prisma.printQueue.update({
                  where: { id: existingPrintQueueItem.id },
                  data: {
                    isPrinted: false,
                    printedAt: null,
                    printedBy: null,
                    addedAt: new Date(), // Update the added time
                    addedBy: userId
                  }
                })
                printQueueItemsAdded++
                console.log(`Re-added item ${item.id} to print queue for order ${updatedOrder.id}`)
              } else {
                console.log(`Item ${item.id} already in print queue`)
              }
            } else {
              // Create new print queue entry
              await prisma.printQueue.create({
                data: {
                  orderItemId: item.id,
                  addedBy: userId,
                  isPrinted: false
                }
              })
              printQueueItemsAdded++
              console.log(`Added item ${item.id} to print queue for order ${updatedOrder.id}`)
            }
          } catch (itemError) {
            console.error(`Failed to add item ${item.id} to print queue:`, itemError)
          }
        }

        approvalResult = {
          approvalSuccess: true,
          printQueueItemsAdded,
          totalVerifiedItems: verifiedProductionItems.length
        }

        console.log(`Order approved - added ${printQueueItemsAdded} items to print queue`, {
          orderId: updatedOrder.id,
          totalVerifiedItems: verifiedProductionItems.length,
          printQueueItemsAdded
        })

      } catch (error) {
        console.error('Error adding items to print queue on approval:', error)
        approvalResult = {
          approvalSuccess: false,
          printQueueItemsAdded: 0,
          error: 'Failed to add items to print queue'
        }
      }
    }

    // Record audit log
    await recordAuditLog(event, {
      action: 'ORDER_UPDATE',
      entityName: 'Order',
      entityId: updatedOrder.id,
      oldValue: existingOrder,
      newValue: updatedOrder,
    }, userId)

    // Prepare response
    const response = {
      success: true,
      data: updatedOrder,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      approvalResult: approvalResult
    }

    console.log(`Order updated successfully: ${updatedOrder.id}`, {
      customerId: updatedOrder.customerId,
      orderStatus: updatedOrder.orderStatus,
      purchaseOrderNumber: updatedOrder.purchaseOrderNumber,
      hasWarnings: validationWarnings.length > 0,
      statusChanged: existingOrder.orderStatus !== updatedOrder.orderStatus
    })

    return response

  } catch (error) {
    console.error(`Error updating order ${orderId}:`, error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update order'
    })
  }
})