import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'
import { validatePONumber, type POValidationResult } from '~/server/utils/poValidationService'

const CreateProductAttributeSchema = z.object({
  orderItemId: z.string().cuid2({ message: 'Invalid order item ID format.' }),
  // Required fields (as specified by user)
  productType: z.enum(['SPA_COVER', 'COVER_FOR_COVER']).optional().default('SPA_COVER'),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  shape: z.string().nullable().optional(),
  skirtType: z.enum(['CONN', 'SLIT']).nullable().optional(),
  skirtLength: z.string().nullable().optional(),
  tieDownsQty: z.string().nullable().optional(),
  tieDownPlacement: z.enum(['HANDLE_SIDE', 'CORNER_SIDE', 'FOLD_SIDE']).nullable().optional(),
  distance: z.string().nullable().optional(),
  // Optional fields (can be null)
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
})

export default defineEventHandler(async (event) => {
  // Handle both direct attributes and wrapped format
  const rawBody = await readBody(event)
  
  let bodyToValidate
  if (rawBody && typeof rawBody === 'object') {
    // Check if it's the new format with orderItemId and attributes
    if ('orderItemId' in rawBody && 'attributes' in rawBody) {
      bodyToValidate = {
        orderItemId: rawBody.orderItemId,
        ...rawBody.attributes
      }
    } else if ('data' in rawBody) {
      // Legacy format with data wrapper
      bodyToValidate = rawBody.data
    } else {
      // Direct format
      bodyToValidate = rawBody
    }
  } else {
    bodyToValidate = rawBody
  }
  
  const result = CreateProductAttributeSchema.safeParse(bodyToValidate)

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

  const data = result.data
  const prisma = await getEnhancedPrismaClient(event)

  try {
    // Check if the order item exists and get customer info for PO validation
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      include: {
        order: {
          select: {
            customerId: true
          }
        }
      }
    })

    if (!orderItem) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Order item not found'
      })
    }

    // Check if ProductAttribute already exists for this order item
    const existingAttribute = await prisma.productAttribute.findUnique({
      where: { orderItemId: data.orderItemId }
    })

    // PO validation if poNumber is provided
    let poValidationResult: POValidationResult | null = null
    if (data.poNumber && data.poNumber.trim()) {
      poValidationResult = await validatePONumber(
        orderItem.order.customerId,
        data.poNumber.trim(),
        undefined, // excludeOrderId
        data.orderItemId // excludeOrderItemId
      )
    }

    let productAttribute

    if (existingAttribute) {
      // Update existing ProductAttribute
      productAttribute = await prisma.productAttribute.update({
        where: { orderItemId: data.orderItemId },
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
          verified: data.verified,
          isParsedFromDescription: data.isParsedFromDescription,
          parsingErrors: data.parsingErrors,
        }
      })

      // Record audit log for update
      await recordAuditLog(event, {
        action: 'PRODUCT_ATTRIBUTE_UPDATE',
        entityName: 'ProductAttribute',
        entityId: productAttribute.id,
        oldValue: existingAttribute,
        newValue: productAttribute,
      }, sessionData.user.id)

    } else {
      // Create new ProductAttribute
      productAttribute = await prisma.productAttribute.create({
        data: {
          orderItemId: data.orderItemId,
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

      // Record audit log for create
      await recordAuditLog(event, {
        action: 'PRODUCT_ATTRIBUTE_CREATE',
        entityName: 'ProductAttribute',
        entityId: productAttribute.id,
        oldValue: null,
        newValue: productAttribute,
      }, sessionData.user.id)
    }

    // Prepare response
    const response = {
      productAttributes: productAttribute,
      poValidation: poValidationResult
    }

    return response

  } catch (error) {
    console.error('Error saving ProductAttribute:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save product attribute'
    })
  }
})
