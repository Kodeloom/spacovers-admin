/**
 * Purchase Order (PO) Number Validation Service
 * Provides validation and duplicate checking for PO numbers at both order and order item levels
 * Ensures PO numbers are unique within customer scope
 * Includes caching for performance optimization
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { CacheService } from '~/utils/cacheService';

export interface POValidationResult {
  isValid: boolean;
  isDuplicate: boolean;
  existingUsage?: {
    orders: Array<{
      id: string;
      salesOrderNumber: string | null;
      createdAt: Date;
    }>;
    orderItems: Array<{
      id: string;
      orderId: string;
      orderSalesNumber: string | null;
      itemName: string;
    }>;
  };
  message: string;
  warningMessage?: string;
  existingOrders?: Array<{
    id: string;
    salesOrderNumber: string | null;
    createdAt: Date;
  }>;
  existingItems?: Array<{
    id: string;
    orderId: string;
    orderSalesNumber: string | null;
    itemName: string;
  }>;
}

export interface PODuplicateCheckResult {
  hasDuplicates: boolean;
  duplicateCount: number;
  orders: Array<{
    id: string;
    salesOrderNumber: string | null;
    createdAt: Date;
  }>;
  orderItems: Array<{
    id: string;
    orderId: string;
    orderSalesNumber: string | null;
    itemName: string;
  }>;
}

// Cache TTL for PO validation results (5 minutes)
const PO_VALIDATION_CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate cache key for PO validation
 */
function getPOValidationCacheKey(
  customerId: string,
  poNumber: string,
  excludeOrderId?: string,
  excludeOrderItemId?: string
): string {
  const excludeKey = [excludeOrderId, excludeOrderItemId].filter(Boolean).join('-');
  return `po-validation:${customerId}:${poNumber.trim()}:${excludeKey}`;
}

/**
 * Validates PO number for duplicates within customer scope
 * Excludes archived/cancelled records from validation
 * Uses caching for performance optimization
 */
export async function validatePONumber(
  customerId: string,
  poNumber: string,
  excludeOrderId?: string,
  excludeOrderItemId?: string
): Promise<POValidationResult> {
  try {
    // Input validation
    if (!customerId || !poNumber) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'Invalid input parameters'
      };
    }

    // Trim and normalize PO number
    const normalizedPO = poNumber.trim();
    if (normalizedPO.length === 0) {
      return {
        isValid: false,
        isDuplicate: false,
        message: 'PO number cannot be empty'
      };
    }

    // Check cache first
    const cacheKey = getPOValidationCacheKey(customerId, normalizedPO, excludeOrderId, excludeOrderItemId);
    const cachedResult = CacheService.get<POValidationResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Check for duplicates
    const duplicateCheck = await checkDuplicatePO(
      customerId,
      normalizedPO,
      excludeOrderId,
      excludeOrderItemId
    );

    const result: POValidationResult = {
      isValid: true,
      isDuplicate: duplicateCheck.hasDuplicates,
      existingUsage: duplicateCheck.hasDuplicates ? {
        orders: duplicateCheck.orders,
        orderItems: duplicateCheck.orderItems
      } : undefined,
      message: duplicateCheck.hasDuplicates 
        ? `Found ${duplicateCheck.duplicateCount} existing usage(s) of PO number "${normalizedPO}"`
        : `PO number "${normalizedPO}" is available`,
      warningMessage: duplicateCheck.hasDuplicates
        ? `This PO number is already used by ${duplicateCheck.duplicateCount} other order(s) or item(s)`
        : undefined,
      existingOrders: duplicateCheck.orders,
      existingItems: duplicateCheck.orderItems
    };

    // Cache the result
    CacheService.set(cacheKey, result, PO_VALIDATION_CACHE_TTL);

    return result;

  } catch (error) {
    console.error('Error validating PO number:', error);
    return {
      isValid: false,
      isDuplicate: false,
      message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Checks for duplicate PO numbers within a customer's scope
 * Returns detailed information about existing usage
 * Excludes archived/cancelled orders and items
 */
export async function checkDuplicatePO(
  customerId: string,
  poNumber: string,
  excludeOrderId?: string,
  excludeOrderItemId?: string
): Promise<PODuplicateCheckResult> {
  try {
    const normalizedPO = poNumber.trim();

    // Build where clauses for exclusions
    const orderExclusionClause = excludeOrderId ? { id: { not: excludeOrderId } } : {};
    const orderItemExclusionClause = excludeOrderItemId ? { id: { not: excludeOrderItemId } } : {};

    // Check for duplicate PO numbers in orders
    const duplicateOrders = await prisma.order.findMany({
      where: {
        customerId,
        poNumber: normalizedPO,
        orderStatus: {
          notIn: ['CANCELLED', 'ARCHIVED']
        },
        ...orderExclusionClause
      },
      select: {
        id: true,
        salesOrderNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Check for duplicate PO numbers in product attributes
    let duplicateOrderItems: any[] = [];
    try {
      // Use raw query to check ProductAttribute poNumber field
      const rawQuery = `
        SELECT 
          pa.id,
          oi."orderId",
          o."salesOrderNumber" as "orderSalesNumber",
          i.name as "itemName"
        FROM "ProductAttribute" pa
        JOIN "OrderItem" oi ON pa."orderItemId" = oi.id
        JOIN "Order" o ON oi."orderId" = o.id
        JOIN "Item" i ON oi."itemId" = i.id
        WHERE pa."poNumber" = $1 
        AND o."customerId" = $2
        AND o."orderStatus" NOT IN ('CANCELLED', 'ARCHIVED')
        ${excludeOrderItemId ? 'AND pa.id != $3' : ''}
        ORDER BY oi."createdAt" DESC
      `;
      
      const params = [normalizedPO, customerId];
      if (excludeOrderItemId) {
        params.push(excludeOrderItemId);
      }
      
      duplicateOrderItems = await prisma.$queryRawUnsafe(rawQuery, ...params);
    } catch (error) {
      console.warn('ProductAttribute poNumber field not available yet. Migration may be needed.', error);
      // Continue without order item duplicates if field doesn't exist
    }

    const totalDuplicates = duplicateOrders.length + duplicateOrderItems.length;

    return {
      hasDuplicates: totalDuplicates > 0,
      duplicateCount: totalDuplicates,
      orders: duplicateOrders,
      orderItems: duplicateOrderItems
    };

  } catch (error) {
    console.error('Error checking duplicate PO:', error);
    throw new Error(`Duplicate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates PO number format
 * Can be extended with additional validation rules as needed
 */
export function validatePOFormat(poNumber: string): { isValid: boolean; message: string } {
  const trimmed = poNumber.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, message: 'PO number cannot be empty' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, message: 'PO number cannot exceed 100 characters' };
  }
  
  // Add more format validation rules as needed
  // For example: alphanumeric only, specific patterns, etc.
  
  return { isValid: true, message: 'PO number format is valid' };
}

/**
 * Get detailed PO usage information for a customer
 * Useful for reporting and analysis
 */
export async function getPOUsageDetails(
  customerId: string,
  poNumber: string
): Promise<{
  orders: Array<{
    id: string;
    salesOrderNumber: string | null;
    orderStatus: string;
    createdAt: Date;
    totalAmount: number | null;
  }>;
  orderItems: Array<{
    id: string;
    orderId: string;
    orderSalesNumber: string | null;
    itemName: string;
    quantity: number;
    pricePerItem: number;
  }>;
}> {
  try {
    const normalizedPO = poNumber.trim();

    const orders = await prisma.order.findMany({
      where: {
        customerId,
        poNumber: normalizedPO
      },
      select: {
        id: true,
        salesOrderNumber: true,
        orderStatus: true,
        createdAt: true,
        totalAmount: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get order items with PO numbers from ProductAttribute
    let orderItems: any[] = [];
    try {
      const rawQuery = `
        SELECT 
          pa.id,
          oi."orderId",
          o."salesOrderNumber" as "orderSalesNumber",
          i.name as "itemName",
          oi.quantity,
          oi."pricePerItem"
        FROM "ProductAttribute" pa
        JOIN "OrderItem" oi ON pa."orderItemId" = oi.id
        JOIN "Order" o ON oi."orderId" = o.id
        JOIN "Item" i ON oi."itemId" = i.id
        WHERE pa."poNumber" = $1 
        AND o."customerId" = $2
        ORDER BY oi."createdAt" DESC
      `;
      
      orderItems = await prisma.$queryRawUnsafe(rawQuery, normalizedPO, customerId);
    } catch (error) {
      console.warn('ProductAttribute poNumber field not available yet.', error);
    }

    return {
      orders,
      orderItems
    };

  } catch (error) {
    console.error('Error getting PO usage details:', error);
    throw new Error(`Failed to get PO usage details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Invalidate PO validation cache for a specific customer and PO number
 * Should be called when orders or order items are modified
 */
export function invalidatePOValidationCache(customerId: string, poNumber?: string): void {
  if (poNumber) {
    // Invalidate specific PO number cache entries
    const pattern = `po-validation:${customerId}:${poNumber.trim()}:`;
    CacheService.invalidatePattern(pattern);
  } else {
    // Invalidate all PO validation cache entries for customer
    const pattern = `po-validation:${customerId}:`;
    CacheService.invalidatePattern(pattern);
  }
}

/**
 * Warm up PO validation cache with commonly used PO numbers
 * Should be called during low-traffic periods
 */
export async function warmUpPOValidationCache(customerId: string): Promise<void> {
  try {
    // Get recent PO numbers for this customer
    const recentOrders = await prisma.order.findMany({
      where: {
        customerId,
        poNumber: { not: null },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        poNumber: true
      },
      distinct: ['poNumber'],
      take: 20 // Limit to 20 most recent unique PO numbers
    });

    // Pre-validate these PO numbers to warm up cache
    const validationPromises = recentOrders
      .filter(order => order.poNumber)
      .map(order => validatePONumber(customerId, order.poNumber!));

    await Promise.allSettled(validationPromises);
    
    console.log(`Warmed up PO validation cache for customer ${customerId} with ${recentOrders.length} PO numbers`);
  } catch (error) {
    console.error('Error warming up PO validation cache:', error);
  }
}