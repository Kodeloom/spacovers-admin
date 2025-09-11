import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

describe('Office Scanner Support', () => {
  let testUserId: string;
  let testStationId: string;

  beforeEach(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        status: 'ACTIVE'
      }
    });
    testUserId = testUser.id;

    // Create a test station
    const testStation = await prisma.station.create({
      data: {
        name: `Test Station ${Date.now()}`
      }
    });
    testStationId = testStation.id;
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

  it('should create scanner with null stationId for office use', async () => {
    const scanner = await prisma.barcodeScanner.create({
      data: {
        prefix: `O1A-${Date.now()}`,
        stationId: null, // Office scanner with no station
        userId: testUserId,
        model: 'Test Office Scanner',
        isActive: true
      }
    });

    expect(scanner.stationId).toBeNull();
    expect(scanner.prefix).toContain('O1A');
    expect(scanner.userId).toBe(testUserId);
  });

  it('should create scanner with stationId for production use', async () => {
    const scanner = await prisma.barcodeScanner.create({
      data: {
        prefix: `S1A-${Date.now()}`,
        stationId: testStationId,
        userId: testUserId,
        model: 'Test Production Scanner',
        isActive: true
      }
    });

    expect(scanner.stationId).toBe(testStationId);
    expect(scanner.prefix).toContain('S1A');
    expect(scanner.userId).toBe(testUserId);
  });

  it('should handle scanner lookup with null stationId', async () => {
    const prefix = `O2A-${Date.now()}`;
    
    // Create office scanner
    await prisma.barcodeScanner.create({
      data: {
        prefix,
        stationId: null,
        userId: testUserId,
        isActive: true
      }
    });

    // Lookup scanner
    const scanner = await prisma.barcodeScanner.findUnique({
      where: { prefix },
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
    expect(scanner?.stationId).toBeNull();
    expect(scanner?.station).toBeNull();
    expect(scanner?.user.id).toBe(testUserId);
  });

  it('should handle migration from existing scanners', async () => {
    // Test that existing scanners with stationId still work
    const prefix = `C1A-${Date.now()}`;
    
    const scanner = await prisma.barcodeScanner.create({
      data: {
        prefix,
        stationId: testStationId,
        userId: testUserId,
        isActive: true
      }
    });

    expect(scanner.stationId).toBe(testStationId);

    // Update to office scanner (simulate migration scenario)
    const updatedScanner = await prisma.barcodeScanner.update({
      where: { id: scanner.id },
      data: { stationId: null }
    });

    expect(updatedScanner.stationId).toBeNull();
  });
});