import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

describe('Office Scanner Integration Tests', () => {
  let testUserId: string;
  let testStationId: string;
  let officeScannerPrefix: string;

  beforeEach(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Office Test User',
        email: `office-test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;

    // Create a test station for comparison
    const testStation = await prisma.station.create({
      data: {
        name: `Test Station ${Date.now()}`
      }
    });
    testStationId = testStation.id;

    officeScannerPrefix = `O1A${Date.now().toString().slice(-3)}`;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.barcodeScanner.deleteMany({
      where: {
        userId: testUserId
      }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    await prisma.station.delete({
      where: { id: testStationId }
    });
  });

  it('should create office scanner through API workflow', async () => {
    // Test the complete workflow: create -> lookup -> update
    
    // 1. Create office scanner with null stationId
    const createdScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: officeScannerPrefix,
        stationId: null, // Office scanner
        userId: testUserId,
        model: 'Office Scanner Model',
        isActive: true
      },
      include: {
        station: true,
        user: true
      }
    });

    expect(createdScanner.stationId).toBeNull();
    expect(createdScanner.station).toBeNull();
    expect(createdScanner.prefix).toBe(officeScannerPrefix);

    // 2. Test scanner lookup (simulating API behavior)
    const lookedUpScanner = await prisma.barcodeScanner.findUnique({
      where: { 
        prefix: officeScannerPrefix,
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

    expect(lookedUpScanner).toBeTruthy();
    expect(lookedUpScanner?.stationId).toBeNull();
    expect(lookedUpScanner?.station).toBeNull();
    
    // Simulate the API response transformation
    const apiResponse = {
      success: true,
      scanner: {
        id: lookedUpScanner!.id,
        prefix: lookedUpScanner!.prefix,
        user: lookedUpScanner!.user,
        station: lookedUpScanner!.station || { id: null, name: 'Office' },
        model: lookedUpScanner!.model,
        serialNumber: lookedUpScanner!.serialNumber
      }
    };

    expect(apiResponse.scanner.station.name).toBe('Office');
    expect(apiResponse.scanner.station.id).toBeNull();

    // 3. Test updating scanner from office to production station
    const updatedScanner = await prisma.barcodeScanner.update({
      where: { id: createdScanner.id },
      data: { stationId: testStationId },
      include: {
        station: true,
        user: true
      }
    });

    expect(updatedScanner.stationId).toBe(testStationId);
    expect(updatedScanner.station?.id).toBe(testStationId);

    // 4. Test updating scanner back to office (null stationId)
    const backToOfficeScanner = await prisma.barcodeScanner.update({
      where: { id: createdScanner.id },
      data: { stationId: null },
      include: {
        station: true,
        user: true
      }
    });

    expect(backToOfficeScanner.stationId).toBeNull();
    expect(backToOfficeScanner.station).toBeNull();
  });

  it('should handle mixed scanner types in queries', async () => {
    // Create both office and production scanners
    const officeScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: `O2A${Date.now().toString().slice(-3)}`,
        stationId: null,
        userId: testUserId,
        isActive: true
      }
    });

    const productionScanner = await prisma.barcodeScanner.create({
      data: {
        prefix: `S1A${Date.now().toString().slice(-3)}`,
        stationId: testStationId,
        userId: testUserId,
        isActive: true
      }
    });

    // Query all scanners for this user
    const userScanners = await prisma.barcodeScanner.findMany({
      where: { userId: testUserId },
      include: { station: true }
    });

    expect(userScanners).toHaveLength(2);
    
    const office = userScanners.find(s => s.stationId === null);
    const production = userScanners.find(s => s.stationId === testStationId);

    expect(office).toBeTruthy();
    expect(office?.station).toBeNull();
    
    expect(production).toBeTruthy();
    expect(production?.station?.id).toBe(testStationId);
  });

  it('should validate office scanner prefix format', async () => {
    // Test that office scanner prefixes follow the expected format
    const validOfficePrefixes = ['O1A', 'O2B', 'O9Z'];
    
    for (const prefix of validOfficePrefixes) {
      const scanner = await prisma.barcodeScanner.create({
        data: {
          prefix: `${prefix}${Date.now().toString().slice(-3)}`,
          stationId: null,
          userId: testUserId,
          isActive: true
        }
      });
      
      expect(scanner.prefix).toContain(prefix);
      expect(scanner.stationId).toBeNull();
    }
  });
});