import { z } from 'zod';
import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

const logOrderChangeSchema = z.object({
  orderId: z.string(),
  changeType: z.string(),
  oldValue: z.any().nullable(),
  newValue: z.any().nullable(),
  additionalData: z.any().optional(),
  userId: z.string().optional(),
  changeReason: z.string(),
  triggeredBy: z.string(),
  notes: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    // Get the current user session using the existing auth pattern
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const body = await readBody(event);
    const validatedData = logOrderChangeSchema.parse(body);

    // Get the enhanced Prisma client using the existing pattern
    const prisma = await getEnhancedPrismaClient(event);

    let logEntry;

    // Determine which table to use based on change type
    if (validatedData.changeType === 'STATUS' && 
        isValidOrderSystemStatus(validatedData.oldValue) && 
        isValidOrderSystemStatus(validatedData.newValue)) {
      // Use OrderStatusLog for order status changes
      logEntry = await prisma.orderStatusLog.create({
        data: {
          orderId: validatedData.orderId,
          fromStatus: validatedData.oldValue,
          toStatus: validatedData.newValue,
          userId: validatedData.userId || sessionData.user.id,
          changeReason: validatedData.changeReason,
          triggeredBy: validatedData.triggeredBy as any,
          notes: validatedData.notes || `Order status changed from ${validatedData.oldValue} to ${validatedData.newValue}`,
        },
      });
    } else {
      // Use AuditLog for all other changes (priority, notes, product attributes, etc.)
      logEntry = await prisma.auditLog.create({
        data: {
          userId: validatedData.userId || sessionData.user.id,
          action: `ORDER_${validatedData.changeType}`,
          entityName: 'Order',
          entityId: validatedData.orderId,
          oldValue: validatedData.oldValue !== null ? validatedData.oldValue : undefined,
          newValue: validatedData.newValue !== null ? validatedData.newValue : undefined,
          timestamp: new Date(),
        },
      });
    }

    return {
      success: true,
      data: logEntry,
    };
  } catch (error) {
    console.error('Error logging order change:', error);
    
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: error.issues,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    });
  }
});

// Helper function to check if a value is a valid OrderSystemStatus
function isValidOrderSystemStatus(value: any): boolean {
  const validStatuses = ['PENDING', 'APPROVED', 'ORDER_PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
  return validStatuses.includes(value);
}
