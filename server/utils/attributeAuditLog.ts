import type { H3Event } from 'h3'
import { unenhancedPrisma as prisma } from '~/server/lib/db'
import { recordAuditLog } from '~/server/utils/auditLog'

export interface AttributeEditAuditData {
  orderItemId: string
  userId: string
  action: 'CREATE' | 'UPDATE' | 'SUPER_ADMIN_OVERRIDE'
  previousAttributes?: any
  newAttributes: any
  orderStatus: string
  wasVerified: boolean
  packingSlipPrinted: boolean
  reason?: string
}

/**
 * Records an audit log specifically for product attribute edits
 * This provides enhanced tracking for super admin overrides and critical changes
 */
export async function recordAttributeEditAudit(
  event: H3Event,
  auditData: AttributeEditAuditData
): Promise<void> {
  try {
    // Determine the appropriate audit action
    let auditAction: string
    
    if (auditData.action === 'SUPER_ADMIN_OVERRIDE') {
      auditAction = 'SUPER_ADMIN_ATTRIBUTE_OVERRIDE'
    } else if (auditData.action === 'UPDATE') {
      auditAction = 'PRODUCT_ATTRIBUTE_UPDATE'
    } else {
      auditAction = 'PRODUCT_ATTRIBUTE_CREATE'
    }

    // Prepare enhanced audit data with metadata
    const auditMetadata = {
      orderItemId: auditData.orderItemId,
      orderStatus: auditData.orderStatus,
      wasVerified: auditData.wasVerified,
      packingSlipPrinted: auditData.packingSlipPrinted,
      overrideReason: auditData.reason,
      timestamp: new Date().toISOString(),
      riskLevel: determineRiskLevel(auditData)
    }

    const oldValue = auditData.previousAttributes ? {
      ...auditData.previousAttributes,
      auditMetadata
    } : null

    const newValue = {
      ...auditData.newAttributes,
      auditMetadata
    }

    // Record the audit log using the existing utility
    await recordAuditLog(event, {
      action: auditAction,
      entityName: 'ProductAttribute',
      entityId: auditData.newAttributes.id,
      oldValue,
      newValue
    }, auditData.userId)

    // Log to console for immediate visibility of critical changes
    if (auditData.action === 'SUPER_ADMIN_OVERRIDE') {
      console.warn(`SUPER ADMIN OVERRIDE: User ${auditData.userId} modified verified attributes on ${auditData.orderStatus} order. OrderItem: ${auditData.orderItemId}, PackingSlip: ${auditData.packingSlipPrinted ? 'PRINTED' : 'NOT_PRINTED'}`)
    }

  } catch (error) {
    console.error('Failed to record attribute edit audit:', {
      error: error.message,
      auditData,
      stack: error.stack
    })
    
    // Don't throw the error to avoid breaking the main operation
    // But log it for investigation
  }
}

/**
 * Determines the risk level of an attribute edit for audit purposes
 */
function determineRiskLevel(auditData: AttributeEditAuditData): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  // Critical: Super admin override on approved order with printed packing slip
  if (auditData.action === 'SUPER_ADMIN_OVERRIDE' && 
      auditData.packingSlipPrinted && 
      ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP'].includes(auditData.orderStatus)) {
    return 'CRITICAL'
  }
  
  // High: Super admin override on approved order
  if (auditData.action === 'SUPER_ADMIN_OVERRIDE' && 
      ['APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED'].includes(auditData.orderStatus)) {
    return 'HIGH'
  }
  
  // Medium: Editing verified attributes (even if order not approved)
  if (auditData.wasVerified) {
    return 'MEDIUM'
  }
  
  // Low: Normal attribute edits
  return 'LOW'
}

/**
 * Retrieves audit logs for a specific order item's attribute changes
 */
export async function getAttributeAuditHistory(orderItemId: string): Promise<any[]> {
  try {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityName: 'ProductAttribute',
        OR: [
          { action: 'PRODUCT_ATTRIBUTE_CREATE' },
          { action: 'PRODUCT_ATTRIBUTE_UPDATE' },
          { action: 'SUPER_ADMIN_ATTRIBUTE_OVERRIDE' }
        ],
        // Filter by orderItemId in the audit data
        newValue: {
          path: ['auditMetadata', 'orderItemId'],
          equals: orderItemId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: {
              include: {
                role: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    return auditLogs
  } catch (error) {
    console.error('Failed to retrieve attribute audit history:', error)
    return []
  }
}

/**
 * Gets a summary of super admin overrides for reporting
 */
export async function getSuperAdminOverrideSummary(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalOverrides: number
  criticalOverrides: number
  overridesByUser: Array<{ userId: string, userName: string, count: number }>
}> {
  try {
    const whereClause: any = {
      action: 'SUPER_ADMIN_ATTRIBUTE_OVERRIDE'
    }

    if (startDate || endDate) {
      whereClause.timestamp = {}
      if (startDate) whereClause.timestamp.gte = startDate
      if (endDate) whereClause.timestamp.lte = endDate
    }

    const overrides = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const totalOverrides = overrides.length
    const criticalOverrides = overrides.filter(log => {
      const metadata = log.newValue as any
      return metadata?.auditMetadata?.riskLevel === 'CRITICAL'
    }).length

    // Group by user
    const userOverrides = overrides.reduce((acc, log) => {
      const userId = log.userId || 'unknown'
      const userName = log.user?.name || 'Unknown User'
      
      if (!acc[userId]) {
        acc[userId] = { userId, userName, count: 0 }
      }
      acc[userId].count++
      
      return acc
    }, {} as Record<string, { userId: string, userName: string, count: number }>)

    return {
      totalOverrides,
      criticalOverrides,
      overridesByUser: Object.values(userOverrides)
    }
  } catch (error) {
    console.error('Failed to get super admin override summary:', error)
    return {
      totalOverrides: 0,
      criticalOverrides: 0,
      overridesByUser: []
    }
  }
}