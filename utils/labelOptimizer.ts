/**
 * Label Information Optimization Utilities
 * 
 * This module provides utilities for optimizing label information display
 * to fit within the constraints of split labels (3x3 and 2x3 inch parts).
 */

export interface OptimizedLabelInfo {
  customer: string;
  thickness: string;
  size: string;
  type: string;
  color: string;
  date: string;
  upgrades: string;
  barcode: string;
}

export interface LabelOptimizationConfig {
  maxCustomerLength: number;
  maxUpgradeLength: number;
  maxTypeLength: number;
  maxColorLength: number;
}

// Default configuration for label optimization
export const DEFAULT_LABEL_CONFIG: LabelOptimizationConfig = {
  maxCustomerLength: 15,
  maxUpgradeLength: 20,
  maxTypeLength: 12,
  maxColorLength: 10,
};

/**
 * Common abbreviations for product types
 */
const TYPE_ABBREVIATIONS: Record<string, string> = {
  'Reinforced': 'Reinf',
  'Standard': 'Std',
  'Premium': 'Prem',
  'Custom': 'Cust',
  'Heavy Duty': 'HD',
  'Light Weight': 'LW',
  'Commercial': 'Comm',
  'Residential': 'Res',
};

/**
 * Common abbreviations for colors
 */
const COLOR_ABBREVIATIONS: Record<string, string> = {
  'Forest Green': 'F.Green',
  'Dark Blue': 'D.Blue',
  'Light Blue': 'L.Blue',
  'Dark Gray': 'D.Gray',
  'Light Gray': 'L.Gray',
  'Navy Blue': 'Navy',
  'Royal Blue': 'R.Blue',
  'Burgundy': 'Burg',
  'Charcoal': 'Char',
  'Chocolate': 'Choc',
};

/**
 * Common abbreviations for upgrades
 */
const UPGRADE_ABBREVIATIONS: Record<string, string> = {
  'Reinforced': 'Reinf',
  'Waterproof': 'WP',
  'Fire Resistant': 'FR',
  'UV Protection': 'UV',
  'Anti-Static': 'AS',
  'Heavy Duty': 'HD',
  'Extra Strong': 'XS',
  'Double Layer': 'DL',
  'Insulated': 'Insul',
  'Breathable': 'Breath',
};

/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Abbreviates text using common abbreviations, falls back to truncation
 */
export function abbreviateText(text: string, abbreviations: Record<string, string>, maxLength: number): string {
  if (!text) return '';
  
  // First try to find exact match in abbreviations
  if (abbreviations[text]) {
    return abbreviations[text];
  }
  
  // Try to find partial matches for compound terms
  let abbreviated = text;
  for (const [full, abbrev] of Object.entries(abbreviations)) {
    abbreviated = abbreviated.replace(new RegExp(full, 'gi'), abbrev);
  }
  
  // If still too long, truncate
  if (abbreviated.length > maxLength) {
    abbreviated = truncateText(abbreviated, maxLength);
  }
  
  return abbreviated;
}

/**
 * Optimizes customer name for label display
 */
export function optimizeCustomerName(customerName: string, maxLength: number = DEFAULT_LABEL_CONFIG.maxCustomerLength): string {
  if (!customerName) return '';
  
  // Remove common business suffixes that take up space
  let optimized = customerName
    .replace(/\b(LLC|Inc|Corp|Corporation|Company|Co\.?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return truncateText(optimized, maxLength);
}

/**
 * Optimizes product type for label display
 */
export function optimizeProductType(type: string, maxLength: number = DEFAULT_LABEL_CONFIG.maxTypeLength): string {
  return abbreviateText(type, TYPE_ABBREVIATIONS, maxLength);
}

/**
 * Optimizes color name for label display
 */
export function optimizeColor(color: string, maxLength: number = DEFAULT_LABEL_CONFIG.maxColorLength): string {
  return abbreviateText(color, COLOR_ABBREVIATIONS, maxLength);
}

/**
 * Condenses upgrade information into a compact format
 */
export function condenseUpgrades(upgrades: string[], maxLength: number = DEFAULT_LABEL_CONFIG.maxUpgradeLength): string {
  if (!upgrades || upgrades.length === 0) {
    return '';
  }
  
  // Abbreviate each upgrade
  const abbreviated = upgrades.map(upgrade => 
    abbreviateText(upgrade, UPGRADE_ABBREVIATIONS, 8)
  );
  
  // Join with commas and check length
  let result = abbreviated.join(', ');
  
  // If too long, try joining with just commas (no spaces)
  if (result.length > maxLength) {
    result = abbreviated.join(',');
  }
  
  // If still too long, take only the first few upgrades
  if (result.length > maxLength) {
    let shortened = abbreviated[0];
    for (let i = 1; i < abbreviated.length; i++) {
      const next = shortened + ',' + abbreviated[i];
      if (next.length > maxLength - 3) { // Leave room for "..."
        shortened += '...';
        break;
      }
      shortened = next;
    }
    result = shortened;
  }
  
  return result;
}

/**
 * Formats date to MM/DD format for compact display
 */
export function formatCompactDate(date: Date | string): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  
  return `${month}/${day}`;
}

/**
 * Main optimization function that processes all label information
 */
export function optimizeLabelInfo(
  orderItem: any,
  config: Partial<LabelOptimizationConfig> = {}
): OptimizedLabelInfo {
  const finalConfig = { ...DEFAULT_LABEL_CONFIG, ...config };
  
  return {
    customer: optimizeCustomerName(orderItem.customerName || '', finalConfig.maxCustomerLength),
    thickness: orderItem.thickness || '',
    size: orderItem.size || '',
    type: optimizeProductType(orderItem.type || '', finalConfig.maxTypeLength),
    color: optimizeColor(orderItem.color || '', finalConfig.maxColorLength),
    date: formatCompactDate(orderItem.date || new Date()),
    upgrades: condenseUpgrades(orderItem.upgrades || [], finalConfig.maxUpgradeLength),
    barcode: orderItem.barcode || orderItem.id || '',
  };
}

/**
 * Optimizes barcode data for smaller labels while maintaining scannability
 */
export function optimizeBarcodeData(
  prefix: string,
  orderNumber: string,
  itemId: string,
  maxLength: number = 20
): string {
  const fullBarcode = `${prefix}-${orderNumber}-${itemId}`;
  
  // If already within limits, return as-is
  if (fullBarcode.length <= maxLength) {
    return fullBarcode;
  }
  
  // Try to shorten order number if it's very long
  let shortOrderNumber = orderNumber;
  if (orderNumber.length > 8) {
    // Keep first 4 and last 4 characters of order number
    shortOrderNumber = orderNumber.substring(0, 4) + orderNumber.substring(orderNumber.length - 4);
  }
  
  // Try to shorten item ID if needed
  let shortItemId = itemId;
  if (itemId.length > 6) {
    // Keep first 3 and last 3 characters of item ID
    shortItemId = itemId.substring(0, 3) + itemId.substring(itemId.length - 3);
  }
  
  const optimizedBarcode = `${prefix}-${shortOrderNumber}-${shortItemId}`;
  
  // If still too long, truncate the entire string but keep the structure
  if (optimizedBarcode.length > maxLength) {
    return truncateText(optimizedBarcode, maxLength);
  }
  
  return optimizedBarcode;
}

/**
 * Gets optimal barcode configuration for different label sizes
 */
export function getOptimalBarcodeConfig(labelWidth: number, labelHeight: number): {
  width: number;
  height: number;
  fontSize: number;
  margin: number;
  showText: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  
  // Calculate available space (leaving room for other label content)
  const availableWidth = Math.floor(labelWidth * 0.8); // 80% of label width
  const availableHeight = Math.floor(labelHeight * 0.3); // 30% of label height
  
  let config = {
    width: availableWidth,
    height: availableHeight,
    fontSize: 8,
    margin: 3,
    showText: true,
  };
  
  // Adjust for very small labels
  if (labelWidth < 150 || labelHeight < 50) {
    config.fontSize = 6;
    config.margin = 2;
    recommendations.push('Using minimal font size for small label');
    
    if (labelHeight < 35) {
      config.showText = false;
      recommendations.push('Text disabled due to height constraints');
    }
  }
  
  // Adjust for tiny labels
  if (labelWidth < 100 || labelHeight < 35) {
    config.fontSize = 5;
    config.margin = 1;
    config.height = Math.max(20, availableHeight);
    recommendations.push('Using ultra-compact settings for tiny label');
  }
  
  // Ensure minimum readable dimensions
  if (config.height < 20) {
    config.height = 20;
    recommendations.push('Increased height to minimum readable size');
  }
  
  if (config.width < 60) {
    config.width = 60;
    recommendations.push('Increased width to minimum scannable size');
  }
  
  return {
    ...config,
    recommendations,
  };
}

/**
 * Validates that optimized information fits within specified constraints
 */
export function validateOptimizedInfo(
  info: OptimizedLabelInfo,
  config: LabelOptimizationConfig = DEFAULT_LABEL_CONFIG
): { isValid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (info.customer.length > config.maxCustomerLength) {
    violations.push(`Customer name exceeds ${config.maxCustomerLength} characters`);
  }
  
  if (info.upgrades.length > config.maxUpgradeLength) {
    violations.push(`Upgrades exceed ${config.maxUpgradeLength} characters`);
  }
  
  if (info.type.length > config.maxTypeLength) {
    violations.push(`Type exceeds ${config.maxTypeLength} characters`);
  }
  
  if (info.color.length > config.maxColorLength) {
    violations.push(`Color exceeds ${config.maxColorLength} characters`);
  }
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Provides recommendations for improving barcode readability on small labels
 */
export function getBarcodeOptimizationRecommendations(
  labelWidth: number,
  labelHeight: number,
  barcodeData: string
): {
  canOptimize: boolean;
  recommendations: string[];
  alternativeFormats: string[];
} {
  const recommendations: string[] = [];
  const alternativeFormats: string[] = [];
  
  // Check if label is too small for standard barcodes
  const isVerySmall = labelWidth < 120 || labelHeight < 40;
  const isTooSmall = labelWidth < 80 || labelHeight < 30;
  
  if (isTooSmall) {
    recommendations.push('Label too small for reliable barcode scanning');
    recommendations.push('Consider using QR code format instead');
    alternativeFormats.push('QR Code');
    alternativeFormats.push('Text-only with manual entry');
    return {
      canOptimize: false,
      recommendations,
      alternativeFormats,
    };
  }
  
  if (isVerySmall) {
    recommendations.push('Use minimal margins and compact font');
    recommendations.push('Consider shortening barcode data');
    recommendations.push('Test scannability with target hardware');
  }
  
  // Check barcode data length
  if (barcodeData.length > 15) {
    recommendations.push('Barcode data is long - consider abbreviating');
    recommendations.push('Use shorter order/item identifiers if possible');
  }
  
  // Suggest alternative formats for problematic cases
  if (labelWidth / labelHeight < 2.5) {
    alternativeFormats.push('QR Code (better for square labels)');
  }
  
  if (barcodeData.length > 20) {
    alternativeFormats.push('QR Code (handles long data better)');
  }
  
  return {
    canOptimize: true,
    recommendations,
    alternativeFormats,
  };
}