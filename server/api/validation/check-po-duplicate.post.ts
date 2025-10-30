import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { poValidationService } from '~/server/lib/POValidationService'

const CheckPODuplicateSchema = z.object({
  poNumber: z.string().min(1, 'PO number is required'),
  customerId: z.string().cuid2('Invalid customer ID format'),
  level: z.enum(['order', 'item'], { message: 'Level must be either "order" or "item"' }),
  excludeOrderId: z.string().cuid2().optional(),
  excludeOrderItemId: z.string().cuid2().optional(),
})

export default defineEventHandler(async (event) => {
  // Authentication check
  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Authorization check - only office employees, admins, and super admins can validate PO numbers
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin', 'Office Employee']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to validate PO numbers'
    })
  }

  // Parse and validate request body
  const body = await readBody(event)
  const result = CheckPODuplicateSchema.safeParse(body)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { poNumber, customerId, level, excludeOrderId, excludeOrderItemId } = result.data

  try {
    let validationResult

    if (level === 'order') {
      validationResult = await poValidationService.checkOrderLevelDuplicate(
        poNumber,
        customerId,
        excludeOrderId
      )
    } else {
      validationResult = await poValidationService.checkItemLevelDuplicate(
        poNumber,
        customerId,
        excludeOrderItemId
      )
    }

    return {
      success: true,
      data: validationResult,
      meta: {
        level,
        timestamp: new Date().toISOString(),
        cached: false // Would need to be determined by service
      }
    }

  } catch (error) {
    console.error('Error checking PO duplicate:', {
      error: error.message,
      level,
      poNumber: poNumber ? 'present' : 'missing',
      customerId: customerId ? 'present' : 'missing'
    })
    
    // Determine appropriate error response based on error type
    let statusCode = 500
    let statusMessage = 'Failed to validate PO number'
    
    if (error.message.includes('Invalid') || error.message.includes('invalid')) {
      statusCode = 400
      statusMessage = 'Invalid validation request'
    } else if (error.message.includes('timeout')) {
      statusCode = 504
      statusMessage = 'PO validation timed out'
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      statusCode = 403
      statusMessage = 'Insufficient permissions for PO validation'
    } else if (error.message.includes('not found')) {
      statusCode = 404
      statusMessage = 'Customer or related data not found'
    }
    
    throw createError({
      statusCode,
      statusMessage,
      data: {
        retryable: statusCode >= 500 || statusCode === 504,
        fallbackAdvice: 'Please verify manually that this PO number is not already in use',
        suggestions: statusCode === 400 
          ? ['Check that PO number and customer are valid', 'Ensure all required fields are provided']
          : statusCode === 404
          ? ['Verify the customer exists', 'Check that the order data is valid']
          : statusCode === 504
          ? ['Try the validation again', 'The system may be busy']
          : ['Try the validation again', 'Contact support if the problem persists']
      }
    })
  }
})