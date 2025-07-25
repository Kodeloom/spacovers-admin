import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'

export default defineEventHandler(async (event) => {
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

  const prisma = await getEnhancedPrismaClient(event)

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product not found'
      })
    }

    return product
  } catch (error: unknown) {
    console.error('Error fetching product:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw validation errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch product'
    })
  }
}) 