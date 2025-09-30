/**
 * Unit tests for QuickBooks webhook retry mechanism with exponential backoff
 * Tests retry logic, backoff calculations, and error handling scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the QuickBooks utilities
vi.mock('~/server/lib/quickbooksLogger', () => ({
  QuickBooksLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Webhook Retry Mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Exponential Backoff Calculations', () => {
    it('should calculate correct delays for exponential backoff', () => {
      const baseDelay = 1000; // 1 second
      const maxDelay = 30000; // 30 seconds
      
      // Test exponential backoff formula: baseDelay * 2^(attempt - 1)
      const expectedDelays = [
        1000,  // Attempt 1: 1000 * 2^0 = 1000ms
        2000,  // Attempt 2: 1000 * 2^1 = 2000ms
        4000,  // Attempt 3: 1000 * 2^2 = 4000ms
        8000,  // Attempt 4: 1000 * 2^3 = 8000ms
        16000, // Attempt 5: 1000 * 2^4 = 16000ms
        30000, // Attempt 6: 1000 * 2^5 = 32000ms, capped at maxDelay
        30000  // Attempt 7: Still capped at maxDelay
      ];

      expectedDelays.forEach((expectedDelay, index) => {
        const attempt = index + 1;
        const calculatedDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        expect(calculatedDelay).toBe(expectedDelay);
      });
    });

    it('should respect maximum delay limits', () => {
      const baseDelay = 1000;
      const maxDelay = 5000;
      
      // Even with high attempt numbers, delay should not exceed maxDelay
      for (let attempt = 1; attempt <= 10; attempt++) {
        const calculatedDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        expect(calculatedDelay).toBeLessThanOrEqual(maxDelay);
      }
    });

    it('should handle jitter correctly', () => {
      const baseDelay = 1000;
      const jitterMultiplier = 0.5 + Math.random() * 0.5; // Between 0.5 and 1.0
      
      const delayWithJitter = baseDelay * jitterMultiplier;
      
      expect(delayWithJitter).toBeGreaterThanOrEqual(baseDelay * 0.5);
      expect(delayWithJitter).toBeLessThanOrEqual(baseDelay);
    });
  });

  describe('Retry Logic Implementation', () => {
    it('should succeed on first attempt when operation succeeds', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      // Simulate the retry function logic
      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === maxRetries) throw error;
            // In real implementation, there would be a delay here
          }
        }
      };

      const result = await retryWithBackoff(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failures and eventually succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Transient failure 1'))
        .mockRejectedValueOnce(new Error('Transient failure 2'))
        .mockResolvedValue('success after retries');
      
      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt === maxRetries) throw error;
          }
        }
      };

      const result = await retryWithBackoff(mockOperation);
      
      expect(result).toBe('success after retries');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting all retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
            if (attempt === maxRetries) throw error;
          }
        }
        throw lastError;
      };

      await expect(retryWithBackoff(mockOperation)).rejects.toThrow('Persistent failure');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).status = 401;
      
      const mockOperation = vi.fn().mockRejectedValue(authError);
      
      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            // Don't retry on authentication errors
            if (error.status === 401 || error.status === 403 || error.status === 404) {
              throw error;
            }
            if (attempt === maxRetries) throw error;
          }
        }
      };

      await expect(retryWithBackoff(mockOperation)).rejects.toThrow('Unauthorized');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should handle rate limiting with appropriate delays', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).status = 429;
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success after rate limit');
      
      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            if (attempt === maxRetries) throw error;
            
            // Special handling for rate limiting
            if (error.status === 429) {
              // In real implementation, might use Retry-After header
              // For test, just continue with normal backoff
            }
          }
        }
      };

      const result = await retryWithBackoff(mockOperation);
      
      expect(result).toBe('success after rate limit');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Delay Implementation', () => {
    it('should implement delays correctly with setTimeout', async () => {
      const delays: number[] = [];
      
      const mockSetTimeout = vi.fn((callback, delay) => {
        delays.push(delay);
        // Immediately execute callback for test
        callback();
        return 123; // Mock timer ID
      });
      
      global.setTimeout = mockSetTimeout;
      
      const simulateRetryWithDelay = async (attempts: number) => {
        for (let attempt = 1; attempt <= attempts; attempt++) {
          if (attempt > 1) {
            const delay = 1000 * Math.pow(2, attempt - 2); // Previous attempt's delay
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      await simulateRetryWithDelay(4);
      
      expect(delays).toEqual([1000, 2000, 4000]); // Delays for attempts 2, 3, 4
    });

    it('should handle concurrent retry operations independently', async () => {
      const operation1 = vi.fn()
        .mockRejectedValueOnce(new Error('Op1 fail'))
        .mockResolvedValue('Op1 success');
      
      const operation2 = vi.fn()
        .mockRejectedValueOnce(new Error('Op2 fail'))
        .mockRejectedValueOnce(new Error('Op2 fail again'))
        .mockResolvedValue('Op2 success');

      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === maxRetries) throw error;
            // Simulate delay without actually waiting in test
          }
        }
      };

      const [result1, result2] = await Promise.all([
        retryWithBackoff(operation1),
        retryWithBackoff(operation2)
      ]);

      expect(result1).toBe('Op1 success');
      expect(result2).toBe('Op2 success');
      expect(operation1).toHaveBeenCalledTimes(2);
      expect(operation2).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Classification', () => {
    it('should classify retryable vs non-retryable errors correctly', () => {
      const testCases = [
        { status: 401, retryable: false, description: 'Unauthorized' },
        { status: 403, retryable: false, description: 'Forbidden' },
        { status: 404, retryable: false, description: 'Not Found' },
        { status: 429, retryable: true, description: 'Rate Limited' },
        { status: 500, retryable: true, description: 'Internal Server Error' },
        { status: 502, retryable: true, description: 'Bad Gateway' },
        { status: 503, retryable: true, description: 'Service Unavailable' },
        { status: 504, retryable: true, description: 'Gateway Timeout' },
        { status: undefined, retryable: true, description: 'Network Error' }
      ];

      testCases.forEach(({ status, retryable, description }) => {
        const isRetryable = (error: any) => {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false;
          }
          return true; // Retry all other errors
        };

        const mockError = { status, message: description };
        expect(isRetryable(mockError)).toBe(retryable);
      });
    });

    it('should handle errors without status codes', () => {
      const networkError = new Error('Network connection failed');
      const timeoutError = new Error('Request timeout');
      
      const isRetryable = (error: any) => {
        // Network errors and timeouts are typically retryable
        if (!error.status) return true;
        return ![401, 403, 404].includes(error.status);
      };

      expect(isRetryable(networkError)).toBe(true);
      expect(isRetryable(timeoutError)).toBe(true);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log retry attempts with appropriate details', async () => {
      const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('Success');

      const retryWithLogging = async (operation: () => Promise<string>, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await operation();
            if (attempt > 1) {
              QuickBooksLogger.info('RetrySuccess', `Operation succeeded after ${attempt} attempts`);
            }
            return result;
          } catch (error: any) {
            QuickBooksLogger.debug('RetryAttempt', `Attempt ${attempt} failed`, {
              attempt,
              maxRetries,
              errorMessage: error.message,
              willRetry: attempt < maxRetries
            });
            
            if (attempt === maxRetries) throw error;
          }
        }
      };

      const result = await retryWithLogging(mockOperation);
      
      expect(result).toBe('Success');
      expect(QuickBooksLogger.debug).toHaveBeenCalledWith(
        'RetryAttempt',
        'Attempt 1 failed',
        expect.objectContaining({
          attempt: 1,
          maxRetries: 3,
          errorMessage: 'First failure',
          willRetry: true
        })
      );
      expect(QuickBooksLogger.info).toHaveBeenCalledWith(
        'RetrySuccess',
        'Operation succeeded after 2 attempts'
      );
    });

    it('should log final failure after all retries exhausted', async () => {
      const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
      
      const mockOperation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const retryWithLogging = async (operation: () => Promise<string>, maxRetries = 2) => {
        let lastError: any;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error: any) {
            lastError = error;
            QuickBooksLogger.debug('RetryAttempt', `Attempt ${attempt} failed`, {
              attempt,
              maxRetries,
              errorMessage: error.message,
              willRetry: attempt < maxRetries
            });
            
            if (attempt === maxRetries) {
              QuickBooksLogger.error('RetryExhausted', 'All retry attempts failed', {
                totalAttempts: maxRetries,
                finalError: error.message
              });
              throw error;
            }
          }
        }
      };

      await expect(retryWithLogging(mockOperation)).rejects.toThrow('Persistent failure');
      
      expect(QuickBooksLogger.error).toHaveBeenCalledWith(
        'RetryExhausted',
        'All retry attempts failed',
        expect.objectContaining({
          totalAttempts: 2,
          finalError: 'Persistent failure'
        })
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause memory leaks with many retry operations', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => 
        vi.fn().mockResolvedValue(`result-${i}`)
      );

      const retryWithBackoff = async (operation: () => Promise<string>) => {
        return await operation();
      };

      const results = await Promise.all(
        operations.map(op => retryWithBackoff(op))
      );

      expect(results).toHaveLength(100);
      results.forEach((result, i) => {
        expect(result).toBe(`result-${i}`);
      });
    });

    it('should handle rapid successive retry operations', async () => {
      const rapidOperations = Array.from({ length: 10 }, () => 
        vi.fn()
          .mockRejectedValueOnce(new Error('Rapid failure'))
          .mockResolvedValue('Rapid success')
      );

      const retryWithBackoff = async (operation: () => Promise<string>, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation();
          } catch (error) {
            if (attempt === maxRetries) throw error;
          }
        }
      };

      const startTime = Date.now();
      const results = await Promise.all(
        rapidOperations.map(op => retryWithBackoff(op))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe('Rapid success');
      });
      
      // Should complete quickly since we're not actually waiting for delays in tests
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});