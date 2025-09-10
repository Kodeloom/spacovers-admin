import { auth } from '~/server/lib/auth';
import { EmailService } from '~/server/lib/emailService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { orderId, trackingNumber } = body;

    if (!orderId || !trackingNumber) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order ID and tracking number are required'
      });
    }

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Send the tracking email
    await EmailService.sendTrackingEmail(orderId, trackingNumber);

    return {
      success: true,
      message: 'Tracking email sent successfully'
    };

  } catch (error) {
    console.error('Error sending tracking email:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to send tracking email'
    });
  }
});