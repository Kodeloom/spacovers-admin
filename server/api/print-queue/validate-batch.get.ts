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

  // Authorization check - office employees, admins, and super admins can validate print batches
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to validate print batches'
    })
  }

  try {
    // Get current queue status for validation
    const queueStatus = await printQueueService.getQueueStatus()
    
    // Get next batch for detailed validation
    const nextBatch = await printQueueService.getNextBatch()
    
    // Enhanced batch validation
    const batchSize = nextBatch.items.length
    const standardBatchSize = 4 // Should match PrintQueueServiceImpl.BATCH_SIZE
    
    const validation = {
      isValid: batchSize > 0,
      canPrintWithoutWarning: batchSize >= standardBatchSize,
      requiresWarning: batchSize > 0 && batchSize < standardBatchSize,
      batchSize,
      standardBatchSize,
      warningMessage: nextBatch.warningMessage,
      recommendations: [] as string[]
    }

    // Generate specific recommendations based on batch state
    if (batchSize === 0) {
      validation.recommendations.push('No items in queue - approve orders to add items')
      validation.recommendations.push('Check that orders have been properly approved')
    } else if (batchSize < standardBatchSize) {
      validation.recommendations.push(`Wait for ${standardBatchSize - batchSize} more items for optimal printing`)
      validation.recommendations.push('Partial batches may result in paper waste')
      validation.recommendations.push('You can proceed if urgent printing is needed')
    } else if (batchSize === standardBatchSize) {
      validation.recommendations.push('Perfect batch size for optimal paper usage')
      validation.recommendations.push('Ready to print without warnings')
    } else {
      validation.recommendations.push('Batch size exceeds standard - this should not normally happen')
    }

    return {
      success: true,
      data: {
        validation,
        queueStatus,
        nextBatch: {
          itemCount: nextBatch.items.length,
          canPrintWithoutWarning: nextBatch.canPrintWithoutWarning,
          warningMessage: nextBatch.warningMessage
        }
      },
      meta: {
        validatedAt: new Date().toISOString(),
        validatedBy: sessionData.user.id
      }
    }

  } catch (error) {
    console.error('Error validating print batch:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to validate print batch'
    })
  }
})