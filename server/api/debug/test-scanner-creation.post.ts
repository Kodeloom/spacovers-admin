/**
 * Debug endpoint to test scanner creation with regular Prisma client
 * This bypasses ZenStack to isolate the issue
 */

import { z } from 'zod';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

const CreateBarcodeScannerSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  stationId: z.string().nullable().optional().transform(val => val === '' ? null : val),
  userId: z.string().min(1, 'User is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  isActive: z.boolean().default(true)
});

export default defineEventHandler(async (event) => {
  try {
    console.log('🔧 DEBUG: Testing scanner creation with regular Prisma client');
    
    // Parse and validate request body
    const body = await readBody(event);
    console.log('Raw request body:', JSON.stringify(body, null, 2));
    
    const data = CreateBarcodeScannerSchema.parse(body);
    console.log('Parsed and transformed data:', JSON.stringify(data, null, 2));
    console.log('stationId value:', data.stationId, 'type:', typeof data.stationId);
    
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

    // Create the barcode scanner using regular Prisma client
    const createData = {
      prefix: data.prefix,
      stationId: data.stationId,
      userId: data.userId,
      model: data.model || '',
      serialNumber: data.serialNumber || '',
      isActive: data.isActive
    };
    
    console.log('Database create data:', JSON.stringify(createData, null, 2));
    console.log('Final stationId for DB:', createData.stationId, 'type:', typeof createData.stationId);
    
    const scanner = await prisma.barcodeScanner.create({
      data: createData,
      include: {
        station: true,
        user: true
      }
    });

    console.log('✅ Scanner created successfully with regular Prisma client!');
    console.log('Scanner data:', JSON.stringify(scanner, null, 2));

    return {
      success: true,
      message: 'Scanner created with regular Prisma client',
      scanner,
      debug: {
        originalStationId: body.stationId,
        transformedStationId: data.stationId,
        finalStationId: createData.stationId
      }
    };
  } catch (error: any) {
    console.error('❌ DEBUG: Scanner creation failed:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    });
  }
});