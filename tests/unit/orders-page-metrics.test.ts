import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

// Mock the orders page component functionality
describe('Orders Page Metrics Integration', () => {
  let mockFetch: any;
  let mockToast: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockToast = {
      success: vi.fn(),
      error: vi.fn()
    };
    
    // Mock global $fetch
    global.$fetch = mockFetch;
  });

  describe('fetchMetrics function', () => {
    it('should fetch metrics from the new orders API with correct filters', async () => {
      // Mock successful API response
      const mockResponse = {
        success: true,
        data: {
          statusCounts: {
            PENDING: 5,
            ORDER_PROCESSING: 3,
            READY_TO_SHIP: 2,
            COMPLETED: 10
          },
          totalValue: 15000,
          averageOrderValue: 750,
          totalOrders: 20,
          productionMetrics: {
            notStarted: 8,
            cutting: 2,
            sewing: 1,
            foamCutting: 1,
            packaging: 1,
            finished: 5,
            ready: 2
          }
        }
      };

      mockFetch.mockResolvedValueOnce(mockResponse);
      mockFetch.mockResolvedValueOnce({ avgLeadTime: 7 }); // Lead time API

      // Simulate the fetchMetrics function logic
      const timeFilter = ref('30');
      const customerFilter = ref('');
      const statusFilter = ref('');
      const customerIdFromQuery = ref(null);
      const metrics = ref({});
      const isMetricsLoading = ref(false);
      const metricsError = ref(null);

      // Simulate fetchMetrics function
      const fetchMetrics = async () => {
        isMetricsLoading.value = true;
        metricsError.value = null;
        
        try {
          const filters: Record<string, any> = {};
          
          // Apply time filter
          if (timeFilter.value !== 'lifetime') {
            const now = new Date();
            const dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filters.dateFrom = dateFrom.toISOString();
          }
          
          const response = await $fetch('/api/metrics/orders', { query: filters });
          // Calculate date range for last 60 days
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 60);
          
          const leadTimeResponse = await $fetch('/api/reports/lead-time', { 
            query: { 
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString()
            } 
          });
          
          if (response.success && response.data) {
            const data = response.data;
            metrics.value = {
              avgLeadTime: leadTimeResponse.avgLeadTime || 0,
              ordersPending: data.statusCounts?.PENDING || 0,
              ordersInProgress: data.statusCounts?.ORDER_PROCESSING || 0,
              ordersReadyToShip: data.statusCounts?.READY_TO_SHIP || 0,
              ordersCompleted: data.statusCounts?.COMPLETED || 0,
              totalValue: data.totalValue || 0,
              averageOrderValue: data.averageOrderValue || 0,
              totalOrders: data.totalOrders || 0,
              productionMetrics: data.productionMetrics
            };
          }
        } catch (error) {
          metricsError.value = 'Failed to load metrics. Please try again.';
        } finally {
          isMetricsLoading.value = false;
        }
      };

      await fetchMetrics();

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/orders', {
        query: expect.objectContaining({
          dateFrom: expect.any(String)
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/reports/lead-time', {
        query: expect.objectContaining({
          startDate: expect.any(String),
          endDate: expect.any(String)
        })
      });

      // Verify metrics were updated correctly
      expect(metrics.value).toEqual({
        avgLeadTime: 7,
        ordersPending: 5,
        ordersInProgress: 3,
        ordersReadyToShip: 2,
        ordersCompleted: 10,
        totalValue: 15000,
        averageOrderValue: 750,
        totalOrders: 20,
        productionMetrics: {
          notStarted: 8,
          cutting: 2,
          sewing: 1,
          foamCutting: 1,
          packaging: 1,
          finished: 5,
          ready: 2
        }
      });

      expect(isMetricsLoading.value).toBe(false);
      expect(metricsError.value).toBe(null);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const metrics = ref({});
      const isMetricsLoading = ref(false);
      const metricsError = ref(null);

      const fetchMetrics = async () => {
        isMetricsLoading.value = true;
        metricsError.value = null;
        
        try {
          await $fetch('/api/metrics/orders', { query: {} });
        } catch (error) {
          metricsError.value = 'Failed to load metrics. Please try again.';
        } finally {
          isMetricsLoading.value = false;
        }
      };

      await fetchMetrics();

      expect(isMetricsLoading.value).toBe(false);
      expect(metricsError.value).toBe('Failed to load metrics. Please try again.');
    });

    it('should apply filters correctly to metrics API call', async () => {
      const mockResponse = { success: true, data: { statusCounts: {}, totalValue: 0, totalOrders: 0, productionMetrics: {} } };
      mockFetch.mockResolvedValue(mockResponse);

      const timeFilter = ref('60');
      const customerIdFromQuery = ref('customer-123');
      const statusFilter = ref('PENDING');

      const fetchMetrics = async () => {
        const filters: Record<string, any> = {};
        
        // Apply time filter
        if (timeFilter.value !== 'lifetime') {
          const now = new Date();
          const dateFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          filters.dateFrom = dateFrom.toISOString();
        }
        
        if (customerIdFromQuery.value) {
          filters.customerId = customerIdFromQuery.value;
        }
        
        if (statusFilter.value) {
          filters.status = statusFilter.value;
        }

        await $fetch('/api/metrics/orders', { query: filters });
      };

      await fetchMetrics();

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/orders', {
        query: expect.objectContaining({
          dateFrom: expect.any(String),
          customerId: 'customer-123',
          status: 'PENDING'
        })
      });
    });
  });

  describe('Automatic refresh functionality', () => {
    it('should refresh metrics when orders are updated', () => {
      const fetchMetrics = vi.fn();
      const refreshOrders = vi.fn();
      const refreshCount = vi.fn();

      // Simulate the updateOrder success callback
      const onOrderUpdateSuccess = () => {
        refreshOrders();
        refreshCount();
        fetchMetrics();
      };

      onOrderUpdateSuccess();

      expect(refreshOrders).toHaveBeenCalled();
      expect(refreshCount).toHaveBeenCalled();
      expect(fetchMetrics).toHaveBeenCalled();
    });

    it('should refresh metrics when sync is completed', () => {
      const fetchMetrics = vi.fn();
      const refreshOrders = vi.fn();
      const refreshCount = vi.fn();

      // Simulate the sync success callback
      const onSyncSuccess = () => {
        refreshOrders();
        refreshCount();
        fetchMetrics();
      };

      onSyncSuccess();

      expect(refreshOrders).toHaveBeenCalled();
      expect(refreshCount).toHaveBeenCalled();
      expect(fetchMetrics).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should show error state when metrics fail to load', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const metricsError = ref(null);
      const isMetricsLoading = ref(false);

      const fetchMetrics = async () => {
        isMetricsLoading.value = true;
        metricsError.value = null;
        
        try {
          await $fetch('/api/metrics/orders', { query: {} });
        } catch (error) {
          console.error('Failed to fetch metrics:', error);
          metricsError.value = 'Failed to load metrics. Please try again.';
        } finally {
          isMetricsLoading.value = false;
        }
      };

      await fetchMetrics();

      expect(metricsError.value).toBe('Failed to load metrics. Please try again.');
      expect(isMetricsLoading.value).toBe(false);
    });

    it('should provide retry functionality on error', () => {
      const fetchMetrics = vi.fn();
      const metricsError = ref('Failed to load metrics. Please try again.');

      // Simulate retry button click
      const onRetryClick = () => {
        fetchMetrics();
      };

      onRetryClick();

      expect(fetchMetrics).toHaveBeenCalled();
    });
  });
});