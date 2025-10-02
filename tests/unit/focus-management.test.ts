/**
 * Enhanced Focus Management Tests
 * 
 * Tests for task 8: Implement Enhanced Focus Management in Kiosk
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FocusGuard } from '~/utils/focusGuard';

describe('Enhanced Focus Management', () => {
  let focusGuard: FocusGuard;
  let mockInput: HTMLInputElement;
  let mockLogoutButton: HTMLButtonElement;

  beforeEach(() => {
    // Create mock DOM elements
    mockInput = document.createElement('input');
    mockInput.type = 'text';
    mockInput.id = 'barcode-input';
    document.body.appendChild(mockInput);

    mockLogoutButton = document.createElement('button');
    mockLogoutButton.setAttribute('data-logout', '');
    mockLogoutButton.textContent = 'Logout';
    document.body.appendChild(mockLogoutButton);

    // Create FocusGuard instance with faster interval for testing
    focusGuard = new FocusGuard(50);
  });

  afterEach(() => {
    // Cleanup
    focusGuard.stopGuarding();
    document.body.removeChild(mockInput);
    document.body.removeChild(mockLogoutButton);
  });

  describe('Requirement 6.1: Focus protection system', () => {
    it('should start guarding the target element', () => {
      focusGuard.startGuarding(mockInput);
      
      expect(focusGuard.isGuarding()).toBe(true);
      expect(focusGuard.getTargetElement()).toBe(mockInput);
    });

    it('should focus the target element immediately when guarding starts', () => {
      const focusSpy = vi.spyOn(mockInput, 'focus');
      
      focusGuard.startGuarding(mockInput);
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should maintain focus on the target element', async () => {
      focusGuard.startGuarding(mockInput);
      
      // Simulate focus loss
      const otherElement = document.createElement('div');
      document.body.appendChild(otherElement);
      otherElement.focus();
      
      // Wait for focus guard to act
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(document.activeElement).toBe(mockInput);
      
      document.body.removeChild(otherElement);
    });
  });

  describe('Requirement 6.2: Global click handler', () => {
    it('should refocus after clicks outside the input', async () => {
      focusGuard.startGuarding(mockInput);
      
      const otherElement = document.createElement('div');
      document.body.appendChild(otherElement);
      
      // Simulate click on other element
      otherElement.click();
      otherElement.focus();
      
      // Wait for focus guard to respond
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(document.activeElement).toBe(mockInput);
      
      document.body.removeChild(otherElement);
    });
  });

  describe('Requirement 6.3: Global scroll handler', () => {
    it('should maintain focus during scroll events', async () => {
      focusGuard.startGuarding(mockInput);
      
      // Create scrollable element
      const scrollableDiv = document.createElement('div');
      scrollableDiv.style.height = '200px';
      scrollableDiv.style.overflow = 'auto';
      scrollableDiv.innerHTML = '<div style="height: 400px;">Scrollable content</div>';
      document.body.appendChild(scrollableDiv);
      
      // Simulate scroll event
      scrollableDiv.dispatchEvent(new Event('scroll', { bubbles: true }));
      
      // Wait for focus guard to respond
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(document.activeElement).toBe(mockInput);
      
      document.body.removeChild(scrollableDiv);
    });
  });

  describe('Requirement 6.5: Logout button exception', () => {
    it('should not interfere with logout button clicks', () => {
      focusGuard.startGuarding(mockInput);
      
      // Focus the logout button
      mockLogoutButton.focus();
      
      // Verify focus is not stolen from logout button
      expect(document.activeElement).toBe(mockLogoutButton);
    });

    it('should detect logout button by data-logout attribute', () => {
      focusGuard.startGuarding(mockInput);
      
      mockLogoutButton.click();
      mockLogoutButton.focus();
      
      // Should not refocus to input when logout button is active
      expect(document.activeElement).toBe(mockLogoutButton);
    });

    it('should detect logout button by text content', () => {
      const logoutByText = document.createElement('button');
      logoutByText.textContent = 'Log Out';
      document.body.appendChild(logoutByText);
      
      focusGuard.startGuarding(mockInput);
      
      logoutByText.focus();
      
      // Should not steal focus from logout button
      expect(document.activeElement).toBe(logoutByText);
      
      document.body.removeChild(logoutByText);
    });
  });

  describe('Manual refocus capability', () => {
    it('should provide manual refocus method', () => {
      focusGuard.startGuarding(mockInput);
      
      const otherElement = document.createElement('input');
      document.body.appendChild(otherElement);
      otherElement.focus();
      
      // Manual refocus
      focusGuard.refocus();
      
      expect(document.activeElement).toBe(mockInput);
      
      document.body.removeChild(otherElement);
    });
  });

  describe('Cleanup and error handling', () => {
    it('should stop guarding and cleanup properly', () => {
      focusGuard.startGuarding(mockInput);
      expect(focusGuard.isGuarding()).toBe(true);
      
      focusGuard.stopGuarding();
      expect(focusGuard.isGuarding()).toBe(false);
    });

    it('should handle null element gracefully', () => {
      expect(() => {
        focusGuard.startGuarding(null as any);
      }).not.toThrow();
      
      expect(focusGuard.isGuarding()).toBe(false);
    });
  });
});