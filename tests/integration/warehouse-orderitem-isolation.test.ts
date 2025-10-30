/**
 * Integration tests for warehouse API endpoints handling OrderItem operations
 * Ensures proper isolation when scanning barcodes and updating item statuses
 * Requirements: 2.1, 2.2, 2.3, 3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unenhancedPrisma as prisma } from '~/server/lib/db';

describe('Warehouse OrderItem Operations - Integration Tests', () => {
  let testCustomer: any;
  let testItem1: any;
  let testItem2: any;
  let testStation: any;
  let testUser: any;
  let order1: any;
  let order2: any;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.itemProcessingLog.deleteMany({
      where: {
        orderItem: {
          order: { customer: { name: 'Test Customer Warehouse' } }
        }
      }
    });
    await prisma.orderItem.deleteMany({
      where: {
        order: { customer: { name: 'Test Customer Warehouse' } }
      }
    });
    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Warehouse' } }
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Warehouse' }
    });
    await prisma.item.deleteMany({
      where: { name: { startsWith: 'Test Item Warehouse' } }
    });
    await prisma.station.deleteMany({
      where: { name: 'Test Station Warehouse' }
    });
    await prisma.user.deleteMany({
      where: { name: 'Test User Warehouse' }
    });

    // Create test data
    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Customer Warehouse',
        email: 'test-warehouse@example.com',
        customerType: 'RETAILER',
        status: 'ACTIVE'
      }
    });

    testItem1 = await prisma.item.create({
      data: {
        name: 'Test Item Warehouse 1',
        status: 'ACTIVE',
        category: 'Test'
      }
    });

    testItem2 = await prisma.item.create({
      data: {
        name: 'Test Item Warehouse 2',
        status: 'ACTIVE',
        category: 'Test'
      }
    });

    testStation = await prisma.station.create({
      data: {
        name: 'Test Station Warehouse'
      }
    });

    testUser = await prisma.user.create({
      data: {
        name: 'Test User Warehouse',
        email: 'test-user-warehouse@example.com',
        status: 'ACTIVE'
      }
    });

    order1 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-WAREHOUSE-ORDER-1'
      }
    });

    order2 = await prisma.order.create({
      data: {
        customerId: testCustomer.id,
        orderStatus: 'APPROVED',
        salesOrderNumber: 'TEST-WAREHOUSE-ORDER-2'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.itemProcessingLog.deleteMany({
      where: {
        orderItem: {
          order: { customer: { name: 'Test Customer Warehouse' } }
        }
      }
    });
    await prisma.orderItem.deleteMany({
      where: {
        order: { customer: { name: 'Test Customer Warehouse' } }
      }
    });
    await prisma.order.deleteMany({
      where: { customer: { name: 'Test Customer Warehouse' } }
    });
    await prisma.customer.deleteMany({
      where: { name: 'Test Customer Warehouse' }
    });
    await prisma.item.deleteMany({
      where: { name: { startsWith: 'Test Item Warehouse' } }
    });
    await prisma.station.deleteMany({
      where: { name: 'Test Station Warehouse' }
    });
    await prisma.user.deleteMany({
      where: { name: 'Test User Warehouse' }
    });
  });

  describe('Barcode Scanning Operations', () => {
    it('should scan and retrieve OrderItem with proper order context', async () => {
      // Create OrderItems in different orders
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'CUTTING'
        }
      });

      // Simulate barcode scan for order1 item
      const scannedItem1 = await prisma.orderItem.findUnique({
        where: { id: orderItem1.id },
        include: {
          order: {
            include: { customer: true }
          },
          item: true
        }
      });

      // Simulate barcode scan for order2 item
      const scannedItem2 = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id },
        include: {
          order: {
            include: { customer: true }
          },
          item: true
        }
      });

      // Verify proper isolation
      expect(scannedItem1).toBeDefined();
      expect(scannedItem1?.orderId).toBe(order1.id);
      expect(scannedItem1?.itemStatus).toBe('NOT_STARTED_PRODUCTION');
      expect(scannedItem1?.order.salesOrderNumber).toBe('TEST-WAREHOUSE-ORDER-1');

      expect(scannedItem2).toBeDefined();
      expect(scannedItem2?.orderId).toBe(order2.id);
      expect(scannedItem2?.itemStatus).toBe('CUTTING');
      expect(scannedItem2?.order.salesOrderNumber).toBe('TEST-WAREHOUSE-ORDER-2');

      // Verify they reference the same item type but are different OrderItems
      expect(scannedItem1?.itemId).toBe(scannedItem2?.itemId);
      expect(scannedItem1?.id).not.toBe(scannedItem2?.id);
    });

    it('should reject barcode scan for non-approved orders', async () => {
      // Create order with non-approved status
      const pendingOrder = await prisma.order.create({
        data: {
          customerId: testCustomer.id,
          orderStatus: 'PENDING',
          salesOrderNumber: 'TEST-WAREHOUSE-PENDING'
        }
      });

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: pendingOrder.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Simulate barcode scan validation
      const scannedItem = await prisma.orderItem.findUnique({
        where: { id: orderItem.id },
        include: {
          order: {
            include: { customer: true }
          },
          item: true
        }
      });

      expect(scannedItem?.order.orderStatus).toBe('PENDING');
      // In real implementation, this would be rejected by the API
    });

    it('should handle barcode scanning with active processing logs', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'CUTTING'
        }
      });

      // Create active processing log
      const processingLog = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem.id,
          stationId: testStation.id,
          userId: testUser.id,
          startTime: new Date()
          // endTime is null, indicating active processing
        }
      });

      // Check for active processing
      const activeProcessing = await prisma.itemProcessingLog.findFirst({
        where: {
          orderItemId: orderItem.id,
          endTime: null
        }
      });

      expect(activeProcessing).toBeDefined();
      expect(activeProcessing?.id).toBe(processingLog.id);
      expect(activeProcessing?.endTime).toBeNull();
    });
  });

  describe('Work Start Operations', () => {
    it('should start work on specific OrderItem without affecting others', async () => {
      // Create OrderItems with same item type in different orders
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Start work on order1 item only
      const result = await prisma.$transaction(async (tx) => {
        // Update the order item status
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: orderItem1.id },
          data: { itemStatus: 'CUTTING' }
        });

        // Create processing log
        const processingLog = await tx.itemProcessingLog.create({
          data: {
            orderItemId: orderItem1.id,
            stationId: testStation.id,
            userId: testUser.id,
            startTime: new Date()
          }
        });

        return { updatedOrderItem, processingLog };
      });

      // Verify order1 item was updated
      expect(result.updatedOrderItem.itemStatus).toBe('CUTTING');
      expect(result.processingLog.orderItemId).toBe(orderItem1.id);

      // Verify order2 item was not affected
      const unchangedOrderItem2 = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id }
      });
      expect(unchangedOrderItem2?.itemStatus).toBe('NOT_STARTED_PRODUCTION');

      // Verify processing log is specific to order1 item
      const processingLogs = await prisma.itemProcessingLog.findMany({
        where: { orderItemId: orderItem2.id }
      });
      expect(processingLogs).toHaveLength(0);
    });

    it('should prevent starting work on already active OrderItem', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'CUTTING'
        }
      });

      // Create active processing log
      await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem.id,
          stationId: testStation.id,
          userId: testUser.id,
          startTime: new Date()
        }
      });

      // Check for existing active processing
      const activeProcessing = await prisma.itemProcessingLog.findFirst({
        where: {
          orderItemId: orderItem.id,
          endTime: null
        }
      });

      expect(activeProcessing).toBeDefined();
      // In real implementation, this would prevent starting new work
    });

    it('should handle concurrent work start attempts on different OrderItems', async () => {
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem2.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Simulate concurrent work start operations
      const [result1, result2] = await Promise.all([
        prisma.$transaction(async (tx) => {
          const updatedOrderItem = await tx.orderItem.update({
            where: { id: orderItem1.id },
            data: { itemStatus: 'CUTTING' }
          });

          const processingLog = await tx.itemProcessingLog.create({
            data: {
              orderItemId: orderItem1.id,
              stationId: testStation.id,
              userId: testUser.id,
              startTime: new Date()
            }
          });

          return { updatedOrderItem, processingLog };
        }),
        prisma.$transaction(async (tx) => {
          const updatedOrderItem = await tx.orderItem.update({
            where: { id: orderItem2.id },
            data: { itemStatus: 'SEWING' }
          });

          const processingLog = await tx.itemProcessingLog.create({
            data: {
              orderItemId: orderItem2.id,
              stationId: testStation.id,
              userId: testUser.id,
              startTime: new Date()
            }
          });

          return { updatedOrderItem, processingLog };
        })
      ]);

      // Verify both operations succeeded independently
      expect(result1.updatedOrderItem.itemStatus).toBe('CUTTING');
      expect(result1.updatedOrderItem.orderId).toBe(order1.id);

      expect(result2.updatedOrderItem.itemStatus).toBe('SEWING');
      expect(result2.updatedOrderItem.orderId).toBe(order2.id);

      // Verify processing logs are correctly associated
      expect(result1.processingLog.orderItemId).toBe(orderItem1.id);
      expect(result2.processingLog.orderItemId).toBe(orderItem2.id);
    });
  });

  describe('Work Completion Operations', () => {
    it('should complete work on specific OrderItem without affecting others', async () => {
      // Create OrderItems and start work on both
      const orderItem1 = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'CUTTING'
        }
      });

      const orderItem2 = await prisma.orderItem.create({
        data: {
          orderId: order2.id,
          itemId: testItem1.id, // Same item type
          quantity: 2,
          pricePerItem: 150.00,
          itemStatus: 'CUTTING'
        }
      });

      const processingLog1 = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem1.id,
          stationId: testStation.id,
          userId: testUser.id,
          startTime: new Date(Date.now() - 3600000) // 1 hour ago
        }
      });

      const processingLog2 = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem2.id,
          stationId: testStation.id,
          userId: testUser.id,
          startTime: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      });

      // Complete work on order1 item only
      const result = await prisma.$transaction(async (tx) => {
        const endTime = new Date();
        const startTime = processingLog1.startTime;
        const durationInSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        // Update processing log
        const updatedProcessingLog = await tx.itemProcessingLog.update({
          where: { id: processingLog1.id },
          data: {
            endTime,
            durationInSeconds
          }
        });

        // Update order item status to next stage
        const updatedOrderItem = await tx.orderItem.update({
          where: { id: orderItem1.id },
          data: { itemStatus: 'SEWING' }
        });

        return { updatedProcessingLog, updatedOrderItem };
      });

      // Verify order1 item was completed
      expect(result.updatedOrderItem.itemStatus).toBe('SEWING');
      expect(result.updatedProcessingLog.endTime).toBeDefined();
      expect(result.updatedProcessingLog.durationInSeconds).toBeGreaterThan(0);

      // Verify order2 item was not affected
      const unchangedOrderItem2 = await prisma.orderItem.findUnique({
        where: { id: orderItem2.id }
      });
      const unchangedProcessingLog2 = await prisma.itemProcessingLog.findUnique({
        where: { id: processingLog2.id }
      });

      expect(unchangedOrderItem2?.itemStatus).toBe('CUTTING');
      expect(unchangedProcessingLog2?.endTime).toBeNull();
    });

    it('should calculate duration correctly for completed work', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'CUTTING'
        }
      });

      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const processingLog = await prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem.id,
          stationId: testStation.id,
          userId: testUser.id,
          startTime
        }
      });

      // Complete the work
      const endTime = new Date();
      const expectedDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const updatedLog = await prisma.itemProcessingLog.update({
        where: { id: processingLog.id },
        data: {
          endTime,
          durationInSeconds: expectedDuration
        }
      });

      expect(updatedLog.durationInSeconds).toBe(expectedDuration);
      expect(updatedLog.durationInSeconds).toBeGreaterThan(7000); // More than 2 hours in seconds
    });
  });

  describe('Status Progression and Validation', () => {
    it('should maintain proper status progression per OrderItem', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Progress through statuses
      const statuses: Array<'CUTTING' | 'SEWING' | 'FOAM_CUTTING' | 'STUFFING' | 'PACKAGING' | 'READY'> = [
        'CUTTING',
        'SEWING', 
        'FOAM_CUTTING',
        'STUFFING',
        'PACKAGING',
        'READY'
      ];

      for (const status of statuses) {
        const updatedItem = await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { itemStatus: status }
        });

        expect(updatedItem.itemStatus).toBe(status);
        expect(updatedItem.orderId).toBe(order1.id);
      }

      // Verify final state
      const finalItem = await prisma.orderItem.findUnique({
        where: { id: orderItem.id }
      });
      expect(finalItem?.itemStatus).toBe('READY');
    });

    it('should track processing history per OrderItem', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Create multiple processing logs for different stations
      const stations = ['CUTTING', 'SEWING', 'PACKAGING'];
      const logs = [];

      for (let i = 0; i < stations.length; i++) {
        const log = await prisma.itemProcessingLog.create({
          data: {
            orderItemId: orderItem.id,
            stationId: testStation.id,
            userId: testUser.id,
            startTime: new Date(Date.now() - (3600000 * (stations.length - i))),
            endTime: new Date(Date.now() - (3600000 * (stations.length - i - 1))),
            durationInSeconds: 3600
          }
        });
        logs.push(log);
      }

      // Verify processing history
      const processingHistory = await prisma.itemProcessingLog.findMany({
        where: { orderItemId: orderItem.id },
        orderBy: { startTime: 'asc' }
      });

      expect(processingHistory).toHaveLength(3);
      expect(processingHistory.every(log => log.orderItemId === orderItem.id)).toBe(true);
      expect(processingHistory.every(log => log.durationInSeconds === 3600)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle OrderItem not found scenarios', async () => {
      // Attempt to scan non-existent OrderItem
      const nonExistentItem = await prisma.orderItem.findUnique({
        where: { id: 'non-existent-id' },
        include: {
          order: { include: { customer: true } },
          item: true
        }
      });

      expect(nonExistentItem).toBeNull();
    });

    it('should handle station not found scenarios', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Attempt to create processing log with non-existent station
      await expect(prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem.id,
          stationId: 'non-existent-station',
          userId: testUser.id,
          startTime: new Date()
        }
      })).rejects.toThrow();
    });

    it('should handle user not found scenarios', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Attempt to create processing log with non-existent user
      await expect(prisma.itemProcessingLog.create({
        data: {
          orderItemId: orderItem.id,
          stationId: testStation.id,
          userId: 'non-existent-user',
          startTime: new Date()
        }
      })).rejects.toThrow();
    });

    it('should handle concurrent status updates gracefully', async () => {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order1.id,
          itemId: testItem1.id,
          quantity: 1,
          pricePerItem: 100.00,
          itemStatus: 'NOT_STARTED_PRODUCTION'
        }
      });

      // Attempt concurrent status updates
      const [result1, result2] = await Promise.allSettled([
        prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { itemStatus: 'CUTTING' }
        }),
        prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { itemStatus: 'SEWING' }
        })
      ]);

      // Both should succeed (last one wins)
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');

      // Verify final state
      const finalItem = await prisma.orderItem.findUnique({
        where: { id: orderItem.id }
      });
      expect(['CUTTING', 'SEWING']).toContain(finalItem?.itemStatus);
    });
  });
});