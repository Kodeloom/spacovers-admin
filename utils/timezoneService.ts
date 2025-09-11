/**
 * Timezone Service - Handles date conversion between local timezone and UTC for database queries
 * 
 * This service addresses timezone issues in reports where local date filters need to be
 * properly converted to UTC for accurate database queries and then converted back for display.
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimezoneConversionOptions {
  timezone?: string;
  includeEndOfDay?: boolean;
}

export class TimezoneService {
  /**
   * Converts a local date string to UTC date range for database queries
   * 
   * @param localDateString - Date string in local timezone (YYYY-MM-DD format)
   * @param options - Conversion options including timezone and end-of-day handling
   * @returns Object with start and end UTC dates for the full day range
   */
  static convertLocalDateToUTCRange(
    localDateString: string, 
    options: TimezoneConversionOptions = {}
  ): DateRange {
    try {
      this.validateDateString(localDateString);
      
      const { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, includeEndOfDay = true } = options;
      
      // Create start of day in local timezone
      const localStartDate = new Date(`${localDateString}T00:00:00`);
      const localEndDate = new Date(`${localDateString}T23:59:59.999`);
      
      // Convert to UTC by accounting for timezone offset
      const startUTC = this.convertLocalToUTC(localStartDate, timezone);
      const endUTC = includeEndOfDay 
        ? this.convertLocalToUTC(localEndDate, timezone)
        : this.convertLocalToUTC(localStartDate, timezone);
      
      return {
        start: startUTC,
        end: endUTC
      };
    } catch (error) {
      throw new Error(`Failed to convert local date to UTC range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Converts a date range from local timezone to UTC for database queries
   * 
   * @param startDate - Start date string in local timezone
   * @param endDate - End date string in local timezone  
   * @param options - Conversion options
   * @returns Object with UTC start and end dates
   */
  static convertLocalDateRangeToUTC(
    startDate: string,
    endDate: string,
    options: TimezoneConversionOptions = {}
  ): DateRange {
    try {
      this.validateDateString(startDate);
      this.validateDateString(endDate);
      
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date cannot be after end date');
      }
      
      const startRange = this.convertLocalDateToUTCRange(startDate, { ...options, includeEndOfDay: false });
      const endRange = this.convertLocalDateToUTCRange(endDate, { ...options, includeEndOfDay: true });
      
      return {
        start: startRange.start,
        end: endRange.end
      };
    } catch (error) {
      throw new Error(`Failed to convert date range to UTC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Converts UTC date back to local timezone for display
   * 
   * @param utcDate - UTC date to convert
   * @param timezone - Target timezone (defaults to system timezone)
   * @returns Date object in local timezone
   */
  static convertUTCToLocal(utcDate: Date, timezone?: string): Date {
    try {
      if (!utcDate || !(utcDate instanceof Date) || isNaN(utcDate.getTime())) {
        throw new Error('Invalid UTC date provided');
      }
      
      const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create a new date in the target timezone
      const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: targetTimezone }));
      
      return localDate;
    } catch (error) {
      throw new Error(`Failed to convert UTC to local time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Formats a UTC date for display in local timezone
   * 
   * @param utcDate - UTC date to format
   * @param timezone - Target timezone for display
   * @param format - Format options (defaults to date and time)
   * @returns Formatted date string in local timezone
   */
  static formatUTCForLocalDisplay(
    utcDate: Date, 
    timezone?: string,
    format: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  ): string {
    try {
      if (!utcDate || !(utcDate instanceof Date) || isNaN(utcDate.getTime())) {
        throw new Error('Invalid UTC date provided');
      }
      
      const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      return utcDate.toLocaleString('en-US', {
        ...format,
        timeZone: targetTimezone
      });
    } catch (error) {
      throw new Error(`Failed to format UTC date for display: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the current user's timezone
   * 
   * @returns Current timezone string
   */
  static getCurrentTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      // Fallback to UTC if timezone detection fails
      console.warn('Failed to detect timezone, falling back to UTC');
      return 'UTC';
    }
  }

  /**
   * Validates if a timezone string is valid
   * 
   * @param timezone - Timezone string to validate
   * @returns True if valid, false otherwise
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Private helper to convert local date to UTC accounting for timezone
   */
  private static convertLocalToUTC(localDate: Date, timezone: string): Date {
    try {
      // Get the timezone offset for the specific date
      const utcTime = localDate.getTime();
      const localTime = new Date(localDate.toLocaleString('en-US', { timeZone: timezone })).getTime();
      const timezoneOffset = utcTime - localTime;
      
      return new Date(utcTime + timezoneOffset);
    } catch (error) {
      throw new Error(`Failed to convert local date to UTC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper to validate date string format
   */
  private static validateDateString(dateString: string): void {
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Date string is required and must be a string');
    }
    
    // Check for YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      throw new Error('Date string must be in YYYY-MM-DD format');
    }
    
    // Validate that it's a real date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    // Check if the date string matches the parsed date (catches invalid dates like 2023-02-30)
    const [year, month, day] = dateString.split('-').map(Number);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      throw new Error('Invalid date provided');
    }
  }

  /**
   * Helper method to create database-safe date range queries
   * 
   * @param startDate - Start date string in local timezone
   * @param endDate - End date string in local timezone
   * @param timezone - Optional timezone (defaults to system timezone)
   * @returns Object with UTC dates suitable for database WHERE clauses
   */
  static createDatabaseDateRange(
    startDate: string,
    endDate: string,
    timezone?: string
  ): { gte: Date; lte: Date } {
    const utcRange = this.convertLocalDateRangeToUTC(startDate, endDate, { timezone });
    
    return {
      gte: utcRange.start,  // Greater than or equal to start of day
      lte: utcRange.end     // Less than or equal to end of day
    };
  }

  /**
   * Helper method for single date database queries
   * 
   * @param date - Date string in local timezone
   * @param timezone - Optional timezone
   * @returns Object with UTC date range for the full day
   */
  static createSingleDateRange(
    date: string,
    timezone?: string
  ): { gte: Date; lte: Date } {
    const utcRange = this.convertLocalDateToUTCRange(date, { timezone });
    
    return {
      gte: utcRange.start,
      lte: utcRange.end
    };
  }
}

// Export convenience functions for common use cases
export const convertLocalDateToUTC = TimezoneService.convertLocalDateToUTCRange;
export const convertUTCToLocal = TimezoneService.convertUTCToLocal;
export const formatForDisplay = TimezoneService.formatUTCForLocalDisplay;
export const createDbDateRange = TimezoneService.createDatabaseDateRange;