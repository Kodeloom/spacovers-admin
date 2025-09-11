import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimezoneService } from '../../utils/timezoneService';

describe('TimezoneService', () => {
  beforeEach(() => {
    // Reset any mocks
    vi.clearAllMocks();
  });

  describe('convertLocalDateToUTCRange', () => {
    it('should convert a local date to UTC range for start and end of day', () => {
      const result = TimezoneService.convertLocalDateToUTCRange('2025-09-10');
      
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());
    });

    it('should handle timezone conversion correctly', () => {
      const result = TimezoneService.convertLocalDateToUTCRange('2025-09-10', { 
        timezone: 'America/New_York' 
      });
      
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
    });

    it('should throw error for invalid date format', () => {
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange('invalid-date');
      }).toThrow('Date string must be in YYYY-MM-DD format');
    });

    it('should throw error for invalid date values', () => {
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange('2025-02-30');
      }).toThrow('Invalid date provided');
    });

    it('should throw error for empty date string', () => {
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange('');
      }).toThrow('Date string is required and must be a string');
    });
  });

  describe('convertLocalDateRangeToUTC', () => {
    it('should convert date range from local to UTC', () => {
      const result = TimezoneService.convertLocalDateRangeToUTC('2025-09-10', '2025-09-15');
      
      expect(result).toHaveProperty('start');
      expect(result).toHaveProperty('end');
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());
    });

    it('should throw error when start date is after end date', () => {
      expect(() => {
        TimezoneService.convertLocalDateRangeToUTC('2025-09-15', '2025-09-10');
      }).toThrow('Start date cannot be after end date');
    });

    it('should handle same start and end date', () => {
      const result = TimezoneService.convertLocalDateRangeToUTC('2025-09-10', '2025-09-10');
      
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());
    });
  });

  describe('convertUTCToLocal', () => {
    it('should convert UTC date to local timezone', () => {
      const utcDate = new Date('2025-09-10T12:00:00.000Z');
      const result = TimezoneService.convertUTCToLocal(utcDate);
      
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw error for invalid UTC date', () => {
      expect(() => {
        TimezoneService.convertUTCToLocal(new Date('invalid'));
      }).toThrow('Invalid UTC date provided');
    });

    it('should throw error for null date', () => {
      expect(() => {
        TimezoneService.convertUTCToLocal(null as any);
      }).toThrow('Invalid UTC date provided');
    });
  });

  describe('formatUTCForLocalDisplay', () => {
    it('should format UTC date for local display', () => {
      const utcDate = new Date('2025-09-10T12:00:00.000Z');
      const result = TimezoneService.formatUTCForLocalDisplay(utcDate);
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/); // MM/DD/YYYY format
    });

    it('should handle custom format options', () => {
      const utcDate = new Date('2025-09-10T12:00:00.000Z');
      const result = TimezoneService.formatUTCForLocalDisplay(utcDate, undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\w+ \d{1,2}, \d{4}/); // "Month DD, YYYY" format
    });

    it('should throw error for invalid date', () => {
      expect(() => {
        TimezoneService.formatUTCForLocalDisplay(new Date('invalid'));
      }).toThrow('Invalid UTC date provided');
    });
  });

  describe('getCurrentTimezone', () => {
    it('should return a valid timezone string', () => {
      const timezone = TimezoneService.getCurrentTimezone();
      
      expect(typeof timezone).toBe('string');
      expect(timezone.length).toBeGreaterThan(0);
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(TimezoneService.isValidTimezone('UTC')).toBe(true);
      expect(TimezoneService.isValidTimezone('America/New_York')).toBe(true);
      expect(TimezoneService.isValidTimezone('Europe/London')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(TimezoneService.isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(TimezoneService.isValidTimezone('')).toBe(false);
      expect(TimezoneService.isValidTimezone('NotATimezone')).toBe(false);
    });
  });

  describe('createDatabaseDateRange', () => {
    it('should create database-safe date range', () => {
      const result = TimezoneService.createDatabaseDateRange('2025-09-10', '2025-09-15');
      
      expect(result).toHaveProperty('gte');
      expect(result).toHaveProperty('lte');
      expect(result.gte).toBeInstanceOf(Date);
      expect(result.lte).toBeInstanceOf(Date);
      expect(result.gte.getTime()).toBeLessThan(result.lte.getTime());
    });
  });

  describe('createSingleDateRange', () => {
    it('should create single date range for database queries', () => {
      const result = TimezoneService.createSingleDateRange('2025-09-10');
      
      expect(result).toHaveProperty('gte');
      expect(result).toHaveProperty('lte');
      expect(result.gte).toBeInstanceOf(Date);
      expect(result.lte).toBeInstanceOf(Date);
      expect(result.gte.getTime()).toBeLessThan(result.lte.getTime());
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle daylight saving time transitions', () => {
      // Test around DST transition dates
      const springForward = '2025-03-09'; // DST starts in US
      const fallBack = '2025-11-02'; // DST ends in US
      
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange(springForward, { 
          timezone: 'America/New_York' 
        });
      }).not.toThrow();
      
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange(fallBack, { 
          timezone: 'America/New_York' 
        });
      }).not.toThrow();
    });

    it('should handle leap year dates', () => {
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange('2024-02-29'); // Leap year
      }).not.toThrow();
      
      expect(() => {
        TimezoneService.convertLocalDateToUTCRange('2025-02-29'); // Not leap year
      }).toThrow('Invalid date provided');
    });

    it('should handle year boundaries', () => {
      const result = TimezoneService.convertLocalDateRangeToUTC('2024-12-31', '2025-01-01');
      
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.start.getTime()).toBeLessThan(result.end.getTime());
    });
  });
});