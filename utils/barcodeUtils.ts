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
  { from: 'FOAM_CUTTING', to: 'PACKAGING', station: 'Foam Cutting' },
  
  // Step 5: Packaging station completes work
  { from: 'PACKAGING', to: 'PRODUCT_FINISHED', station: 'Packaging' },
  
  // Step 6: Office confirms finished product ready for delivery/pickup
  { from: 'PRODUCT_FINISHED', to: 'READY', station: 'Office' }
];

/**
 * Decode a barcode string into its components
 * Format: [PREFIX]-[ORDER_NUMBER]-[ITEM_ID]
 * Prefix Format: [STATION][PERSON][SEQUENCE]
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
 * Get the next status for a given current status and station
 * 
 * @param currentStatus - The current item status
 * @param station - The station where the scan occurred
 * @returns The next status or null if no valid transition
 */
export function getNextStatus(currentStatus: string, station: string): string | null {
  const transition = STATUS_TRANSITIONS.find(
    t => t.from === currentStatus && t.station === station
  );
  
  return transition ? transition.to : null;
}

/**
 * Validate if a status transition is allowed
 * 
 * @param currentStatus - The current item status
 * @param station - The station where the scan occurred
 * @returns True if the transition is valid
 */
export function isValidStatusTransition(currentStatus: string, station: string): boolean {
  return getNextStatus(currentStatus, station) !== null;
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
