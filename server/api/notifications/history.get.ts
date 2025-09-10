import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { orderId, limit = 50, offset = 0 } = query;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Build where clause
    const whereClause: any = {};
    if (orderId) {
      whereClause.orderId = orderId as string;
    }

    // Get email notifications
    const notifications = await prisma.emailNotification.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count
    const totalCount = await prisma.emailNotification.count({
      where: whereClause
    });

    return {
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        emailType: notification.emailType,
        recipientEmail: notification.recipientEmail,
        subject: notification.subject,
        sentAt: notification.sentAt,
        failedAt: notification.failedAt,
        retryCount: notification.retryCount,
        errorMessage: notification.errorMessage,
        createdAt: notification.createdAt,
        order: {
          id: notification.order.id,
          orderNumber: notification.order.salesOrderNumber || notification.order.id.slice(-8),
          customerName: notification.order.customer?.name
        }
      })),
      totalCount,
      hasMore: (parseInt(offset as string) + notifications.length) < totalCount
    };

  } catch (error) {
    console.error('Error getting email notification history:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get email notification history'
    });
  }
});