import { z } from 'zod';
import { auth } from '~/server/lib/auth';
import { getEnhancedPrismaClient } from '~/server/lib/db';

const CreateBarcodeScannerSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  stationId: z.string().nullable().optional().transform(val => val === '' ? null : val), // Convert empty string to null for office scanners
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
    console.log('Raw request body:', JSON.stringify(body, null, 2));
    
    const data = CreateBarcodeScannerSchema.parse(body);
    console.log('Parsed and transformed data:', JSON.stringify(data, null, 2));
    console.log('stationId value:', data.stationId, 'type:', typeof data.stationId);

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
    const createData = {
      prefix: data.prefix,
      stationId: data.stationId, // Already transformed by Zod (empty string -> null)
      userId: data.userId,
      model: data.model || '',
      serialNumber: data.serialNumber || '',
      isActive: data.isActive
    };
    
    console.log('Database create data:', JSON.stringify(createData, null, 2));
    console.log('Final stationId for DB:', createData.stationId, 'type:', typeof createData.stationId);
    
    // For office scanners (null stationId), don't include station to avoid ZenStack policy issues
    const includeStation = createData.stationId !== null;
    console.log('Including station in response:', includeStation);
    
    const scanner = await prisma.barcodeScanner.create({
      data: createData,
      include: {
        station: includeStation,
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
