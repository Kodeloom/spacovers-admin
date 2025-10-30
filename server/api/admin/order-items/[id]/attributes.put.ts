import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAttributeEditAudit } from '~/server/utils/attributeAuditLog'

const UpdateProductAttributeSchema = z.object({
  // Required fields
  productType: z.enum(['SPA_COVER', 'COVER_FOR_COVER']).optional().default('SPA_COVER'),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  shape: z.string().nullable().optional(),
  skirtType: z.enum(['CONN', 'SLIT']).nullable().optional(),
  skirtLength: z.string().nullable().optional(),
  tieDownsQty: z.string().nullable().optional(),
  tieDownPlacement: z.enum(['HANDLE_SIDE', 'CORNER_SIDE', 'FOLD_SIDE']).nullable().optional(),
  distance: z.string().nullable().optional(),
  // Optional fields
  radiusSize: z.string().nullable().optional(),
  length: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  tieDownLength: z.string().nullable().optional(),
  poNumber: z.string().nullable().optional(),
  foamUpgrade: z.string().nullable().optional(),
  doublePlasticWrapUpgrade: z.string().nullable().optional(),
  webbingUpgrade: z.string().nullable().optional(),
  metalForLifterUpgrade: z.string().nullable().optional(),
  steamStopperUpgrade: z.string().nullable().optional(),
  fabricUpgrade: z.string().nullable().optional(),
  extraHandleQty: z.string().nullable().optional(),
  extraLongSkirt: z.string().nullable().optional(),
  packaging: z.boolean().nullable().optional().default(false),
  notes: z.string().nullable().optional(),
  verified: z.boolean().nullable().optional().default(false),
  isParsedFromDescription: z.boolean().nullable().optional().default(false),
  parsingErrors: z.array(z.string()).nullable().optional().default([]),
  // Super admin override metadata
  isSuperAdminOverride: z.boolean().optional().default(false),
  packingSlipPrinted: z.boolean().optional().default(false),
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

  // Get order item ID from route params
  const orderItemId = getRouterParam(event, 'id')
  if (!orderItemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Order item ID is required'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = UpdateProductAttributeSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const data = result.data

  try {
    // Get order item with order status and existing attributes
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: {
            orderStatus: true,
            customerId: true
          }
        },
        productAttributes: true
      }
    })

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      })
    }

    // Check user roles
    const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
    const isSuperAdmin = userRoles.includes('Super Admin')
    const isAdmin = userRoles.includes('Admin') || userRoles.includes('Office Employee')

    // Basic authorization check
    if (!isAdmin && !isSuperAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to edit product attributes'
      })
    }

    // Permission validation logic based on requirements
    const hasVerifiedAttributes = orderItem.productAttributes?.verified || false
    const approvedStatuses = ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED']
    const isOrderApproved = approvedStatuses.includes(orderItem.order.orderStatus)
    
    // Check if this edit requires super admin override
    const requiresSuperAdminOverride = hasVerifiedAttributes && isOrderApproved
    
    if (requiresSuperAdminOverride && !isSuperAdmin) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Super Admin privileges required to edit verified attributes on approved orders'
      })
    }

    // Get existing attributes for audit logging
    const existingAttributes = orderItem.productAttributes

    let productAttribute

    if (existingAttributes) {
      // Update existing ProductAttribute
      productAttribute = await prisma.productAttribute.update({
        where: { orderItemId: orderItemId },
        data: {
          productType: data.productType,
          color: data.color ?? null,
          size: data.size ?? null,
          shape: data.shape ?? null,
          radiusSize: data.radiusSize ?? null,
          length: data.length ?? null,
          width: data.width ?? null,
          skirtLength: data.skirtLength ?? null,
          skirtType: data.skirtType ?? null,
          tieDownsQty: data.tieDownsQty ?? null,
          tieDownPlacement: data.tieDownPlacement ?? null,
          tieDownLength: data.tieDownLength ?? null,
          poNumber: data.poNumber ?? null,
          distance: data.distance ?? null,
          foamUpgrade: data.foamUpgrade ?? null,
          doublePlasticWrapUpgrade: data.doublePlasticWrapUpgrade ?? null,
          webbingUpgrade: data.webbingUpgrade ?? null,
          metalForLifterUpgrade: data.metalForLifterUpgrade ?? null,
          steamStopperUpgrade: data.steamStopperUpgrade ?? null,
          fabricUpgrade: data.fabricUpgrade ?? null,
          extraHandleQty: data.extraHandleQty ?? null,
          extraLongSkirt: data.extraLongSkirt ?? null,
          packaging: data.packaging ?? false,
          notes: data.notes ?? null,
          verified: data.verified ?? existingAttributes.verified,
          isParsedFromDescription: data.isParsedFromDescription ?? existingAttributes.isParsedFromDescription,
          parsingErrors: data.parsingErrors ?? existingAttributes.parsingErrors,
        }
      })
    } else {
      // Create new ProductAttribute
      productAttribute = await prisma.productAttribute.create({
        data: {
          orderItemId: orderItemId,
          productType: data.productType,
          color: data.color ?? null,
          size: data.size ?? null,
          shape: data.shape ?? null,
          radiusSize: data.radiusSize ?? null,
          length: data.length ?? null,
          width: data.width ?? null,
          skirtLength: data.skirtLength ?? null,
          skirtType: data.skirtType ?? null,
          tieDownsQty: data.tieDownsQty ?? null,
          tieDownPlacement: data.tieDownPlacement ?? null,
          tieDownLength: data.tieDownLength ?? null,
          poNumber: data.poNumber ?? null,
          distance: data.distance ?? null,
          foamUpgrade: data.foamUpgrade ?? null,
          doublePlasticWrapUpgrade: data.doublePlasticWrapUpgrade ?? null,
          webbingUpgrade: data.webbingUpgrade ?? null,
          metalForLifterUpgrade: data.metalForLifterUpgrade ?? null,
          steamStopperUpgrade: data.steamStopperUpgrade ?? null,
          fabricUpgrade: data.fabricUpgrade ?? null,
          extraHandleQty: data.extraHandleQty ?? null,
          extraLongSkirt: data.extraLongSkirt ?? null,
          packaging: data.packaging ?? false,
          notes: data.notes ?? null,
          verified: data.verified ?? false,
          isParsedFromDescription: data.isParsedFromDescription ?? false,
          parsingErrors: data.parsingErrors ?? [],
        }
      })
    }

    // Enhanced audit logging using specialized utility
    const auditAction = requiresSuperAdminOverride && data.isSuperAdminOverride 
      ? 'SUPER_ADMIN_OVERRIDE' 
      : existingAttributes ? 'UPDATE' : 'CREATE'
    
    await recordAttributeEditAudit(event, {
      orderItemId: orderItemId,
      userId: sessionData.user.id,
      action: auditAction,
      previousAttributes: existingAttributes,
      newAttributes: productAttribute,
      orderStatus: orderItem.order.orderStatus,
      wasVerified: hasVerifiedAttributes,
      packingSlipPrinted: data.packingSlipPrinted || false,
      reason: requiresSuperAdminOverride ? 'Super Admin Override - Critical Production Change' : undefined
    })

    return {
      success: true,
      data: productAttribute,
      message: requiresSuperAdminOverride 
        ? 'Product attributes updated with Super Admin override'
        : 'Product attributes updated successfully'
    }

  } catch (error) {
    console.error('Error updating product attributes:', error)
    
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update product attributes'
    })
  }
})