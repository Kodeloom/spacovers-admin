import { auth } from '~/server/lib/auth';
import { completeUserActiveWork } from '~/server/lib/productionTimer';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { logId } = body;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    const result = await completeUserActiveWork(sessionData.user.id, logId);

    return {
      success: true,
      message: 'Work completed successfully',
      ...result
    };

  } catch (error) {
    console.error('Error completing active work:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to complete active work'
    });
  }
});