import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }
    // Debug: Let's check for Order #1043 specifically
    console.log('🔍 DEBUG: Looking for Order #1043...');
    
    const order1043 = await prisma.order.findFirst({
      where: {
        salesOrderNumber: '1043'
      },
      select: {
        id: true,
        salesOrderNumber: true,
        priority: true,
        orderStatus: true,
        createdAt: true,
        customer: { select: { name: true } },
        items: {
          select: {
            id: true,
            itemStatus: true,
            isProduct: true,
            productType: true,
            size: true,
            item: { select: { name: true } },
            productAttributes: {
              select: {
                id: true,
                productType: true,
                color: true,
                size: true
              }
            }
          }
        }
      }
    });
    
    console.log('Order #1043 details:', order1043);
    
    if (order1043) {
      console.log('Order items in #1043:', order1043.items);
      
      // Check if any items match our criteria (has ProductAttributes and correct status)
      const matchingItems = order1043.items.filter(item => 
        item.itemStatus === 'NOT_STARTED_PRODUCTION' && item.productAttributes !== null
      );
      console.log('Items that should match our criteria (with ProductAttributes):', matchingItems);
    }
    
    // Check how many items have ProductAttributes
    const itemsWithAttributes = await prisma.orderItem.count({
      where: {
        productAttributes: {
          isNot: null
        }
      }
    });
    console.log(`Total items with ProductAttributes: ${itemsWithAttributes}`);

    // Optimized query for priority items with performance enhancements
    // Requirements: 8.1, 8.3 - Efficient database query with proper indexing
    const priorityItems = await prisma.orderItem.findMany({
      where: {
        // Filter for items across all production stages (from ready to start until finished)
        // This uses the idx_order_items_priority_status_created index
        itemStatus: {
          in: ['NOT_STARTED_PRODUCTION', 'CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING', 'PRODUCT_FINISHED']
        },
        // Only show production items (items that have ProductAttributes)
        productAttributes: {
          isNot: null
        },
        // Ensure the order is not cancelled or archived AND has priority (exclude NO_PRIORITY)
        // This uses the idx_orders_priority_items index
        order: {
          orderStatus: {
            notIn: ['CANCELLED', 'ARCHIVED']
          },
          // Show HIGH, MEDIUM, and LOW priority orders (exclude NO_PRIORITY)
          priority: {
            in: ['HIGH', 'MEDIUM', 'LOW']
          }
        }
      },
      select: {
        // Only select needed fields for better performance
        id: true,
        itemStatus: true,
        createdAt: true,
        // Product attributes for description
        productType: true,
        size: true,
        shape: true,
        radiusSize: true,
        skirtLength: true,
        skirtType: true,
        tieDownsQty: true,
        tieDownPlacement: true,
        distance: true,
        order: {
          select: {
            id: true,
            salesOrderNumber: true,
            priority: true,
            createdAt: true,
            dueDate: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        },
        item: {
          select: {
            name: true
          }
        },
        // Include ProductAttribute relation for additional attributes
        productAttributes: {
          select: {
            color: true,
            productType: true,
            size: true,
            shape: true,
            radiusSize: true,
            skirtLength: true,
            skirtType: true,
            tieDownsQty: true,
            tieDownPlacement: true,
            distance: true
          }
        }
      },
      orderBy: [
        // First group by priority (HIGH, MEDIUM, LOW)
        { order: { priority: 'desc' } }, // DESC gives us HIGH, MEDIUM, LOW order
        // Then sort by order creation date (oldest first) within each priority group
        { order: { createdAt: 'asc' } },
        // Finally by item creation date
        { createdAt: 'asc' }
      ],
      // Limit results for performance - increased slightly for better UX
      take: 75
    });

    console.log(`🎯 Final query returned ${priorityItems.length} priority items`);
    if (priorityItems.length > 0) {
      console.log('Sample priority item:', {
        id: priorityItems[0].id,
        itemStatus: priorityItems[0].itemStatus,
        isProduct: priorityItems[0].isProduct,
        orderPriority: priorityItems[0].order.priority,
        orderStatus: priorityItems[0].order.orderStatus
      });
    }
    
    // If no results, let's try a less restrictive query to see what's available
    if (priorityItems.length === 0) {
      console.log('🔍 No results found, trying less restrictive queries...');
      
      // Try without the order status filter
      const withoutOrderStatusFilter = await prisma.orderItem.count({
        where: {
          itemStatus: {
            in: ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING']
          },
          productAttributes: {
            isNot: null
          },
          order: {
            priority: {
              in: ['HIGH', 'MEDIUM', 'LOW']
            }
          }
        }
      });
      console.log(`Without order status filter: ${withoutOrderStatusFilter} items`);
      
      // Try without the ProductAttributes filter
      const withoutProductAttributesFilter = await prisma.orderItem.count({
        where: {
          itemStatus: {
            in: ['CUTTING', 'SEWING', 'FOAM_CUTTING', 'STUFFING', 'PACKAGING']
          },
          order: {
            orderStatus: {
              notIn: ['CANCELLED', 'ARCHIVED']
            },
            priority: {
              in: ['HIGH', 'MEDIUM', 'LOW']
            }
          }
        }
      });
      console.log(`Without ProductAttributes filter: ${withoutProductAttributesFilter} items`);
      
      // Try with all priorities
      const allPriorities = await prisma.orderItem.count({
        where: {
          order: {
            priority: {
              in: ['HIGH', 'MEDIUM', 'LOW']
            }
          }
        }
      });
      console.log(`All priority orders (HIGH, MEDIUM, LOW): ${allPriorities} items`);
    }

    // Helper function to create attribute description
    const createAttributeDescription = (item: any) => {
      const attributes = [];
      
      // Use ProductAttribute data if available, otherwise fall back to OrderItem fields
      const attrs = item.productAttributes || item;
      
      // Product Type
      if (attrs.productType) {
        attributes.push(attrs.productType === 'SPA_COVER' ? 'Spa Cover' : attrs.productType);
      }
      
      // Color (only available in ProductAttribute)
      if (item.productAttributes?.color) {
        attributes.push(item.productAttributes.color);
      }
      
      // Size
      if (attrs.size) {
        attributes.push(`Size: ${attrs.size}`);
      }
      
      // Shape
      if (attrs.shape) {
        attributes.push(`Shape: ${attrs.shape}`);
      }
      
      // Radius Size
      if (attrs.radiusSize) {
        attributes.push(`Radius: ${attrs.radiusSize}`);
      }
      
      // Skirt Length
      if (attrs.skirtLength) {
        attributes.push(`Skirt Length: ${attrs.skirtLength}`);
      }
      
      // Skirt Type
      if (attrs.skirtType) {
        const skirtTypeDisplay = attrs.skirtType === 'CONN' ? 'Connected' : 
                                attrs.skirtType === 'SLIT' ? 'Slit' : attrs.skirtType;
        attributes.push(`Skirt Type: ${skirtTypeDisplay}`);
      }
      
      // Tie Downs Quantity
      if (attrs.tieDownsQty && attrs.tieDownsQty !== '0') {
        attributes.push(`Tie Downs: ${attrs.tieDownsQty}`);
      }
      
      // Tie Down Placement
      if (attrs.tieDownPlacement) {
        const placementDisplay = attrs.tieDownPlacement === 'HANDLE_SIDE' ? 'Handle Side' :
                                attrs.tieDownPlacement === 'CORNER_SIDE' ? 'Corner Side' :
                                attrs.tieDownPlacement === 'FOLD_SIDE' ? 'Fold Side' : attrs.tieDownPlacement;
        attributes.push(`Placement: ${placementDisplay}`);
      }
      
      // Distance
      if (attrs.distance && attrs.distance !== '0') {
        attributes.push(`Distance: ${attrs.distance}`);
      }
      
      return attributes.length > 0 ? attributes.join(', ') : 'No attributes specified';
    };

    // Format the response data
    const formattedItems = priorityItems.map(item => ({
      id: item.id,
      orderNumber: item.order.salesOrderNumber || item.order.id.slice(-8),
      itemName: createAttributeDescription(item), // Use attribute description instead of item name
      customerName: item.order.customer?.name || 'Unknown Customer',
      status: item.itemStatus, // Show actual status (NOT_STARTED_PRODUCTION, CUTTING, SEWING, FOAM_CUTTING, STUFFING, PACKAGING, PRODUCT_FINISHED)
      priority: item.order.priority, // Include priority for grouping
      isUrgent: item.order.priority === 'HIGH', // Only HIGH priority items are urgent
      createdAt: item.createdAt.toISOString(),
      orderCreatedAt: item.order.createdAt.toISOString(),
      estimatedDueDate: item.order.dueDate?.toISOString() || null
    }));

    return {
      success: true,
      data: formattedItems,
      meta: {
        totalCount: formattedItems.length,
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Priority items API error:', error);
    
    return {
      success: false,
      error: 'Failed to fetch priority items',
      data: [],
      meta: {
        totalCount: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
});