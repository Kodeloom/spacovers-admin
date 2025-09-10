import { z } from 'zod';
import { getEnhancedPrismaClient } from '~/server/lib/db';

const ScannerLookupSchema = z.object({
  prefix: z.string().min(1, 'Scanner prefix is required')
});

export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event);
    const { prefix } = ScannerLookupSchema.parse(body);

    const prisma = await getEnhancedPrismaClient(event);

    // Look up the scanner with user and station information
    const scanner = await prisma.barcodeScanner.findUnique({
      where: { 
        prefix: prefix,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!scanner) {
      throw createError({
        statusCode: 404,
        statusMessage: `Scanner with prefix "${prefix}" not found or not active`
      });
    }

    return {
      success: true,
      scanner: {
        id: scanner.id,
        prefix: scanner.prefix,
        user: scanner.user,
        station: scanner.station || { id: null, name: 'Office' }, // Default to Office for scanners without station
        model: scanner.model,
        serialNumber: scanner.serialNumber
      }
    };

  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Scanner lookup error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to lookup scanner information'
    });
  }
});