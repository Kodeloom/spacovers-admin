/**
 * Enhanced Focus Guard Utility
 * 
 * Provides robust focus management for warehouse kiosk interface.
 * Ensures scan input remains focused while allowing specific exceptions
 * like logout button interactions.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

export class FocusGuard {
  private targetElement: HTMLElement | null = null;
  private checkInterval: number | null = null;
  private isActive = false;
  private readonly intervalMs: number;

  constructor(intervalMs = 300) {
    this.intervalMs = intervalMs;
    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleGlobalScroll = this.handleGlobalScroll.bind(this);
  }

  /**
   * Start protecting focus on the specified element
   * Requirement 6.1: Focus protection system
   */
  startGuarding(element: HTMLElement): void {
    if (!element) {
      console.warn('FocusGuard: Cannot guard null or undefined element');
      return;
    }

    this.targetElement = element;
    this.isActive = true;
    
    // Immediate focus to ensure element is focused from start
    this.focusTarget();
    
    // Set up interval checking for focus maintenance
    this.checkInterval = window.setInterval(() => {
      if (this.isActive && this.shouldRefocus()) {
        this.focusTarget();
      }
    }, this.intervalMs);

    // Add global event handlers for click and scroll
    // Requirement 6.2: Global click handler
    document.addEventListener('click', this.handleGlobalClick, true);
    
    // Requirement 6.3: Global scroll handler  
    document.addEventListener('scroll', this.handleGlobalScroll, true);
    
    console.log('FocusGuard: Started guarding element', element);
  }

  /**
   * Stop focus protection and cleanup
   */
  stopGuarding(): void {
    this.isActive = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Remove global event listeners
    document.removeEventListener('click', this.handleGlobalClick, true);
    document.removeEventListener('scroll', this.handleGlobalScroll, true);
    
    console.log('FocusGuard: Stopped guarding');
  }

  /**
   * Check if focus should be returned to target element
   * Requirement 6.4: Focus detection and restoration
   */
  private shouldRefocus(): boolean {
    if (!this.targetElement) {
      return false;
    }

    const activeElement = document.activeElement as HTMLElement;
    
    // Don't refocus if target is already focused
    if (activeElement === this.targetElement) {
      return false;
    }

    // Don't refocus if logout button is active
    // Requirement 6.5: Logout button exception
    if (this.isLogoutButton(activeElement)) {
      return false;
    }

    return true;
  }

  /**
   * Focus the target element safely
   */
  private focusTarget(): void {
    if (this.targetElement && this.isActive) {
      try {
        this.targetElement.focus();
      } catch (error) {
        console.warn('FocusGuard: Failed to focus target element', error);
      }
    }
  }

  /**
   * Handle global click events
   * Requirement 6.2: Refocus after clicks outside scan input
   */
  private handleGlobalClick(event: Event): void {
    if (!this.isActive) return;

    const target = event.target as HTMLElement;
    
    // Don't interfere with logout button clicks
    // Requirement 6.5: Logout button detection
    if (this.isLogoutButton(target)) {
      return;
    }

    // Use setTimeout to ensure click processing completes first
    setTimeout(() => {
      if (this.shouldRefocus()) {
        this.focusTarget();
      }
    }, 10);
  }

  /**
   * Handle global scroll events
   * Requirement 6.3: Refocus after scrolling
   */
  private handleGlobalScroll(): void {
    if (!this.isActive) return;

    // Use setTimeout to ensure scroll processing completes first
    setTimeout(() => {
      if (this.shouldRefocus()) {
        this.focusTarget();
      }
    }, 10);
  }

  /**
   * Detect if element is a logout button or contained within one
   * Requirement 6.5: Logout button detection to prevent interference
   */
  private isLogoutButton(element: HTMLElement | null): boolean {
    if (!element) return false;

    // Check for logout button data attribute
    const logoutButton = element.closest('button[data-logout]');
    if (logoutButton) return true;

    // Check for common logout button classes/text
    const logoutSelectors = [
      'button[class*="logout"]',
      'button[id*="logout"]',
      'a[class*="logout"]',
      'a[id*="logout"]'
    ];

    for (const selector of logoutSelectors) {
      if (element.closest(selector)) {
        return true;
      }
    }

    // Check button text content for logout indicators
    const buttonElement = element.closest('button, a');
    if (buttonElement) {
      const text = buttonElement.textContent?.toLowerCase() || '';
      const logoutKeywords = ['logout', 'log out', 'sign out', 'signout'];
      
      if (logoutKeywords.some(keyword => text.includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get current guard status
   */
  isGuarding(): boolean {
    return this.isActive;
  }

  /**
   * Get currently guarded element
   */
  getTargetElement(): HTMLElement | null {
    return this.targetElement;
  }

  /**
   * Force refocus (useful for manual refocus triggers)
   * Requirement 6.4: Manual refocus capability
   */
  refocus(): void {
    if (this.isActive && this.targetElement) {
      this.focusTarget();
    }
  }
}

/**
 * Create a singleton instance for global use
 */
export const globalFocusGuard = new FocusGuard();

/**
 * Utility function to create a new FocusGuard instance
 */
export function createFocusGuard(intervalMs?: number): FocusGuard {
  return new FocusGuard(intervalMs);
}