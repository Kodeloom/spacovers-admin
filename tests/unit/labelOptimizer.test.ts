import { describe, it, expect } from 'vitest';
import {
  truncateText,
  abbreviateText,
  optimizeCustomerName,
  optimizeProductType,
  optimizeColor,
  condenseUpgrades,
  formatCompactDate,
  optimizeLabelInfo,
  validateOptimizedInfo,
  DEFAULT_LABEL_CONFIG,
  type OptimizedLabelInfo,
} from '../../utils/labelOptimizer';

describe('labelOptimizer', () => {
  describe('truncateText', () => {
    it('should return original text if within length limit', () => {
      expect(truncateText('Short', 10)).toBe('Short');
    });

    it('should truncate text and add ellipsis if too long', () => {
      expect(truncateText('This is a very long text', 10)).toBe('This is...');
    });

    it('should handle empty or null text', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText(null as any, 10)).toBe(null);
    });

    it('should handle text exactly at limit', () => {
      expect(truncateText('Exactly10!', 10)).toBe('Exactly10!');
    });
  });

  describe('abbreviateText', () => {
    const testAbbreviations = {
      'Reinforced': 'Reinf',
      'Heavy Duty': 'HD',
    };

    it('should use exact abbreviation match', () => {
      expect(abbreviateText('Reinforced', testAbbreviations, 20)).toBe('Reinf');
    });

    it('should replace partial matches in compound terms', () => {
      expect(abbreviateText('Reinforced Material', testAbbreviations, 20)).toBe('Reinf Material');
    });

    it('should truncate if still too long after abbreviation', () => {
      expect(abbreviateText('Very Long Reinforced Material Name', testAbbreviations, 10)).toBe('Very Lo...');
    });

    it('should handle empty text', () => {
      expect(abbreviateText('', testAbbreviations, 10)).toBe('');
    });
  });

  describe('optimizeCustomerName', () => {
    it('should remove common business suffixes', () => {
      expect(optimizeCustomerName('Acme Corporation LLC')).toBe('Acme');
      expect(optimizeCustomerName('Smith Inc')).toBe('Smith');
      expect(optimizeCustomerName('Johnson Company')).toBe('Johnson');
      expect(optimizeCustomerName('Brown Co.')).toBe('Brown');
    });

    it('should handle multiple spaces', () => {
      expect(optimizeCustomerName('Acme   Corporation   LLC')).toBe('Acme');
    });

    it('should truncate if still too long', () => {
      expect(optimizeCustomerName('Very Long Customer Name Without Suffixes', 10)).toBe('Very Lo...');
    });

    it('should handle empty customer name', () => {
      expect(optimizeCustomerName('')).toBe('');
    });
  });

  describe('optimizeProductType', () => {
    it('should abbreviate known product types', () => {
      expect(optimizeProductType('Reinforced')).toBe('Reinf');
      expect(optimizeProductType('Heavy Duty')).toBe('HD');
      expect(optimizeProductType('Standard')).toBe('Std');
    });

    it('should truncate unknown types if too long', () => {
      expect(optimizeProductType('Unknown Very Long Type Name', 8)).toBe('Unkno...');
    });

    it('should handle case insensitive matching', () => {
      expect(optimizeProductType('reinforced')).toBe('Reinf');
      expect(optimizeProductType('HEAVY DUTY')).toBe('HD');
    });
  });

  describe('optimizeColor', () => {
    it('should abbreviate known colors', () => {
      expect(optimizeColor('Forest Green')).toBe('F.Green');
      expect(optimizeColor('Dark Blue')).toBe('D.Blue');
      expect(optimizeColor('Navy Blue')).toBe('Navy');
    });

    it('should truncate unknown colors if too long', () => {
      expect(optimizeColor('Unknown Very Long Color Name', 8)).toBe('Unkno...');
    });

    it('should handle case insensitive matching', () => {
      expect(optimizeColor('forest green')).toBe('F.Green');
    });
  });

  describe('condenseUpgrades', () => {
    it('should return empty string for no upgrades', () => {
      expect(condenseUpgrades([])).toBe('');
      expect(condenseUpgrades(null as any)).toBe('');
    });

    it('should abbreviate and join upgrades with commas', () => {
      expect(condenseUpgrades(['Reinforced', 'Waterproof'])).toBe('Reinf, WP');
    });

    it('should remove spaces if too long', () => {
      const longUpgrades = ['Reinforced', 'Waterproof', 'Fire Resistant', 'UV Protection'];
      const result = condenseUpgrades(longUpgrades, 15);
      expect(result).toBe('Reinf,WP,FR,UV');
    });

    it('should truncate and add ellipsis if still too long', () => {
      const manyUpgrades = ['Reinforced', 'Waterproof', 'Fire Resistant', 'UV Protection', 'Anti-Static'];
      const result = condenseUpgrades(manyUpgrades, 10);
      expect(result.length).toBeLessThanOrEqual(10);
      expect(result).toContain('...');
    });

    it('should handle single upgrade', () => {
      expect(condenseUpgrades(['Reinforced'])).toBe('Reinf');
    });
  });

  describe('formatCompactDate', () => {
    it('should format Date object to MM/DD', () => {
      const date = new Date('2024-03-15');
      expect(formatCompactDate(date)).toBe('03/15');
    });

    it('should format date string to MM/DD', () => {
      expect(formatCompactDate('2024-12-25')).toBe('12/25');
    });

    it('should pad single digits with zeros', () => {
      const date = new Date('2024-01-05');
      expect(formatCompactDate(date)).toBe('01/05');
    });

    it('should handle invalid dates', () => {
      expect(formatCompactDate('invalid-date')).toBe('');
      expect(formatCompactDate('')).toBe('');
    });

    it('should handle null/undefined dates', () => {
      expect(formatCompactDate(null as any)).toBe('');
      expect(formatCompactDate(undefined as any)).toBe('');
    });
  });

  describe('optimizeLabelInfo', () => {
    const mockOrderItem = {
      customerName: 'Acme Corporation LLC',
      thickness: '1/4',
      size: '12x18',
      type: 'Reinforced',
      color: 'Forest Green',
      date: '2024-03-15',
      upgrades: ['Waterproof', 'Fire Resistant'],
      barcode: 'ABC123',
      id: 'order-123',
    };

    it('should optimize all label information', () => {
      const result = optimizeLabelInfo(mockOrderItem);
      
      expect(result.customer).toBe('Acme');
      expect(result.thickness).toBe('1/4');
      expect(result.size).toBe('12x18');
      expect(result.type).toBe('Reinf');
      expect(result.color).toBe('F.Green');
      expect(result.date).toBe('03/15');
      expect(result.upgrades).toBe('WP, FR');
      expect(result.barcode).toBe('ABC123');
    });

    it('should use custom configuration', () => {
      const config = {
        maxCustomerLength: 5,
        maxUpgradeLength: 5,
        maxTypeLength: 5,
        maxColorLength: 5,
      };
      
      const result = optimizeLabelInfo(mockOrderItem, config);
      
      expect(result.customer.length).toBeLessThanOrEqual(5);
      expect(result.upgrades.length).toBeLessThanOrEqual(5);
      expect(result.type.length).toBeLessThanOrEqual(5);
      expect(result.color.length).toBeLessThanOrEqual(5);
    });

    it('should handle missing fields gracefully', () => {
      const incompleteItem = {
        customerName: 'Test Customer',
      };
      
      const result = optimizeLabelInfo(incompleteItem);
      
      expect(result.customer).toBe('Test Customer');
      expect(result.thickness).toBe('');
      expect(result.size).toBe('');
      expect(result.type).toBe('');
      expect(result.color).toBe('');
      expect(result.upgrades).toBe('');
      expect(result.barcode).toBe('');
    });

    it('should use current date if no date provided', () => {
      const itemWithoutDate = {
        customerName: 'Test Customer',
      };
      
      const result = optimizeLabelInfo(itemWithoutDate);
      const today = new Date();
      const expectedDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
      
      expect(result.date).toBe(expectedDate);
    });

    it('should use id as barcode fallback', () => {
      const itemWithId = {
        customerName: 'Test Customer',
        id: 'fallback-123',
      };
      
      const result = optimizeLabelInfo(itemWithId);
      expect(result.barcode).toBe('fallback-123');
    });
  });

  describe('validateOptimizedInfo', () => {
    it('should validate info within limits', () => {
      const validInfo: OptimizedLabelInfo = {
        customer: 'Short Name',
        thickness: '1/4',
        size: '12x18',
        type: 'Std',
        color: 'Blue',
        date: '03/15',
        upgrades: 'WP, FR',
        barcode: 'ABC123',
      };
      
      const result = validateOptimizedInfo(validInfo);
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect violations', () => {
      const invalidInfo: OptimizedLabelInfo = {
        customer: 'This is a very long customer name that exceeds limits',
        thickness: '1/4',
        size: '12x18',
        type: 'Very Long Type Name',
        color: 'Very Long Color Name',
        date: '03/15',
        upgrades: 'Very Long Upgrade List That Exceeds The Maximum Length',
        barcode: 'ABC123',
      };
      
      const result = validateOptimizedInfo(invalidInfo);
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('Customer name'))).toBe(true);
      expect(result.violations.some(v => v.includes('Type'))).toBe(true);
      expect(result.violations.some(v => v.includes('Color'))).toBe(true);
      expect(result.violations.some(v => v.includes('Upgrades'))).toBe(true);
    });

    it('should use custom configuration for validation', () => {
      const info: OptimizedLabelInfo = {
        customer: 'Medium Name',
        thickness: '1/4',
        size: '12x18',
        type: 'Std',
        color: 'Blue',
        date: '03/15',
        upgrades: 'WP',
        barcode: 'ABC123',
      };
      
      const strictConfig = {
        maxCustomerLength: 5,
        maxUpgradeLength: 5,
        maxTypeLength: 5,
        maxColorLength: 5,
      };
      
      const result = validateOptimizedInfo(info, strictConfig);
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('Customer name exceeds 5'))).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined and null inputs gracefully', () => {
      expect(() => optimizeLabelInfo(null as any)).not.toThrow();
      expect(() => optimizeLabelInfo(undefined as any)).not.toThrow();
      expect(() => optimizeLabelInfo({})).not.toThrow();
    });

    it('should handle special characters in text', () => {
      expect(truncateText('Text with émojis 🚀', 10)).toBe('Text wi...');
      expect(optimizeCustomerName('Café & Co.')).toBe('Café &');
    });

    it('should handle very long upgrade lists', () => {
      const manyUpgrades = Array(20).fill('Upgrade').map((u, i) => `${u}${i}`);
      const result = condenseUpgrades(manyUpgrades, 15);
      expect(result.length).toBeLessThanOrEqual(15);
    });

    it('should handle dates at year boundaries', () => {
      expect(formatCompactDate('2024-01-01')).toBe('01/01');
      expect(formatCompactDate('2024-12-31')).toBe('12/31');
    });
  });
});