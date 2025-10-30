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

// Test data that matches what the productivity API would return
const mockProductivityData = [
  {
    userId: 'user-123',
    userName: 'John Doe',
    stationId: 'station-1',
    stationName: 'Assembly Station',
    itemsProcessed: 3, // This should match the count in employee items
    totalDuration: 7200, // 2 hours
    avgDuration: 2400, // 40 minutes per item
    efficiency: 1.5
  }
];

// Employee items data that should match the productivity count
const mockEmployeeItemsResponse = {
  success: true,
  data: [
    {
      orderItemId: 'item-1',
      itemName: 'Test Product A',
      orderNumber: 'SO-12345',
      orderId: 'order-1',
      customerName: 'Test Customer Inc',
      processingTime: 2400, // 40 minutes
      processingTimeFormatted: '40m',
      processedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:40:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    },
    {
      orderItemId: 'item-2',
      itemName: 'Test Product B',
      orderNumber: 'SO-12346',
      orderId: 'order-2',
      customerName: 'Test Customer Inc',
      processingTime: 2400, // 40 minutes
      processingTimeFormatted: '40m',
      processedAt: '2024-01-15T11:00:00Z',
      completedAt: '2024-01-15T11:40:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    },
    {
      orderItemId: 'item-3',
      itemName: 'Test Product C',
      orderNumber: 'SO-12347',
      orderId: 'order-3',
      customerName: 'Another Customer LLC',
      processingTime: 2400, // 40 minutes
      processingTimeFormatted: '40m',
      processedAt: '2024-01-15T14:00:00Z',
      completedAt: '2024-01-15T14:40:00Z',
      stationName: 'Assembly Station',
      stationNames: ['Assembly Station']
    }
  ],
  summary: {
    totalItems: 3, // Should match itemsProcessed from productivity data
    totalProcessingTime: 7200, // Should match totalDuration from productivity data
    totalProcessingTimeFormatted: '2h'
  }
};

// Test data with different filter combinations
const mockFilteredResponse = {
  success: true,
  data: [
    {
      orderItemId: 'item-1',
      itemName: 'Filtered Product',
      orderNumber: 'SO-99999',
      orderId: 'order-filtered',
      customerName: 'Filtered Customer',
      processingTime: 1800, // 30 minutes
      processingTimeFormatted: '30m',
      processedAt: '2024-02-01T10:00:00Z',
      completedAt: '2024-02-01T10:30:00Z',
      stationName: 'Quality Control',
      stationNames: ['Quality Control']
    }
  ],
  summary: {
    totalItems: 1,
    totalProcessingTime: 1800,
    totalProcessingTimeFormatted: '30m'
  }
};

describe('Employee Items Modal Data Accuracy Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockEmployeeItemsResponse);
  });

  describe('3.2 Validate modal data accuracy', () => {
    it('should ensure modal data matches the items counted in the main productivity report', async () => {
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

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the modal shows the same number of items as the productivity report
      const summaryText = wrapper.text();
      expect(summaryText).toContain('Total Items: 3');
      
      // Verify the total processing time matches
      expect(summaryText).toContain('Total Processing Time: 2h');
      
      // Count the actual rows in the table (excluding header)
      const tableRows = wrapper.findAll('tbody tr');
      expect(tableRows.length).toBe(3); // Should match itemsProcessed from productivity data
      
      // Verify each item is displayed
      const tableText = wrapper.text();
      expect(tableText).toContain('Test Product A');
      expect(tableText).toContain('Test Product B');
      expect(tableText).toContain('Test Product C');
    });

    it('should verify processing times and completion dates are displayed correctly', async () => {
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

      const tableText = wrapper.text();
      
      // Verify processing times are formatted correctly
      expect(tableText).toContain('40m'); // Each item should show 40 minutes
      
      // Verify completion dates are displayed (should show formatted dates)
      // The component should format dates like "1/15/2024 10:40 AM"
      expect(tableText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date pattern
      expect(tableText).toMatch(/\d{1,2}:\d{2}/); // Time pattern
    });

    it('should test modal with different filter combinations (date range, station, employee)', async () => {
      // Test with date range filter
      mockFetch.mockResolvedValue(mockFilteredResponse);
      
      const wrapper = mount(EmployeeItemDetailsModal, {
        props: {
          isOpen: true,
          employeeId: 'user-123',
          employeeName: 'John Doe',
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          stationId: 'quality-control'
        },
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was called with correct filters
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/employee-items', {
        query: {
          userId: 'user-123',
          startDate: '2024-02-01',
          endDate: '2024-02-28',
          stationId: 'quality-control'
        }
      });

      // Verify filtered data is displayed
      const tableText = wrapper.text();
      expect(tableText).toContain('Filtered Product');
      expect(tableText).toContain('Quality Control');
      expect(tableText).toContain('30m');
      
      // Verify summary reflects filtered data
      const summaryText = wrapper.text();
      expect(summaryText).toContain('Total Items: 1');
      expect(summaryText).toContain('Total Processing Time: 30m');
    });

    it('should ensure modal handles empty data states appropriately', async () => {
      const emptyResponse = {
        success: true,
        data: [],
        summary: {
          totalItems: 0,
          totalProcessingTime: 0,
          totalProcessingTimeFormatted: '0s'
        }
      };
      
      mockFetch.mockResolvedValue(emptyResponse);

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

      // Verify empty state message is displayed
      expect(wrapper.text()).toContain('No items found for this employee');
      
      // Verify summary shows zero values
      const summaryText = wrapper.text();
      expect(summaryText).toContain('Total Items: 0');
      expect(summaryText).toContain('Total Processing Time: 0s');
      
      // Verify no table rows are displayed
      const tableRows = wrapper.findAll('tbody tr');
      expect(tableRows.length).toBe(0);
    });

    it('should validate data consistency between API response and display', async () => {
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

      // Get the component's internal data
      const componentData = wrapper.vm.items;
      const componentSummary = wrapper.vm.summary;

      // Verify component data matches API response
      expect(componentData.length).toBe(mockEmployeeItemsResponse.data.length);
      expect(componentSummary.totalItems).toBe(mockEmployeeItemsResponse.summary.totalItems);
      expect(componentSummary.totalProcessingTime).toBe(mockEmployeeItemsResponse.summary.totalProcessingTime);

      // Verify each item's data is correctly stored
      componentData.forEach((item, index) => {
        const expectedItem = mockEmployeeItemsResponse.data[index];
        expect(item.orderItemId).toBe(expectedItem.orderItemId);
        expect(item.itemName).toBe(expectedItem.itemName);
        expect(item.orderNumber).toBe(expectedItem.orderNumber);
        expect(item.processingTime).toBe(expectedItem.processingTime);
        expect(item.customerName).toBe(expectedItem.customerName);
      });
    });

    it('should handle station filtering correctly and show appropriate station data', async () => {
      const multiStationResponse = {
        success: true,
        data: [
          {
            orderItemId: 'item-multi',
            itemName: 'Multi-Station Product',
            orderNumber: 'SO-MULTI',
            orderId: 'order-multi',
            customerName: 'Multi Customer',
            processingTime: 3600,
            processingTimeFormatted: '1h',
            processedAt: '2024-01-15T10:00:00Z',
            completedAt: '2024-01-15T11:00:00Z',
            stationName: 'Assembly Station, Quality Control',
            stationNames: ['Assembly Station', 'Quality Control']
          }
        ],
        summary: {
          totalItems: 1,
          totalProcessingTime: 3600,
          totalProcessingTimeFormatted: '1h'
        }
      };

      mockFetch.mockResolvedValue(multiStationResponse);

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

      const tableText = wrapper.text();
      
      // Verify multiple stations are displayed
      expect(tableText).toContain('Assembly Station');
      expect(tableText).toContain('Quality Control');
      
      // Verify the item processed at multiple stations is shown
      expect(tableText).toContain('Multi-Station Product');
    });

    it('should validate time formatting consistency', async () => {
      const timeTestResponse = {
        success: true,
        data: [
          {
            orderItemId: 'time-test-1',
            itemName: 'Short Time Item',
            orderNumber: 'SO-TIME1',
            orderId: 'order-time1',
            customerName: 'Time Customer',
            processingTime: 45, // 45 seconds
            processingTimeFormatted: '45s',
            processedAt: '2024-01-15T10:00:00Z',
            completedAt: '2024-01-15T10:00:45Z',
            stationName: 'Test Station',
            stationNames: ['Test Station']
          },
          {
            orderItemId: 'time-test-2',
            itemName: 'Long Time Item',
            orderNumber: 'SO-TIME2',
            orderId: 'order-time2',
            customerName: 'Time Customer',
            processingTime: 7265, // 2h 1m 5s
            processingTimeFormatted: '2h 1m 5s',
            processedAt: '2024-01-15T10:00:00Z',
            completedAt: '2024-01-15T12:01:05Z',
            stationName: 'Test Station',
            stationNames: ['Test Station']
          }
        ],
        summary: {
          totalItems: 2,
          totalProcessingTime: 7310, // 2h 1m 50s
          totalProcessingTimeFormatted: '2h 1m 50s'
        }
      };

      mockFetch.mockResolvedValue(timeTestResponse);

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

      const tableText = wrapper.text();
      
      // Verify different time formats are displayed correctly
      expect(tableText).toContain('45s');
      expect(tableText).toContain('2h 1m 5s');
      
      // Verify summary time formatting
      const summaryText = wrapper.text();
      expect(summaryText).toContain('Total Processing Time: 2h 1m 50s');
    });
  });

  describe('Data refresh and reactivity', () => {
    it('should refresh data when props change', async () => {
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

      // Clear the mock to track new calls
      mockFetch.mockClear();
      mockFetch.mockResolvedValue(mockFilteredResponse);

      // Change the employee ID
      await wrapper.setProps({
        employeeId: 'user-456',
        employeeName: 'Jane Smith'
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify API was called again with new employee ID
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/employee-items', {
        query: {
          userId: 'user-456',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      // Verify modal title updated
      expect(wrapper.text()).toContain('Items Processed by Jane Smith');
    });
  });
});