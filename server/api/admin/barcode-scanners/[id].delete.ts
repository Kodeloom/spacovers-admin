import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

export default defineEventHandler(async (event) => {
  try {
    // Check authentication
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    // Get the scanner ID from the route
    const scannerId = getRouterParam(event, 'id');
    if (!scannerId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Scanner ID is required'
      });
    }

    const prisma = await getEnhancedPrismaClient(event);
    
    // Check if scanner exists
    const existingScanner = await prisma.barcodeScanner.findUnique({
      where: { id: scannerId }
    });

    if (!existingScanner) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Scanner not found'
      });
    }

    // Delete the barcode scanner
    await prisma.barcodeScanner.delete({
      where: { id: scannerId }
    });

    return { success: true };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    });
  }
});
