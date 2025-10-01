import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarcodeGenerator, type BarcodeConfig } from '../../utils/barcodeGenerator';

// Mock canvas and context
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

describe('BarcodeGenerator - Split Label Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Split Label Configurations', () => {
    it('should provide optimized config for 3x3 top part', () => {
      const config = BarcodeGenerator.getSplitLabelTopConfig();
      
      expect(config.width).toBe(180);
      expect(config.height).toBe(45);
      expect(config.fontSize).toBe(8);
      expect(config.margin).toBe(4);
      expect(config.showText).toBe(true);
      expect(config.format).toBe('CODE128');
    });

    it('should provide ultra-compact config for 2x3 bottom part', () => {
      const config = BarcodeGenerator.getSplitLabelBottomConfig();
      
      expect(config.width).toBe(120);
      expect(config.height).toBe(35);
      expect(config.fontSize).toBe(6);
      expect(config.margin).toBe(2);
      expect(config.showText).toBe(true);
      expect(config.format).toBe('CODE128');
    });

    it('should provide enhanced configs for better readability', () => {
      const topConfig = BarcodeGenerator.getSplitLabelEnhancedConfig(true);
      const bottomConfig = BarcodeGenerator.getSplitLabelEnhancedConfig(false);
      
      expect(topConfig.width).toBeGreaterThan(bottomConfig.width);
      expect(topConfig.height).toBeGreaterThan(bottomConfig.height);
      expect(topConfig.fontSize).toBeGreaterThan(bottomConfig.fontSize);
    });
  });

  describe('Barcode Readability Testing', () => {
    it('should score high for optimal dimensions', () => {
      const config: BarcodeConfig = {
        width: 200,
        height: 60,
        fontSize: 10,
        margin: 5,
        showText: true,
        format: 'CODE128'
      };

      const result = BarcodeGenerator.testBarcodeReadability(config, 'TEST-123-456');
      
      expect(result.score).toBeGreaterThan(80);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about small dimensions', () => {
      const config: BarcodeConfig = {
        width: 80,
        height: 25,
        fontSize: 5,
        margin: 2,
        showText: true,
        format: 'CODE128'
      };

      const result = BarcodeGenerator.testBarcodeReadability(config, 'TEST-123-456');
      
      expect(result.score).toBeLessThan(70);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should warn about long data strings', () => {
      const config: BarcodeConfig = {
        width: 200,
        height: 60,
        fontSize: 10,
        margin: 5,
        showText: true,
        format: 'CODE128'
      };

      const longData = 'VERY-LONG-BARCODE-DATA-STRING-THAT-EXCEEDS-NORMAL-LENGTH';
      const result = BarcodeGenerator.testBarcodeReadability(config, longData);
      
      expect(result.warnings.some(w => w.includes('Long data'))).toBe(true);
    });

    it('should warn about narrow bar widths', () => {
      const config: BarcodeConfig = {
        width: 50,
        height: 30,
        fontSize: 6,
        margin: 1,
        showText: true,
        format: 'CODE128'
      };

      const result = BarcodeGenerator.testBarcodeReadability(config, 'TEST-123-456');
      
      expect(result.warnings.some(w => w.includes('Bar width'))).toBe(true);
    });
  });

  describe('Recommended Configuration Generation', () => {
    it('should generate appropriate config for large labels', () => {
      const config = BarcodeGenerator.getRecommendedConfig(300, 80, 15);
      
      expect(config.width).toBe(300);
      expect(config.height).toBe(80);
      expect(config.fontSize).toBeGreaterThanOrEqual(10);
      expect(config.margin).toBeGreaterThanOrEqual(5);
      expect(config.showText).toBe(true);
    });

    it('should generate compact config for small labels', () => {
      const config = BarcodeGenerator.getRecommendedConfig(150, 40, 15);
      
      expect(config.width).toBe(150);
      expect(config.height).toBe(40);
      expect(config.fontSize).toBeGreaterThanOrEqual(7);
      expect(config.margin).toBeGreaterThanOrEqual(3);
      expect(config.showText).toBe(true);
    });

    it('should generate ultra-compact config for tiny labels', () => {
      const config = BarcodeGenerator.getRecommendedConfig(100, 30, 15);
      
      expect(config.width).toBe(100);
      expect(config.height).toBe(30);
      expect(config.fontSize).toBeGreaterThanOrEqual(6);
      expect(config.margin).toBeGreaterThanOrEqual(2);
    });

    it('should disable text for very small labels', () => {
      const config = BarcodeGenerator.getRecommendedConfig(80, 20, 15);
      
      expect(config.showText).toBe(false);
    });
  });

  describe('Fallback Generation', () => {
    it('should handle fallback generation gracefully', async () => {
      const config: BarcodeConfig = {
        width: 120,
        height: 35,
        fontSize: 6,
        margin: 2,
        showText: true,
        format: 'CODE128'
      };

      // Mock JsBarcode to fail
      vi.doMock('jsbarcode', () => {
        throw new Error('JsBarcode failed');
      });

      const result = await BarcodeGenerator.generateWithFallback(mockCanvas, 'TEST-123', config);
      
      expect(result.success).toBe(true);
      expect(['simplified', 'text']).toContain(result.method);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should provide text fallback when all methods fail', async () => {
      const config: BarcodeConfig = {
        width: 50,
        height: 20,
        fontSize: 4,
        margin: 1,
        showText: true,
        format: 'CODE128'
      };

      // Force all methods to fail by using invalid canvas
      const invalidCanvas = {
        getContext: () => null
      } as unknown as HTMLCanvasElement;

      const result = await BarcodeGenerator.generateWithFallback(invalidCanvas, 'TEST', config);
      
      expect(result.method).toBe('text');
      expect(result.warnings.some(w => w.includes('failed'))).toBe(true);
    });
  });

  describe('Barcode Validation', () => {
    it('should validate correct barcode format', () => {
      expect(BarcodeGenerator.validateBarcode('ABC-123-456')).toBe(true);
      expect(BarcodeGenerator.validateBarcode('O1A-ORDER123-ITEM456')).toBe(true);
    });

    it('should reject invalid barcode formats', () => {
      expect(BarcodeGenerator.validateBarcode('ABC-123')).toBe(false);
      expect(BarcodeGenerator.validateBarcode('ABC123456')).toBe(false);
      expect(BarcodeGenerator.validateBarcode('AB-123-456')).toBe(false);
      expect(BarcodeGenerator.validateBarcode('ABC--456')).toBe(false);
    });
  });

  describe('Configuration Presets', () => {
    it('should provide consistent packing slip config', () => {
      const config = BarcodeGenerator.getPackingSlipConfig();
      
      expect(config.width).toBe(280);
      expect(config.height).toBe(70);
      expect(config.format).toBe('CODE128');
    });

    it('should provide high-resolution print config', () => {
      const config = BarcodeGenerator.getPrintConfig();
      
      expect(config.width).toBe(900);
      expect(config.height).toBe(120);
      expect(config.fontSize).toBe(26);
    });

    it('should provide print layout config', () => {
      const config = BarcodeGenerator.getPrintLayoutConfig();
      
      expect(config.width).toBe(300);
      expect(config.height).toBe(60);
      expect(config.fontSize).toBe(12);
    });
  });
});