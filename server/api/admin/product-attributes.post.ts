import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

const CreateProductAttributeSchema = z.object({
  orderItemId: z.string().cuid2({ message: 'Invalid order item ID format.' }),
  productType: z.enum(['SPA_COVER', 'COVER_FOR_COVER']).optional().default('SPA_COVER'),
  size: z.string().optional(),
  shape: z.string().optional(),
  radiusSize: z.string().optional(),
  skirtLength: z.string().optional(),
  skirtType: z.enum(['CONN', 'SLIT']).optional(),
  tieDownsQty: z.string().optional(),
  tieDownPlacement: z.enum(['HANDLE_SIDE', 'CORNER_SIDE', 'FOLD_SIDE']).optional(),
  distance: z.string().optional(),
  foamUpgrade: z.string().optional(),
  doublePlasticWrapUpgrade: z.string().optional(),
  webbingUpgrade: z.string().optional(),
  metalForLifterUpgrade: z.string().optional(),
  steamStopperUpgrade: z.string().optional(),
  fabricUpgrade: z.string().optional(),
  extraHandleQty: z.string().optional(),
  extraLongSkirt: z.string().optional(),
  packaging: z.boolean().optional().default(false),
  verified: z.boolean().optional().default(false),
  isParsedFromDescription: z.boolean().optional().default(false),
  parsingErrors: z.array(z.string()).optional().default([]),
})

export default defineEventHandler(async (event) => {
  // Add debugging
  const rawBody = await readBody(event)
  console.log('🔍 Raw body received:', rawBody)
  
  // Handle the data wrapper from frontend - extract the actual data
  let bodyToValidate
  if (rawBody && typeof rawBody === 'object' && 'data' in rawBody) {
    bodyToValidate = rawBody.data
  } else {
    bodyToValidate = rawBody
  }
  console.log('🔍 Body to validate:', bodyToValidate)
  
  const result = CreateProductAttributeSchema.safeParse(bodyToValidate)

  if (!result.success) {
    console.log('🔍 Validation failed:', result.error.flatten().fieldErrors)
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
    // Check if the order item exists
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId }
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

    if (existingAttribute) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Product attribute already exists for this order item'
      })
    }

    // Create the ProductAttribute
    const newProductAttribute = await prisma.productAttribute.create({
      data: {
        orderItemId: data.orderItemId,
        productType: data.productType,
        size: data.size || '',
        shape: data.shape || '',
        radiusSize: data.radiusSize || '',
        skirtLength: data.skirtLength || '',
        skirtType: data.skirtType || 'CONN',
        tieDownsQty: data.tieDownsQty || '',
        tieDownPlacement: data.tieDownPlacement || 'HANDLE_SIDE',
        distance: data.distance || '0',
        foamUpgrade: data.foamUpgrade || '',
        doublePlasticWrapUpgrade: data.doublePlasticWrapUpgrade || 'No',
        webbingUpgrade: data.webbingUpgrade || 'No',
        metalForLifterUpgrade: data.metalForLifterUpgrade || 'No',
        steamStopperUpgrade: data.steamStopperUpgrade || 'No',
        fabricUpgrade: data.fabricUpgrade || 'No',
        extraHandleQty: data.extraHandleQty || '0',
        extraLongSkirt: data.extraLongSkirt || '',
        packaging: data.packaging,
        verified: data.verified,
        isParsedFromDescription: data.isParsedFromDescription,
        parsingErrors: data.parsingErrors,
      }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'PRODUCT_ATTRIBUTE_CREATE',
      entityName: 'ProductAttribute',
      entityId: newProductAttribute.id,
      oldValue: null,
      newValue: newProductAttribute,
    }, sessionData.user.id)

    return { data: newProductAttribute }

  } catch (error) {
    console.error('Error creating ProductAttribute:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create product attribute'
    })
  }
})
