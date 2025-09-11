/**
 * LeadTimeCalculator - Utility class for calculating lead times and production times
 * with proper business day conversion and rounding logic.
 */
export class LeadTimeCalculator {
  private static readonly BUSINESS_HOURS_PER_DAY = 8;
  private static readonly MINIMUM_DAYS = 1;

  /**
   * Converts hours to business days with proper rounding
   * - Uses 8-hour business days
   * - Minimum 1 day for any production time
   * - Rounds up partial days (e.g., 7.5 days becomes 8 days)
   * 
   * @param hours - Total hours to convert
   * @returns Number of business days (minimum 1)
   */
  static convertHoursToBusinessDays(hours: number): number {
    if (hours <= 0) {
      return this.MINIMUM_DAYS;
    }

    const days = hours / this.BUSINESS_HOURS_PER_DAY;
    
    // If less than 8 hours, always return 1 day minimum
    if (days < this.MINIMUM_DAYS) {
      return this.MINIMUM_DAYS;
    }

    // Round up to next whole day for any partial day
    return Math.ceil(days);
  }

  /**
   * Calculates production time between two dates in hours
   * 
   * @param startTime - Production start time
   * @param endTime - Production end time (or current time if still in production)
   * @returns Total production time in hours
   */
  static calculateProductionTimeInHours(startTime: Date, endTime: Date): number {
    if (!startTime || !endTime) {
      return 0;
    }

    if (endTime < startTime) {
      return 0;
    }

    const diffInMs = endTime.getTime() - startTime.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    return Math.max(0, diffInHours);
  }

  /**
   * Calculates production time in business days between two dates
   * 
   * @param startTime - Production start time
   * @param endTime - Production end time (or current time if still in production)
   * @returns Number of business days (minimum 1)
   */
  static calculateProductionTimeInBusinessDays(startTime: Date, endTime: Date): number {
    const hours = this.calculateProductionTimeInHours(startTime, endTime);
    return this.convertHoursToBusinessDays(hours);
  }

  /**
   * Calculates lead time for an order from creation to completion
   * 
   * @param orderCreatedAt - Order creation timestamp
   * @param completedAt - Order completion timestamp (optional, uses current time if not provided)
   * @returns Lead time in business days
   */
  static calculateLeadTime(orderCreatedAt: Date, completedAt?: Date): number {
    const endTime = completedAt || new Date();
    return this.calculateProductionTimeInBusinessDays(orderCreatedAt, endTime);
  }

  /**
   * Validates date inputs for lead time calculations
   * 
   * @param startTime - Start date to validate
   * @param endTime - End date to validate (optional)
   * @returns Validation result with error message if invalid
   */
  static validateDates(startTime: Date, endTime?: Date): { isValid: boolean; error?: string } {
    if (!startTime || isNaN(startTime.getTime())) {
      return { isValid: false, error: 'Start time is required and must be a valid date' };
    }

    if (endTime && isNaN(endTime.getTime())) {
      return { isValid: false, error: 'End time must be a valid date if provided' };
    }

    if (endTime && endTime < startTime) {
      return { isValid: false, error: 'End time cannot be before start time' };
    }

    return { isValid: true };
  }

  /**
   * Handles edge cases and provides graceful fallbacks for missing data
   * 
   * @param startTime - Production start time (may be null/undefined)
   * @param endTime - Production end time (may be null/undefined)
   * @returns Safe calculation result with fallback values
   */
  static safeCalculateBusinessDays(startTime?: Date | null, endTime?: Date | null): number {
    try {
      if (!startTime) {
        return 0; // No start time means no production time
      }

      const safeEndTime = endTime || new Date();
      const validation = this.validateDates(startTime, safeEndTime);
      
      if (!validation.isValid) {
        console.warn(`LeadTimeCalculator validation error: ${validation.error}`);
        return 0;
      }

      return this.calculateProductionTimeInBusinessDays(startTime, safeEndTime);
    } catch (error) {
      console.error('Error calculating business days:', error);
      return 0;
    }
  }
}