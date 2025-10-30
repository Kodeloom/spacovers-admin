/**
 * Backward compatibility utilities for order management
 */

/**
 * Get display text for priority values
 */
export function getPriorityDisplayText(priority: string | null | undefined): string {
  if (!priority) return 'No Priority';
  
  switch (priority) {
    case 'NO_PRIORITY':
      return 'No Priority';
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
      return 'Medium';
    case 'HIGH':
      return 'High';
    default:
      return priority;
  }
}

/**
 * Get display text for purchase order numbers
 */
export function getPurchaseOrderDisplay(poNumber: string | null | undefined): string {
  return poNumber && poNumber.trim() !== '' ? poNumber.trim() : '-';
}

/**
 * Get display text for tie down length
 */
export function getTieDownLengthDisplay(tieDownLength: string | null | undefined): string {
  return tieDownLength && tieDownLength.trim() !== '' ? tieDownLength.trim() : '-';
}