import { auth } from '~/server/lib/auth'
import { getEnhancedPrismaClient } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

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
    // Get the product before deletion for audit log
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product not found'
      })
    }

    // Check if product is being used in any order items
    const orderItemsUsingProduct = await prisma.orderItem.findFirst({
      where: { productId }
    })

    if (orderItemsUsingProduct) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete product that is being used in order items'
      })
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'PRODUCT_DELETE',
      entityName: 'Product',
      entityId: productId,
      oldValue: product,
      newValue: null,
    }, sessionData.user.id)

    return {
      message: 'Product deleted successfully'
    }

  } catch (error: unknown) {
    console.error('Error deleting product:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error // Re-throw validation errors
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete product'
    })
  }
}) 