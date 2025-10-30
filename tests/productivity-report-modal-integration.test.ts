import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

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

// Mock the hooks
vi.mock('~/lib/hooks/station', () => ({
  useFindManyStation: () => ({
    data: ref([
      { id: 'station-1', name: 'Assembly Station' },
      { id: 'station-2', name: 'Quality Control' }
    ])
  })
}));

vi.mock('~/lib/hooks/user', () => ({
  useFindManyUser: () => ({
    data: ref([
      { id: 'user-123', name: 'John Doe' },
      { id: 'user-456', name: 'Jane Smith' }
    ])
  })
}));

vi.mock('~/lib/hooks/customer', () => ({
  useFindManyCustomer: () => ({
    data: ref([
      { id: 'customer-1', name: 'Test Customer Inc' }
    ])
  })
}));

// Mock TimezoneService
vi.mock('~/utils/timezoneService', () => ({
  TimezoneService: {
    formatUTCForLocalDisplay: vi.fn((date) => date.toLocaleDateString())
  }
}));

// Import the component after mocks are set up
import ReportsPage from '~/pages/admin/reports/index.vue';

// Mock productivity API response
const mockProductivityResponse = {
  success: true,
  data: [
    {
      userId: 'user-123',
      userName: 'John Doe',
      stationId: 'station-1',
      stationName: 'Assembly Station',
      itemsProcessed: 5,
      totalDuration: 18000, // 5 hours in seconds
      avgDuration: 3600, // 1 hour per item
      efficiency: 1.0
    },
    {
      userId: 'user-456',
      userName: 'Jane Smith',
      stationId: 'station-2',
      stationName: 'Quality Control',
      itemsProcessed: 3,
      totalDuration: 7200, // 2 hours in seconds
      avgDuration: 2400, // 40 minutes per item
      efficiency: 1.5
    }
  ],
  summary: {
    totalEmployees: 2,
    totalItemsProcessed: 8,
    totalProductionTime: 25200 // 7 hours in seconds
  }
};

// Mock employee items API response
const mockEmployeeItemsResponse = {
  success: true,
  data: [
    {
      orderItemId: 'item-1',
      itemName: 'Product A',
      orderNumber: 'SO-12345',
      orderId: 'order-1',
      customerName: 'Test Customer Inc',
      processingTime: 3600,
      processingTimeFormatted: '1h',
      processedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T11:00:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    },
    {
      orderItemId: 'item-2',
      itemName: 'Product B',
      orderNumber: 'SO-12346',
      orderId: 'order-2',
      customerName: 'Test Customer Inc',
      processingTime: 3600,
      processingTimeFormatted: '1h',
      processedAt: '2024-01-15T11:00:00Z',
      completedAt: '2024-01-15T12:00:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    }
  ],
  summary: {
    totalItems: 2,
    totalProcessingTime: 7200,
    totalProcessingTimeFormatted: '2h'
  }
};

describe('Productivity Report and Modal Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default API responses
    mockFetch.mockImplementation((url) => {
      if (url === '/api/reports/productivity') {
        return Promise.resolve(mockProductivityResponse);
      }
      if (url === '/api/reports/employee-items') {
        return Promise.resolve(mockEmployeeItemsResponse);
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  describe('Integration between productivity report and employee items modal', () => {
    it('should open employee items modal when clicking on items processed count', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      // Wait for the component to load and fetch data
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify productivity data is loaded
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Assembly Station');

      // Find the items processed button for John Doe
      const itemsProcessedButtons = wrapper.findAll('button').filter(button => 
        button.text().includes('5') && button.classes().includes('text-indigo-600')
      );

      expect(itemsProcessedButtons.length).toBeGreaterThan(0);

      // Click on the items processed count
      await itemsProcessedButtons[0].trigger('click');

      // Verify modal is opened
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(true);
      expect(wrapper.vm.employeeItemsModal.employeeId).toBe('user-123');
      expect(wrapper.vm.employeeItemsModal.employeeName).toBe('John Doe');
    });

    it('should pass correct filters to employee items modal', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      // Set specific filters
      await wrapper.setData({
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          stationId: 'station-1',
          userId: ''
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open the modal
      wrapper.vm.openEmployeeItemsModal('user-123', 'John Doe', 5);

      await wrapper.vm.$nextTick();

      // Verify modal receives the same filters
      const modalComponent = wrapper.findComponent({ name: 'EmployeeItemDetailsModal' });
      expect(modalComponent.props('startDate')).toBe('2024-01-01');
      expect(modalComponent.props('endDate')).toBe('2024-01-31');
      expect(modalComponent.props('stationId')).toBe('station-1');
      expect(modalComponent.props('employeeId')).toBe('user-123');
      expect(modalComponent.props('employeeName')).toBe('John Doe');
    });

    it('should not open modal when items processed count is zero', async () => {
      // Mock response with zero items
      const zeroItemsResponse = {
        ...mockProductivityResponse,
        data: [
          {
            userId: 'user-123',
            userName: 'John Doe',
            stationId: 'station-1',
            stationName: 'Assembly Station',
            itemsProcessed: 0, // Zero items
            totalDuration: 0,
            avgDuration: 0,
            efficiency: 0
          }
        ]
      };

      mockFetch.mockImplementation((url) => {
        if (url === '/api/reports/productivity') {
          return Promise.resolve(zeroItemsResponse);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Find the items processed display (should be disabled)
      const itemsProcessedButtons = wrapper.findAll('button').filter(button => 
        button.text().includes('0') && button.attributes('disabled') !== undefined
      );

      expect(itemsProcessedButtons.length).toBeGreaterThan(0);

      // Try to click on the disabled button
      await itemsProcessedButtons[0].trigger('click');

      // Verify modal is not opened
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(false);
    });

    it('should update modal data when main report filters change', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open the modal first
      wrapper.vm.openEmployeeItemsModal('user-123', 'John Doe', 5);
      await wrapper.vm.$nextTick();

      // Clear previous API calls
      mockFetch.mockClear();

      // Change the date range in the main report
      const startDateInput = wrapper.find('input[id="startDate"]');
      const endDateInput = wrapper.find('input[id="endDate"]');

      await startDateInput.setValue('2024-02-01');
      await endDateInput.setValue('2024-02-28');

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify the modal component receives updated props
      const modalComponent = wrapper.findComponent({ name: 'EmployeeItemDetailsModal' });
      expect(modalComponent.props('startDate')).toBe('2024-02-01');
      expect(modalComponent.props('endDate')).toBe('2024-02-28');
    });

    it('should close modal and maintain main report state', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open the modal
      wrapper.vm.openEmployeeItemsModal('user-123', 'John Doe', 5);
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(true);

      // Close the modal
      wrapper.vm.closeEmployeeItemsModal();
      
      // Verify modal is closed
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(false);
      expect(wrapper.vm.employeeItemsModal.employeeId).toBe(null);
      expect(wrapper.vm.employeeItemsModal.employeeName).toBe(null);

      // Verify main report data is still intact
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Assembly Station');
      expect(wrapper.text()).toContain('Jane Smith');
    });

    it('should handle multiple employees and stations correctly', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify both employees are displayed
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Jane Smith');

      // Find items processed buttons for both employees
      const allItemsButtons = wrapper.findAll('button').filter(button => 
        button.classes().includes('text-indigo-600')
      );

      expect(allItemsButtons.length).toBeGreaterThanOrEqual(2);

      // Test opening modal for first employee
      await allItemsButtons[0].trigger('click');
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(true);
      expect(wrapper.vm.employeeItemsModal.employeeId).toBe('user-123');

      // Close and test second employee
      wrapper.vm.closeEmployeeItemsModal();
      await allItemsButtons[1].trigger('click');
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(true);
      expect(wrapper.vm.employeeItemsModal.employeeId).toBe('user-456');
    });

    it('should maintain filter state when modal is opened and closed', async () => {
      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      // Set specific filters
      const stationSelect = wrapper.find('select[id="stationFilter"]');
      const userSelect = wrapper.find('select[id="userFilter"]');

      await stationSelect.setValue('station-1');
      await userSelect.setValue('user-123');

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Open modal
      wrapper.vm.openEmployeeItemsModal('user-123', 'John Doe', 5);
      
      // Close modal
      wrapper.vm.closeEmployeeItemsModal();

      // Verify filters are still set
      expect(wrapper.vm.filters.stationId).toBe('station-1');
      expect(wrapper.vm.filters.userId).toBe('user-123');
      expect(stationSelect.element.value).toBe('station-1');
      expect(userSelect.element.value).toBe('user-123');
    });
  });

  describe('Error handling in integration', () => {
    it('should handle modal API errors gracefully without affecting main report', async () => {
      // Set up main report to succeed but modal to fail
      mockFetch.mockImplementation((url) => {
        if (url === '/api/reports/productivity') {
          return Promise.resolve(mockProductivityResponse);
        }
        if (url === '/api/reports/employee-items') {
          return Promise.reject(new Error('Modal API Error'));
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const wrapper = mount(ReportsPage, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify main report loaded successfully
      expect(wrapper.text()).toContain('John Doe');

      // Open modal (which will fail)
      wrapper.vm.openEmployeeItemsModal('user-123', 'John Doe', 5);
      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify main report is still functional
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Assembly Station');
      
      // Modal should still be open but show error state
      expect(wrapper.vm.employeeItemsModal.isOpen).toBe(true);
    });
  });
});