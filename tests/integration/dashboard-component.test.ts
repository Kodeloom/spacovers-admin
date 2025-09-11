/**
 * Integration test for dashboard component metrics integration
 * Tests that the dashboard component can successfully fetch and display metrics
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma-app/client';
import { MetricsService } from '../../utils/metricsService';

const prisma = new PrismaClient();

describe('Dashboard Component Integration', () => {
  beforeAll(async () => {
    // Ensure database connection is available
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should fetch dashboard metrics successfully', async () => {
    // Test that the MetricsService returns valid data structure
    const metrics = await MetricsService.getDashboardMetrics();
    
    // Verify all required fields are present
    expect(metrics).toHaveProperty('totalOrders');
    expect(metrics).toHaveProperty('revenueThisMonth');
    expect(metrics).toHaveProperty('ordersThisWeek');
    expect(metrics).toHaveProperty('pendingOrders');
    expect(metrics).toHaveProperty('inProduction');
    expect(metrics).toHaveProperty('readyToShip');
    
    // Verify all values are numbers
    expect(typeof metrics.totalOrders).toBe('number');
    expect(typeof metrics.revenueThisMonth).toBe('number');
    expect(typeof metrics.ordersThisWeek).toBe('number');
    expect(typeof metrics.pendingOrders).toBe('number');
    expect(typeof metrics.inProduction).toBe('number');
    expect(typeof metrics.readyToShip).toBe('number');
    
    // Verify all values are non-negative
    expect(metrics.totalOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.revenueThisMonth).toBeGreaterThanOrEqual(0);
    expect(metrics.ordersThisWeek).toBeGreaterThanOrEqual(0);
    expect(metrics.pendingOrders).toBeGreaterThanOrEqual(0);
    expect(metrics.inProduction).toBeGreaterThanOrEqual(0);
    expect(metrics.readyToShip).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors gracefully and return fallback values', async () => {
    // Mock a database error by temporarily breaking the connection
    const originalCount = prisma.order.count;
    prisma.order.count = () => {
      throw new Error('Database connection failed');
    };

    try {
      const metrics = await MetricsService.getDashboardMetrics();
      
      // Should still return a valid structure with fallback values
      expect(metrics).toHaveProperty('totalOrders');
      expect(metrics).toHaveProperty('revenueThisMonth');
      expect(metrics).toHaveProperty('ordersThisWeek');
      expect(metrics).toHaveProperty('pendingOrders');
      expect(metrics).toHaveProperty('inProduction');
      expect(metrics).toHaveProperty('readyToShip');
      
      // All values should be numbers (likely 0 due to fallbacks)
      expect(typeof metrics.totalOrders).toBe('number');
      expect(typeof metrics.revenueThisMonth).toBe('number');
      expect(typeof metrics.ordersThisWeek).toBe('number');
      expect(typeof metrics.pendingOrders).toBe('number');
      expect(typeof metrics.inProduction).toBe('number');
      expect(typeof metrics.readyToShip).toBe('number');
      
    } finally {
      // Restore the original method
      prisma.order.count = originalCount;
    }
  });

  it('should calculate metrics within reasonable time limits', async () => {
    const startTime = Date.now();
    await MetricsService.getDashboardMetrics();
    const endTime = Date.now();
    
    const executionTime = endTime - startTime;
    
    // Should complete within 5 seconds (generous limit for CI environments)
    expect(executionTime).toBeLessThan(5000);
  });

  it('should return consistent results on multiple calls', async () => {
    // Get metrics twice in quick succession
    const metrics1 = await MetricsService.getDashboardMetrics();
    const metrics2 = await MetricsService.getDashboardMetrics();
    
    // Results should be identical (assuming no data changes between calls)
    expect(metrics1.totalOrders).toBe(metrics2.totalOrders);
    expect(metrics1.pendingOrders).toBe(metrics2.pendingOrders);
    expect(metrics1.inProduction).toBe(metrics2.inProduction);
    expect(metrics1.readyToShip).toBe(metrics2.readyToShip);
    
    // Revenue and weekly orders might change if we're at month/week boundaries,
    // but they should still be numbers
    expect(typeof metrics1.revenueThisMonth).toBe('number');
    expect(typeof metrics1.ordersThisWeek).toBe('number');
    expect(typeof metrics2.revenueThisMonth).toBe('number');
    expect(typeof metrics2.ordersThisWeek).toBe('number');
  });
});