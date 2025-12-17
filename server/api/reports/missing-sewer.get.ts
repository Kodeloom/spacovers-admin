import { auth } from '~/server/lib/auth';
import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { validateReportRequest } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

export default defineEventHandler(async (event) => {
  let sessionData: any = null;
  
  try {
    const query = getQuery(event);

    // Get the current user session
    sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Validate request parameters
    const validation = validateReportRequest(query);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request parameters: ${errorMessages}`,
        data: {
          errors: validation.errors,
          suggestions: [
            'Check parameter formats and try again',
            'Ensure date range is valid',
            'Verify all IDs are in correct format'
          ]
        }
      });
    }

    const { startDate, endDate } = validation.validatedParams;

    // Find items that have progressed beyond SEWING but never had a sewing station scan
    // These are items in: FOAM_CUTTING, STUFFING, PACKAGING, PRODUCT_FINISHED, READY
    const advancedStatuses = [
      'FOAM_CUTTING',
      'STUFFING', 
      'PACKAGING',
      'PRODUCT_FINISHED',
      'READY'
    ];

    // Get all order items in advanced statuses
    let whereClause: any = {
      itemStatus: {
        in: advancedStatuses
      },
      isProduct: true // Only production items
    };

    // Apply date filters based on when the item was last updated (moved to advanced status)
    if (startDate && endDate) {
      whereClause.updatedAt = {
        gte: startDate,
        lte: endDate
      };
    } else if (startDate) {
      whereClause.updatedAt = { gte: startDate };
    } else if (endDate) {
      whereClause.updatedAt = { lte: endDate };
    }

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        item: true,
        productAttributes: {
          select: {
            productType: true,
            shape: true,
            size: true,
            color: true
          }
        },
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            purchaseOrderNumber: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        },
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

    console.log(`🔍 Found ${orderItems.length} items in advanced statuses`);

    // Filter items that never had a sewing station scan
    const missingSewingItems = orderItems.filter(item => {
      const hasSewerScan = item.itemProcessingLogs.some(log => 
        log.station?.name === 'Sewing'
      );
      
      if (!hasSewerScan) {
        console.log(`📦 Item ${item.productNumber} (${item.itemStatus}) missing sewing scan`);
      }
      
      return !hasSewerScan;
    });

    console.log(`🚨 Found ${missingSewingItems.length} items missing sewing attribution`);

    // Transform data for the UI
    const result = missingSewingItems.map(item => {
      const order = item.order;
      const customer = order?.customer;
      const productAttrs = item.productAttributes;
      
      // Determine order number - prefer sales order number, fallback to purchase order number
      const orderNumber = order?.salesOrderNumber || 
                         order?.purchaseOrderNumber || 
                         `Order-${order?.id.slice(-8)}`;

      // Get the progression of stations this item went through
      const stationProgression = item.itemProcessingLogs
        .map(log => log.station?.name)
        .filter(name => name && name !== 'Office')
        .join(' → ');

      return {
        orderItemId: item.id,
        productNumber: item.productNumber,
        itemName: item.item?.name || 'Unknown Item',
        itemStatus: item.itemStatus,
        orderNumber,
        orderId: order?.id,
        customerName: customer?.name || 'Unknown Customer',
        // Product attributes
        productType: productAttrs?.productType || null,
        shape: productAttrs?.shape || null,
        size: productAttrs?.size || null,
        color: productAttrs?.color || null,
        // Workflow info
        stationProgression,
        lastUpdated: item.updatedAt,
        // Processing logs for reference
        processingLogs: item.itemProcessingLogs.map(log => ({
          id: log.id,
          stationName: log.station?.name,
          userName: log.user?.name,
          startTime: log.startTime,
          endTime: log.endTime
        }))
      };
    });

    // Sort by most recently updated first
    result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    return {
      success: true,
      data: result,
      summary: {
        totalMissingItems: result.length,
        statusBreakdown: advancedStatuses.reduce((acc, status) => {
          acc[status] = result.filter(item => item.itemStatus === status).length;
          return acc;
        }, {} as Record<string, number>)
      },
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      }
    };

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'missing_sewer_report_generation', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'Report generation timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Try again during off-peak hours'
          ]
        }
      });
    }

    if (error.code?.startsWith('P20')) {
      // Prisma database errors
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error occurred while generating missing sewer report',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Contact support if the problem persists'
          ]
        }
      });
    }
    
    // Generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while generating missing sewer report',
      data: {
        retryable: true,
        suggestions: [
          'Try again with a smaller date range',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
      }
    });
  }
});