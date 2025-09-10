import { z } from 'zod';
import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

const UpdateBarcodeScannerSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required').optional(),
  stationId: z.string().min(1, 'Station is required').optional(),
  userId: z.string().min(1, 'User is required').optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  isActive: z.boolean().optional()
});

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

    // Parse and validate request body
    const body = await readBody(event);
    const data = UpdateBarcodeScannerSchema.parse(body);

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

    // Check if prefix already exists (if being updated)
    if (data.prefix && data.prefix !== existingScanner.prefix) {
      const prefixExists = await prisma.barcodeScanner.findUnique({
        where: { prefix: data.prefix }
      });

      if (prefixExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'A scanner with this prefix already exists'
        });
      }
    }

    // Update the barcode scanner
    const scanner = await prisma.barcodeScanner.update({
      where: { id: scannerId },
      data: {
        ...(data.prefix && { prefix: data.prefix }),
        ...(data.stationId && { stationId: data.stationId }),
        ...(data.userId && { userId: data.userId }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      },
      include: {
        station: true,
        user: true
      }
    });

    return scanner;
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
