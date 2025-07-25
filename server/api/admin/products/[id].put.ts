import { z } from 'zod'
import { parseProductDescription } from '~/server/utils/productParser'
import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

const UpdateProductSchema = z.object({
  description: z.string().min(1, 'Description is required.')
})

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => UpdateProductSchema.safeParse(body))

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

  const productId = getRouterParam(event, 'id')
  if (!productId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID is required'
    })
  }

  const { description } = result.data
  const prisma = await getEnhancedPrismaClient(event)

  try {
    // Get the existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product not found'
      })
    }

    // Parse the new description
    const parsed = parseProductDescription(description)
    if (!parsed) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid product description format. Expected 7 lines: Size, Shape, Pieces, Foam Thickness, Skit, Tiedown, Color'
      })
    }

    // Check if the new description would create a duplicate
    const existingWithNewDescription = await prisma.product.findUnique({
      where: { fullDescription: parsed.fullDescription }
    })

    if (existingWithNewDescription && existingWithNewDescription.id !== productId) {
      throw createError({
        statusCode: 409,
        statusMessage: 'A product with this description already exists'
      })
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        size: parsed.specs.size,
        shape: parsed.specs.shape,
        pieces: parsed.specs.pieces,
        foamThickness: parsed.specs.foamThickness,
        skit: parsed.specs.skit,
        tiedown: parsed.specs.tiedown,
        color: parsed.specs.color,
        fullDescription: parsed.fullDescription,
        displayName: parsed.displayName
      }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'PRODUCT_UPDATE',
      entityName: 'Product',
      entityId: productId,
      oldValue: existingProduct,
      newValue: updatedProduct,
    }, sessionData.user.id)

    return {
      product: updatedProduct,
      message: 'Product updated successfully'
    }

  } catch (error: unknown) {
    console.error('Error updating product:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw validation errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update product'
    })
  }
}) 