import { auth } from '~/server/lib/auth'
import { printQueueService, PrintQueueServiceImpl } from '~/server/lib/PrintQueueService'

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - office employees, admins, and super admins can access print queue status
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to access print queue status'
    })
  }

  try {
    // Get queue status
    const status = await printQueueService.getQueueStatus()
    
    // Check if batch can be printed without warnings
    const canPrintBatch = await printQueueService.canPrintBatch()

    return {
      success: true,
      data: {
        ...status,
        canPrintBatch,
        batchSize: PrintQueueServiceImpl.getBatchSize()
      },
      meta: {
        retrievedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Error retrieving print queue status:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve print queue status'
    })
  }
})