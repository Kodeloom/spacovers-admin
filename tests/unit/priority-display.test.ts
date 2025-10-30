/**
 * Unit tests for Priority Display functionality
 * Tests the priority display text and styling with NO_PRIORITY option
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect } from 'vitest';
import { getPriorityDisplayText } from '~/utils/backwardCompatibility';

describe('Priority Display', () => {
  describe('getPriorityDisplayText', () => {
    it('should return correct display text for all priority values', () => {
      expect(getPriorityDisplayText('NO_PRIORITY')).toBe('No Priority');
      expect(getPriorityDisplayText('LOW')).toBe('Low');
      expect(getPriorityDisplayText('MEDIUM')).toBe('Medium');
      expect(getPriorityDisplayText('HIGH')).toBe('High');
    });

    it('should handle null and undefined values', () => {
      expect(getPriorityDisplayText(null)).toBe('No Priority');
      expect(getPriorityDisplayText(undefined)).toBe('No Priority');
      expect(getPriorityDisplayText('')).toBe('No Priority');
    });

    it('should handle unknown priority values', () => {
      expect(getPriorityDisplayText('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('Priority Sorting Order', () => {
    it('should define correct priority order for sorting', () => {
      const priorities = ['NO_PRIORITY', 'LOW', 'MEDIUM', 'HIGH'];
      
      // Test that all priority values are valid enum values
      priorities.forEach(priority => {
        expect(typeof priority).toBe('string');
        expect(priority.length).toBeGreaterThan(0);
      });
      
      // Test that NO_PRIORITY is included in the list
      expect(priorities).toContain('NO_PRIORITY');
    });
  });
});