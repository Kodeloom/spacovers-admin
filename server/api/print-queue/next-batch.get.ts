import { auth } from '~/server/lib/auth'
import { printQueueService } from '~/server/lib/PrintQueueService'

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - office employees, admins, and super admins can access print queue
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to access print queue'
    })
  }

  try {
    // Get the next batch for printing
    const batch = await printQueueService.getNextBatch()

    return {
      success: true,
      data: batch,
      meta: {
        batchSize: batch.items.length,
        canPrintWithoutWarning: batch.canPrintWithoutWarning,
        warningMessage: batch.warningMessage,
        retrievedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error retrieving next print batch:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve next print batch'
    })
  }
})