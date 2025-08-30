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

  const productAttributeId = getRouterParam(event, 'id')
  if (!productAttributeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product attribute ID is required'
    })
  }

  const prisma = await getEnhancedPrismaClient(event)

  try {
    // Get the existing product attribute
    const existingAttribute = await prisma.productAttribute.findUnique({
      where: { id: productAttributeId }
    })

    if (!existingAttribute) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Product attribute not found'
      })
    }

    // Delete the ProductAttribute
    await prisma.productAttribute.delete({
      where: { id: productAttributeId }
    })

    // Record audit log
    await recordAuditLog(event, {
      action: 'PRODUCT_ATTRIBUTE_DELETE',
      entityName: 'ProductAttribute',
      entityId: productAttributeId,
      oldValue: existingAttribute,
      newValue: null,
    }, sessionData.user.id)

    return { success: true, message: 'Product attribute deleted successfully' }

  } catch (error) {
    console.error('Error deleting ProductAttribute:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete product attribute'
    })
  }
})
