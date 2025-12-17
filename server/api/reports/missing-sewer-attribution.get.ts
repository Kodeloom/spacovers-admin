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
    const itemStatus = query.itemStatus as string;

    // Build where clause for filtering items that skipped sewing
    const whereClause: any = {
      // Only include production items
      isProduct: true,
      // Items that are beyond sewing stage (FOAM_CUTTING, STUFFING, PACKAGING, PRODUCT_FINISHED, READY)
      itemStatus: {
        in: ['FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED', 'READY']
      }
    };

    // Apply item status filter if specified
    if (itemStatus) {
      whereClause.itemStatus = itemStatus;
    }

    // Apply date filters based on order creation date
    if (startDate && endDate) {
      whereClause.order = {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      };
    } else if (startDate) {
      whereClause.order = {
        createdAt: { gte: startDate }
      };
    } else if (endDate) {
      whereClause.order = {
        createdAt: { lte: endDate }
      };
    }

    console.log('🔍 Missing Sewer Attribution Query:', JSON.stringify(whereClause, null, 2));

    // Get all items that are beyond sewing stage
    const potentialMissingItems = await prisma.orderItem.findMany({
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
            createdAt: true,
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

    console.log(`🔍 Found ${potentialMissingItems.length} items beyond sewing stage`);

    // Filter items that don't have any sewing station processing logs
    const missingSewingItems = potentialMissingItems.filter(item => {
      const hasSewerLog = item.itemProcessingLogs.some(log => 
        log.station?.name === 'Sewing'
      );
      
      if (!hasSewerLog) {
        console.log(`📦 Item ${item.productNumber} (${item.itemStatus}) - Missing sewing log`);
      }
      
      return !hasSewerLog;
    });

    console.log(`🚨 Found ${missingSewingItems.length} items missing sewing attribution`);

    // Transform the data for the UI
    const result = missingSewingItems.map(item => {
      const order = item.order;
      const customer = order?.customer;
      const productAttrs = item.productAttributes;
      
      // Determine order number - prefer sales order number, fallback to purchase order number
      const orderNumber = order?.salesOrderNumber || 
                         order?.purchaseOrderNumber || 
                         `Order-${order?.id.slice(-8)}`;

      // Get the latest processing log to see current station
      const latestLog = item.itemProcessingLogs[item.itemProcessingLogs.length - 1];
      
      return {
        orderItemId: item.id,
        productNumber: item.productNumber,
        itemName: item.item?.name || 'Unknown Item',
        itemStatus: item.itemStatus,
        orderNumber,
        orderId: order?.id,
        orderCreatedAt: order?.createdAt,
        customerName: customer?.name || 'Unknown Customer',
        // Product attributes
        productType: productAttrs?.productType || null,
        shape: productAttrs?.shape || null,
        size: productAttrs?.size || null,
        color: productAttrs?.color || null,
        // Current processing info
        currentStation: latestLog?.station?.name || 'Unknown',
        currentUser: latestLog?.user?.name || 'Unknown',
        lastProcessedAt: latestLog?.startTime || null,
        // Processing logs for reference
        processingLogs: item.itemProcessingLogs.map(log => ({
          id: log.id,
          stationName: log.station?.name || 'Unknown',
          userName: log.user?.name || 'Unknown',
          startTime: log.startTime,
          endTime: log.endTime
        }))
      };
    });

    // Sort by order creation date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.orderCreatedAt || 0);
      const dateB = new Date(b.orderCreatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return {
      success: true,
      data: result,
      summary: {
        totalMissingItems: result.length,
        statusBreakdown: result.reduce((acc, item) => {
          acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
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
    logError(error, 'missing_sewer_attribution_report', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while generating missing sewer attribution report',
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