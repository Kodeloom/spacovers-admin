import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'
import { validatePONumber, type POValidationResult } from '~/server/utils/poValidationService'

const UpdateProductAttributeSchema = z.object({
  productType: z.enum(['SPA_COVER', 'COVER_FOR_COVER']).optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  shape: z.string().optional(),
  radiusSize: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  skirtLength: z.string().optional(),
  skirtType: z.enum(['CONN', 'SLIT']).optional(),
  tieDownsQty: z.string().optional(),
  tieDownPlacement: z.enum(['HANDLE_SIDE', 'CORNER_SIDE', 'FOLD_SIDE']).optional(),
  tieDownLength: z.string().optional(),
  poNumber: z.string().optional(),
  distance: z.string().optional(),
  foamUpgrade: z.string().optional(),
  doublePlasticWrapUpgrade: z.string().optional(),
  webbingUpgrade: z.string().optional(),
  metalForLifterUpgrade: z.string().optional(),
  steamStopperUpgrade: z.string().optional(),
  fabricUpgrade: z.string().optional(),
  extraHandleQty: z.string().optional(),
  extraLongSkirt: z.string().optional(),
  packaging: z.boolean().optional(),
  notes: z.string().optional(),
  verified: z.boolean().optional(),
  isParsedFromDescription: z.boolean().optional(),
  parsingErrors: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => UpdateProductAttributeSchema.safeParse(body))

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed.',
      data: result.error.flatten().fieldErrors,
    })
  }

  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const productAttributeId = getRouterParam(event, 'id')
  if (!productAttributeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product attribute ID is required'
    })
  }

  const data = result.data
  const prisma = await getEnhancedPrismaClient(event)

  try {
    // Get the existing product attribute with order info for PO validation
    const existingAttribute = await prisma.productAttribute.findUnique({
      where: { id: productAttributeId },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                customerId: true
              }
            }
          }
        }
      }
    })

    if (!existingAttribute) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product attribute not found'
      })
    }

    // PO validation if poNumber is provided and different from existing
    let poValidationResult: POValidationResult | null = null
    if (data.poNumber !== undefined && data.poNumber?.trim() !== existingAttribute.poNumber) {
      if (data.poNumber && data.poNumber.trim()) {
        poValidationResult = await validatePONumber(
          existingAttribute.orderItem.order.customerId,
          data.poNumber.trim(),
          undefined, // excludeOrderId
          existingAttribute.orderItemId // excludeOrderItemId
        )
      }
    }

    // Update the ProductAttribute
    const updatedProductAttribute = await prisma.productAttribute.update({
      where: { id: productAttributeId },
      data: {
        productType: data.productType,
        color: data.color,
        size: data.size,
        shape: data.shape,
        radiusSize: data.radiusSize,
        length: data.length,
        width: data.width,
        skirtLength: data.skirtLength,
        skirtType: data.skirtType,
        tieDownsQty: data.tieDownsQty,
        tieDownPlacement: data.tieDownPlacement,
        tieDownLength: data.tieDownLength,
        poNumber: data.poNumber,
        distance: data.distance,
        foamUpgrade: data.foamUpgrade,
        doublePlasticWrapUpgrade: data.doublePlasticWrapUpgrade,
        webbingUpgrade: data.webbingUpgrade,
        metalForLifterUpgrade: data.metalForLifterUpgrade,
        steamStopperUpgrade: data.steamStopperUpgrade,
        fabricUpgrade: data.fabricUpgrade,
        extraHandleQty: data.extraHandleQty,
        extraLongSkirt: data.extraLongSkirt,
        packaging: data.packaging,
        notes: data.notes,
        verified: data.verified,
        isParsedFromDescription: data.isParsedFromDescription,
        parsingErrors: data.parsingErrors,
      }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'PRODUCT_ATTRIBUTE_UPDATE',
      entityName: 'ProductAttribute',
      entityId: productAttributeId,
      oldValue: existingAttribute,
      newValue: updatedProductAttribute,
    }, sessionData.user.id)

    // Prepare response with validation warnings
    const response: {
      data: typeof updatedProductAttribute
      poValidation?: POValidationResult
    } = {
      data: updatedProductAttribute
    }

    // Include PO validation result if there was a validation performed
    if (poValidationResult) {
      response.poValidation = poValidationResult
    }

    return response

  } catch (error) {
    console.error('Error updating ProductAttribute:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update product attribute'
    })
  }
})
