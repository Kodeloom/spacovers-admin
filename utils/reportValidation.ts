/**
 * Comprehensive validation utilities for report endpoints
 * Provides robust data validation with clear error messages and graceful fallbacks
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedValue?: any;
}

export interface DateRangeValidation extends ValidationResult {
  normalizedRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ReportValidationError {
  field: string;
  message: string;
  code: string;
  suggestions: string[];
}

/**
 * Validate date range parameters with comprehensive error handling and timezone support
 */
export function validateDateRange(
  startDate?: string | Date,
  endDate?: string | Date,
  maxRangeDays: number = 365
): DateRangeValidation {
  // Check if both dates are provided
  if (!startDate || !endDate) {
    return {
      isValid: false,
      error: 'Both startDate and endDate are required for report generation'
    };
  }

  let start: Date;
  let end: Date;

  try {
    // Convert to Date objects if they're strings
    start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    // Validate that dates are valid
    if (isNaN(start.getTime())) {
      return {
        isValid: false,
        error: 'Invalid start date format. Please provide a valid ISO date string (e.g., "2024-01-01T00:00:00.000Z") or use the date picker'
      };
    }

    if (isNaN(end.getTime())) {
      return {
        isValid: false,
        error: 'Invalid end date format. Please provide a valid ISO date string (e.g., "2024-12-31T23:59:59.999Z") or use the date picker'
      };
    }

    // Validate date range logic
    if (start > end) {
      return {
        isValid: false,
        error: 'Start date cannot be after end date. Please check your date selection.'
      };
    }

    // Check for same day (which is valid but might be unintentional)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    if (startDay.getTime() === endDay.getTime()) {
      // This is valid but we'll note it for potential warnings
      console.info('Single day date range selected');
    }

    // Check for reasonable date range (not too far in the past or future)
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());

    if (start < threeYearsAgo) {
      return {
        isValid: false,
        error: 'Start date cannot be more than 3 years in the past. Historical data may not be available.'
      };
    }

    if (end > sixMonthsFromNow) {
      return {
        isValid: false,
        error: 'End date cannot be more than 6 months in the future. Future data is not available.'
      };
    }

    // Check if start date is in the future
    if (start > now) {
      return {
        isValid: false,
        error: 'Start date cannot be in the future. Please select a past or current date.'
      };
    }

    // Check maximum range with performance warnings
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (rangeDays > maxRangeDays) {
      return {
        isValid: false,
        error: `Date range cannot exceed ${maxRangeDays} days. Current range is ${rangeDays} days. Please reduce the date range for better performance.`
      };
    }

    // Performance warning for large ranges (but still valid)
    if (rangeDays > 180) {
      console.warn(`Large date range selected: ${rangeDays} days. This may impact performance.`);
    }

    return {
      isValid: true,
      normalizedRange: {
        startDate: start,
        endDate: end
      }
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Date parsing error: ${error instanceof Error ? error.message : 'Invalid date format'}. Please use the date picker to select valid dates.`
    };
  }
}

/**
 * Validate user ID parameter (supports multiple formats: CUID, Firebase Auth, UUID)
 */
export function validateUserId(userId?: string): ValidationResult {
  if (!userId) {
    return {
      isValid: false,
      error: 'userId parameter is required'
    };
  }

  if (typeof userId !== 'string') {
    return {
      isValid: false,
      error: 'userId must be a string'
    };
  }

  if (userId.trim().length === 0) {
    return {
      isValid: false,
      error: 'userId cannot be empty'
    };
  }

  const trimmedUserId = userId.trim();

  // CUID format validation (starts with 'c' followed by 24 alphanumeric characters)
  // Example: cmg5nic400016ujni1xm9qcnl
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  
  // Firebase Auth UID format (typically 28 characters, but can vary between 20-128 characters)
  // Example: 6Y5kw0UGhfiDjDG2dhf4Cq7Z3RIVmGtm
  const firebaseAuthRegex = /^[a-zA-Z0-9]{20,128}$/;
  
  // UUID format (with or without hyphens)
  // Example: 123e4567-e89b-12d3-a456-426614174000 or 123e4567e89b12d3a456426614174000
  const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

  // Check if it matches any of the supported formats
  if (cuidRegex.test(trimmedUserId) || firebaseAuthRegex.test(trimmedUserId) || uuidRegex.test(trimmedUserId)) {
    return {
      isValid: true,
      normalizedValue: trimmedUserId
    };
  }

  return {
    isValid: false,
    error: 'userId must be in a valid format (CUID, Firebase Auth UID, or UUID)'
  };
}

/**
 * Validate station ID parameter (CUID format)
 */
export function validateStationId(stationId?: string): ValidationResult {
  if (!stationId) {
    // Station ID is optional in most cases
    return {
      isValid: true,
      normalizedValue: undefined
    };
  }

  if (typeof stationId !== 'string') {
    return {
      isValid: false,
      error: 'stationId must be a string'
    };
  }

  if (stationId.trim().length === 0) {
    return {
      isValid: false,
      error: 'stationId cannot be empty when provided'
    };
  }

  // CUID format validation (starts with 'c' followed by 24 alphanumeric characters)
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  if (!cuidRegex.test(stationId)) {
    return {
      isValid: false,
      error: 'stationId must be a valid CUID format (e.g., cmg5nic400016ujni1xm9qcnl)'
    };
  }

  return {
    isValid: true,
    normalizedValue: stationId.trim()
  };
}

/**
 * Validate order status parameter
 */
export function validateOrderStatus(orderStatus?: string): ValidationResult {
  if (!orderStatus) {
    // Order status is optional
    return {
      isValid: true,
      normalizedValue: undefined
    };
  }

  if (typeof orderStatus !== 'string') {
    return {
      isValid: false,
      error: 'orderStatus must be a string'
    };
  }

  const validStatuses = [
    'PENDING',
    'ORDER_PROCESSING', 
    'READY_TO_SHIP',
    'SHIPPED',
    'CANCELLED'
  ];

  const normalizedStatus = orderStatus.trim().toUpperCase();
  
  if (!validStatuses.includes(normalizedStatus)) {
    return {
      isValid: false,
      error: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`
    };
  }

  return {
    isValid: true,
    normalizedValue: normalizedStatus
  };
}

/**
 * Validate customer ID parameter (CUID format)
 */
export function validateCustomerId(customerId?: string): ValidationResult {
  if (!customerId) {
    // Customer ID is optional
    return {
      isValid: true,
      normalizedValue: undefined
    };
  }

  if (typeof customerId !== 'string') {
    return {
      isValid: false,
      error: 'customerId must be a string'
    };
  }

  if (customerId.trim().length === 0) {
    return {
      isValid: false,
      error: 'customerId cannot be empty when provided'
    };
  }

  // CUID format validation (starts with 'c' followed by 24 alphanumeric characters)
  const cuidRegex = /^c[a-z0-9]{24}$/i;
  if (!cuidRegex.test(customerId)) {
    return {
      isValid: false,
      error: 'customerId must be a valid CUID format (e.g., cmg5nic400016ujni1xm9qcnl)'
    };
  }

  return {
    isValid: true,
    normalizedValue: customerId.trim()
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page?: string | number,
  limit?: string | number
): ValidationResult {
  const result = {
    page: 1,
    limit: 50
  };

  // Validate page
  if (page !== undefined) {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    
    if (isNaN(pageNum) || pageNum < 1) {
      return {
        isValid: false,
        error: 'page must be a positive integer starting from 1'
      };
    }

    if (pageNum > 10000) {
      return {
        isValid: false,
        error: 'page number cannot exceed 10000'
      };
    }

    result.page = pageNum;
  }

  // Validate limit
  if (limit !== undefined) {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    
    if (isNaN(limitNum) || limitNum < 1) {
      return {
        isValid: false,
        error: 'limit must be a positive integer'
      };
    }

    if (limitNum > 1000) {
      return {
        isValid: false,
        error: 'limit cannot exceed 1000 records per request'
      };
    }

    result.limit = limitNum;
  }

  return {
    isValid: true,
    normalizedValue: result
  };
}

/**
 * Handle missing or null processing logs gracefully with enhanced validation
 */
export function validateProcessingLogs(logs: any[]): {
  isValid: boolean;
  validLogs: any[];
  invalidLogs: any[];
  warnings: string[];
} {
  if (!Array.isArray(logs)) {
    return {
      isValid: false,
      validLogs: [],
      invalidLogs: [],
      warnings: ['Processing logs data is not in expected array format']
    };
  }

  const validLogs: any[] = [];
  const invalidLogs: any[] = [];
  const warnings: string[] = [];

  for (const log of logs) {
    // Check for required fields
    if (!log) {
      warnings.push('Encountered null or undefined processing log entry');
      invalidLogs.push(log);
      continue;
    }

    if (!log.orderItemId) {
      warnings.push('Processing log missing orderItemId - skipping entry');
      invalidLogs.push(log);
      continue;
    }

    if (!log.userId) {
      warnings.push(`Processing log for item ${log.orderItemId} missing userId - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    if (!log.stationId) {
      warnings.push(`Processing log for item ${log.orderItemId} missing stationId - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    // Validate that we have at least a start time
    if (!log.startTime) {
      warnings.push(`Processing log for item ${log.orderItemId} missing startTime - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    // Allow logs without endTime (in-progress items)
    // Only validate duration if the log is completed (has endTime)
    if (log.endTime) {
      // Validate duration for completed logs
      if (log.durationInSeconds === null || log.durationInSeconds === undefined) {
        warnings.push(`Processing log for item ${log.orderItemId} missing duration - skipping entry`);
        invalidLogs.push(log);
        continue;
      }

      if (typeof log.durationInSeconds !== 'number' || log.durationInSeconds <= 0) {
        warnings.push(`Invalid duration for item ${log.orderItemId} - skipping entry`);
        invalidLogs.push(log);
        continue;
      }
    }

    // Check for unreasonably long durations (more than 24 hours)
    if (log.durationInSeconds > 86400) {
      warnings.push(`Unusually long duration (${Math.round(log.durationInSeconds / 3600)} hours) for item ${log.orderItemId} - excluding from calculations`);
      invalidLogs.push(log);
      continue;
    }

    // Validate timestamps
    if (log.startTime && !(log.startTime instanceof Date) && typeof log.startTime === 'string') {
      const startDate = new Date(log.startTime);
      if (isNaN(startDate.getTime())) {
        warnings.push(`Invalid start time for item ${log.orderItemId} - skipping entry`);
        invalidLogs.push(log);
        continue;
      }
      log.startTime = startDate;
    }

    if (log.endTime && !(log.endTime instanceof Date) && typeof log.endTime === 'string') {
      const endDate = new Date(log.endTime);
      if (isNaN(endDate.getTime())) {
        warnings.push(`Invalid end time for item ${log.orderItemId} - skipping entry`);
        invalidLogs.push(log);
        continue;
      }
      log.endTime = endDate;
    }

    // Validate that endTime is after startTime
    if (log.startTime && log.endTime && log.startTime >= log.endTime) {
      warnings.push(`Processing log for item ${log.orderItemId} has invalid time range (start >= end) - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    // Validate that orderItem exists and is a production item
    if (!log.orderItem) {
      warnings.push(`Processing log for item ${log.orderItemId} missing orderItem relation - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    if (!log.orderItem.isProduct) {
      warnings.push(`Processing log for item ${log.orderItemId} is not a production item - skipping entry`);
      invalidLogs.push(log);
      continue;
    }

    validLogs.push(log);
  }

  return {
    isValid: validLogs.length > 0,
    validLogs,
    invalidLogs,
    warnings
  };
}

/**
 * Validate division operations to prevent division by zero
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number {
  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return defaultValue;
  }

  if (isNaN(numerator) || isNaN(denominator)) {
    return defaultValue;
  }

  if (denominator === 0) {
    return defaultValue;
  }

  const result = numerator / denominator;
  
  if (isNaN(result) || !isFinite(result)) {
    return defaultValue;
  }

  return result;
}

/**
 * Validate and sanitize numeric values
 */
export function validateNumeric(
  value: any,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    allowNull?: boolean;
    defaultValue?: number;
  } = {}
): ValidationResult {
  const { min, max, allowNull = false, defaultValue = 0 } = options;

  if (value === null || value === undefined) {
    if (allowNull) {
      return {
        isValid: true,
        normalizedValue: null
      };
    }
    return {
      isValid: true,
      normalizedValue: defaultValue
    };
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof numValue !== 'number' || isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`
    };
  }

  if (!isFinite(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a finite number`
    };
  }

  if (min !== undefined && numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`
    };
  }

  if (max !== undefined && numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${max}`
    };
  }

  return {
    isValid: true,
    normalizedValue: numValue
  };
}

/**
 * Create standardized validation error response
 */
export function createValidationError(
  field: string,
  message: string,
  code: string = 'VALIDATION_ERROR',
  suggestions: string[] = []
): ReportValidationError {
  return {
    field,
    message,
    code,
    suggestions: suggestions.length > 0 ? suggestions : [
      'Check the parameter format and try again',
      'Refer to the API documentation for valid parameter formats'
    ]
  };
}

/**
 * Validate complete report request parameters
 */
export function validateReportRequest(query: Record<string, any>): {
  isValid: boolean;
  errors: ReportValidationError[];
  validatedParams: Record<string, any>;
} {
  const errors: ReportValidationError[] = [];
  const validatedParams: Record<string, any> = {};

  // Validate date range
  const dateValidation = validateDateRange(query.startDate, query.endDate);
  if (!dateValidation.isValid) {
    errors.push(createValidationError(
      'dateRange',
      dateValidation.error!,
      'INVALID_DATE_RANGE',
      [
        'Ensure both startDate and endDate are provided',
        'Use ISO date format (e.g., "2024-01-01T00:00:00.000Z")',
        'Ensure start date is before end date',
        'Keep date range within reasonable limits (max 365 days)'
      ]
    ));
  } else {
    validatedParams.startDate = dateValidation.normalizedRange!.startDate;
    validatedParams.endDate = dateValidation.normalizedRange!.endDate;
  }

  // Validate optional parameters
  if (query.userId) {
    const userValidation = validateUserId(query.userId);
    if (!userValidation.isValid) {
      errors.push(createValidationError(
        'userId',
        userValidation.error!,
        'INVALID_USER_ID',
        [
          'Ensure the user ID is in a valid format (CUID, Firebase Auth UID, or UUID)',
          'Check that the user ID was copied correctly from the system',
          'Use the employee dropdown to select a valid user'
        ]
      ));
    } else {
      validatedParams.userId = userValidation.normalizedValue;
    }
  }

  if (query.stationId) {
    const stationValidation = validateStationId(query.stationId);
    if (!stationValidation.isValid) {
      errors.push(createValidationError(
        'stationId',
        stationValidation.error!,
        'INVALID_STATION_ID',
        [
          'Ensure the station ID is in CUID format (starts with "c" followed by 24 characters)',
          'Check that the station ID was copied correctly from the system',
          'Use the station dropdown to select a valid station'
        ]
      ));
    } else {
      validatedParams.stationId = stationValidation.normalizedValue;
    }
  }

  if (query.orderStatus) {
    const statusValidation = validateOrderStatus(query.orderStatus);
    if (!statusValidation.isValid) {
      errors.push(createValidationError(
        'orderStatus',
        statusValidation.error!,
        'INVALID_ORDER_STATUS'
      ));
    } else {
      validatedParams.orderStatus = statusValidation.normalizedValue;
    }
  }

  if (query.customerId) {
    const customerValidation = validateCustomerId(query.customerId);
    if (!customerValidation.isValid) {
      errors.push(createValidationError(
        'customerId',
        customerValidation.error!,
        'INVALID_CUSTOMER_ID',
        [
          'Ensure the customer ID is in CUID format (starts with "c" followed by 24 characters)',
          'Check that the customer ID was copied correctly from the system',
          'Use the customer dropdown to select a valid customer'
        ]
      ));
    } else {
      validatedParams.customerId = customerValidation.normalizedValue;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedParams
  };
}
/**

 * Validate data quality and provide comprehensive warnings
 */
export function validateDataQuality(logs: any[]): {
  qualityScore: number;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let qualityScore = 100;

  if (logs.length === 0) {
    return {
      qualityScore: 0,
      warnings: ['No data available'],
      recommendations: ['Check date range and filters', 'Ensure employees are logging their work properly']
    };
  }

  // Check for missing user information
  const logsWithoutUser = logs.filter(log => !log.user?.name);
  if (logsWithoutUser.length > 0) {
    const percentage = Math.round((logsWithoutUser.length / logs.length) * 100);
    warnings.push(`${percentage}% of logs have missing user information`);
    qualityScore -= Math.min(percentage, 20);
  }

  // Check for missing station information
  const logsWithoutStation = logs.filter(log => !log.station?.name);
  if (logsWithoutStation.length > 0) {
    const percentage = Math.round((logsWithoutStation.length / logs.length) * 100);
    warnings.push(`${percentage}% of logs have missing station information`);
    qualityScore -= Math.min(percentage, 20);
  }

  // Check for very short durations (less than 1 minute)
  const shortDurationLogs = logs.filter(log => log.durationInSeconds && log.durationInSeconds < 60);
  if (shortDurationLogs.length > 0) {
    const percentage = Math.round((shortDurationLogs.length / logs.length) * 100);
    if (percentage > 10) {
      warnings.push(`${percentage}% of logs have very short durations (< 1 minute)`);
      recommendations.push('Review scanning procedures to ensure accurate time tracking');
      qualityScore -= Math.min(percentage / 2, 10);
    }
  }

  // Check for very long durations (more than 8 hours)
  const longDurationLogs = logs.filter(log => log.durationInSeconds && log.durationInSeconds > 28800);
  if (longDurationLogs.length > 0) {
    const percentage = Math.round((longDurationLogs.length / logs.length) * 100);
    if (percentage > 5) {
      warnings.push(`${percentage}% of logs have very long durations (> 8 hours)`);
      recommendations.push('Review time tracking procedures for accuracy');
      qualityScore -= Math.min(percentage, 15);
    }
  }

  // Check for duplicate processing logs (same item, user, station, similar time)
  const duplicateGroups = new Map<string, any[]>();
  logs.forEach(log => {
    const key = `${log.orderItemId}-${log.userId}-${log.stationId}`;
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key)!.push(log);
  });

  const duplicates = Array.from(duplicateGroups.values()).filter(group => group.length > 1);
  if (duplicates.length > 0) {
    const totalDuplicates = duplicates.reduce((sum, group) => sum + group.length - 1, 0);
    const percentage = Math.round((totalDuplicates / logs.length) * 100);
    warnings.push(`${percentage}% of logs appear to be duplicates`);
    recommendations.push('Review scanning procedures to prevent duplicate entries');
    qualityScore -= Math.min(percentage, 25);
  }

  // Ensure quality score doesn't go below 0
  qualityScore = Math.max(0, qualityScore);

  // Add general recommendations based on quality score
  if (qualityScore < 70) {
    recommendations.push('Consider reviewing data collection procedures');
    recommendations.push('Provide additional training on time tracking systems');
  }

  if (qualityScore < 50) {
    recommendations.push('Data quality is poor - results may not be reliable');
    recommendations.push('Contact system administrator for data quality review');
  }

  return {
    qualityScore,
    warnings,
    recommendations
  };
}
/**

 * Monitor and log performance metrics for report generation
 */
export function logPerformanceMetrics(
  operation: string,
  duration: number,
  recordCount: number,
  userId?: string
): void {
  const metrics = {
    operation,
    duration,
    recordCount,
    recordsPerSecond: recordCount > 0 ? Math.round(recordCount / (duration / 1000)) : 0,
    timestamp: new Date().toISOString(),
    userId
  };

  // Log performance metrics
  console.log('Performance metrics:', metrics);

  // Log warnings for slow operations
  if (duration > 10000) {
    console.warn(`Slow ${operation} detected: ${duration}ms for ${recordCount} records`);
  }

  // Log warnings for low throughput
  if (metrics.recordsPerSecond < 100 && recordCount > 1000) {
    console.warn(`Low throughput for ${operation}: ${metrics.recordsPerSecond} records/second`);
  }
}

/**
 * Validate query parameters for performance implications
 */
export function validateQueryPerformance(params: {
  startDate?: Date;
  endDate?: Date;
  stationId?: string;
  userId?: string;
}): {
  isOptimal: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let isOptimal = true;

  // Check date range size
  if (params.startDate && params.endDate) {
    const rangeDays = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (rangeDays > 90) {
      warnings.push(`Large date range (${rangeDays} days) may impact performance`);
      suggestions.push('Consider reducing date range to 90 days or less');
      isOptimal = false;
    }

    if (rangeDays > 365) {
      warnings.push(`Very large date range (${rangeDays} days) will likely cause slow performance`);
      suggestions.push('Reduce date range to 365 days or less for better performance');
      isOptimal = false;
    }
  }

  // Check for missing filters that could improve performance
  if (!params.stationId && !params.userId) {
    suggestions.push('Adding station or user filters can improve query performance');
  }

  return {
    isOptimal,
    warnings,
    suggestions
  };
}