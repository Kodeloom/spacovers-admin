/**
 * Utility functions for managing product numbers
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';

/**
 * Get the next available product number
 * Product numbers start at 1001 and increment
 * @param tx - Optional Prisma transaction client
 * @returns Promise<number> - The next product number
 */
export async function getNextProductNumber(tx?: any): Promise<number> {
  try {
    const client = tx || prisma;
    
    // Get the highest existing product number
    const highestProductNumber = await client.orderItem.findFirst({
      where: {
        productNumber: { not: null }
      },
      orderBy: {
        productNumber: 'desc'
      },
      select: {
        productNumber: true
      }
    });

    // Start from 1001 or increment from the highest
    return highestProductNumber?.productNumber 
      ? highestProductNumber.productNumber + 1 
      : 1001;
  } catch (error) {
    console.error('Error getting next product number:', error);
    throw error;
  }
}

/**
 * Get multiple sequential product numbers for batch creation
 * This ensures no duplicates when creating multiple items in one transaction
 * @param count - Number of product numbers needed
 * @param tx - Optional Prisma transaction client
 * @returns Promise<number[]> - Array of sequential product numbers
 */
export async function getNextProductNumbers(count: number, tx?: any): Promise<number[]> {
  try {
    const client = tx || prisma;
    
    // Get the highest existing product number
    const highestProductNumber = await client.orderItem.findFirst({
      where: {
        productNumber: { not: null }
      },
      orderBy: {
        productNumber: 'desc'
      },
      select: {
        productNumber: true
      }
    });

    // Start from 1001 or increment from the highest
    const startNumber = highestProductNumber?.productNumber 
      ? highestProductNumber.productNumber + 1 
      : 1001;

    // Generate sequential numbers
    const productNumbers: number[] = [];
    for (let i = 0; i < count; i++) {
      productNumbers.push(startNumber + i);
    }

    return productNumbers;
  } catch (error) {
    console.error('Error getting next product numbers:', error);
    throw error;
  }
}

/**
 * Format a product number for display (adds "P" prefix)
 * @param productNumber - The numeric product number
 * @returns string - Formatted product number (e.g., "P01001")
 */
export function formatProductNumber(productNumber: number | null | undefined): string {
  if (!productNumber) {
    return 'N/A';
  }
  
  // Pad with zeros to ensure at least 5 digits
  const paddedNumber = productNumber.toString().padStart(5, '0');
  return `P${paddedNumber}`;
}

/**
 * Parse a formatted product number back to its numeric value
 * @param formattedNumber - The formatted product number (e.g., "P01001")
 * @returns number | null - The numeric product number or null if invalid
 */
export function parseProductNumber(formattedNumber: string): number | null {
  if (!formattedNumber || !formattedNumber.startsWith('P')) {
    return null;
  }
  
  const numericPart = formattedNumber.substring(1);
  const parsed = parseInt(numericPart, 10);
  
  return isNaN(parsed) ? null : parsed;
}
