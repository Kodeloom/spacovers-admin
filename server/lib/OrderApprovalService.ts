import { printQueueService } from './PrintQueueService';
import { poValidationService } from './POValidationService';
import { getEnhancedPrismaClient } from './db';
import type { H3Event } from 'h3';

export interface OrderApprovalResult {
  success: boolean;
  printQueueItemsAdded?: number;
  validationWarnings?: string[];
  error?: string;
}

export interface OrderApprovalService {
  handleOrderApproval(orderId: string, userId?: string, event?: H3Event): Promise<OrderApprovalResult>;
  validateOrderPO(poNumber: string, customerId: string, excludeOrderId?: string, event?: H3Event): Promise<{
    isDuplicate: boolean;
    warningMessage?: string;
    existingOrders?: any[];
  }>;
}

export class OrderApprovalServiceImpl implements OrderApprovalService {
  
  /**
   * Handle order approval workflow including print queue integration
   * This method is called when an order status changes to APPROVED
   * @param orderId - The ID of the order being approved
   * @param userId - Optional user ID who approved the order
   * @param event - Optional H3Event for database context
   * @returns OrderApprovalResult with success status and details
   */
  async handleOrderApproval(orderId: string, userId?: string, event?: H3Event): Promise<OrderApprovalResult> {
    try {
      console.log(`Starting order approval workflow for order ${orderId}`, { userId });

      // Get enhanced Prisma client with proper context
      const prisma = event ? await getEnhancedPrismaClient(event) : null;
      
      if (!prisma) {
        throw new Error('Database context required for order approval');
      }

      // Fetch the order with its items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: {
              id: true,
              itemStatus: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      // Verify order is actually approved
      if (order.orderStatus !== 'APPROVED') {
        return {
          success: false,
          error: 'Order is not in approved status'
        };
      }

      // Get order items that need to be added to print queue
      const orderItemIds = order.items.map((item: any) => item.id);
      
      if (orderItemIds.length === 0) {
        console.log(`No items to add to print queue for order ${orderId}`);
        return {
          success: true,
          printQueueItemsAdded: 0
        };
      }

      // Add items to print queue
      const printQueueItems = await printQueueService.addToQueue(orderItemIds, userId);

      console.log(`Successfully added ${printQueueItems.length} items to print queue for order ${orderId}`, {
        orderItemIds,
        printQueueItemIds: printQueueItems.map(item => item.id)
      });

      return {
        success: true,
        printQueueItemsAdded: printQueueItems.length
      };

    } catch (error) {
      console.error(`Error in order approval workflow for order ${orderId}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during order approval'
      };
    }
  }

  /**
   * Validate PO number for order-level duplicates
   * @param poNumber - The PO number to validate
   * @param customerId - The customer ID to scope validation to
   * @param excludeOrderId - Optional order ID to exclude from validation (for updates)
   * @param event - Optional H3Event for database context
   * @returns Validation result with duplicate status and warnings
   */
  async validateOrderPO(
    poNumber: string, 
    customerId: string, 
    excludeOrderId?: string, 
    event?: H3Event
  ): Promise<{
    isDuplicate: boolean;
    warningMessage?: string;
    existingOrders?: any[];
  }> {
    try {
      // Skip validation if no PO number provided
      if (!poNumber || poNumber.trim() === '') {
        return { isDuplicate: false };
      }

      console.log(`Validating order-level PO number: ${poNumber} for customer ${customerId}`, {
        excludeOrderId
      });

      // Use the PO validation service
      const validationResult = await poValidationService.checkOrderLevelDuplicate(
        poNumber.trim(),
        customerId,
        excludeOrderId
      );

      if (validationResult.isDuplicate) {
        console.log(`Found duplicate PO number at order level: ${poNumber}`, {
          existingOrders: validationResult.existingOrders?.length || 0
        });

        return {
          isDuplicate: true,
          warningMessage: validationResult.warningMessage,
          existingOrders: validationResult.existingOrders
        };
      }

      return { isDuplicate: false };

    } catch (error) {
      console.error(`Error validating order PO number ${poNumber}:`, error);
      
      // Return non-blocking result on validation error
      return {
        isDuplicate: false,
        warningMessage: 'PO validation temporarily unavailable. Please verify manually.'
      };
    }
  }

  /**
   * Check if an order status change should trigger approval workflow
   * @param oldStatus - Previous order status
   * @param newStatus - New order status
   * @returns True if approval workflow should be triggered
   */
  static shouldTriggerApprovalWorkflow(oldStatus: string, newStatus: string): boolean {
    return oldStatus !== 'APPROVED' && newStatus === 'APPROVED';
  }

  /**
   * Get approval workflow summary for logging
   * @param result - OrderApprovalResult from approval workflow
   * @returns Summary string for logging
   */
  static getApprovalSummary(result: OrderApprovalResult): string {
    if (!result.success) {
      return `Approval failed: ${result.error}`;
    }

    const itemsAdded = result.printQueueItemsAdded || 0;
    const warnings = result.validationWarnings?.length || 0;
    
    return `Approval successful: ${itemsAdded} items added to print queue${warnings > 0 ? `, ${warnings} warnings` : ''}`;
  }
}

// Export a default instance for convenience
export const orderApprovalService = new OrderApprovalServiceImpl();