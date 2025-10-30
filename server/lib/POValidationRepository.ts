import { PrismaClient } from "@prisma-app/client";
import { unenhancedPrisma } from "./db";

export interface POValidationRepository {
  findOrdersByPO(poNumber: string, customerId: string): Promise<any[]>;
  findItemsByPO(poNumber: string, customerId: string): Promise<any[]>;
}

export class POValidationRepositoryImpl implements POValidationRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient = unenhancedPrisma) {
    this.prisma = prisma;
  }

  /**
   * Find orders with the specified PO number for a given customer with enhanced error handling
   * @param poNumber - The PO number to search for
   * @param customerId - The customer ID to scope the search to
   * @returns Array of orders with matching PO number
   */
  async findOrdersByPO(poNumber: string, customerId: string): Promise<any[]> {
    if (!poNumber || !customerId) {
      return [];
    }

    try {
      // Add timeout to prevent hanging queries
      const queryPromise = this.prisma.order.findMany({
        where: {
          poNumber: poNumber,
          customerId: customerId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Set a reasonable timeout for the query (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 30000);
      });

      const orders = await Promise.race([queryPromise, timeoutPromise]) as any[];

      // Validate the results
      if (!Array.isArray(orders)) {
        console.error('Invalid response from database - expected array, got:', typeof orders);
        throw new Error('Invalid database response format');
      }

      return orders;
    } catch (error) {
      console.error('Error finding orders by PO number:', {
        error: error.message,
        code: error.code,
        poNumber: poNumber ? 'present' : 'missing',
        customerId: customerId ? 'present' : 'missing'
      });

      // Re-throw with more specific error information
      if (error.message === 'Database query timeout') {
        const timeoutError = new Error('Database query timed out while searching for orders');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      if (error.code && error.code.startsWith('P')) {
        // Prisma error - preserve the original error for proper handling upstream
        throw error;
      }

      // Generic database error
      const dbError = new Error('Failed to search orders by PO number');
      dbError.name = 'DatabaseError';
      throw dbError;
    }
  }

  /**
   * Find order items with ProductAttributes containing the specified PO number for a given customer with enhanced error handling
   * @param poNumber - The PO number to search for
   * @param customerId - The customer ID to scope the search to
   * @returns Array of order items with ProductAttributes containing matching PO number
   */
  async findItemsByPO(poNumber: string, customerId: string): Promise<any[]> {
    if (!poNumber || !customerId) {
      return [];
    }

    try {
      // Add timeout to prevent hanging queries
      const queryPromise = this.prisma.orderItem.findMany({
        where: {
          order: {
            customerId: customerId,
          },
          productAttributes: {
            poNumber: poNumber,
          },
        },
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
              poNumber: true,
              color: true,
              size: true,
              shape: true,
              tieDownLength: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Set a reasonable timeout for the query (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 30000);
      });

      const orderItems = await Promise.race([queryPromise, timeoutPromise]) as any[];

      // Validate the results
      if (!Array.isArray(orderItems)) {
        console.error('Invalid response from database - expected array, got:', typeof orderItems);
        throw new Error('Invalid database response format');
      }

      // Additional validation to ensure data integrity
      const validItems = orderItems.filter(item => {
        if (!item || !item.order || !item.productAttributes) {
          console.warn('Found invalid order item during PO validation:', item?.id);
          return false;
        }
        return true;
      });

      if (validItems.length !== orderItems.length) {
        console.warn(`Filtered out ${orderItems.length - validItems.length} invalid items during PO validation`);
      }

      return validItems;
    } catch (error) {
      console.error('Error finding items by PO number:', {
        error: error.message,
        code: error.code,
        poNumber: poNumber ? 'present' : 'missing',
        customerId: customerId ? 'present' : 'missing'
      });

      // Re-throw with more specific error information
      if (error.message === 'Database query timeout') {
        const timeoutError = new Error('Database query timed out while searching for items');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      if (error.code && error.code.startsWith('P')) {
        // Prisma error - preserve the original error for proper handling upstream
        throw error;
      }

      // Generic database error
      const dbError = new Error('Failed to search items by PO number');
      dbError.name = 'DatabaseError';
      throw dbError;
    }
  }
}

// Export a default instance for convenience
export const poValidationRepository = new POValidationRepositoryImpl();