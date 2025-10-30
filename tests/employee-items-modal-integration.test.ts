import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import EmployeeItemDetailsModal from '~/components/EmployeeItemDetailsModal.vue';

// Mock the global $fetch function
const mockFetch = vi.fn();
global.$fetch = mockFetch;

// Mock the navigateTo function
const mockNavigateTo = vi.fn();
global.navigateTo = mockNavigateTo;

// Mock the useToast composable
const mockToast = {
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
};
vi.mock('#app', () => ({
  useToast: () => mockToast
}));

// Mock data for testing
const mockEmployeeItemsResponse = {
  success: true,
  data: [
    {
      orderItemId: 'item-1',
      itemName: 'Test Product A',
      orderNumber: 'SO-12345',
      orderId: 'order-1',
      customerName: 'Test Customer Inc',
      processingTime: 3600, // 1 hour in seconds
      processingTimeFormatted: '1h',
      processedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T11:00:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    },
    {
      orderItemId: 'item-2',
      itemName: 'Test Product B',
      orderNumber: 'SO-12346',
      orderId: 'order-2',
      customerName: 'Another Customer LLC',
      processingTime: 1800, // 30 minutes in seconds
      processingTimeFormatted: '30m',
      processedAt: '2024-01-15T14:00:00Z',
      completedAt: '2024-01-15T14:30:00Z',
      stationName: 'Quality Control, Packaging',
      stationNames: ['Quality Control', 'Packaging']
    }
  ],
  summary: {
    totalItems: 2,
    totalProcessingTime: 5400, // 1.5 hours in seconds
    totalProcessingTimeFormatted: '1h 30m'
  }
};

const mockEmptyResponse = {
  success: true,
  data: [],
  summary: {
    totalItems: 0,
    totalProcessingTime: 0,
    totalProcessingTimeFormatted: '0s'
  }
};

describe('Employee Items Modal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockEmployeeItemsResponse);
  });

  describe('3.1 Test employee items modal functionality', () => {
    it('should open modal with correct employee data when items processed count is clicked', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          stationId: 'station-1'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      // Wait for the component to load data
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/employee-items', {
        query: {
          userId: 'user-123',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          stationId: 'station-1'
        }
      });

      // Verify modal title shows employee name
      expect(wrapper.text()).toContain('Items Processed by John Doe');
    });

    it('should display item details including name, order number, processing time, and completion date', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      // Wait for data to load
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const tableText = wrapper.text();

      // Verify item details are displayed
      expect(tableText).toContain('Test Product A');
      expect(tableText).toContain('Test Product B');
      expect(tableText).toContain('SO-12345');
      expect(tableText).toContain('SO-12346');
      expect(tableText).toContain('Test Customer Inc');
      expect(tableText).toContain('Another Customer LLC');
      expect(tableText).toContain('1h');
      expect(tableText).toContain('30m');
      expect(tableText).toContain('Assembly Station');
      expect(tableText).toContain('Quality Control');
      expect(tableText).toContain('Packaging');
    });

    it('should respect the same date range and station filters as main report', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          stationId: 'assembly-station'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API call includes all filters
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/employee-items', {
        query: {
          userId: 'user-123',
          startDate: '2024-01-15',
          endDate: '2024-01-20',
          stationId: 'assembly-station'
        }
      });
    });

    it('should navigate to correct order details page when order number is clicked', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find and click the "View Order" button for the first item
      const viewOrderButtons = wrapper.findAll('button').filter(button => 
        button.text().includes('View Order')
      );
      
      expect(viewOrderButtons.length).toBeGreaterThan(0);
      
      await viewOrderButtons[0].trigger('click');

      // Verify navigation was called with correct order ID
      expect(mockNavigateTo).toHaveBeenCalledWith('/admin/orders/edit/order-1');
    });

    it('should update data when filters change', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear previous calls
      mockFetch.mockClear();

      // Change the date range
      await wrapper.setProps({
        startDate: '2024-02-01',
        endDate: '2024-02-28',
        stationId: 'new-station'
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was called again with new filters
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/employee-items', {
        query: {
          userId: 'user-123',
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          stationId: 'new-station'
        }
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('should display error message when API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain('Failed to load employee item details');
      expect(wrapper.find('button').text()).toContain('Try Again');
    });

    it('should display empty state when no items are found', async () => {
      mockFetch.mockResolvedValue(mockEmptyResponse);

      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain('No items found for this employee');
    });

    it('should not make API call when modal is closed', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: false,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not make API call when employeeId is null', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: null,
          employeeName: null,
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Summary statistics', () => {
    it('should display correct summary statistics', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const summaryText = wrapper.text();
      expect(summaryText).toContain('Total Items: 2');
      expect(summaryText).toContain('Total Processing Time: 1h 30m');
    });
  });

  describe('Modal behavior', () => {
    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      const closeButton = wrapper.find('button[class*="border-gray-300"]');
      await closeButton.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event after navigating to order', async () => {
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const viewOrderButton = wrapper.findAll('button').find(button => 
        button.text().includes('View Order')
      );
      
      if (viewOrderButton) {
        await viewOrderButton.trigger('click');
        expect(wrapper.emitted('close')).toBeTruthy();
      }
    });
  });
});