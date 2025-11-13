import { defineEventHandler, getRouterParam, createError } from 'h3';
import { unenhancedPrisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  // Check authentication and Super Admin role
  const sessionData = await auth.api.getSession({ headers: event.headers });
  
  if (!sessionData?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  // Check if user is Super Admin
  const userRoles = (sessionData.user as any).roles || [];
  const isSuperAdmin = userRoles.some((r: any) => r.role?.name === 'Super Admin');
  
  if (!isSuperAdmin) {
    throw createError({ 
      statusCode: 403, 
      statusMessage: 'Only Super Admins can delete orders' 
    });
  }

  const orderId = getRouterParam(event, 'id');
  if (!orderId) {
    throw createError({ statusCode: 400, statusMessage: 'Order ID is required' });
  }

  try {
    // Check if order exists
    const order = await unenhancedPrisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found' });
    }

    // Delete order (cascade will handle related records)
    // The schema has onDelete: Cascade for:
    // - OrderItem
    // - OrderStatusLog
    // - ItemStatusLog (through OrderItem)
    // - ItemProcessingLog (through OrderItem)
    // - ProductAttribute (through OrderItem)
    // - PrintQueue (through OrderItem)
    // - EmailNotification
    await unenhancedPrisma.order.delete({
      where: { id: orderId }
    });

    return { 
      success: true, 
      message: 'Order and all related data deleted successfully',
      deletedOrderId: orderId
    };
  } catch (error: unknown) {
    console.error(`[Admin] Error deleting order:`, error);
    
    if (error instanceof Error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to delete order: ${error.message}`
      });
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete order'
    });
  }
});
