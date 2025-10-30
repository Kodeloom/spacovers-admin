import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'

/**
 * Production Items API Endpoint
 * Returns production items filtered by status for modal displays
 * 
 * Query Parameters:
 * - status: Filter type - 'in_production', 'not_started', or 'completed'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

const ProductionStatusFilterSchema = z.object({
  status: z.enum(['in_production', 'not_started', 'completed']).optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Authentication check
    const sessionData = await auth.api.getSession({ headers: event.headers })
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // Authorization check - only office employees, admins, and super admins can access production items
    const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
    const allowedRoles = ['Super Admin', 'Admin', 'Office Employee', 'Manager']
    const hasAccess = userRoles.some(role => allowedRoles.includes(role))
    
    if (!hasAccess) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to access production items'
      })
    }

    // Parse and validate query parameters
    const query = getQuery(event)
    const result = ProductionStatusFilterSchema.safeParse(query)

    if (!result.success) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Validation failed',
        data: result.error.format(),
      })
    }

    const { status } = result.data

    // Define status mappings based on requirements
    let itemStatusFilter: any = {}
    
    if (status === 'in_production') {
      // Items currently in production: CUTTING, SEWING, FOAM_CUTTING, PACKAGING
      itemStatusFilter = {
        itemStatus: {
          in: ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'PACKAGING']
        }
      }
    } else if (status === 'not_started') {
      // Items not started: NOT_STARTED_PRODUCTION
      itemStatusFilter = {
        itemStatus: 'NOT_STARTED_PRODUCTION'
      }
    } else if (status === 'completed') {
      // Items completed: PRODUCT_FINISHED, READY
      itemStatusFilter = {
        itemStatus: {
          in: ['PRODUCT_FINISHED', 'READY']
        }
      }
    }

    // Query production items with related data
    const productionItems = await prisma.orderItem.findMany({
      where: {
        isProduct: true, // Only production items
        ...itemStatusFilter
      },
      include: {
        item: {
          select: {
            name: true,
            imageUrl: true
          }
        },
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        },
        productAttributes: {
          select: {
            verified: true,
            size: true,
            shape: true,
            color: true,
            skirtLength: true,
            skirtType: true,
            tieDownsQty: true,
            tieDownPlacement: true,
            foamUpgrade: true,
            doublePlasticWrapUpgrade: true,
            webbingUpgrade: true,
            metalForLifterUpgrade: true,
            steamStopperUpgrade: true,
            fabricUpgrade: true,
            extraHandleQty: true,
            packaging: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    // Transform the data for frontend consumption
    const transformedItems = productionItems.map(item => ({
      id: item.id,
      itemStatus: item.itemStatus,
      item: {
        name: item.item.name,
        imageUrl: item.item.imageUrl
      },
      order: {
        id: item.order.id,
        salesOrderNumber: item.order.salesOrderNumber,
        customer: {
          name: item.order.customer.name
        }
      },
      productAttributes: {
        verified: item.productAttributes?.verified || false,
        size: item.productAttributes?.size,
        shape: item.productAttributes?.shape,
        color: item.productAttributes?.color,
        skirtLength: item.productAttributes?.skirtLength,
        skirtType: item.productAttributes?.skirtType,
        tieDownsQty: item.productAttributes?.tieDownsQty,
        tieDownPlacement: item.productAttributes?.tieDownPlacement,
        foamUpgrade: item.productAttributes?.foamUpgrade,
        doublePlasticWrapUpgrade: item.productAttributes?.doublePlasticWrapUpgrade,
        webbingUpgrade: item.productAttributes?.webbingUpgrade,
        metalForLifterUpgrade: item.productAttributes?.metalForLifterUpgrade,
        steamStopperUpgrade: item.productAttributes?.steamStopperUpgrade,
        fabricUpgrade: item.productAttributes?.fabricUpgrade,
        extraHandleQty: item.productAttributes?.extraHandleQty,
        packaging: item.productAttributes?.packaging
      }
    }))

    return {
      success: true,
      data: transformedItems,
      totalCount: transformedItems.length,
      filterApplied: status || 'all',
      timestamp: new Date().toISOString()
    }

  } catch (error: any) {
    console.error('Error fetching production items:', error)
    
    // If it's already a createError, re-throw it
    if (error?.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch production items',
      data: {
        success: false,
        error: 'Internal server error while fetching production items',
        timestamp: new Date().toISOString()
      }
    })
  }
})