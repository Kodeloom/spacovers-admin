import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { orderApprovalService } from '~/server/lib/OrderApprovalService'
import { recordAuditLog } from '~/server/utils/auditLog'

const CreateOrderSchema = z.object({
  customerId: z.string().cuid2('Invalid customer ID format'),
  salesOrderNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  poNumber: z.string().optional(),
  contactEmail: z.string().email('Invalid email format'),
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
  orderStatus: z.enum(['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).default('PENDING'),
  priority: z.enum(['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
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

  // Authorization check - only office employees, admins, and super admins can create orders
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to create orders'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = CreateOrderSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const orderData = result.data
  const userId = sessionData.user.id

  try {
    const prisma = await getEnhancedPrismaClient(event)

    // PO validation if poNumber is provided
    let validationWarnings: string[] = []
    if (orderData.poNumber && orderData.poNumber.trim() !== '') {
      const poValidation = await orderApprovalService.validateOrderPO(
        orderData.poNumber,
        orderData.customerId,
        undefined, // No excludeOrderId for new orders
        event
      )

      if (poValidation.isDuplicate) {
        validationWarnings.push(poValidation.warningMessage || 'Duplicate PO number found')
        
        // Note: We don't block creation, just warn
        console.log(`PO duplicate warning for new order: ${orderData.poNumber}`, {
          customerId: orderData.customerId,
          existingOrders: poValidation.existingOrders?.length || 0
        })
      }
    }

    // Prepare order data with proper date conversions
    const orderCreateData = {
      ...orderData,
      transactionDate: orderData.transactionDate ? new Date(orderData.transactionDate) : undefined,
      dueDate: orderData.dueDate ? new Date(orderData.dueDate) : undefined,
      shipDate: orderData.shipDate ? new Date(orderData.shipDate) : undefined,
      approvedAt: orderData.orderStatus === 'APPROVED' ? new Date() : undefined,
    }

    // Create the order
    const newOrder = await prisma.order.create({
      data: orderCreateData,
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

    // Handle approval workflow if order is created as approved
    let approvalResult = null
    if (orderData.orderStatus === 'APPROVED') {
      approvalResult = await orderApprovalService.handleOrderApproval(
        newOrder.id,
        userId,
        event
      )

      if (!approvalResult.success) {
        console.error(`Order approval workflow failed for new order ${newOrder.id}:`, approvalResult.error)
        // Don't fail the order creation, just log the issue
      }
    }

    // Record audit log
    await recordAuditLog(event, {
      action: 'ORDER_CREATE',
      entityName: 'Order',
      entityId: newOrder.id,
      oldValue: null,
      newValue: newOrder,
    }, userId)

    // Prepare response
    const response = {
      success: true,
      data: newOrder,
      warnings: validationWarnings.length > 0 ? validationWarnings : undefined,
      approvalResult: approvalResult ? {
        printQueueItemsAdded: approvalResult.printQueueItemsAdded || 0,
        approvalSuccess: approvalResult.success
      } : undefined
    }

    console.log(`Order created successfully: ${newOrder.id}`, {
      customerId: orderData.customerId,
      orderStatus: orderData.orderStatus,
      poNumber: orderData.poNumber,
      hasWarnings: validationWarnings.length > 0,
      approvalTriggered: orderData.orderStatus === 'APPROVED'
    })

    return response

  } catch (error) {
    console.error('Error creating order:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create order'
    })
  }
})