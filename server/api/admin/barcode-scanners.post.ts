import { z } from 'zod';
import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

const CreateBarcodeScannerSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  stationId: z.string().optional(), // Optional for office scanners
  userId: z.string().min(1, 'User is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  isActive: z.boolean().default(true)
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

    // Parse and validate request body
    const body = await readBody(event);
    const data = CreateBarcodeScannerSchema.parse(body);

    const prisma = await getEnhancedPrismaClient(event);
    
    // Check if prefix already exists
    const existingScanner = await prisma.barcodeScanner.findUnique({
      where: { prefix: data.prefix }
    });

    if (existingScanner) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A scanner with this prefix already exists'
      });
    }

    // Create the barcode scanner
    const scanner = await prisma.barcodeScanner.create({
      data: {
        prefix: data.prefix,
        stationId: data.stationId || null, // Allow null for office scanners
        userId: data.userId,
        model: data.model || '',
        serialNumber: data.serialNumber || '',
        isActive: data.isActive
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
