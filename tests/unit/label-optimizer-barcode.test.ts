import { describe, it, expect } from 'vitest';
import {
  optimizeBarcodeData,
  getOptimalBarcodeConfig,
  getBarcodeOptimizationRecommendations,
} from '../../utils/labelOptimizer';

describe('LabelOptimizer - Barcode Optimization', () => {
  describe('optimizeBarcodeData', () => {
    it('should return original barcode if within length limit', () => {
      const result = optimizeBarcodeData('ABC', '123', '456', 20);
      expect(result).toBe('ABC-123-456');
    });

    it('should shorten long order numbers', () => {
      const result = optimizeBarcodeData('ABC', 'VERYLONGORDER123', '456', 20);
      expect(result).toBe('ABC-VERY123-456');
    });

    it('should shorten long item IDs', () => {
      const result = optimizeBarcodeData('ABC', '123', 'VERYLONGITEM789', 20);
      expect(result).toBe('ABC-123-VER789');
    });

    it('should shorten both order and item if needed', () => {
      const result = optimizeBarcodeData('ABC', 'VERYLONGORDER123', 'VERYLONGITEM789', 20);
      expect(result).toBe('ABC-VERY123-VER789');
    });

    it('should truncate entire string if still too long', () => {
      const result = optimizeBarcodeData('ABCDEF', 'VERYLONGORDER123', 'VERYLONGITEM789', 15);
      expect(result.length).toBeLessThanOrEqual(15);
      expect(result).toContain('...');
    });
  });

  describe('getOptimalBarcodeConfig', () => {
    it('should provide standard config for normal-sized labels', () => {
      const config = getOptimalBarcodeConfig(200, 80);
      
      expect(config.width).toBe(160); // 80% of 200
      expect(config.height).toBe(24);  // 30% of 80
      expect(config.fontSize).toBe(8);
      expect(config.margin).toBe(3);
      expect(config.showText).toBe(true);
      expect(config.recommendations).toHaveLength(0);
    });

    it('should provide compact config for small labels', () => {
      const config = getOptimalBarcodeConfig(120, 40);
      
      expect(config.fontSize).toBe(6);
      expect(config.margin).toBe(2);
      expect(config.showText).toBe(true);
      expect(config.recommendations.length).toBeGreaterThan(0);
    });

    it('should disable text for very small labels', () => {
      const config = getOptimalBarcodeConfig(100, 30);
      
      expect(config.showText).toBe(false);
      expect(config.recommendations.some(r => r.includes('Text disabled'))).toBe(true);
    });

    it('should use ultra-compact settings for tiny labels', () => {
      const config = getOptimalBarcodeConfig(80, 25);
      
      expect(config.fontSize).toBe(5);
      expect(config.margin).toBe(1);
      expect(config.recommendations.some(r => r.includes('ultra-compact'))).toBe(true);
    });

    it('should enforce minimum dimensions', () => {
      const config = getOptimalBarcodeConfig(50, 15);
      
      expect(config.height).toBeGreaterThanOrEqual(20);
      expect(config.width).toBeGreaterThanOrEqual(60);
      expect(config.recommendations.some(r => r.includes('minimum'))).toBe(true);
    });
  });

  describe('getBarcodeOptimizationRecommendations', () => {
    it('should indicate optimization is possible for reasonable sizes', () => {
      const result = getBarcodeOptimizationRecommendations(150, 50, 'ABC-123-456');
      
      expect(result.canOptimize).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should reject labels that are too small', () => {
      const result = getBarcodeOptimizationRecommendations(70, 25, 'ABC-123-456');
      
      expect(result.canOptimize).toBe(false);
      expect(result.recommendations.some(r => r.includes('too small'))).toBe(true);
      expect(result.alternativeFormats).toContain('QR Code');
    });

    it('should warn about very small labels', () => {
      const result = getBarcodeOptimizationRecommendations(100, 35, 'ABC-123-456');
      
      expect(result.canOptimize).toBe(true);
      expect(result.recommendations.some(r => r.includes('minimal margins'))).toBe(true);
    });

    it('should warn about long barcode data', () => {
      const result = getBarcodeOptimizationRecommendations(200, 60, 'VERYLONGPREFIX-VERYLONGORDER-VERYLONGITEM');
      
      expect(result.recommendations.some(r => r.includes('long'))).toBe(true);
    });

    it('should suggest QR code for square labels', () => {
      const result = getBarcodeOptimizationRecommendations(100, 100, 'ABC-123-456');
      
      expect(result.alternativeFormats.some(f => f.includes('QR Code'))).toBe(true);
    });

    it('should suggest QR code for very long data', () => {
      const longData = 'A'.repeat(25);
      const result = getBarcodeOptimizationRecommendations(200, 60, longData);
      
      expect(result.alternativeFormats.some(f => f.includes('QR Code'))).toBe(true);
    });
  });
});