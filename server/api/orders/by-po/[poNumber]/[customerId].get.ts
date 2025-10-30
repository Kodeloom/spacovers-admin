import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'

const GetOrdersByPOSchema = z.object({
  poNumber: z.string().min(1, 'PO number is required'),
  customerId: z.string().cuid2('Invalid customer ID format'),
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

  // Authorization check - only office employees, admins, and super admins can retrieve orders by PO
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to retrieve orders by PO number'
    })
  }

  // Extract and validate route parameters
  const poNumber = getRouterParam(event, 'poNumber')
  const customerId = getRouterParam(event, 'customerId')

  const result = GetOrdersByPOSchema.safeParse({ poNumber, customerId })

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid parameters',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { poNumber: validatedPONumber, customerId: validatedCustomerId } = result.data

  try {
    const prisma = await getEnhancedPrismaClient(event)

    // Find orders with the specified PO number for the given customer
    const orders = await prisma.order.findMany({
      where: {
        poNumber: validatedPONumber,
        customerId: validatedCustomerId,
      },
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
                fullDescription: true,
              },
            },
            productAttributes: {
              select: {
                id: true,
                poNumber: true,
                color: true,
                size: true,
                shape: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Also find items with ProductAttributes containing the same PO number
    const itemsWithPO = await prisma.orderItem.findMany({
      where: {
        order: {
          customerId: validatedCustomerId,
        },
        productAttributes: {
          poNumber: validatedPONumber,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
            fullDescription: true,
          },
        },
        productAttributes: {
          select: {
            id: true,
            poNumber: true,
            color: true,
            size: true,
            shape: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      success: true,
      data: {
        orders,
        itemsWithPO,
        summary: {
          totalOrders: orders.length,
          totalItems: itemsWithPO.length,
          poNumber: validatedPONumber,
          customerId: validatedCustomerId,
        },
      },
    }

  } catch (error) {
    console.error('Error retrieving orders by PO number:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve orders by PO number'
    })
  }
})