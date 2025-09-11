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
 * Validate date range parameters with comprehensive error handling
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
        error: 'Invalid start date format. Please provide a valid ISO date string (e.g., "2024-01-01T00:00:00.000Z")'
      };
    }

    if (isNaN(end.getTime())) {
      return {
        isValid: false,
        error: 'Invalid end date format. Please provide a valid ISO date string (e.g., "2024-12-31T23:59:59.999Z")'
      };
    }

    // Validate date range logic
    if (start > end) {
      return {
        isValid: false,
        error: 'Start date cannot be after end date'
      };
    }

    // Check for reasonable date range (not too far in the past or future)
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    if (start < twoYearsAgo) {
      return {
        isValid: false,
        error: 'Start date cannot be more than 2 years in the past'
      };
    }

    if (end > oneYearFromNow) {
      return {
        isValid: false,
        error: 'End date cannot be more than 1 year in the future'
      };
    }

    // Check maximum range
    const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (rangeDays > maxRangeDays) {
      return {
        isValid: false,
        error: `Date range cannot exceed ${maxRangeDays} days. Current range is ${rangeDays} days.`
      };
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
      error: `Date parsing error: ${error instanceof Error ? error.message : 'Invalid date format'}`
    };
  }
}

/**
 * Validate user ID parameter
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

  // Basic UUID format validation (optional but recommended)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return {
      isValid: false,
      error: 'userId must be a valid UUID format'
    };
  }

  return {
    isValid: true,
    normalizedValue: userId.trim()
  };
}

/**
 * Validate station ID parameter
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
 * Validate customer ID parameter
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
 * Handle missing or null processing logs gracefully
 */
export function validateProcessingLogs(logs: any[]): {
  isValid: boolean;
  validLogs: any[];
  warnings: string[];
} {
  if (!Array.isArray(logs)) {
    return {
      isValid: false,
      validLogs: [],
      warnings: ['Processing logs data is not in expected array format']
    };
  }

  const validLogs: any[] = [];
  const warnings: string[] = [];

  for (const log of logs) {
    // Check for required fields
    if (!log) {
      warnings.push('Encountered null or undefined processing log entry');
      continue;
    }

    if (!log.orderItemId) {
      warnings.push('Processing log missing orderItemId - skipping entry');
      continue;
    }

    if (!log.userId) {
      warnings.push(`Processing log for item ${log.orderItemId} missing userId - skipping entry`);
      continue;
    }

    if (!log.stationId) {
      warnings.push(`Processing log for item ${log.orderItemId} missing stationId - skipping entry`);
      continue;
    }

    // Validate duration
    if (log.durationInSeconds !== null && log.durationInSeconds !== undefined) {
      if (typeof log.durationInSeconds !== 'number' || log.durationInSeconds < 0) {
        warnings.push(`Invalid duration for item ${log.orderItemId} - setting to 0`);
        log.durationInSeconds = 0;
      }

      // Check for unreasonably long durations (more than 24 hours)
      if (log.durationInSeconds > 86400) {
        warnings.push(`Unusually long duration (${Math.round(log.durationInSeconds / 3600)} hours) for item ${log.orderItemId}`);
      }
    }

    // Validate timestamps
    if (log.startTime && !(log.startTime instanceof Date) && typeof log.startTime === 'string') {
      const startDate = new Date(log.startTime);
      if (isNaN(startDate.getTime())) {
        warnings.push(`Invalid start time for item ${log.orderItemId} - skipping entry`);
        continue;
      }
      log.startTime = startDate;
    }

    if (log.endTime && !(log.endTime instanceof Date) && typeof log.endTime === 'string') {
      const endDate = new Date(log.endTime);
      if (isNaN(endDate.getTime())) {
        warnings.push(`Invalid end time for item ${log.orderItemId} - skipping entry`);
        continue;
      }
      log.endTime = endDate;
    }

    validLogs.push(log);
  }

  return {
    isValid: validLogs.length > 0,
    validLogs,
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
        'INVALID_USER_ID'
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
        'INVALID_STATION_ID'
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
        'INVALID_CUSTOMER_ID'
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