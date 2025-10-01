/**
 * Barcode Optimization Examples
 * 
 * This file demonstrates how to use the optimized barcode generation
 * for split labels in various scenarios.
 */

import { BarcodeGenerator, type BarcodeConfig } from './barcodeGenerator';
import { optimizeBarcodeData, getOptimalBarcodeConfig, getBarcodeOptimizationRecommendations } from './labelOptimizer';

/**
 * Example: Generate barcode for 3x3 label top part
 */
export async function generateTopPartBarcode(canvas: HTMLCanvasElement, orderItem: any): Promise<void> {
  // Get optimized configuration for 3x3 label
  const config = BarcodeGenerator.getSplitLabelTopConfig();
  
  // Create barcode data
  const barcodeData = `O1A-${orderItem.orderNumber}-${orderItem.id}`;
  
  // Generate with automatic fallback handling
  const result = await BarcodeGenerator.generateWithFallback(canvas, barcodeData, config);
  
  if (result.warnings.length > 0) {
    console.warn('Barcode generation warnings:', result.warnings);
  }
  
  console.log(`Generated barcode using ${result.method} method`);
}

/**
 * Example: Generate barcode for 2x3 label bottom part
 */
export async function generateBottomPartBarcode(canvas: HTMLCanvasElement, orderItem: any): Promise<void> {
  // Get ultra-compact configuration for 2x3 label
  const config = BarcodeGenerator.getSplitLabelBottomConfig();
  
  // Optimize barcode data for smaller space
  const optimizedData = optimizeBarcodeData(
    'O1A',
    orderItem.orderNumber,
    orderItem.id,
    15 // Maximum length for compact labels
  );
  
  // Generate with automatic fallback handling
  const result = await BarcodeGenerator.generateWithFallback(canvas, optimizedData, config);
  
  if (result.warnings.length > 0) {
    console.warn('Compact barcode warnings:', result.warnings);
  }
  
  console.log(`Generated compact barcode: ${optimizedData}`);
}

/**
 * Example: Adaptive barcode generation based on available space
 */
export async function generateAdaptiveBarcode(
  canvas: HTMLCanvasElement,
  orderItem: any,
  availableWidth: number,
  availableHeight: number
): Promise<void> {
  // Get optimal configuration for available space
  const optimalConfig = getOptimalBarcodeConfig(availableWidth, availableHeight);
  
  // Get recommendations for this size
  const barcodeData = `O1A-${orderItem.orderNumber}-${orderItem.id}`;
  const recommendations = getBarcodeOptimizationRecommendations(
    availableWidth,
    availableHeight,
    barcodeData
  );
  
  if (!recommendations.canOptimize) {
    console.warn('Space too small for barcode:', recommendations.recommendations);
    console.log('Consider alternatives:', recommendations.alternativeFormats);
    return;
  }
  
  // Create configuration based on recommendations
  const config: BarcodeConfig = {
    width: optimalConfig.width,
    height: optimalConfig.height,
    fontSize: optimalConfig.fontSize,
    margin: optimalConfig.margin,
    showText: optimalConfig.showText,
    format: 'CODE128'
  };
  
  // Optimize data if needed
  const optimizedData = barcodeData.length > 18 
    ? optimizeBarcodeData('O1A', orderItem.orderNumber, orderItem.id, 18)
    : barcodeData;
  
  // Generate barcode
  const result = await BarcodeGenerator.generateWithFallback(canvas, optimizedData, config);
  
  console.log('Adaptive barcode generated:', {
    method: result.method,
    data: optimizedData,
    config: config,
    warnings: result.warnings,
    recommendations: optimalConfig.recommendations
  });
}

/**
 * Example: Test barcode readability before generation
 */
export function testBarcodeBeforeGeneration(orderItem: any, labelType: '3x3' | '2x3'): {
  canGenerate: boolean;
  config: BarcodeConfig;
  warnings: string[];
  recommendations: string[];
} {
  // Get appropriate configuration
  const config = labelType === '3x3' 
    ? BarcodeGenerator.getSplitLabelTopConfig()
    : BarcodeGenerator.getSplitLabelBottomConfig();
  
  // Create barcode data
  const barcodeData = `O1A-${orderItem.orderNumber}-${orderItem.id}`;
  
  // Test readability
  const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, barcodeData);
  
  // Get optimization recommendations
  const optimizationRecs = getBarcodeOptimizationRecommendations(
    config.width,
    config.height,
    barcodeData
  );
  
  return {
    canGenerate: readabilityTest.score > 30 && optimizationRecs.canOptimize,
    config,
    warnings: readabilityTest.warnings,
    recommendations: [
      ...readabilityTest.recommendations,
      ...optimizationRecs.recommendations
    ]
  };
}

/**
 * Example: Enhanced barcode generation with better readability
 */
export async function generateEnhancedBarcode(
  canvas: HTMLCanvasElement,
  orderItem: any,
  isTopPart: boolean = true
): Promise<void> {
  // Use enhanced configuration for better readability
  const config = BarcodeGenerator.getSplitLabelEnhancedConfig(isTopPart);
  
  // Create and optimize barcode data
  const barcodeData = `O1A-${orderItem.orderNumber}-${orderItem.id}`;
  const maxLength = isTopPart ? 20 : 15;
  const optimizedData = barcodeData.length > maxLength
    ? optimizeBarcodeData('O1A', orderItem.orderNumber, orderItem.id, maxLength)
    : barcodeData;
  
  // Test before generation
  const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, optimizedData);
  
  if (readabilityTest.score < 50) {
    console.warn('Low readability score:', readabilityTest.score);
    console.warn('Warnings:', readabilityTest.warnings);
    console.log('Recommendations:', readabilityTest.recommendations);
  }
  
  // Generate with fallback
  const result = await BarcodeGenerator.generateWithFallback(canvas, optimizedData, config);
  
  console.log('Enhanced barcode generated:', {
    part: isTopPart ? 'top (3x3)' : 'bottom (2x3)',
    method: result.method,
    readabilityScore: readabilityTest.score,
    success: result.success
  });
}

/**
 * Example: Batch barcode generation for print queue
 */
export async function generateBatchBarcodes(
  orderItems: any[],
  canvasElements: HTMLCanvasElement[]
): Promise<{
  successful: number;
  failed: number;
  warnings: string[];
}> {
  let successful = 0;
  let failed = 0;
  const allWarnings: string[] = [];
  
  for (let i = 0; i < orderItems.length && i < canvasElements.length; i++) {
    const orderItem = orderItems[i];
    const canvas = canvasElements[i];
    
    try {
      // Determine if this is a top or bottom part (alternating for demo)
      const isTopPart = i % 2 === 0;
      const config = isTopPart 
        ? BarcodeGenerator.getSplitLabelTopConfig()
        : BarcodeGenerator.getSplitLabelBottomConfig();
      
      // Create optimized barcode data
      const barcodeData = `O1A-${orderItem.orderNumber}-${orderItem.id}`;
      const maxLength = isTopPart ? 18 : 15;
      const optimizedData = optimizeBarcodeData('O1A', orderItem.orderNumber, orderItem.id, maxLength);
      
      // Generate barcode
      const result = await BarcodeGenerator.generateWithFallback(canvas, optimizedData, config);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      allWarnings.push(...result.warnings);
      
    } catch (error) {
      console.error(`Failed to generate barcode for item ${orderItem.id}:`, error);
      failed++;
      allWarnings.push(`Generation failed for item ${orderItem.id}`);
    }
  }
  
  return {
    successful,
    failed,
    warnings: [...new Set(allWarnings)] // Remove duplicates
  };
}

/**
 * Example usage in a Vue component:
 * 
 * ```typescript
 * import { generateTopPartBarcode, generateBottomPartBarcode } from '@/utils/barcode-optimization-examples';
 * 
 * // In your component
 * const topCanvas = ref<HTMLCanvasElement>();
 * const bottomCanvas = ref<HTMLCanvasElement>();
 * 
 * onMounted(async () => {
 *   if (topCanvas.value && bottomCanvas.value) {
 *     await generateTopPartBarcode(topCanvas.value, orderItem);
 *     await generateBottomPartBarcode(bottomCanvas.value, orderItem);
 *   }
 * });
 * ```
 */