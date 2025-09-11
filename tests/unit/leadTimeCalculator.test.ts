import { describe, it, expect, beforeEach } from 'vitest';
import { LeadTimeCalculator } from '../../utils/leadTimeCalculator';

describe('LeadTimeCalculator', () => {
  describe('convertHoursToBusinessDays', () => {
    it('should return 1 day minimum for any positive hours less than 8', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(0.5)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(4)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(7.9)).toBe(1);
    });

    it('should return 1 day for exactly 8 hours', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(8)).toBe(1);
    });

    it('should round up partial days correctly', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(8.1)).toBe(2);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(15)).toBe(2);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(16.1)).toBe(3);
    });

    it('should handle the 60 hours = 8 days example from requirements', () => {
      // 60 hours / 8 = 7.5 days, should round up to 8 days
      expect(LeadTimeCalculator.convertHoursToBusinessDays(60)).toBe(8);
    });

    it('should handle exact multiples of 8 hours', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(16)).toBe(2);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(24)).toBe(3);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(40)).toBe(5);
    });

    it('should return 1 day minimum for zero or negative hours', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(0)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(-5)).toBe(1);
    });

    it('should handle large hour values correctly', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(168)).toBe(21); // 1 week
      expect(LeadTimeCalculator.convertHoursToBusinessDays(169)).toBe(22); // 1 week + 1 hour
    });
  });

  describe('calculateProductionTimeInHours', () => {
    it('should calculate correct hours between two dates', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-01T17:00:00Z');
      
      expect(LeadTimeCalculator.calculateProductionTimeInHours(start, end)).toBe(8);
    });

    it('should handle dates spanning multiple days', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-02T17:00:00Z');
      
      expect(LeadTimeCalculator.calculateProductionTimeInHours(start, end)).toBe(32);
    });

    it('should return 0 for invalid date inputs', () => {
      const validDate = new Date('2025-01-01T09:00:00Z');
      
      expect(LeadTimeCalculator.calculateProductionTimeInHours(null as any, validDate)).toBe(0);
      expect(LeadTimeCalculator.calculateProductionTimeInHours(validDate, null as any)).toBe(0);
      expect(LeadTimeCalculator.calculateProductionTimeInHours(null as any, null as any)).toBe(0);
    });

    it('should return 0 when end time is before start time', () => {
      const start = new Date('2025-01-02T09:00:00Z');
      const end = new Date('2025-01-01T09:00:00Z');
      
      expect(LeadTimeCalculator.calculateProductionTimeInHours(start, end)).toBe(0);
    });

    it('should handle same start and end times', () => {
      const date = new Date('2025-01-01T09:00:00Z');
      
      expect(LeadTimeCalculator.calculateProductionTimeInHours(date, date)).toBe(0);
    });
  });

  describe('calculateProductionTimeInBusinessDays', () => {
    it('should combine hour calculation with business day conversion', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-01T17:00:00Z'); // 8 hours
      
      expect(LeadTimeCalculator.calculateProductionTimeInBusinessDays(start, end)).toBe(1);
    });

    it('should handle multi-day production correctly', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-03T17:00:00Z'); // 56 hours = 7 days
      
      expect(LeadTimeCalculator.calculateProductionTimeInBusinessDays(start, end)).toBe(7);
    });

    it('should apply minimum 1 day rule', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-01T11:00:00Z'); // 2 hours
      
      expect(LeadTimeCalculator.calculateProductionTimeInBusinessDays(start, end)).toBe(1);
    });
  });

  describe('calculateLeadTime', () => {
    it('should calculate lead time from order creation to completion', () => {
      const created = new Date('2025-01-01T09:00:00Z');
      const completed = new Date('2025-01-02T17:00:00Z'); // 32 hours = 4 days
      
      expect(LeadTimeCalculator.calculateLeadTime(created, completed)).toBe(4);
    });

    it('should use current time when completion time is not provided', () => {
      const created = new Date(Date.now() - (10 * 60 * 60 * 1000)); // 10 hours ago
      
      const result = LeadTimeCalculator.calculateLeadTime(created);
      expect(result).toBeGreaterThanOrEqual(1); // Should be at least 1 day
      expect(result).toBeLessThanOrEqual(2); // Should be at most 2 days for 10 hours
    });
  });

  describe('validateDates', () => {
    it('should validate correct date inputs', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-02T09:00:00Z');
      
      const result = LeadTimeCalculator.validateDates(start, end);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid start date', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2025-01-01T09:00:00Z');
      
      const result = LeadTimeCalculator.validateDates(invalidDate, validDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Start time is required');
    });

    it('should reject invalid end date', () => {
      const validDate = new Date('2025-01-01T09:00:00Z');
      const invalidDate = new Date('invalid');
      
      const result = LeadTimeCalculator.validateDates(validDate, invalidDate);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End time must be a valid date');
    });

    it('should reject end date before start date', () => {
      const start = new Date('2025-01-02T09:00:00Z');
      const end = new Date('2025-01-01T09:00:00Z');
      
      const result = LeadTimeCalculator.validateDates(start, end);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('End time cannot be before start time');
    });

    it('should accept null/undefined start date', () => {
      const result = LeadTimeCalculator.validateDates(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Start time is required');
    });
  });

  describe('safeCalculateBusinessDays', () => {
    it('should handle valid inputs correctly', () => {
      const start = new Date('2025-01-01T09:00:00Z');
      const end = new Date('2025-01-01T17:00:00Z'); // 8 hours = 1 day
      
      expect(LeadTimeCalculator.safeCalculateBusinessDays(start, end)).toBe(1);
    });

    it('should return 0 for null start time', () => {
      const end = new Date('2025-01-01T17:00:00Z');
      
      expect(LeadTimeCalculator.safeCalculateBusinessDays(null, end)).toBe(0);
      expect(LeadTimeCalculator.safeCalculateBusinessDays(undefined, end)).toBe(0);
    });

    it('should use current time when end time is null', () => {
      const start = new Date(Date.now() - (5 * 60 * 60 * 1000)); // 5 hours ago
      
      const result = LeadTimeCalculator.safeCalculateBusinessDays(start, null);
      expect(result).toBeGreaterThanOrEqual(1); // Should be at least 1 day
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2025-01-01T09:00:00Z');
      
      expect(LeadTimeCalculator.safeCalculateBusinessDays(invalidDate, validDate)).toBe(0);
    });

    it('should handle exceptions gracefully', () => {
      // Test with dates that might cause calculation errors
      const result = LeadTimeCalculator.safeCalculateBusinessDays(
        new Date('1900-01-01'), 
        new Date('2100-01-01')
      );
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases and Requirements Validation', () => {
    it('should meet requirement: less than 8 hours always rounds to 1 day', () => {
      for (let hours = 0.1; hours < 8; hours += 0.5) {
        expect(LeadTimeCalculator.convertHoursToBusinessDays(hours)).toBe(1);
      }
    });

    it('should meet requirement: 60 hours = 8 days (7.5 rounded up)', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(60)).toBe(8);
    });

    it('should meet requirement: exact multiples of 8 show exact days', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(8)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(16)).toBe(2);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(24)).toBe(3);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(32)).toBe(4);
    });

    it('should meet requirement: minimum 1 day for any production time', () => {
      expect(LeadTimeCalculator.convertHoursToBusinessDays(0)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(0.001)).toBe(1);
      expect(LeadTimeCalculator.convertHoursToBusinessDays(7.999)).toBe(1);
    });

    it('should handle daylight saving time transitions', () => {
      // Test dates around DST transitions (these are just examples)
      const beforeDST = new Date('2025-03-08T09:00:00Z');
      const afterDST = new Date('2025-03-09T09:00:00Z');
      
      const result = LeadTimeCalculator.calculateProductionTimeInBusinessDays(beforeDST, afterDST);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(typeof result).toBe('number');
    });

    it('should handle very large time differences', () => {
      const start = new Date('2020-01-01T00:00:00Z');
      const end = new Date('2025-01-01T00:00:00Z');
      
      const result = LeadTimeCalculator.calculateProductionTimeInBusinessDays(start, end);
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
      expect(isFinite(result)).toBe(true);
    });

    it('should handle microsecond precision differences', () => {
      const start = new Date('2025-01-01T09:00:00.000Z');
      const end = new Date('2025-01-01T09:00:00.001Z'); // 1 millisecond difference
      
      const result = LeadTimeCalculator.calculateProductionTimeInBusinessDays(start, end);
      expect(result).toBe(1); // Should still be minimum 1 day
    });
  });
});