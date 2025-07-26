import { z } from 'zod'
import { parseProductDescription, findOrCreateProduct } from '~/server/utils/productParser'
import { auth } from '~/server/lib/auth'
import { recordAuditLog } from '~/server/utils/auditLog'

const CreateProductFromDescriptionSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  price: z.number().optional()
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => CreateProductFromDescriptionSchema.safeParse(body))

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

  const { description, price } = result.data

  try {
    // Parse the description
    const parsed = parseProductDescription(description)
    if (!parsed) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid product description format. Expected 7 lines: Size, Shape, Pieces, Foam Thickness, Skit, Tiedown, Color'
      })
    }

    // Add price to specs if provided
    if (price !== undefined) {
      parsed.specs.price = price
    }

    // Find or create the product
    const { product, created } = await findOrCreateProduct(parsed.specs)

    // Record audit log
    await recordAuditLog(event, {
      action: created ? 'PRODUCT_CREATE' : 'PRODUCT_READ',
      entityName: 'Product',
      entityId: product.id,
      oldValue: created ? null : product,
      newValue: created ? product : null,
    }, sessionData.user.id)

    return {
      product,
      created,
      message: created ? 'Product created successfully' : 'Product already exists'
    }

  } catch (error: unknown) {
    console.error('Error creating product from description:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw validation errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create product from description'
    })
  }
}) 