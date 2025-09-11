/**
 * Unit tests for Orders Metrics API endpoint
 * Tests parameter validation and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock the parseOrderFilters function from the API endpoint
function parseOrderFilters(query: Record<string, any>) {
  const filters: any = {};

  // Parse status filter - can be single value or array
  if (query.status) {
    const statusArray = Array.isArray(query.status) ? query.status : [query.status];
    const validStatuses = [
      'PENDING',
      'APPROVED', 
      'ORDER_PROCESSING',
      'READY_TO_SHIP',
      'SHIPPED',
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED'
    ];
    
    const filteredStatuses = statusArray.filter((status: string) => 
      validStatuses.includes(status)
    );
    
    if (filteredStatuses.length > 0) {
      filters.status = filteredStatuses;
    }
  }

  // Parse priority filter - can be single value or array
  if (query.priority) {
    const priorityArray = Array.isArray(query.priority) ? query.priority : [query.priority];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    
    const filteredPriorities = priorityArray.filter((priority: string) => 
      validPriorities.includes(priority)
    );
    
    if (filteredPriorities.length > 0) {
      filters.priority = filteredPriorities;
    }
  }

  // Parse date filters
  if (query.dateFrom) {
    const dateFrom = new Date(query.dateFrom);
    if (!isNaN(dateFrom.getTime())) {
      filters.dateFrom = dateFrom;
    } else {
      throw new Error('Invalid dateFrom parameter - must be a valid ISO date string');
    }
  }

  if (query.dateTo) {
    const dateTo = new Date(query.dateTo);
    if (!isNaN(dateTo.getTime())) {
      // Set to end of day for inclusive filtering
      dateTo.setHours(23, 59, 59, 999);
      filters.dateTo = dateTo;
    } else {
      throw new Error('Invalid dateTo parameter - must be a valid ISO date string');
    }
  }

  // Validate date range
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw new Error('Invalid date range - dateFrom must be before or equal to dateTo');
  }

  // Parse customer ID filter
  if (query.customerId && typeof query.customerId === 'string') {
    // Basic validation - should be a non-empty string
    if (query.customerId.trim().length > 0) {
      filters.customerId = query.customerId.trim();
    }
  }

  return filters;
}

describe('Orders Metrics API Parameter Validation', () => {
  describe('parseOrderFilters', () => {
    it('should return empty filters for empty query', () => {
      const result = parseOrderFilters({});
      expect(result).toEqual({});
    });

    it('should parse single status filter', () => {
      const result = parseOrderFilters({ status: 'PENDING' });
      expect(result).toEqual({ status: ['PENDING'] });
    });

    it('should parse multiple status filters', () => {
      const result = parseOrderFilters({ status: ['PENDING', 'ORDER_PROCESSING'] });
      expect(result).toEqual({ status: ['PENDING', 'ORDER_PROCESSING'] });
    });

    it('should filter out invalid status values', () => {
      const result = parseOrderFilters({ status: ['PENDING', 'INVALID_STATUS', 'APPROVED'] });
      expect(result).toEqual({ status: ['PENDING', 'APPROVED'] });
    });

    it('should not include status filter if all values are invalid', () => {
      const result = parseOrderFilters({ status: ['INVALID_STATUS', 'ANOTHER_INVALID'] });
      expect(result).toEqual({});
    });

    it('should parse single priority filter', () => {
      const result = parseOrderFilters({ priority: 'HIGH' });
      expect(result).toEqual({ priority: ['HIGH'] });
    });

    it('should parse multiple priority filters', () => {
      const result = parseOrderFilters({ priority: ['HIGH', 'MEDIUM'] });
      expect(result).toEqual({ priority: ['HIGH', 'MEDIUM'] });
    });

    it('should filter out invalid priority values', () => {
      const result = parseOrderFilters({ priority: ['HIGH', 'INVALID_PRIORITY', 'LOW'] });
      expect(result).toEqual({ priority: ['HIGH', 'LOW'] });
    });

    it('should parse valid dateFrom', () => {
      const dateStr = '2024-01-01T00:00:00.000Z';
      const result = parseOrderFilters({ dateFrom: dateStr });
      expect(result.dateFrom).toEqual(new Date(dateStr));
    });

    it('should parse valid dateTo and set to end of day', () => {
      const dateStr = '2024-01-01';
      const result = parseOrderFilters({ dateTo: dateStr });
      const expectedDate = new Date(dateStr);
      expectedDate.setHours(23, 59, 59, 999);
      expect(result.dateTo).toEqual(expectedDate);
    });

    it('should throw error for invalid dateFrom', () => {
      expect(() => {
        parseOrderFilters({ dateFrom: 'invalid-date' });
      }).toThrow('Invalid dateFrom parameter - must be a valid ISO date string');
    });

    it('should throw error for invalid dateTo', () => {
      expect(() => {
        parseOrderFilters({ dateTo: 'invalid-date' });
      }).toThrow('Invalid dateTo parameter - must be a valid ISO date string');
    });

    it('should throw error when dateFrom is after dateTo', () => {
      expect(() => {
        parseOrderFilters({
          dateFrom: '2024-01-02T00:00:00.000Z',
          dateTo: '2024-01-01T00:00:00.000Z'
        });
      }).toThrow('Invalid date range - dateFrom must be before or equal to dateTo');
    });

    it('should accept valid date range', () => {
      const result = parseOrderFilters({
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-01-02T00:00:00.000Z'
      });
      expect(result.dateFrom).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(result.dateTo).toEqual(new Date('2024-01-02T23:59:59.999Z'));
    });

    it('should parse valid customerId', () => {
      const result = parseOrderFilters({ customerId: 'customer-123' });
      expect(result).toEqual({ customerId: 'customer-123' });
    });

    it('should trim whitespace from customerId', () => {
      const result = parseOrderFilters({ customerId: '  customer-123  ' });
      expect(result).toEqual({ customerId: 'customer-123' });
    });

    it('should ignore empty customerId', () => {
      const result = parseOrderFilters({ customerId: '   ' });
      expect(result).toEqual({});
    });

    it('should ignore non-string customerId', () => {
      const result = parseOrderFilters({ customerId: 123 });
      expect(result).toEqual({});
    });

    it('should parse complex filter combination', () => {
      const result = parseOrderFilters({
        status: ['PENDING', 'ORDER_PROCESSING'],
        priority: ['HIGH'],
        dateFrom: '2024-01-01T00:00:00.000Z',
        dateTo: '2024-01-31T00:00:00.000Z',
        customerId: 'customer-123'
      });

      expect(result).toEqual({
        status: ['PENDING', 'ORDER_PROCESSING'],
        priority: ['HIGH'],
        dateFrom: new Date('2024-01-01T00:00:00.000Z'),
        dateTo: new Date('2024-01-31T23:59:59.999Z'),
        customerId: 'customer-123'
      });
    });

    it('should handle mixed valid and invalid values', () => {
      const result = parseOrderFilters({
        status: ['PENDING', 'INVALID_STATUS', 'APPROVED'],
        priority: ['HIGH', 'INVALID_PRIORITY'],
        customerId: 'customer-123',
        invalidParam: 'should-be-ignored'
      });

      expect(result).toEqual({
        status: ['PENDING', 'APPROVED'],
        priority: ['HIGH'],
        customerId: 'customer-123'
      });
    });
  });

  describe('Valid Status Values', () => {
    const validStatuses = [
      'PENDING',
      'APPROVED', 
      'ORDER_PROCESSING',
      'READY_TO_SHIP',
      'SHIPPED',
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED'
    ];

    validStatuses.forEach(status => {
      it(`should accept valid status: ${status}`, () => {
        const result = parseOrderFilters({ status });
        expect(result.status).toContain(status);
      });
    });
  });

  describe('Valid Priority Values', () => {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];

    validPriorities.forEach(priority => {
      it(`should accept valid priority: ${priority}`, () => {
        const result = parseOrderFilters({ priority });
        expect(result.priority).toContain(priority);
      });
    });
  });
});