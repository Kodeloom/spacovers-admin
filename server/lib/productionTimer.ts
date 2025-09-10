// Production timer utilities for tracking order and item processing times

import { unenhancedPrisma as prisma } from './db';

export interface ProductionMetrics {
  orderId: string;
  totalProductionTimeSeconds: number;
  productionStartedAt: Date | null;
  productionCompletedAt: Date | null;
  stationBreakdown: StationTime[];
  itemsInProduction: number;
  itemsCompleted: number;
}

export interface StationTime {
  stationName: string;
  totalTimeSeconds: number;
  itemsProcessed: number;
  averageTimePerItem: number;
}

export interface ItemProductionHistory {
  orderItemId: string;
  itemName: string;
  currentStatus: string;
  stationLogs: StationLog[];
  totalTimeSeconds: number;
  isCompleted: boolean;
}

export interface StationLog {
  stationName: string;
  userName: string;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number | null;
  scannerPrefix: string | null;
}

/**
 * Calculate production metrics for an order
 */
export async function calculateOrderProductionMetrics(orderId: string): Promise<ProductionMetrics> {
  // Get all production items for this order
  const orderItems = await prisma.orderItem.findMany({
    where: {
      orderId: orderId,
      isProduct: true // Only production items
    },
    include: {
      item: true,
      itemProcessingLogs: {
        include: {
          station: true,
          user: true
        },
        orderBy: {
          startTime: 'asc'
        }
      }
    }
  });

  if (orderItems.length === 0) {
    return {
      orderId,
      totalProductionTimeSeconds: 0,
      productionStartedAt: null,
      productionCompletedAt: null,
      stationBreakdown: [],
      itemsInProduction: 0,
      itemsCompleted: 0
    };
  }

  // Find production start time (first log entry)
  let productionStartedAt: Date | null = null;
  let productionCompletedAt: Date | null = null;
  let totalProductionTimeSeconds = 0;
  
  const stationTimes = new Map<string, { totalTime: number; itemCount: number }>();
  let itemsCompleted = 0;
  let itemsInProduction = 0;

  for (const orderItem of orderItems) {
    if (orderItem.itemProcessingLogs.length > 0) {
      itemsInProduction++;
      
      // Track production start
      const firstLog = orderItem.itemProcessingLogs[0];
      if (!productionStartedAt || firstLog.startTime < productionStartedAt) {
        productionStartedAt = firstLog.startTime;
      }

      // Calculate time for this item
      let itemTotalTime = 0;
      
      for (const log of orderItem.itemProcessingLogs) {
        if (log.endTime && log.durationInSeconds) {
          itemTotalTime += log.durationInSeconds;
          
          // Track station times
          const stationName = log.station.name;
          const existing = stationTimes.get(stationName) || { totalTime: 0, itemCount: 0 };
          existing.totalTime += log.durationInSeconds;
          existing.itemCount += 1;
          stationTimes.set(stationName, existing);
        }
      }

      totalProductionTimeSeconds += itemTotalTime;

      // Check if item is completed
      if (orderItem.itemStatus === 'READY') {
        itemsCompleted++;
        
        // Track production completion (latest completion time)
        const lastLog = orderItem.itemProcessingLogs[orderItem.itemProcessingLogs.length - 1];
        if (lastLog.endTime && (!productionCompletedAt || lastLog.endTime > productionCompletedAt)) {
          productionCompletedAt = lastLog.endTime;
        }
      }
    }
  }

  // Build station breakdown
  const stationBreakdown: StationTime[] = Array.from(stationTimes.entries()).map(([stationName, data]) => ({
    stationName,
    totalTimeSeconds: data.totalTime,
    itemsProcessed: data.itemCount,
    averageTimePerItem: data.itemCount > 0 ? Math.round(data.totalTime / data.itemCount) : 0
  }));

  return {
    orderId,
    totalProductionTimeSeconds,
    productionStartedAt,
    productionCompletedAt,
    stationBreakdown,
    itemsInProduction,
    itemsCompleted
  };
}

/**
 * Get detailed production history for an item
 */
export async function getItemProductionHistory(orderItemId: string): Promise<ItemProductionHistory> {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      item: true,
      itemProcessingLogs: {
        include: {
          station: true,
          user: true
        },
        orderBy: {
          startTime: 'asc'
        }
      }
    }
  });

  if (!orderItem) {
    throw new Error('Order item not found');
  }

  const stationLogs: StationLog[] = orderItem.itemProcessingLogs.map(log => ({
    stationName: log.station.name,
    userName: log.user.name,
    startTime: log.startTime,
    endTime: log.endTime,
    durationSeconds: log.durationInSeconds,
    scannerPrefix: log.scannerPrefix
  }));

  const totalTimeSeconds = orderItem.itemProcessingLogs
    .filter(log => log.durationInSeconds)
    .reduce((sum, log) => sum + (log.durationInSeconds || 0), 0);

  return {
    orderItemId,
    itemName: orderItem.item.name,
    currentStatus: orderItem.itemStatus,
    stationLogs,
    totalTimeSeconds,
    isCompleted: orderItem.itemStatus === 'READY'
  };
}

/**
 * Get active work sessions for a user
 */
export async function getUserActiveWork(userId: string) {
  const activeWork = await prisma.itemProcessingLog.findMany({
    where: {
      userId: userId,
      endTime: null // Still in progress
    },
    include: {
      orderItem: {
        include: {
          item: true,
          order: true
        }
      },
      station: true
    }
  });

  return activeWork.map(work => ({
    logId: work.id,
    orderNumber: work.orderItem.order.salesOrderNumber || work.orderItem.order.id.slice(-8),
    itemName: work.orderItem.item.name,
    stationName: work.station.name,
    startTime: work.startTime,
    durationSoFar: Math.floor((new Date().getTime() - work.startTime.getTime()) / 1000),
    scannerPrefix: work.scannerPrefix
  }));
}

/**
 * Complete active work session for a user
 */
export async function completeUserActiveWork(userId: string, logId?: string) {
  const whereClause = logId 
    ? { id: logId, userId: userId }
    : { userId: userId, endTime: null };

  const activeWork = await prisma.itemProcessingLog.findFirst({
    where: whereClause
  });

  if (!activeWork) {
    throw new Error('No active work found to complete');
  }

  const endTime = new Date();
  const durationInSeconds = Math.floor((endTime.getTime() - activeWork.startTime.getTime()) / 1000);

  await prisma.itemProcessingLog.update({
    where: { id: activeWork.id },
    data: {
      endTime: endTime,
      durationInSeconds: durationInSeconds,
      notes: `${activeWork.notes || ''} - Completed at ${endTime.toISOString()}`
    }
  });

  return {
    logId: activeWork.id,
    durationInSeconds,
    completedAt: endTime
  };
}

/**
 * Start production timer for an order (when first item starts)
 */
export async function startOrderProduction(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Only start production if not already started
  if (order.orderStatus === 'APPROVED') {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'ORDER_PROCESSING'
      }
    });
  }
}

/**
 * Complete order production (when all items are ready)
 */
export async function completeOrderProduction(orderId: string) {
  const allItems = await prisma.orderItem.findMany({
    where: { 
      orderId: orderId,
      isProduct: true // Only check production items
    }
  });

  const allReady = allItems.every(item => item.itemStatus === 'READY');

  if (allReady) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: 'READY_TO_SHIP',
        readyToShipAt: new Date()
      }
    });
    return true;
  }

  return false;
}