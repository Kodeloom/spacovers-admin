import { z } from 'zod'
import { auth } from '~/server/lib/auth'
import { getSuperAdminOverrideSummary, getAttributeAuditHistory } from '~/server/utils/attributeAuditLog'

const AuditQuerySchema = z.object({
  orderItemId: z.string().cuid2().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  summary: z.enum(['true', 'false']).optional().default('false')
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

  // Authorization check - only super admins and admins can view audit logs
  const userRoles = sessionData.user.roles?.map(r => r.role.name) || []
  const allowedRoles = ['Super Admin', 'Admin']
  const hasAccess = userRoles.some(role => allowedRoles.includes(role))
  
  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions to view audit logs'
    })
  }

  // Parse query parameters
  const query = getQuery(event)
  const result = AuditQuerySchema.safeParse(query)

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid query parameters',
      data: result.error.flatten().fieldErrors,
    })
  }

  const { orderItemId, startDate, endDate, summary } = result.data

  try {
    if (summary === 'true') {
      // Return summary of super admin overrides
      const summaryData = await getSuperAdminOverrideSummary(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )

      return {
        success: true,
        type: 'summary',
        data: summaryData,
        meta: {
          startDate,
          endDate,
          retrievedAt: new Date().toISOString()
        }
      }
    } else if (orderItemId) {
      // Return audit history for specific order item
      const auditHistory = await getAttributeAuditHistory(orderItemId)

      return {
        success: true,
        type: 'history',
        data: auditHistory,
        meta: {
          orderItemId,
          totalRecords: auditHistory.length,
          retrievedAt: new Date().toISOString()
        }
      }
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Either orderItemId or summary=true must be provided'
      })
    }

  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve audit logs'
    })
  }
})