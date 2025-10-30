import { PrismaClient } from "@prisma-app/client";
import { unenhancedPrisma } from "./db";

export interface PrintQueueRepository {
  addItems(orderItemIds: string[], addedBy?: string): Promise<PrintQueueItem[]>;
  removeItems(queueItemIds: string[]): Promise<void>;
  getUnprintedItems(): Promise<PrintQueueItem[]>;
  markAsPrinted(queueItemIds: string[], printedBy?: string): Promise<void>;
  getOldestBatch(batchSize: number): Promise<PrintQueueItem[]>;
}

export interface PrintQueueItem {
  id: string;
  orderItemId: string;
  orderItem: any; // Will be populated with relations
  isPrinted: boolean;
  addedAt: Date;
  printedAt?: Date;
  addedBy?: string;
  printedBy?: string;
}

export class PrintQueueRepositoryImpl implements PrintQueueRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = unenhancedPrisma) {
    this.prisma = prisma;
  }

  /**
   * Add order items to the print queue with enhanced error handling
   * @param orderItemIds - Array of order item IDs to add to queue
   * @param addedBy - Optional user ID who added the items
   * @returns Array of created print queue items
   */
  async addItems(orderItemIds: string[], addedBy?: string): Promise<PrintQueueItem[]> {
    if (!orderItemIds || orderItemIds.length === 0) {
      return [];
    }

    try {
      // Validate order item IDs exist before adding to queue
      const validOrderItems = await this.prisma.orderItem.findMany({
        where: {
          id: {
            in: orderItemIds,
          },
        },
        select: {
          id: true,
        },
      });

      const validOrderItemIds = validOrderItems.map(item => item.id);
      const invalidIds = orderItemIds.filter(id => !validOrderItemIds.includes(id));

      if (invalidIds.length > 0) {
        console.warn(`Found ${invalidIds.length} invalid order item IDs:`, invalidIds);
      }

      if (validOrderItemIds.length === 0) {
        console.warn('No valid order items found for print queue addition');
        return [];
      }

      // Filter out items that are already in the queue
      const existingItems = await this.prisma.printQueue.findMany({
        where: {
          orderItemId: {
            in: validOrderItemIds,
          },
        },
        select: {
          orderItemId: true,
        },
      });

      const existingOrderItemIds = existingItems.map(item => item.orderItemId);
      const newOrderItemIds = validOrderItemIds.filter(id => !existingOrderItemIds.includes(id));

      if (newOrderItemIds.length === 0) {
        // All items are already in queue, return existing items
        console.log(`All ${validOrderItemIds.length} items already in print queue`);
        return this.getItemsByOrderItemIds(validOrderItemIds);
      }

      // Create new queue items with transaction for data integrity
      const createData = newOrderItemIds.map(orderItemId => ({
        orderItemId,
        addedBy,
        isPrinted: false,
        addedAt: new Date(),
      }));

      await this.prisma.$transaction(async (tx) => {
        await tx.printQueue.createMany({
          data: createData,
        });
      });

      console.log(`Successfully added ${newOrderItemIds.length} new items to print queue`);

      // Return all requested items (existing + newly created)
      return this.getItemsByOrderItemIds(validOrderItemIds);
    } catch (error) {
      console.error('Error adding items to print queue:', {
        error: error.message,
        code: error.code,
        orderItemCount: orderItemIds?.length || 0,
        addedBy: addedBy ? 'present' : 'none'
      });

      // Re-throw with more specific error information
      if (error.code && error.code.startsWith('P')) {
        // Prisma error - preserve the original error for proper handling upstream
        throw error;
      }

      // Generic database error
      const dbError = new Error('Failed to add items to print queue');
      dbError.name = 'DatabaseError';
      throw dbError;
    }
  }

  /**
   * Remove items from the print queue
   * @param queueItemIds - Array of print queue item IDs to remove
   */
  async removeItems(queueItemIds: string[]): Promise<void> {
    if (!queueItemIds || queueItemIds.length === 0) {
      return;
    }

    try {
      await this.prisma.printQueue.deleteMany({
        where: {
          id: {
            in: queueItemIds,
          },
        },
      });
    } catch (error) {
      console.error('Error removing items from print queue:', error);
      throw new Error('Failed to remove items from print queue');
    }
  }

  /**
   * Get unprinted items from the queue with proper FIFO ordering
   * Optimized for large datasets with pagination and selective loading
   * @param limit - Maximum number of items to return (default: 1000)
   * @param offset - Number of items to skip (default: 0)
   * @param includeFullDetails - Whether to include full order details (default: true)
   * @returns Array of unprinted print queue items ordered by addedAt (oldest first)
   */
  async getUnprintedItems(
    limit: number = 1000, 
    offset: number = 0,
    includeFullDetails: boolean = true
  ): Promise<PrintQueueItem[]> {
    try {
      // For large datasets, use selective loading based on requirements
      const baseQuery = {
        where: {
          isPrinted: false,
        },
        orderBy: {
          addedAt: 'asc', // FIFO ordering - oldest first
        },
        take: limit,
        skip: offset,
      };

      if (includeFullDetails) {
        // Full details for UI display
        const items = await this.prisma.printQueue.findMany({
          ...baseQuery,
          include: {
            orderItem: {
              include: {
                order: {
                  select: {
                    id: true,
                    salesOrderNumber: true,
                    customerId: true,
                    customer: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                item: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                product: {
                  select: {
                    id: true,
                    displayName: true,
                    fullDescription: true,
                  },
                },
                productAttributes: {
                  select: {
                    id: true,
                    color: true,
                    size: true,
                    shape: true,
                    tieDownLength: true,
                    poNumber: true,
                  },
                },
              },
            },
          },
        });
        return items;
      } else {
        // Minimal details for batch processing
        const items = await this.prisma.printQueue.findMany({
          ...baseQuery,
          include: {
            orderItem: {
              select: {
                id: true,
                orderId: true,
                itemId: true,
                quantity: true,
                order: {
                  select: {
                    id: true,
                    salesOrderNumber: true,
                    customerId: true,
                  },
                },
                item: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
        return items;
      }
    } catch (error) {
      console.error('Error getting unprinted items from print queue:', error);
      throw new Error('Failed to retrieve unprinted items from print queue');
    }
  }

  /**
   * Get count of unprinted items for pagination
   * @returns Number of unprinted items in queue
   */
  async getUnprintedItemsCount(): Promise<number> {
    try {
      return await this.prisma.printQueue.count({
        where: {
          isPrinted: false,
        },
      });
    } catch (error) {
      console.error('Error getting unprinted items count:', error);
      throw new Error('Failed to get unprinted items count');
    }
  }

  /**
   * Mark items as printed and update print status with enhanced error handling
   * @param queueItemIds - Array of print queue item IDs to mark as printed
   * @param printedBy - Optional user ID who marked the items as printed
   */
  async markAsPrinted(queueItemIds: string[], printedBy?: string): Promise<void> {
    if (!queueItemIds || queueItemIds.length === 0) {
      return;
    }

    try {
      // First, verify which items exist and are not already printed
      const existingItems = await this.prisma.printQueue.findMany({
        where: {
          id: {
            in: queueItemIds,
          },
          isPrinted: false,
        },
        select: {
          id: true,
          orderItemId: true,
        },
      });

      const existingIds = existingItems.map(item => item.id);
      const missingIds = queueItemIds.filter(id => !existingIds.includes(id));

      if (missingIds.length > 0) {
        console.warn(`${missingIds.length} items not found or already printed:`, missingIds);
      }

      if (existingIds.length === 0) {
        console.warn('No valid unprinted items found to mark as printed');
        return;
      }

      // Use transaction to ensure data consistency
      const result = await this.prisma.$transaction(async (tx) => {
        const updateResult = await tx.printQueue.updateMany({
          where: {
            id: {
              in: existingIds,
            },
            isPrinted: false, // Double-check to prevent race conditions
          },
          data: {
            isPrinted: true,
            printedAt: new Date(),
            printedBy,
          },
        });

        return updateResult;
      });

      console.log(`Successfully marked ${result.count} items as printed`, {
        requestedItems: queueItemIds.length,
        updatedItems: result.count,
        printedBy: printedBy || 'unknown'
      });

      if (result.count !== existingIds.length) {
        console.warn(`Expected to update ${existingIds.length} items but updated ${result.count}`);
      }

    } catch (error) {
      console.error('Error marking items as printed:', {
        error: error.message,
        code: error.code,
        queueItemCount: queueItemIds?.length || 0,
        printedBy: printedBy ? 'present' : 'none'
      });

      // Re-throw with more specific error information
      if (error.code && error.code.startsWith('P')) {
        // Prisma error - preserve the original error for proper handling upstream
        throw error;
      }

      // Generic database error
      const dbError = new Error('Failed to mark items as printed');
      dbError.name = 'DatabaseError';
      throw dbError;
    }
  }

  /**
   * Get the oldest batch of items for printing
   * Optimized for performance with selective field loading
   * @param batchSize - Number of items to retrieve (typically 4)
   * @param includeFullDetails - Whether to include full details for printing (default: true)
   * @returns Array of oldest unprinted items up to batchSize
   */
  async getOldestBatch(batchSize: number = 4, includeFullDetails: boolean = true): Promise<PrintQueueItem[]> {
    if (batchSize <= 0) {
      return [];
    }

    try {
      const baseQuery = {
        where: {
          isPrinted: false,
        },
        orderBy: {
          addedAt: 'asc', // FIFO ordering - oldest first
        },
        take: batchSize,
      };

      if (includeFullDetails) {
        // Full details needed for printing packing slips
        const items = await this.prisma.printQueue.findMany({
          ...baseQuery,
          include: {
            orderItem: {
              include: {
                order: {
                  select: {
                    id: true,
                    salesOrderNumber: true,
                    customerId: true,
                    contactEmail: true,
                    contactPhoneNumber: true,
                    shippingAddressLine1: true,
                    shippingAddressLine2: true,
                    shippingCity: true,
                    shippingState: true,
                    shippingZipCode: true,
                    customer: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                item: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                product: {
                  select: {
                    id: true,
                    displayName: true,
                    fullDescription: true,
                  },
                },
                productAttributes: {
                  select: {
                    id: true,
                    color: true,
                    size: true,
                    shape: true,
                    tieDownLength: true,
                    skirtLength: true,
                    tieDownsQty: true,
                    foamUpgrade: true,
                    notes: true,
                    // Exclude poNumber from packing slip as per requirements
                  },
                },
              },
            },
          },
        });
        return items;
      } else {
        // Minimal details for batch operations
        const items = await this.prisma.printQueue.findMany({
          ...baseQuery,
          include: {
            orderItem: {
              select: {
                id: true,
                orderId: true,
                order: {
                  select: {
                    id: true,
                    salesOrderNumber: true,
                  },
                },
              },
            },
          },
        });
        return items;
      }
    } catch (error) {
      console.error('Error getting oldest batch from print queue:', error);
      throw new Error('Failed to retrieve oldest batch from print queue');
    }
  }

  /**
   * Helper method to get print queue items by order item IDs
   * @param orderItemIds - Array of order item IDs
   * @returns Array of print queue items
   */
  private async getItemsByOrderItemIds(orderItemIds: string[]): Promise<PrintQueueItem[]> {
    return this.prisma.printQueue.findMany({
      where: {
        orderItemId: {
          in: orderItemIds,
        },
      },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                salesOrderNumber: true,
                customerId: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            item: {
              select: {
                id: true,
                name: true,
              },
            },
            product: {
              select: {
                id: true,
                displayName: true,
                fullDescription: true,
              },
            },
            productAttributes: true,
          },
        },
      },
      orderBy: {
        addedAt: 'asc',
      },
    });
  }
}

// Export a default instance for convenience
export const printQueueRepository = new PrintQueueRepositoryImpl();