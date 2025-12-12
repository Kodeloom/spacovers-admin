// Barcode utility functions for the warehouse scanning system
import { STATION_CODES } from './constants';

export interface BarcodeData {
  prefix: string;
  orderNumber: string;
  itemId: string;
  station: string;
  person: string;
  sequence: string;
}

export interface StatusTransition {
  from: string;
  to: string;
  station: string;
}

// Status transition mapping based on station (6-step workflow)
export const STATUS_TRANSITIONS: StatusTransition[] = [
  // Step 1: Office confirms order printed and goes into production
  { from: 'NOT_STARTED_PRODUCTION', to: 'CUTTING', station: 'Office' },
  
  // Step 2: Cutting station completes work
  { from: 'CUTTING', to: 'SEWING', station: 'Cutting' },
  
  // Step 3: Sewing station completes work  
  { from: 'SEWING', to: 'FOAM_CUTTING', station: 'Sewing' },
  
  // Step 4: Foam Cutting station completes work
  { from: 'FOAM_CUTTING', to: 'STUFFING', station: 'Foam Cutting' },
  
  // Step 5: Stuffing station completes work
  { from: 'STUFFING', to: 'PACKAGING', station: 'Stuffing' },
  
  // Step 6: Packaging station completes work
  { from: 'PACKAGING', to: 'PRODUCT_FINISHED', station: 'Packaging' },
  
  // Step 6: Office confirms finished product ready for delivery/pickup
  { from: 'PRODUCT_FINISHED', to: 'READY', station: 'Office' }
];

/**
 * Decode a barcode string into its components
 * Format: [PREFIX]-[ORDER_NUMBER]-[ITEM_ID]
 * Prefix Format: [STATION][PERSON][SEQUENCE]
 * 
 * Note: ITEM_ID can be either:
 * - Old format: Database ID (long CUID string)
 * - New format: Product Number (numeric)
 * 
 * @param barcode - The full barcode string
 * @returns BarcodeData object with decoded components
 */
export function decodeBarcode(barcode: string): BarcodeData | null {
  try {
    // Split the barcode into parts
    const parts = barcode.split('-');
    
    if (parts.length !== 3) {
      throw new Error('Invalid barcode format. Expected: PREFIX-ORDER-ITEM');
    }

    const [prefix, orderNumber, itemId] = parts;

    // Validate prefix format (should be 3 characters)
    if (prefix.length !== 3) {
      throw new Error('Invalid prefix format. Expected 3 characters: [STATION][PERSON][SEQUENCE]');
    }

    // Decode prefix components
    const stationCode = prefix[0];
    const personCode = prefix[1];
    const sequenceCode = prefix[2];

    // Validate station code
    if (!STATION_CODES[stationCode]) {
      throw new Error(`Invalid station code: ${stationCode}`);
    }

    const station = STATION_CODES[stationCode];

    return {
      prefix,
      orderNumber,
      itemId,
      station,
      person: personCode,
      sequence: sequenceCode
    };
  } catch (error) {
    console.error('Error decoding barcode:', error);
    return null;
  }
}

/**
 * Get the workflow order index for a status
 * Lower index = earlier in workflow
 */
function getStatusWorkflowIndex(status: string): number {
  const workflowOrder = [
    'NOT_STARTED_PRODUCTION',
    'CUTTING',
    'SEWING',
    'FOAM_CUTTING',
    'STUFFING',
    'PACKAGING',
    'PRODUCT_FINISHED',
    'READY'
  ];
  return workflowOrder.indexOf(status);
}

/**
 * Get the workflow order index for a station
 * Lower index = earlier in workflow
 */
function getStationWorkflowIndex(station: string): number {
  const stationOrder = [
    'Office',      // 0 - starts production
    'Cutting',     // 1
    'Sewing',      // 2
    'Foam Cutting',// 3
    'Stuffing',    // 4
    'Packaging',   // 5
    'Office'       // 6 - finalizes (same as 0 but at end)
  ];
  
  // Special handling for Office - it can be at start (0) or end (6)
  if (station === 'Office') {
    // Return -1 to indicate Office can handle both start and end
    return -1;
  }
  
  return stationOrder.indexOf(station);
}

/**
 * Get the next status for a given current status and station
 * Now supports skipping forward but not backward
 * 
 * @param currentStatus - The current item status
 * @param station - The station where the scan occurred
 * @param lastScannedStation - Optional: The last station that scanned this item
 * @returns The next status or null if no valid transition
 */
export function getNextStatus(currentStatus: string, station: string, lastScannedStation?: string | null): string | null {
  // Special case: NOT_STARTED_PRODUCTION can ONLY be processed by Office
  if (currentStatus === 'NOT_STARTED_PRODUCTION') {
    if (station === 'Office') {
      return 'CUTTING';
    }
    return null; // No other station can start production
  }
  
  // Special case: Office finalizing to READY
  // Office can finalize from ANY status EXCEPT:
  // 1. NOT_STARTED_PRODUCTION (handled above)
  // 2. CUTTING (if Office was the last scanner - can't scan twice in a row)
  if (station === 'Office') {
    // BACKWARD COMPATIBILITY: If we don't have lastScannedStation info (null/undefined),
    // allow Office to finalize from any status except NOT_STARTED_PRODUCTION and CUTTING
    // This ensures existing items in production can still be finalized
    if (!lastScannedStation) {
      // For items without processing log history, allow finalization from any status except CUTTING
      // CUTTING is blocked because it's the immediate next status after Office's first scan
      if (currentStatus === 'CUTTING') {
        return null; // Don't allow Office to finalize immediately after starting production
      }
      return 'READY'; // Allow finalization from all other statuses
    }
    
    // NEW BEHAVIOR: If we have lastScannedStation info
    // If current status is CUTTING and Office was the last scanner, prevent double scan
    if (currentStatus === 'CUTTING' && lastScannedStation === 'Office') {
      return null; // Office cannot scan twice in a row
    }
    
    // If any other station has scanned (lastScannedStation is not Office), allow Office to finalize
    if (lastScannedStation !== 'Office') {
      return 'READY';
    }
    
    // If Office was the last scanner but status has progressed beyond CUTTING, allow finalization
    // This handles edge cases where Office scanned, then the system was updated
    if (currentStatus !== 'CUTTING') {
      return 'READY';
    }
    
    return null;
  }
  
  // For all other statuses, find the next transition based on the scanning station
  // Allow skipping forward but not backward
  
  const currentStatusIndex = getStatusWorkflowIndex(currentStatus);
  const scanningStationIndex = getStationWorkflowIndex(station);
  
  // Find the transition that this station would normally handle
  const stationTransition = STATUS_TRANSITIONS.find(t => t.station === station);
  
  if (!stationTransition) {
    return null; // Invalid station
  }
  
  // Get the target status for this station
  const targetStatus = stationTransition.to;
  const targetStatusIndex = getStatusWorkflowIndex(targetStatus);
  
  // Check if we're moving forward in the workflow
  // Allow the transition if the target status is ahead of current status
  if (targetStatusIndex > currentStatusIndex) {
    return targetStatus;
  }
  
  // Don't allow going backward
  return null;
}

/**
 * Validate if a status transition is allowed
 * Now supports skipping forward but not backward
 * 
 * @param currentStatus - The current item status
 * @param station - The station where the scan occurred
 * @param lastScannedStation - Optional: The last station that scanned this item
 * @returns True if the transition is valid
 */
export function isValidStatusTransition(currentStatus: string, station: string, lastScannedStation?: string | null): boolean {
  return getNextStatus(currentStatus, station, lastScannedStation) !== null;
}

/**
 * Get user-friendly display name for item status
 * 
 * @param status - The item status
 * @returns User-friendly status name
 */
export function getStatusDisplayName(status: string): string {
  const statusMap: Record<string, string> = {
    'NOT_STARTED_PRODUCTION': 'Not Started Production',
    'CUTTING': 'Item being processed at Cutting',
    'SEWING': 'Item being processed at Sewing', 
    'FOAM_CUTTING': 'Item being processed at Foam Cutting',
    'PACKAGING': 'Item being processed at Packaging',
    'PRODUCT_FINISHED': 'Item Done',
    'READY': 'Item Ready'
  };
  
  return statusMap[status] || status.replace(/_/g, ' ').toLowerCase();
}

/**
 * Generate a barcode string from components
 * 
 * @param prefix - The 3-character prefix
 * @param orderNumber - The order number
 * @param itemId - The item ID
 * @returns The formatted barcode string
 */
export function generateBarcode(prefix: string, orderNumber: string, itemId: string): string {
  return `${prefix}-${orderNumber}-${itemId}`;
}

/**
 * Extract the prefix from a barcode string
 * 
 * @param barcode - The full barcode string
 * @returns The prefix or null if invalid
 */
export function extractPrefix(barcode: string): string | null {
  const parts = barcode.split('-');
  return parts.length >= 1 ? parts[0] : null;
}

/**
 * Validate a barcode prefix format
 * 
 * @param prefix - The prefix to validate
 * @returns True if the prefix is valid
 */
export function isValidPrefix(prefix: string): boolean {
  if (prefix.length !== 3) return false;
  
  const stationCode = prefix[0];
  const personCode = prefix[1];
  const sequenceCode = prefix[2];
  
  // Check if station code is valid
  if (!STATION_CODES[stationCode]) return false;
  
  // Check if person code is alphanumeric
  if (!/^[A-Z0-9]$/.test(personCode)) return false;
  
  // Check if sequence code is alphanumeric
  if (!/^[A-Z0-9]$/.test(sequenceCode)) return false;
  
  return true;
}

/**
 * Get station name from station code
 * 
 * @param stationCode - The single character station code
 * @returns The station name or null if invalid
 */
export function getStationName(stationCode: string): string | null {
  return STATION_CODES[stationCode] || null;
}

/**
 * Get all valid station codes
 * 
 * @returns Array of valid station codes
 */
export function getValidStationCodes(): string[] {
  return Object.keys(STATION_CODES);
}

/**
 * Get all valid station names
 * 
 * @returns Array of valid station names
 */
export function getValidStationNames(): string[] {
  return Object.values(STATION_CODES);
}
