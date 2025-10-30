import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { orderApprovalService } from '~/server/lib/OrderApprovalService'
import { recordAuditLog } from '~/server/utils/auditLog'

const UpdateOrderSchema = z.object({
  customerId: z.string().cuid2('Invalid customer ID format').optional(),
  salesOrderNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  poNumber: z.string().optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  contactPhoneNumber: z.string().optional(),
  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  shippingAddressLine1: z.string().optional(),
  shippingAddressLine2: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZipCode: z.string().optional(),
  shippingCountry: z.string().optional(),
  orderStatus: z.enum(['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional(),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH']).optional(),
  transactionDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  shipDate: z.string().datetime().optional(),
  trackingNumber: z.string().optional(),
  totalAmount: z.number().optional(),
  balance: z.number().optional(),
  totalTax: z.number().optional(),
  emailStatus: z.string().optional(),
  customerMemo: z.string().optional(),
  notes: z.string().optional(),
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

    // PO validation if poNumber is being updated
    let validationWarnings: string[] = []
    if (updateData.poNumber !== undefined && updateData.poNumber.trim() !== '') {
      const poValidation = await orderApprovalService.validateOrderPO(
        updateData.poNumber,
        updateData.customerId || existingOrder.customerId,
        orderId, // Exclude current order from validation
        event
      )

      if (poValidation.isDuplicate) {
        validationWarnings.push(poValidation.warningMessage || 'Duplicate PO number found')
        
        console.log(`PO duplicate warning for order update: ${updateData.poNumber}`, {
          orderId,
          customerId: updateData.customerId || existingOrder.customerId,
          existingOrders: poValidation.existingOrders?.length || 0
        })
      }
    }

    // Check if this update will trigger approval workflow
    const willTriggerApproval = updateData.orderStatus && 
      existingOrder.orderStatus !== 'APPROVED' &&
      updateData.orderStatus === 'APPROVED'

    // Prepare update data with proper date conversions
    const orderUpdateData = {
      ...updateData,
      transactionDate: updateData.transactionDate ? new Date(updateData.transactionDate) : undefined,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined,
      shipDate: updateData.shipDate ? new Date(updateData.shipDate) : undefined,
      approvedAt: willTriggerApproval ? new Date() : undefined,
    }

    // Remove undefined values to avoid overwriting with undefined
    Object.keys(orderUpdateData).forEach(key => {
      if (orderUpdateData[key as keyof typeof orderUpdateData] === undefined) {
        delete orderUpdateData[key as keyof typeof orderUpdateData]
      }
    })

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
          },
        },
      },
    })

    // Handle approval workflow if order status changed to approved
    let approvalResult = null
    if (willTriggerApproval) {
      approvalResult = await orderApprovalService.handleOrderApproval(
        updatedOrder.id,
        userId,
        event
      )

      if (!approvalResult.success) {
        console.error(`Order approval workflow failed for order ${updatedOrder.id}:`, approvalResult.error)
        // Don't fail the order update, just log the issue
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
      approvalResult: approvalResult ? {
        printQueueItemsAdded: approvalResult.printQueueItemsAdded || 0,
        approvalSuccess: approvalResult.success
      } : undefined
    }

    console.log(`Order updated successfully: ${updatedOrder.id}`, {
      customerId: updatedOrder.customerId,
      orderStatus: updatedOrder.orderStatus,
      poNumber: (updatedOrder as any).poNumber,
      hasWarnings: validationWarnings.length > 0,
      approvalTriggered: willTriggerApproval,
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