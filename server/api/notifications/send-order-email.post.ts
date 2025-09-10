import { auth } from '~/server/lib/auth';
import { EmailService } from '~/server/lib/emailService';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { orderId, emailType } = body;

    if (!orderId || !emailType) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order ID and email type are required'
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

    // Validate email type
    const validEmailTypes = ['order_approved', 'production_started', 'order_ready', 'order_shipped'];
    if (!validEmailTypes.includes(emailType)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid email type. Must be one of: ${validEmailTypes.join(', ')}`
      });
    }

    // Send the email
    await EmailService.sendOrderStatusEmail(orderId, emailType);

    return {
      success: true,
      message: `${emailType} email sent successfully`
    };

  } catch (error) {
    console.error('Error sending order email:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to send email'
    });
  }
});