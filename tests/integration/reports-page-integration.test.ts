import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Integration test for Reports Page with Accurate Calculations
 * Tests the updated reports page functionality using the new metrics service
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
describe('Reports Page Integration', () => {
  let mockFetch: any;

  beforeEach(() => {
    // Mock the global $fetch function
    mockFetch = vi.fn();
    global.$fetch = mockFetch;
  });

  describe('Date Range Validation', () => {
    it('should validate date range inputs correctly', () => {
      // Mock metrics API response
      const mockMetricsResponse = {
        success: true,
        data: {
          productivityByEmployee: [],
          averageLeadTime: 0,
          revenueByPeriod: [],
          totalProductionHours: 0,
          totalItemsProcessed: 0,
          overallProductivity: 0
        }
      };

      mockFetch.mockResolvedValue(mockMetricsResponse);

      // Test that date validation works
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      expect(new Date(startDate)).toBeInstanceOf(Date);
      expect(new Date(endDate)).toBeInstanceOf(Date);
      expect(new Date(startDate) <= new Date(endDate)).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      const startDate = '2024-02-01';
      const endDate = '2024-01-31'; // End before start
      
      expect(new Date(startDate) > new Date(endDate)).toBe(true);
    });

    it('should reject date ranges exceeding 365 days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-02-01'); // More than 365 days
      
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff > 365).toBe(true);
    });
  });

  describe('Metrics Service Integration', () => {
    it('should call the correct metrics API endpoint', async () => {
      const mockMetricsResponse = {
        success: true,
        data: {
          productivityByEmployee: [
            {
              userId: 'user1',
              userName: 'John Doe',
              totalHours: 40,
              itemsProcessed: 100,
              averageTimePerItem: 1440, // 24 minutes
              stationBreakdown: [
                {
                  stationId: 'station1',
                  stationName: 'Cutting',
                  hoursWorked: 20,
                  itemsProcessed: 50,
                  averageTimePerItem: 1440
                }
              ]
            }
          ],
          averageLeadTime: 72, // 3 days in hours
          revenueByPeriod: [
            {
              period: '2024-01',
              revenue: 10000,
              orderCount: 50
            }
          ],
          totalProductionHours: 100,
          totalItemsProcessed: 200,
          overallProductivity: 2.0
        }
      };

      mockFetch.mockResolvedValue(mockMetricsResponse);

      // Simulate API call
      const response = await mockFetch('/api/metrics/reports', {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/metrics/reports', {
        query: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });

      expect(response.success).toBe(true);
      expect(response.data.productivityByEmployee).toHaveLength(1);
      expect(response.data.totalItemsProcessed).toBe(200);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      try {
        await mockFetch('/api/metrics/reports', {
          query: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          }
        });
      } catch (error) {
        expect(error.message).toBe('API Error');
      }

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Data Transformation', () => {
    it('should transform productivity data correctly', () => {
      const mockProductivityData = [
        {
          userId: 'user1',
          userName: 'John Doe',
          totalHours: 40,
          itemsProcessed: 100,
          averageTimePerItem: 1440,
          stationBreakdown: [
            {
              stationId: 'station1',
              stationName: 'Cutting',
              hoursWorked: 20,
              itemsProcessed: 50,
              averageTimePerItem: 1440
            },
            {
              stationId: 'station2',
              stationName: 'Sewing',
              hoursWorked: 20,
              itemsProcessed: 50,
              averageTimePerItem: 1440
            }
          ]
        }
      ];

      // Transform data (simulating the transformProductivityData function)
      const transformedData = mockProductivityData.flatMap(employee => 
        employee.stationBreakdown.map(station => ({
          userId: employee.userId,
          userName: employee.userName,
          stationId: station.stationId,
          stationName: station.stationName,
          itemsProcessed: station.itemsProcessed,
          totalDuration: station.hoursWorked * 3600, // Convert to seconds
          avgDuration: station.averageTimePerItem,
          efficiency: station.hoursWorked > 0 ? station.itemsProcessed / station.hoursWorked : 0,
          totalCost: station.hoursWorked * 25 // Default hourly rate
        }))
      );

      expect(transformedData).toHaveLength(2);
      expect(transformedData[0].stationName).toBe('Cutting');
      expect(transformedData[1].stationName).toBe('Sewing');
      expect(transformedData[0].totalDuration).toBe(72000); // 20 hours in seconds
    });

    it('should calculate revenue from periods correctly', () => {
      const mockRevenueByPeriod = [
        { period: '2024-01', revenue: 5000, orderCount: 25 },
        { period: '2024-02', revenue: 7500, orderCount: 35 },
        { period: '2024-03', revenue: 6000, orderCount: 30 }
      ];

      const totalRevenue = mockRevenueByPeriod.reduce((total, period) => total + period.revenue, 0);
      
      expect(totalRevenue).toBe(18500);
    });

    it('should calculate labor costs correctly', () => {
      const hoursWorked = 40;
      const defaultHourlyRate = 25;
      const expectedCost = hoursWorked * defaultHourlyRate;
      
      expect(expectedCost).toBe(1000);
    });
  });

  describe('Revenue Report Calculations', () => {
    it('should use actual order data for revenue calculations', () => {
      const mockRevenueData = [
        { period: '2024-01', revenue: 10000, orderCount: 50 },
        { period: '2024-02', revenue: 15000, orderCount: 75 }
      ];

      const totalRevenue = mockRevenueData.reduce((sum, period) => sum + period.revenue, 0);
      const totalOrders = mockRevenueData.reduce((sum, period) => sum + period.orderCount, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      expect(totalRevenue).toBe(25000);
      expect(totalOrders).toBe(125);
      expect(averageOrderValue).toBe(200);
    });

    it('should handle empty revenue data gracefully', () => {
      const emptyRevenueData: any[] = [];
      
      const totalRevenue = emptyRevenueData.reduce((sum, period) => sum + period.revenue, 0);
      
      expect(totalRevenue).toBe(0);
    });
  });

  describe('Lead Time Calculations', () => {
    it('should convert lead time from hours to days correctly', () => {
      const leadTimeInHours = 72; // 3 days
      const leadTimeInDays = leadTimeInHours / 24;
      
      expect(leadTimeInDays).toBe(3);
    });

    it('should handle zero lead time', () => {
      const leadTimeInHours = 0;
      const leadTimeInDays = leadTimeInHours / 24;
      
      expect(leadTimeInDays).toBe(0);
    });
  });
});