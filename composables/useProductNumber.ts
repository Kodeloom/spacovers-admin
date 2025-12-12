/**
 * Composable for working with product numbers
 */

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
 * Get display name for an order item (product number or item name)
 * @param orderItem - The order item object
 * @returns string - Display name
 */
export function getOrderItemDisplayName(orderItem: any): string {
  // Prefer product number if available
  if (orderItem.productNumber) {
    return formatProductNumber(orderItem.productNumber);
  }
  
  // Fallback to item name
  return orderItem.item?.name || orderItem.itemName || 'Unknown Item';
}

export const useProductNumber = () => {
  return {
    formatProductNumber,
    getOrderItemDisplayName
  };
};
