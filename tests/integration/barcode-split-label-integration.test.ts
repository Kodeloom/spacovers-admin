import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarcodeGenerator, type BarcodeConfig } from '../../utils/barcodeGenerator';
import { optimizeBarcodeData, getOptimalBarcodeConfig } from '../../utils/labelOptimizer';

// Mock canvas for testing
const mockContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: 'center' as CanvasTextAlign,
  textBaseline: 'middle' as CanvasTextBaseline,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  clearRect: vi.fn(),
  scale: vi.fn(),
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  width: 0,
  height: 0,
  style: { width: '', height: '' },
} as unknown as HTMLCanvasElement;

describe('Barcode Split Label Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('3x3 Label Top Part Integration', () => {
    it('should generate optimized barcode for 3x3 top part', async () => {
      const config = BarcodeGenerator.getSplitLabelTopConfig();
      const barcodeData = 'O1A-ORDER123-ITEM456';
      
      // Test readability
      const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, barcodeData);
      expect(readabilityTest.score).toBeGreaterThan(60);
      
      // Test generation with fallback
      const result = await BarcodeGenerator.generateWithFallback(mockCanvas, barcodeData, config);
      expect(result.success).toBe(true);
    });

    it('should optimize long barcode data for 3x3 labels', () => {
      const longBarcode = optimizeBarcodeData('O1A', 'VERYLONGORDERNUM123456', 'VERYLONGITEMID789012', 18);
      
      expect(longBarcode.length).toBeLessThanOrEqual(18);
      expect(longBarcode).toContain('O1A-');
      
      const config = BarcodeGenerator.getSplitLabelTopConfig();
      const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, longBarcode);
      expect(readabilityTest.score).toBeGreaterThan(50);
    });

    it('should provide optimal config recommendations for 3x3 labels', () => {
      const optimalConfig = getOptimalBarcodeConfig(180, 45);
      
      expect(optimalConfig.width).toBeLessThanOrEqual(180);
      expect(optimalConfig.height).toBeLessThanOrEqual(45);
      expect(optimalConfig.showText).toBe(true);
      expect(optimalConfig.fontSize).toBeGreaterThanOrEqual(6);
    });
  });

  describe('2x3 Label Bottom Part Integration', () => {
    it('should generate ultra-compact barcode for 2x3 bottom part', async () => {
      const config = BarcodeGenerator.getSplitLabelBottomConfig();
      const barcodeData = 'O1A-ORD123-ITM456';
      
      // Test readability (should be lower but still functional)
      const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, barcodeData);
      expect(readabilityTest.score).toBeGreaterThan(40);
      
      // Test generation with fallback
      const result = await BarcodeGenerator.generateWithFallback(mockCanvas, barcodeData, config);
      expect(result.success).toBe(true);
    });

    it('should handle very compact barcode data for 2x3 labels', () => {
      const compactBarcode = optimizeBarcodeData('O1A', 'ORDER123', 'ITEM456', 15);
      
      expect(compactBarcode.length).toBeLessThanOrEqual(15);
      
      const config = BarcodeGenerator.getSplitLabelBottomConfig();
      const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, compactBarcode);
      
      // Should still be readable despite compact size
      expect(readabilityTest.score).toBeGreaterThan(30);
    });

    it('should provide ultra-compact config for 2x3 labels', () => {
      const optimalConfig = getOptimalBarcodeConfig(120, 35);
      
      expect(optimalConfig.width).toBeLessThanOrEqual(120);
      expect(optimalConfig.height).toBeLessThanOrEqual(35);
      expect(optimalConfig.fontSize).toBeLessThanOrEqual(6);
      expect(optimalConfig.margin).toBeLessThanOrEqual(2);
    });
  });

  describe('Enhanced Configuration Integration', () => {
    it('should provide better readability with enhanced configs', () => {
      const standardTop = BarcodeGenerator.getSplitLabelTopConfig();
      const enhancedTop = BarcodeGenerator.getSplitLabelEnhancedConfig(true);
      
      const testData = 'O1A-ORDER123-ITEM456';
      
      const standardScore = BarcodeGenerator.testBarcodeReadability(standardTop, testData).score;
      const enhancedScore = BarcodeGenerator.testBarcodeReadability(enhancedTop, testData).score;
      
      expect(enhancedScore).toBeGreaterThanOrEqual(standardScore);
    });

    it('should handle edge cases with enhanced configs', async () => {
      const enhancedBottom = BarcodeGenerator.getSplitLabelEnhancedConfig(false);
      const longData = 'O1A-VERYLONGORDERNUM-VERYLONGITEMID';
      
      const result = await BarcodeGenerator.generateWithFallback(mockCanvas, longData, enhancedBottom);
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical warehouse barcode data', async () => {
      const scenarios = [
        { data: 'O1A-12345-67890', label: '3x3 top' },
        { data: 'C2B-ORDER-ITEM', label: '2x3 bottom' },
        { data: 'S3C-98765-43210', label: '3x3 top' },
        { data: 'F4D-SHORT-ID', label: '2x3 bottom' },
      ];

      for (const scenario of scenarios) {
        const isTopPart = scenario.label.includes('3x3');
        const config = isTopPart 
          ? BarcodeGenerator.getSplitLabelTopConfig()
          : BarcodeGenerator.getSplitLabelBottomConfig();

        const result = await BarcodeGenerator.generateWithFallback(mockCanvas, scenario.data, config);
        expect(result.success).toBe(true);
        
        const readabilityTest = BarcodeGenerator.testBarcodeReadability(config, scenario.data);
        expect(readabilityTest.score).toBeGreaterThan(30); // Minimum acceptable score
      }
    });

    it('should optimize problematic barcode data automatically', () => {
      const problematicData = [
        'O1A-VERYLONGORDERNUM123456789-VERYLONGITEMID123456789',
        'STATION-EXTREMELYLONGORDERNUMBER-EXTREMELYLONGITEMIDENTIFIER',
        'ABC-ORDER123456789012345-ITEM123456789012345',
      ];

      for (const data of problematicData) {
        const parts = data.split('-');
        const optimized = optimizeBarcodeData(parts[0], parts[1], parts[2], 20);
        
        expect(optimized.length).toBeLessThanOrEqual(20);
        expect(optimized).toContain(parts[0]); // Prefix should be preserved
        
        // Should still be valid barcode format
        expect(BarcodeGenerator.validateBarcode(optimized)).toBe(true);
      }
    });

    it('should provide appropriate fallbacks for extreme cases', async () => {
      const extremeConfig: BarcodeConfig = {
        width: 60,
        height: 20,
        fontSize: 4,
        margin: 1,
        showText: false,
        format: 'CODE128'
      };

      const result = await BarcodeGenerator.generateWithFallback(
        mockCanvas, 
        'EXTREME-CASE-DATA', 
        extremeConfig
      );

      expect(result.success).toBe(true);
      expect(['simplified', 'text']).toContain(result.method);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Print Layout Integration', () => {
    it('should maintain consistency across print layout', () => {
      const printConfig = BarcodeGenerator.getPrintLayoutConfig();
      const topConfig = BarcodeGenerator.getSplitLabelTopConfig();
      const bottomConfig = BarcodeGenerator.getSplitLabelBottomConfig();

      const testData = 'O1A-ORDER123-ITEM456';

      // All configs should produce valid barcodes
      const printScore = BarcodeGenerator.testBarcodeReadability(printConfig, testData).score;
      const topScore = BarcodeGenerator.testBarcodeReadability(topConfig, testData).score;
      const bottomScore = BarcodeGenerator.testBarcodeReadability(bottomConfig, testData).score;

      expect(printScore).toBeGreaterThan(80);
      expect(topScore).toBeGreaterThan(50);
      expect(bottomScore).toBeGreaterThan(30);
    });

    it('should scale appropriately for different print densities', () => {
      const configs = [
        BarcodeGenerator.getRecommendedConfig(100, 30, 15), // Tiny
        BarcodeGenerator.getRecommendedConfig(150, 40, 15), // Small
        BarcodeGenerator.getRecommendedConfig(200, 60, 15), // Medium
        BarcodeGenerator.getRecommendedConfig(300, 80, 15), // Large
      ];

      for (let i = 1; i < configs.length; i++) {
        expect(configs[i].fontSize).toBeGreaterThanOrEqual(configs[i-1].fontSize);
        expect(configs[i].margin).toBeGreaterThanOrEqual(configs[i-1].margin);
      }
    });
  });
});