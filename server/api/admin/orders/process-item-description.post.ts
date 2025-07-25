import { z } from 'zod'
import { parseProductDescription, findOrCreateProduct } from '~/server/utils/productParser'
import { auth } from '~/server/lib/auth'
import { recordAuditLog } from '~/server/utils/auditLog'
import { getEnhancedPrismaClient } from '~/server/lib/db'

const ProcessItemDescriptionSchema = z.object({
  itemId: z.string().cuid2(),
  description: z.string().min(1, 'Description is required.')
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => ProcessItemDescriptionSchema.safeParse(body))

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

  const { itemId, description } = result.data
  const prisma = await getEnhancedPrismaClient(event)

  try {
    // Check if the item is a spacover product
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Item not found'
      })
    }

    // Only process if it's a spacover product
    if (!item.isSpacoverProduct) {
      return {
        success: false,
        message: 'This item is not a spacover product. Product creation is only available for spacover items.',
        product: null
      }
    }

    // Parse the description
    const parsed = parseProductDescription(description)
    if (!parsed) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid product description format. Expected 7 lines: Size, Shape, Pieces, Foam Thickness, Skit, Tiedown, Color'
      })
    }

    // Find or create the product
    const { product, created } = await findOrCreateProduct(parsed.specs)

    // Record audit log
    await recordAuditLog(event, {
      action: created ? 'PRODUCT_CREATE_FROM_ORDER' : 'PRODUCT_READ_FROM_ORDER',
      entityName: 'Product',
      entityId: product.id,
      oldValue: created ? null : product,
      newValue: created ? product : null,
    }, sessionData.user.id)

    return {
      success: true,
      product,
      created,
      message: created ? 'Product created successfully from order item description' : 'Product found from order item description'
    }

  } catch (error: unknown) {
    console.error('Error processing item description:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw validation errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process item description'
    })
  }
}) 