// Scanner utility functions for managing barcode scanner prefixes and assignments
import { STATION_CODES, STATION_NAME_TO_CODE } from './constants';

export interface ScannerPrefix {
  stationCode: string;
  personCode: string;
  sequenceCode: string;
  fullPrefix: string;
}

/**
 * Parse a scanner prefix into its components
 */
export function parseScannerPrefix(prefix: string): ScannerPrefix | null {
  if (prefix.length !== 3) {
    return null;
  }

  const stationCode = prefix[0];
  const personCode = prefix[1];
  const sequenceCode = prefix[2];

  if (!STATION_CODES[stationCode]) {
    return null;
  }

  return {
    stationCode,
    personCode,
    sequenceCode,
    fullPrefix: prefix
  };
}

/**
 * Generate a scanner prefix from components
 */
export function generateScannerPrefix(
  stationName: string, 
  personNumber: number, 
  sequenceChar: string = 'A'
): string | null {
  const stationCode = STATION_NAME_TO_CODE[stationName];
  if (!stationCode) {
    return null;
  }

  // Convert person number to alphanumeric (1-9, then A-Z)
  let personCode: string;
  if (personNumber >= 1 && personNumber <= 9) {
    personCode = personNumber.toString();
  } else if (personNumber >= 10 && personNumber <= 35) {
    personCode = String.fromCharCode(65 + (personNumber - 10)); // A-Z
  } else {
    return null; // Invalid person number
  }

  // Validate sequence character
  if (!/^[A-Z0-9]$/.test(sequenceChar)) {
    return null;
  }

  return `${stationCode}${personCode}${sequenceChar}`;
}

/**
 * Get suggested prefixes for a station
 */
export function getSuggestedPrefixes(stationName: string, existingPrefixes: string[] = []): string[] {
  const stationCode = STATION_NAME_TO_CODE[stationName];
  if (!stationCode) {
    return [];
  }

  const suggestions: string[] = [];
  
  // Generate suggestions for persons 1-5 with sequence A-C
  for (let person = 1; person <= 5; person++) {
    for (const sequence of ['A', 'B', 'C']) {
      const prefix = generateScannerPrefix(stationName, person, sequence);
      if (prefix && !existingPrefixes.includes(prefix)) {
        suggestions.push(prefix);
      }
    }
  }

  return suggestions.slice(0, 10); // Return first 10 suggestions
}

/**
 * Validate scanner prefix format
 */
export function validateScannerPrefix(prefix: string): { valid: boolean; error?: string } {
  if (!prefix) {
    return { valid: false, error: 'Prefix is required' };
  }

  if (prefix.length !== 3) {
    return { valid: false, error: 'Prefix must be exactly 3 characters' };
  }

  const parsed = parseScannerPrefix(prefix);
  if (!parsed) {
    return { valid: false, error: 'Invalid prefix format. Use format: [Station][Person][Sequence]' };
  }

  return { valid: true };
}

/**
 * Get scanner info from prefix
 */
export function getScannerInfo(prefix: string): {
  stationName: string;
  personNumber: number;
  sequenceChar: string;
} | null {
  const parsed = parseScannerPrefix(prefix);
  if (!parsed) {
    return null;
  }

  const stationName = STATION_CODES[parsed.stationCode];
  
  // Convert person code back to number
  let personNumber: number;
  if (/^[1-9]$/.test(parsed.personCode)) {
    personNumber = parseInt(parsed.personCode);
  } else if (/^[A-Z]$/.test(parsed.personCode)) {
    personNumber = parsed.personCode.charCodeAt(0) - 65 + 10;
  } else {
    return null;
  }

  return {
    stationName,
    personNumber,
    sequenceChar: parsed.sequenceCode
  };
}

/**
 * Check if a prefix is valid for a specific station
 */
export function isPrefixValidForStation(prefix: string, stationName: string): boolean {
  const parsed = parseScannerPrefix(prefix);
  if (!parsed) {
    return false;
  }

  const expectedStationCode = STATION_NAME_TO_CODE[stationName];
  return parsed.stationCode === expectedStationCode;
}

/**
 * Get all possible prefixes for a station
 */
export function getAllPossiblePrefixes(stationName: string): string[] {
  const stationCode = STATION_NAME_TO_CODE[stationName];
  if (!stationCode) {
    return [];
  }

  const prefixes: string[] = [];
  
  // Generate all possible combinations
  for (let person = 1; person <= 35; person++) { // 1-9, A-Z
    for (const sequence of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
      const prefix = generateScannerPrefix(stationName, person, sequence);
      if (prefix) {
        prefixes.push(prefix);
      }
    }
  }

  return prefixes;
}

/**
 * Format prefix for display with explanation
 */
export function formatPrefixDisplay(prefix: string): string {
  const info = getScannerInfo(prefix);
  if (!info) {
    return prefix;
  }

  return `${prefix} (${info.stationName}, Person ${info.personNumber}, Scanner ${info.sequenceChar})`;
}