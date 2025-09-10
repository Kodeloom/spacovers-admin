import { auth } from '~/server/lib/auth';
import { getUserActiveWork } from '~/server/lib/productionTimer';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { userId } = query;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Use provided userId or current user's ID
    const targetUserId = (userId as string) || sessionData.user.id;

    // Only allow users to see their own active work (unless admin)
    if (targetUserId !== sessionData.user.id) {
      // TODO: Add admin role check here if needed
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot view other users active work'
      });
    }

    const activeWork = await getUserActiveWork(targetUserId);

    return {
      success: true,
      activeWork: activeWork,
      hasActiveWork: activeWork.length > 0
    };

  } catch (error) {
    console.error('Error getting active work:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to get active work'
    });
  }
});