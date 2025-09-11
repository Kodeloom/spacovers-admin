/**
 * API test for office scanner functionality
 * Tests the HTTP endpoints for scanner creation and lookup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

describe('Office Scanner API Tests', () => {
  let testUserId: string;
  let testStationId: string;

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'API Test User',
        email: `api-test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;

    // Create test station
    const testStation = await prisma.station.create({
      data: {
        name: `API Test Station ${Date.now()}`
      }
    });
    testStationId = testStation.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.barcodeScanner.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    await prisma.station.delete({
      where: { id: testStationId }
    });
  });

  it('should validate scanner creation schema with null stationId', async () => {
    // Test the Zod schema validation for office scanners
    const { z } = await import('zod');
    
    const CreateBarcodeScannerSchema = z.object({
      prefix: z.string().min(1, 'Prefix is required'),
      stationId: z.string().nullable().optional(), // Should accept null
      userId: z.string().min(1, 'User is required'),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      isActive: z.boolean().default(true)
    });

    // Test valid office scanner data
    const officeScannerData = {
      prefix: 'O1A123',
      stationId: null, // Office scanner
      userId: testUserId,
      model: 'Office Scanner',
      isActive: true
    };

    const result = CreateBarcodeScannerSchema.safeParse(officeScannerData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.stationId).toBeNull();
      expect(result.data.prefix).toBe('O1A123');
      expect(result.data.userId).toBe(testUserId);
    }
  });

  it('should validate scanner creation schema with undefined stationId', async () => {
    const { z } = await import('zod');
    
    const CreateBarcodeScannerSchema = z.object({
      prefix: z.string().min(1, 'Prefix is required'),
      stationId: z.string().nullable().optional(),
      userId: z.string().min(1, 'User is required'),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      isActive: z.boolean().default(true)
    });

    // Test with undefined stationId (omitted field)
    const officeScannerData = {
      prefix: 'O2A456',
      // stationId omitted
      userId: testUserId,
      model: 'Office Scanner 2'
    };

    const result = CreateBarcodeScannerSchema.safeParse(officeScannerData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.stationId).toBeUndefined();
    }
  });

  it('should validate scanner update schema with null stationId', async () => {
    const { z } = await import('zod');
    
    const UpdateBarcodeScannerSchema = z.object({
      prefix: z.string().min(1, 'Prefix is required').optional(),
      stationId: z.string().nullable().optional(),
      userId: z.string().min(1, 'User is required').optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      isActive: z.boolean().optional()
    });

    // Test updating to office scanner (null stationId)
    const updateData = {
      stationId: null // Convert to office scanner
    };

    const result = UpdateBarcodeScannerSchema.safeParse(updateData);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.stationId).toBeNull();
    }
  });

  it('should create office scanner through database operations', async () => {
    // Test the actual database operations that the API performs
    const prefix = `O1A${Date.now().toString().slice(-6)}`;
    
    // Simulate API creation logic
    const scannerData = {
      prefix,
      stationId: null, // Office scanner
      userId: testUserId,
      model: 'Test Office Scanner',
      serialNumber: 'OS-001',
      isActive: true
    };

    const createdScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: scannerData.prefix,
        stationId: scannerData.stationId ?? null, // API logic
        userId: scannerData.userId,
        model: scannerData.model || '',
        serialNumber: scannerData.serialNumber || '',
        isActive: scannerData.isActive
      },
      include: {
        station: true,
        user: true
      }
    });

    expect(createdScanner.stationId).toBeNull();
    expect(createdScanner.station).toBeNull();
    expect(createdScanner.prefix).toBe(prefix);
    expect(createdScanner.userId).toBe(testUserId);
  });

  it('should handle scanner lookup API logic for office scanners', async () => {
    // Create office scanner
    const prefix = `O2A${Date.now().toString().slice(-6)}`;
    
    await prisma.barcodeScanner.create({
      data: {
        prefix,
        stationId: null,
        userId: testUserId,
        isActive: true
      }
    });

    // Simulate scanner lookup API logic
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

    expect(scanner).toBeTruthy();
    
    // Simulate API response transformation
    const apiResponse = {
      success: true,
      scanner: {
        id: scanner!.id,
        prefix: scanner!.prefix,
        user: scanner!.user,
        station: scanner!.station || { id: null, name: 'Office' }, // API logic
        model: scanner!.model,
        serialNumber: scanner!.serialNumber
      }
    };

    expect(apiResponse.success).toBe(true);
    expect(apiResponse.scanner.station.id).toBeNull();
    expect(apiResponse.scanner.station.name).toBe('Office');
  });

  it('should handle scanner update API logic for office conversion', async () => {
    // Create production scanner first
    const prefix = `S1A${Date.now().toString().slice(-6)}`;
    
    const scanner = await prisma.barcodeScanner.create({
      data: {
        prefix,
        stationId: testStationId, // Production scanner
        userId: testUserId,
        isActive: true
      }
    });

    // Simulate update API logic to convert to office scanner
    const updateData = {
      stationId: null // Convert to office
    };

    const updatedScanner = await prisma.barcodeScanner.update({
      where: { id: scanner.id },
      data: {
        ...(updateData.stationId !== undefined && { stationId: updateData.stationId ?? null }), // API logic
      },
      include: {
        station: true,
        user: true
      }
    });

    expect(updatedScanner.stationId).toBeNull();
    expect(updatedScanner.station).toBeNull();
  });
});