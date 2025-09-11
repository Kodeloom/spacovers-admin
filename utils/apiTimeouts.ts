/**
 * API Timeout Management Utility
 * Provides timeout handling for API endpoints with user warnings
 * 
 * Requirements: 9.2 - Implement query timeouts for long-running report generation
 */

import type { H3Event } from 'h3';

/**
 * Interface for API timeout configuration
 */
export interface ApiTimeoutConfig {
  timeoutMs: number;
  warningMs: number;
  enableProgressUpdates: boolean;
  maxRetries: number;
}

/**
 * Interface for API response with timeout metadata
 */
export interface ApiResponse<T> {
  data: T;
  executionTime: number;
  warnings: string[];
  timedOut: boolean;
  retryCount?: number;
}

/**
 * Interface for progress update callback
 */
export type ProgressCallback = (progress: {
  step: string;
  percentage: number;
  message: string;
}) => void;

/**
 * API Timeout Management Service
 * Handles timeouts and progress updates for long-running API operations
 */
export class ApiTimeouts {
  
  // Default timeout configurations by endpoint type
  private static readonly DEFAULT_CONFIGS: Record<string, ApiTimeoutConfig> = {
    dashboard: {
      timeoutMs: 10000,      // 10 seconds
      warningMs: 5000,       // 5 seconds
      enableProgressUpdates: false,
      maxRetries: 1
    },
    orders: {
      timeoutMs: 15000,      // 15 seconds
      warningMs: 7000,       // 7 seconds
      enableProgressUpdates: false,
      maxRetries: 1
    },
    reports: {
      timeoutMs: 60000,      // 60 seconds
      warningMs: 20000,      // 20 seconds
      enableProgressUpdates: true,
      maxRetries: 0
    },
    productivity: {
      timeoutMs: 90000,      // 90 seconds
      warningMs: 30000,      // 30 seconds
      enableProgressUpdates: true,
      maxRetries: 0
    },
    export: {
      timeoutMs: 300000,     // 5 minutes
      warningMs: 60000,      // 1 minute
      enableProgressUpdates: true,
      maxRetries: 0
    }
  };

  /**
   * Execute an API operation with timeout protection
   * @param event - H3 event object
   * @param operationType - Type of operation for configuration lookup
   * @param operation - Async operation to execute
   * @param customConfig - Custom timeout configuration (optional)
   * @returns Promise with timeout protection
   */
  static async executeWithTimeout<T>(
    event: H3Event,
    operationType: string,
    operation: (progressCallback?: ProgressCallback) => Promise<T>,
    customConfig?: Partial<ApiTimeoutConfig>
  ): Promise<ApiResponse<T>> {
    const config = {
      ...this.DEFAULT_CONFIGS[operationType] || this.DEFAULT_CONFIGS.reports,
      ...customConfig
    };

    const startTime = Date.now();
    const warnings: string[] = [];
    let timedOut = false;
    let retryCount = 0;

    // Set up progress tracking if enabled
    let progressCallback: ProgressCallback | undefined;
    if (config.enableProgressUpdates) {
      progressCallback = (progress) => {
        // In a real implementation, this could send Server-Sent Events
        // or update a progress tracking system
        console.log(`Progress: ${progress.step} - ${progress.percentage}% - ${progress.message}`);
      };
    }

    // Set up warning timer
    let warningTimer: NodeJS.Timeout | null = null;
    if (config.warningMs < config.timeoutMs) {
      warningTimer = setTimeout(() => {
        warnings.push(`Operation is taking longer than expected (>${config.warningMs}ms). Please wait...`);
        console.warn(`API operation '${operationType}' is taking longer than expected`);
      }, config.warningMs);
    }

    const executeOperation = async (): Promise<T> => {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error(`Operation timed out after ${config.timeoutMs}ms`));
          }, config.timeoutMs);
        });

        // Race between operation and timeout
        const result = await Promise.race([
          operation(progressCallback),
          timeoutPromise
        ]);

        return result;
      } catch (error) {
        if (timedOut && retryCount < config.maxRetries) {
          retryCount++;
          console.log(`Retrying operation '${operationType}' (attempt ${retryCount}/${config.maxRetries})`);
          timedOut = false; // Reset for retry
          return executeOperation();
        }
        throw error;
      }
    };

    try {
      const result = await executeOperation();
      const executionTime = Date.now() - startTime;

      // Clear warning timer
      if (warningTimer) {
        clearTimeout(warningTimer);
      }

      // Add performance warnings
      if (executionTime > config.warningMs && !timedOut) {
        warnings.push(`Operation completed but took ${executionTime}ms (longer than expected)`);
      }

      return {
        data: result,
        executionTime,
        warnings,
        timedOut: false,
        retryCount: retryCount > 0 ? retryCount : undefined
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Clear warning timer
      if (warningTimer) {
        clearTimeout(warningTimer);
      }

      if (timedOut) {
        warnings.push(`Operation timed out after ${config.timeoutMs}ms. Try reducing the date range or using filters.`);
        
        // Return a timeout response instead of throwing
        return {
          data: null as any, // Will be handled by caller
          executionTime,
          warnings,
          timedOut: true,
          retryCount: retryCount > 0 ? retryCount : undefined
        };
      }

      throw error;
    }
  }

  /**
   * Create a timeout-aware API handler wrapper
   * @param operationType - Type of operation
   * @param handler - Original handler function
   * @param customConfig - Custom timeout configuration
   * @returns Wrapped handler with timeout protection
   */
  static createTimeoutHandler<T>(
    operationType: string,
    handler: (event: H3Event, progressCallback?: ProgressCallback) => Promise<T>,
    customConfig?: Partial<ApiTimeoutConfig>
  ) {
    return async (event: H3Event): Promise<ApiResponse<T> | T> => {
      try {
        const result = await this.executeWithTimeout(
          event,
          operationType,
          (progressCallback) => handler(event, progressCallback),
          customConfig
        );

        // If operation timed out, return appropriate error response
        if (result.timedOut) {
          throw createError({
            statusCode: 408,
            statusMessage: 'Request Timeout',
            data: {
              message: 'Operation timed out. Please try with a smaller date range or additional filters.',
              warnings: result.warnings,
              executionTime: result.executionTime,
              suggestions: this.getTimeoutSuggestions(operationType)
            }
          });
        }

        // Add warnings to response headers if any
        if (result.warnings.length > 0) {
          setHeader(event, 'X-Performance-Warnings', JSON.stringify(result.warnings));
        }

        // Add execution time to response headers
        setHeader(event, 'X-Execution-Time', result.executionTime.toString());

        return result.data;
      } catch (error) {
        // Handle timeout errors gracefully
        if (error instanceof Error && error.message.includes('timed out')) {
          throw createError({
            statusCode: 408,
            statusMessage: 'Request Timeout',
            data: {
              message: 'Operation timed out. Please try with a smaller date range or additional filters.',
              suggestions: this.getTimeoutSuggestions(operationType)
            }
          });
        }
        throw error;
      }
    };
  }

  /**
   * Get timeout suggestions based on operation type
   * @param operationType - Type of operation that timed out
   * @returns Array of suggestions for the user
   */
  private static getTimeoutSuggestions(operationType: string): string[] {
    const baseSuggestions = [
      'Try reducing the date range to 30-90 days',
      'Use additional filters to reduce the dataset size',
      'Consider exporting data in smaller chunks'
    ];

    const specificSuggestions: Record<string, string[]> = {
      reports: [
        ...baseSuggestions,
        'Focus on specific employees or stations',
        'Use the progressive loading feature for large date ranges'
      ],
      productivity: [
        ...baseSuggestions,
        'Filter by specific users or stations',
        'Break large reports into monthly segments'
      ],
      export: [
        'Export data in monthly or quarterly chunks',
        'Use filters to reduce the number of records',
        'Consider scheduling the export during off-peak hours'
      ],
      dashboard: [
        'Dashboard works best with recent data (last 30 days)',
        'Check your internet connection',
        'Try refreshing the page'
      ]
    };

    return specificSuggestions[operationType] || baseSuggestions;
  }

  /**
   * Check if a date range is likely to cause timeout
   * @param startDate - Start date
   * @param endDate - End date
   * @param operationType - Type of operation
   * @returns Warning information if timeout is likely
   */
  static checkTimeoutRisk(
    startDate: Date,
    endDate: Date,
    operationType: string
  ): {
    highRisk: boolean;
    estimatedTime: number;
    warnings: string[];
    suggestions: string[];
  } {
    const rangeDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const warnings: string[] = [];
    const suggestions: string[] = [];
    let highRisk = false;
    let estimatedTime = 0;

    // Risk assessment based on operation type and date range
    switch (operationType) {
      case 'dashboard':
        if (rangeDays > 90) {
          highRisk = true;
          estimatedTime = 8000;
          warnings.push('Dashboard queries with large date ranges may be slow');
          suggestions.push('Use last 30 days for optimal dashboard performance');
        }
        break;

      case 'reports':
      case 'productivity':
        if (rangeDays > 365) {
          highRisk = true;
          estimatedTime = 45000;
          warnings.push('Large date ranges may cause timeout');
          suggestions.push('Consider breaking into smaller date ranges');
        } else if (rangeDays > 180) {
          estimatedTime = 25000;
          warnings.push('This query may take 20-30 seconds');
          suggestions.push('Progressive loading will be used for better performance');
        }
        break;

      case 'export':
        if (rangeDays > 730) {
          highRisk = true;
          estimatedTime = 120000;
          warnings.push('Very large exports may timeout');
          suggestions.push('Export in yearly or quarterly chunks');
        } else if (rangeDays > 365) {
          estimatedTime = 60000;
          warnings.push('Large export may take several minutes');
        }
        break;
    }

    return {
      highRisk,
      estimatedTime,
      warnings,
      suggestions
    };
  }

  /**
   * Get recommended timeout configuration for custom operations
   * @param expectedComplexity - Expected complexity level (1-10)
   * @param expectedDataSize - Expected data size (small, medium, large, huge)
   * @returns Recommended timeout configuration
   */
  static getRecommendedConfig(
    expectedComplexity: number,
    expectedDataSize: 'small' | 'medium' | 'large' | 'huge'
  ): ApiTimeoutConfig {
    const baseTimeout = Math.min(10000 + (expectedComplexity * 5000), 120000);
    
    const sizeMultipliers = {
      small: 1,
      medium: 1.5,
      large: 2.5,
      huge: 4
    };

    const multiplier = sizeMultipliers[expectedDataSize];
    const timeoutMs = Math.floor(baseTimeout * multiplier);
    const warningMs = Math.floor(timeoutMs * 0.3);

    return {
      timeoutMs,
      warningMs,
      enableProgressUpdates: timeoutMs > 30000,
      maxRetries: timeoutMs > 60000 ? 0 : 1
    };
  }
}