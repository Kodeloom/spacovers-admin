// Server-side event emitter utility for real-time updates
// This utility helps coordinate real-time updates across the application

interface ItemStatusChangeEvent {
  orderItemId: string;
  fromStatus: string;
  toStatus: string;
  orderNumber?: string;
  itemName?: string;
  userId?: string;
  stationName?: string;
  timestamp: Date;
}

interface OrderStatusChangeEvent {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  orderNumber?: string;
  userId?: string;
  timestamp: Date;
}

// In a real-world scenario, this would use WebSockets, Server-Sent Events, or a message queue
// For now, we'll use a simple in-memory event system that can be extended later

class EventEmitter {
  private static instance: EventEmitter;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }

  // Emit item status change event
  emitItemStatusChange(event: ItemStatusChangeEvent) {
    console.log('📡 Emitting item status change event:', event);
    
    // In a production environment, this would:
    // 1. Send WebSocket message to connected clients
    // 2. Publish to Redis/message queue for horizontal scaling
    // 3. Update real-time dashboard displays
    
    // For now, we'll log the event for debugging
    // The frontend will use polling and custom events for real-time updates
    this.emit('itemStatusChange', event);
  }

  // Emit order status change event
  emitOrderStatusChange(event: OrderStatusChangeEvent) {
    console.log('📡 Emitting order status change event:', event);
    this.emit('orderStatusChange', event);
  }

  // Generic event emitter
  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });
  }

  // Add event listener
  on(eventType: string, listener: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  // Remove event listener
  off(eventType: string, listener: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

// Export singleton instance
export const eventEmitter = EventEmitter.getInstance();

// Export event interfaces for type safety
export type { ItemStatusChangeEvent, OrderStatusChangeEvent };