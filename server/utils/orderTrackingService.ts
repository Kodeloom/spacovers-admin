import { unenhancedPrisma } from '~/server/lib/db';
import type { OrderSystemStatus, OrderItemProcessingStatus } from '@prisma-app/client';

export interface OrderStatusChangeData {
  orderId: string;
  fromStatus?: OrderSystemStatus;
  toStatus: OrderSystemStatus;
  userId?: string;
  changeReason: string;
  triggeredBy: 'manual' | 'system' | 'automation';
  notes?: string;
}

export interface ItemStatusChangeData {
  orderItemId: string;
  fromStatus?: OrderItemProcessingStatus;
  toStatus: OrderItemProcessingStatus;
  userId?: string;
  changeReason: string;
  triggeredBy: 'manual' | 'system' | 'automation';
  notes?: string;
}

export interface TimeCalculationResult {
  totalSeconds: number;
  displayMinutes: number;
  displayHours: number;
  displayDays: number;
}

export class OrderTrackingService {
  /**
   * Log an order status change
   */
  static async logOrderStatusChange(data: OrderStatusChangeData): Promise<void> {
    try {
      await unenhancedPrisma.orderStatusLog.create({
        data: {
          orderId: data.orderId,
          userId: data.userId,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changeReason: data.changeReason,
          triggeredBy: data.triggeredBy,
          notes: data.notes,
        },
      });

      console.log(`✅ Order status change logged: ${data.fromStatus || 'NONE'} → ${data.toStatus} for order ${data.orderId}`);
    } catch (error) {
      console.error('❌ Failed to log order status change:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Log an item status change
   */
  static async logItemStatusChange(data: ItemStatusChangeData): Promise<void> {
    try {
      await unenhancedPrisma.itemStatusLog.create({
        data: {
          orderItemId: data.orderItemId,
          userId: data.userId,
          fromStatus: data.fromStatus,
          toStatus: data.toStatus,
          changeReason: data.changeReason,
          triggeredBy: data.triggeredBy,
          notes: data.notes,
        },
      });

      console.log(`✅ Item status change logged: ${data.fromStatus || 'NONE'} → ${data.toStatus} for item ${data.orderItemId}`);
    } catch (error) {
      console.error('❌ Failed to log item status change:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Calculate time difference with proper rounding for display
   * Rounds up if ≥30 seconds, rounds down if <30 seconds
   */
  static calculateTimeDifference(startTime: Date, endTime: Date): TimeCalculationResult {
    const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Apply rounding rule: ≥30 seconds rounds up, <30 seconds rounds down
    const roundedSeconds = totalSeconds >= 30 ? Math.ceil(totalSeconds / 60) * 60 : Math.floor(totalSeconds / 60) * 60;
    
    const displayMinutes = Math.floor(roundedSeconds / 60);
    const displayHours = Math.floor(displayMinutes / 60);
    const displayDays = Math.floor(displayHours / 24);

    return {
      totalSeconds: roundedSeconds,
      displayMinutes,
      displayHours,
      displayDays,
    };
  }

  /**
   * Get order lead time metrics
   */
  static async getOrderLeadTimeMetrics(orderId: string) {
    try {
      const logs = await unenhancedPrisma.orderStatusLog.findMany({
        where: { orderId },
        orderBy: { timestamp: 'asc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });

      if (logs.length < 2) {
        return null;
      }

      const metrics: Record<string, any> = {};
      
      for (let i = 0; i < logs.length - 1; i++) {
        const currentLog = logs[i];
        const nextLog = logs[i + 1];
        
        const timeDiff = this.calculateTimeDifference(currentLog.timestamp, nextLog.timestamp);
        
        metrics[`${currentLog.toStatus}_to_${nextLog.toStatus}`] = {
          duration: timeDiff,
          startTime: currentLog.timestamp,
          endTime: nextLog.timestamp,
          triggeredBy: currentLog.triggeredBy,
          user: currentLog.user,
        };
      }

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get order lead time metrics:', error);
      return null;
    }
  }

  /**
   * Get item production metrics
   */
  static async getItemProductionMetrics(orderItemId: string) {
    try {
      const logs = await unenhancedPrisma.itemStatusLog.findMany({
        where: { orderItemId },
        orderBy: { timestamp: 'asc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });

      if (logs.length < 2) {
        return null;
      }

      const metrics: Record<string, any> = {};
      
      for (let i = 0; i < logs.length - 1; i++) {
        const currentLog = logs[i];
        const nextLog = logs[i + 1];
        
        const timeDiff = this.calculateTimeDifference(currentLog.timestamp, nextLog.timestamp);
        
        metrics[`${currentLog.toStatus}_to_${nextLog.toStatus}`] = {
          duration: timeDiff,
          startTime: currentLog.timestamp,
          endTime: nextLog.timestamp,
          triggeredBy: currentLog.triggeredBy,
          user: currentLog.user,
        };
      }

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get item production metrics:', error);
      return null;
    }
  }

  /**
   * Get employee productivity metrics for a specific time period
   */
  static async getEmployeeProductivityMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ) {
    try {
      const whereClause: any = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const orderLogs = await unenhancedPrisma.orderStatusLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true }
          },
          order: {
            select: { salesOrderNumber: true, customer: { select: { name: true } } }
          }
        }
      });

      const itemLogs = await unenhancedPrisma.itemStatusLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true }
          },
          orderItem: {
            select: {
              order: { select: { salesOrderNumber: true, customer: { select: { name: true } } } },
              item: { select: { name: true } }
            }
          }
        }
      });

      // Group by user and calculate metrics
      const userMetrics: Record<string, any> = {};

      // Process order logs
      orderLogs.forEach(log => {
        if (!log.user) return;
        
        const userId = log.user.id;
        if (!userMetrics[userId]) {
          userMetrics[userId] = {
            user: log.user,
            orderChanges: 0,
            itemChanges: 0,
            totalTimeSpent: 0,
            ordersProcessed: new Set(),
            itemsProcessed: new Set(),
          };
        }
        
        userMetrics[userId].orderChanges++;
        if (log.order?.salesOrderNumber) {
          userMetrics[userId].ordersProcessed.add(log.order.salesOrderNumber);
        }
      });

      // Process item logs
      itemLogs.forEach(log => {
        if (!log.user) return;
        
        const userId = log.user.id;
        if (!userMetrics[userId]) {
          userMetrics[userId] = {
            user: log.user,
            orderChanges: 0,
            itemChanges: 0,
            totalTimeSpent: 0,
            ordersProcessed: new Set(),
            itemsProcessed: new Set(),
          };
        }
        
        userMetrics[userId].itemChanges++;
        if (log.orderItem?.order?.salesOrderNumber) {
          userMetrics[userId].ordersProcessed.add(log.orderItem.order.salesOrderNumber);
        }
        if (log.orderItem?.item?.name) {
          userMetrics[userId].itemsProcessed.add(log.orderItem.item.name);
        }
      });

      // Convert sets to counts and calculate totals
      Object.values(userMetrics).forEach((metrics: any) => {
        metrics.ordersProcessed = metrics.ordersProcessed.size;
        metrics.itemsProcessed = metrics.itemsProcessed.size;
        metrics.totalChanges = metrics.orderChanges + metrics.itemChanges;
      });

      return Object.values(userMetrics);
    } catch (error) {
      console.error('❌ Failed to get employee productivity metrics:', error);
      return [];
    }
  }
}
