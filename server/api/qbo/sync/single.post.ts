import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import { recordAuditLog } from '~/server/utils/auditLog';
import { z } from 'zod';
import { CustomerType, type CustomerStatus, type ItemStatus } from '@prisma-app/client';
import { QBO_API_CONFIG } from '~/server/lib/qbo-client';
import type { H3Event } from 'h3';

const SyncInputSchema = z.object({
    resourceType: z.enum(['Estimate', 'Invoice', 'Customer', 'Item', 'EstimateWithInvoices']),
    resourceId: z.string(),
});

interface QboRef { value: string; name: string; }
interface QboEstimate { 
    Id: string; 
    CustomerRef: QboRef; 
    DocNumber?: string; 
    TxnDate?: string; 
    ExpirationDate?: string; 
    TotalAmt?: number;
    Line?: QboLineItem[]; // Added for line items
}

interface QboLineItem {
    Id: string;
    Amount: number;
    DetailType: string;
    Description?: string;
    SalesItemLineDetail?: {
        ItemRef: { value: string; name: string; };
        Qty?: number;
        UnitPrice?: number;
        TaxCodeRef?: { value: string; };
        MarkupInfo?: { Value: number; }; // Added for fallback
    };
    DescriptionLineDetail?: {
        Amount: number;
        Description?: string;
    };
}

interface QboInvoice { 
    Id: string; 
    CustomerRef: QboRef; 
    DocNumber?: string; 
    TxnDate?: string; 
    DueDate?: string; 
    BillEmail?: { Address: string; }; 
    TotalAmt?: number; 
    LinkedTxn?: { TxnId: string; TxnType: string; }[];
    Line?: QboLineItem[];
}
interface QboCustomer { Id: string; DisplayName: string; PrimaryEmailAddr?: { Address: string }; PrimaryPhone?: { FreeFormNumber: string }; ShipAddr?: { Line1?: string; Line2?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string; Country?: string; }; Active: boolean; CustomerTypeRef?: { name: string; }; }
interface QboItem { Id: string; Name: string; Description?: string; UnitPrice?: number; Active: boolean; }

/**
 * Processes line items from a QBO invoice and creates/updates OrderItems
 */
async function processInvoiceLineItems(qboInvoice: QboInvoice, orderId: string, event: H3Event) {
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`🔍 Processing line items for single invoice sync: ${qboInvoice.Id}`);
    console.log(`📦 Invoice Line property:`, qboInvoice.Line);
    console.log(`📦 Invoice Line length:`, qboInvoice.Line?.length);
    
    if (!qboInvoice.Line || qboInvoice.Line.length === 0) {
        console.log(`⚠️ No line items found for invoice ${qboInvoice.Id}`);
        return;
    }
    
    console.log(`✅ Found ${qboInvoice.Line.length} line items to process`);
    
    for (const line of qboInvoice.Line) {
        console.log(`🔍 Processing line item:`, {
            Id: line.Id,
            DetailType: line.DetailType,
            Description: line.Description,
            Amount: line.Amount
        });
        
        if (line.DetailType === 'SalesItemLineDetail' && line.SalesItemLineDetail) {
            const detail = line.SalesItemLineDetail;
            console.log(`📦 SalesItemLineDetail:`, detail);
            
            // Extract quantity and price with fallbacks for different QBO structures
            let quantity = detail.Qty;
            let pricePerItem = detail.UnitPrice;
            
            // Handle cases where Qty/UnitPrice might be missing (e.g., MarkupInfo structure)
            if (quantity === undefined || pricePerItem === undefined) {
                console.warn(`⚠️ Missing Qty or UnitPrice for line item ${line.Id}. Using fallback values.`);
                
                // If we have Amount but no Qty/UnitPrice, try to calculate or use defaults
                if (line.Amount && line.Amount > 0) {
                    // Try to extract from MarkupInfo if available
                    if (detail.MarkupInfo) {
                        console.log(`📊 Using MarkupInfo for pricing:`, detail.MarkupInfo);
                        pricePerItem = detail.MarkupInfo.Value || line.Amount;
                        quantity = 1; // Default to 1 if we can't determine quantity
                    } else {
                        // Use Amount as price and default quantity to 1
                        pricePerItem = line.Amount;
                        quantity = 1;
                    }
                } else {
                    // Last resort fallbacks
                    quantity = 1;
                    pricePerItem = 0;
                }
                
                console.log(`🔄 Fallback values - Quantity: ${quantity}, Price: ${pricePerItem}`);
            }
            
            // Ensure we have valid values
            if (quantity === undefined || quantity === null || quantity <= 0) {
                console.warn(`⚠️ Invalid quantity (${quantity}) for line item ${line.Id}. Setting to 1.`);
                quantity = 1;
            }
            
            if (pricePerItem === undefined || pricePerItem === null || pricePerItem < 0) {
                console.warn(`⚠️ Invalid price (${pricePerItem}) for line item ${line.Id}. Setting to 0.`);
                pricePerItem = 0;
            }
            
            // Try to find the item in our local database
            let localItem = await prisma.item.findUnique({
                where: { quickbooksItemId: detail.ItemRef.value }
            });
            
            // If item doesn't exist, create a placeholder or skip
            if (!localItem) {
                console.warn(`⚠️ Item ${detail.ItemRef.name} (QBO ID: ${detail.ItemRef.value}) not found in local DB. Creating placeholder.`);
                
                // Create a placeholder item
                localItem = await prisma.item.create({
                    data: {
                        quickbooksItemId: detail.ItemRef.value,
                        name: detail.ItemRef.name || `QBO Item ${detail.ItemRef.value}`,
                        status: 'ACTIVE',
                        category: 'QBO Imported'
                    }
                });
                console.log(`✅ Created placeholder item:`, localItem.id);
            }
            
            // Create or update the order item
            const orderItemData = {
                orderId: orderId,
                itemId: localItem.id,
                quickbooksOrderLineId: line.Id,
                quantity: quantity,
                pricePerItem: pricePerItem,
                lineDescription: line.Description,
                notes: line.Description
            };
            
            console.log(`📝 Creating/updating OrderItem:`, orderItemData);
            
            // Use upsert with compound unique constraint (orderId + quickbooksOrderLineId)
            // This ensures OrderItems are properly scoped to their specific order
            const orderItem = await prisma.orderItem.upsert({
                where: { 
                    orderId_quickbooksOrderLineId: {
                        orderId: orderId,
                        quickbooksOrderLineId: line.Id
                    }
                },
                update: {
                    quantity: quantity,
                    pricePerItem: pricePerItem,
                    lineDescription: line.Description,
                    notes: line.Description
                },
                create: {
                    orderId: orderId,
                    itemId: localItem.id,
                    quickbooksOrderLineId: line.Id,
                    quantity: quantity,
                    pricePerItem: pricePerItem,
                    lineDescription: line.Description,
                    notes: line.Description
                }
            });
            
            console.log(`✅ OrderItem processed: ${detail.ItemRef.name} x${quantity} @ $${pricePerItem} (ID: ${orderItem.id})`);
        } else if (line.DetailType === 'DescriptionLineDetail' && line.DescriptionLineDetail) {
            // Handle description-only lines (e.g., shipping, discounts)
            console.log(`ℹ️ Skipping description-only line: ${line.DescriptionLineDetail.Description}`);
        } else {
            console.log(`⚠️ Skipping unsupported line type: ${line.DetailType}`);
            console.log(`🔍 Line item structure:`, JSON.stringify(line, null, 2));
        }
    }
}

/**
 * Processes line items from a QBO estimate and creates/updates EstimateItems
 */
async function processEstimateLineItems(qboEstimate: QboEstimate, estimateId: string, event: H3Event) {
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`🔍 Processing line items for single estimate sync: ${qboEstimate.Id}`);
    console.log(`📦 Estimate Line property:`, qboEstimate.Line);
    console.log(`📦 Estimate Line length:`, qboEstimate.Line?.length);
    
    if (!qboEstimate.Line || qboEstimate.Line.length === 0) {
        console.log(`⚠️ No line items found for estimate ${qboEstimate.Id}`);
        return;
    }
    
    console.log(`✅ Found ${qboEstimate.Line.length} line items to process`);
    
    for (const line of qboEstimate.Line) {
        console.log(`🔍 Processing line item:`, {
            Id: line.Id,
            DetailType: line.DetailType,
            Description: line.Description,
            Amount: line.Amount
        });
        
        if (line.DetailType === 'SalesItemLineDetail' && line.SalesItemLineDetail) {
            const detail = line.SalesItemLineDetail;
            console.log(`📦 SalesItemLineDetail:`, detail);
            
            // Extract quantity and price with fallbacks for different QBO structures
            let quantity = detail.Qty;
            let pricePerItem = detail.UnitPrice;
            
            // Handle cases where Qty/UnitPrice might be missing (e.g., MarkupInfo structure)
            if (quantity === undefined || pricePerItem === undefined) {
                console.warn(`⚠️ Missing Qty or UnitPrice for line item ${line.Id}. Using fallback values.`);
                
                // If we have Amount but no Qty/UnitPrice, try to calculate or use defaults
                if (line.Amount && line.Amount > 0) {
                    // Try to extract from MarkupInfo if available
                    if (detail.MarkupInfo) {
                        console.log(`📊 Using MarkupInfo for pricing:`, detail.MarkupInfo);
                        pricePerItem = detail.MarkupInfo.Value || line.Amount;
                        quantity = 1; // Default to 1 if we can't determine quantity
                    } else {
                        // Use Amount as price and default quantity to 1
                        pricePerItem = line.Amount;
                        quantity = 1;
                    }
                } else {
                    // Last resort fallbacks
                    quantity = 1;
                    pricePerItem = 0;
                }
                
                console.log(`🔄 Fallback values - Quantity: ${quantity}, Price: ${pricePerItem}`);
            }
            
            // Ensure we have valid values
            if (quantity === undefined || quantity === null || quantity <= 0) {
                console.warn(`⚠️ Invalid quantity (${quantity}) for line item ${line.Id}. Setting to 1.`);
                quantity = 1;
            }
            
            if (pricePerItem === undefined || pricePerItem === null || pricePerItem < 0) {
                console.warn(`⚠️ Invalid price (${pricePerItem}) for line item ${line.Id}. Setting to 0.`);
                pricePerItem = 0;
            }
            
            // Try to find the item in our local database
            let localItem = await prisma.item.findUnique({
                where: { quickbooksItemId: detail.ItemRef.value }
            });
            
            // If item doesn't exist, create a placeholder or skip
            if (!localItem) {
                console.warn(`⚠️ Item ${detail.ItemRef.name} (QBO ID: ${detail.ItemRef.value}) not found in local DB. Creating placeholder.`);
                
                // Create a placeholder item
                localItem = await prisma.item.create({
                    data: {
                        quickbooksItemId: detail.ItemRef.value,
                        name: detail.ItemRef.name || `QBO Item ${detail.ItemRef.value}`,
                        status: 'ACTIVE',
                        category: 'QBO Imported'
                    }
                });
                console.log(`✅ Created placeholder item:`, localItem.id);
            }
            
            // Create or update the estimate item
            const estimateItemData = {
                estimateId: estimateId,
                itemId: localItem.id,
                quickbooksEstimateLineId: line.Id,
                quantity: quantity,
                pricePerItem: pricePerItem,
                lineDescription: line.Description
            };
            
            console.log(`📝 Creating/updating EstimateItem:`, estimateItemData);
            
            const estimateItem = await prisma.estimateItem.upsert({
                where: { quickbooksEstimateLineId: line.Id },
                update: estimateItemData,
                create: estimateItemData
            });
            
            console.log(`✅ EstimateItem processed: ${detail.ItemRef.name} x${quantity} @ $${pricePerItem} (ID: ${estimateItem.id})`);
        } else if (line.DetailType === 'DescriptionLineDetail' && line.DescriptionLineDetail) {
            // Handle description-only lines (e.g., shipping, discounts)
            console.log(`ℹ️ Skipping description-only line: ${line.DescriptionLineDetail.Description}`);
        } else {
            console.log(`⚠️ Skipping unsupported line type: ${line.DetailType}`);
            console.log(`🔍 Line item structure:`, JSON.stringify(line, null, 2));
        }
    }
}

export default defineEventHandler(async (event) => {
    const result = await readValidatedBody(event, body => SyncInputSchema.safeParse(body));
    if (!result.success) throw createError({ statusCode: 400, data: result.error.flatten() });

    const { resourceType, resourceId } = result.data;

    try {
        const { oauthClient, token } = await getQboClient(event);
        const prisma = await getEnhancedPrismaClient(event);
        const companyId = token.realmId;
        if (!companyId) throw createError({ statusCode: 400, statusMessage: 'QuickBooks Realm ID not found.' });

        const companyInfoUrl = oauthClient.environment === 'sandbox' 
            ? 'https://sandbox-quickbooks.api.intuit.com' 
            : 'https://quickbooks.api.intuit.com';
        if (resourceType === 'EstimateWithInvoices') {
            // First sync the estimate
            const apiVersion = QBO_API_CONFIG.VERSION;
            const estimateUrl = `${companyInfoUrl}/${apiVersion}/company/${companyId}/estimate/${resourceId}`;
            console.log(`🔍 Using QBO API version: ${apiVersion}`);
            console.log(`🔍 Fetching estimate from: ${estimateUrl}`);
            
            const { Estimate: qboEstimate } = await $fetch<{ Estimate: QboEstimate }>(estimateUrl, {
                headers: { 
                    'Accept': 'application/json', 
                    'Authorization': `Bearer ${token.access_token}`,
                    'User-Agent': QBO_API_CONFIG.USER_AGENT
                }
            });

            console.log(`🔍 QBO Estimate Response:`, JSON.stringify(qboEstimate, null, 2));
            console.log(`📦 Estimate Line items:`, qboEstimate.Line);
            console.log(`📦 Estimate Line count:`, qboEstimate.Line?.length || 0);

            const customer = await prisma.customer.findUnique({ where: { quickbooksCustomerId: qboEstimate.CustomerRef.value } });
            if (!customer) throw createError({ statusCode: 404, statusMessage: `Customer not found for Estimate ${resourceId}`});

            const estimateData = {
                customerId: customer.id,
                estimateNumber: qboEstimate.DocNumber,
                transactionDate: qboEstimate.TxnDate ? new Date(qboEstimate.TxnDate) : undefined,
                expirationDate: qboEstimate.ExpirationDate ? new Date(qboEstimate.ExpirationDate) : undefined,
                totalAmount: qboEstimate.TotalAmt || 0,
            };
            const existingEstimate = await unenhancedPrisma.estimate.findUnique({ where: { quickbooksEstimateId: resourceId } });
            const estimate = await prisma.estimate.upsert({
                where: { quickbooksEstimateId: resourceId },
                update: estimateData,
                create: { ...estimateData, quickbooksEstimateId: resourceId },
            });
            await recordAuditLog(event, { action: existingEstimate ? 'QBO_ESTIMATE_SYNC_UPDATE' : 'QBO_ESTIMATE_SYNC_CREATE', entityName: 'Estimate', entityId: estimate.id, oldValue: existingEstimate, newValue: estimate }, null);
            
            // Process line items for the estimate
            await processEstimateLineItems(qboEstimate, estimate.id, event);
            
            // Now try to find and sync related invoices
            try {
                const invoiceQueryUrl = `${companyInfoUrl}/${apiVersion}/company/${companyId}/query?query=${encodeURIComponent(`SELECT Id, DocNumber, CustomerRef, TxnDate, DueDate, TotalAmt, BillEmail, Line, LinkedTxn FROM Invoice WHERE LinkedTxn.TxnType = 'Estimate' AND LinkedTxn.TxnId = '${resourceId}'`)}`;
                console.log(`🔍 Looking for related invoices: ${invoiceQueryUrl}`);
                
                const invoiceResponse = await $fetch<{ QueryResponse: { Invoice?: QboInvoice[] } }>(invoiceQueryUrl, {
                    headers: { 
                        'Accept': 'application/json', 
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': QBO_API_CONFIG.USER_AGENT
                    }
                });
                
                const relatedInvoices = invoiceResponse.QueryResponse.Invoice || [];
                console.log(`🔍 Found ${relatedInvoices.length} related invoices`);
                
                for (const qboInvoice of relatedInvoices) {
                    console.log(`🔍 Processing related invoice: ${qboInvoice.DocNumber}`);
                    
                    const orderData = {
                        customerId: customer.id,
                        estimateId: estimate.id,
                        salesOrderNumber: qboInvoice.DocNumber,
                        transactionDate: qboInvoice.TxnDate ? new Date(qboInvoice.TxnDate) : undefined,
                        dueDate: qboInvoice.DueDate ? new Date(qboInvoice.DueDate) : undefined,
                        totalAmount: qboInvoice.TotalAmt || 0,
                        contactEmail: qboInvoice.BillEmail?.Address || '',
                    };
                    
                    const existingOrder = await unenhancedPrisma.order.findUnique({ where: { quickbooksOrderId: qboInvoice.Id } });
                    const order = await prisma.order.upsert({
                        where: { quickbooksOrderId: qboInvoice.Id },
                        update: orderData,
                        create: { ...orderData, quickbooksOrderId: qboInvoice.Id },
                    });
                    
                    await recordAuditLog(event, { action: existingOrder ? 'QBO_ORDER_SYNC_UPDATE' : 'QBO_ORDER_SYNC_CREATE', entityName: 'Order', entityId: order.id, oldValue: existingOrder, newValue: order }, null);
                    
                    // Process line items for the order
                    await processInvoiceLineItems(qboInvoice, order.id, event);
                }
                
                console.log(`✅ Successfully synced estimate and ${relatedInvoices.length} related invoices`);
            } catch (invoiceError) {
                console.error(`⚠️ Failed to sync related invoices:`, invoiceError);
                // Don't fail the entire sync if invoice sync fails
            }
            
            return { success: true, synced: estimate, message: 'Estimate and related invoices have been updated from QuickBooks.' };
        }

        if (resourceType === 'Estimate') {
            const apiVersion = QBO_API_CONFIG.VERSION;
            const url = `${companyInfoUrl}/${apiVersion}/company/${companyId}/estimate/${resourceId}`;
            console.log(`🔍 Using QBO API version: ${apiVersion}`);
            console.log(`🔍 Fetching estimate from: ${url}`);
            
            const { Estimate: qboEstimate } = await $fetch<{ Estimate: QboEstimate }>(url, {
                headers: { 
                    'Accept': 'application/json', 
                    'Authorization': `Bearer ${token.access_token}`,
                    'User-Agent': QBO_API_CONFIG.USER_AGENT
                }
            });

            console.log(`🔍 QBO Estimate Response:`, JSON.stringify(qboEstimate, null, 2));
            console.log(`📦 Estimate Line items:`, qboEstimate.Line);
            console.log(`📦 Estimate Line count:`, qboEstimate.Line?.length || 0);

            const customer = await prisma.customer.findUnique({ where: { quickbooksCustomerId: qboEstimate.CustomerRef.value } });
            if (!customer) throw createError({ statusCode: 404, statusMessage: `Customer not found for Estimate ${resourceId}`});

            const estimateData = {
                customerId: customer.id,
                estimateNumber: qboEstimate.DocNumber,
                transactionDate: qboEstimate.TxnDate ? new Date(qboEstimate.TxnDate) : undefined,
                expirationDate: qboEstimate.ExpirationDate ? new Date(qboEstimate.ExpirationDate) : undefined,
                totalAmount: qboEstimate.TotalAmt || 0,
            };
            const existingEstimate = await unenhancedPrisma.estimate.findUnique({ where: { quickbooksEstimateId: resourceId } });
            const estimate = await prisma.estimate.upsert({
                where: { quickbooksEstimateId: resourceId },
                update: estimateData,
                create: { ...estimateData, quickbooksEstimateId: resourceId },
            });
            await recordAuditLog(event, { action: existingEstimate ? 'QBO_ESTIMATE_SYNC_UPDATE' : 'QBO_ESTIMATE_SYNC_CREATE', entityName: 'Estimate', entityId: estimate.id, oldValue: existingEstimate, newValue: estimate }, null);
            
            // Process line items for the estimate
            await processEstimateLineItems(qboEstimate, estimate.id, event);
            
            return { success: true, synced: estimate };
        }

        if (resourceType === 'Invoice') {
            const apiVersion = QBO_API_CONFIG.VERSION;
            
            // Try to fetch invoice with line items using a comprehensive query
            let qboInvoice: QboInvoice | null = null;
            let lineItemsFound = false;
            
            // First try the direct endpoint
            try {
                const directUrl = `${companyInfoUrl}/${apiVersion}/company/${companyId}/invoice/${resourceId}`;
                console.log(`🔍 Using QBO API version: ${apiVersion}`);
                console.log(`🔍 Trying direct invoice fetch from: ${directUrl}`);
                
                const directResponse = await $fetch<{ Invoice: QboInvoice }>(directUrl, {
                    headers: { 
                        'Accept': 'application/json', 
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': QBO_API_CONFIG.USER_AGENT
                    }
                });
                
                qboInvoice = directResponse.Invoice;
                console.log(`🔍 Direct QBO Invoice Response:`, JSON.stringify(qboInvoice, null, 2));
                console.log(`📦 Direct Invoice Line items:`, qboInvoice.Line);
                console.log(`📦 Direct Invoice Line count:`, qboInvoice.Line?.length || 0);
                
                if (qboInvoice.Line && qboInvoice.Line.length > 0) {
                    lineItemsFound = true;
                    console.log(`✅ Direct fetch returned ${qboInvoice.Line.length} line items`);
                } else {
                    console.log(`⚠️ Direct fetch returned no line items, trying query approach...`);
                }
            } catch (directError) {
                console.error(`❌ Direct fetch failed:`, directError);
            }
            
            // If direct fetch didn't return line items, try query approach
            if (!lineItemsFound) {
                try {
                    const queryUrl = `${companyInfoUrl}/${apiVersion}/company/${companyId}/query?query=${encodeURIComponent(`SELECT *, Line.* FROM Invoice WHERE Id = '${resourceId}'`)}`;
                    console.log(`🔍 Trying query approach: ${queryUrl}`);
                    
                    const queryResponse = await $fetch<{ QueryResponse: { Invoice?: QboInvoice[] } }>(queryUrl, {
                        headers: { 
                            'Accept': 'application/json', 
                            'Authorization': `Bearer ${token.access_token}`,
                            'User-Agent': QBO_API_CONFIG.USER_AGENT
                        }
                    });
                    
                    const queryInvoice = queryResponse.QueryResponse.Invoice?.[0];
                    if (queryInvoice && queryInvoice.Line && queryInvoice.Line.length > 0) {
                        qboInvoice = queryInvoice;
                        lineItemsFound = true;
                        console.log(`✅ Query approach returned ${queryInvoice.Line.length} line items`);
                        console.log(`🔍 Query Invoice Line items:`, queryInvoice.Line);
                    } else {
                        console.log(`⚠️ Query approach also returned no line items`);
                    }
                } catch (queryError) {
                    console.error(`❌ Query approach failed:`, queryError);
                }
            }
            
            // If we still don't have line items, try one more approach
            if (!lineItemsFound) {
                try {
                    const altQueryUrl = `${companyInfoUrl}/${apiVersion}/company/${companyId}/query?query=${encodeURIComponent(`SELECT Id, DocNumber, CustomerRef, TxnDate, DueDate, TotalAmt, BillEmail, Line FROM Invoice WHERE Id = '${resourceId}'`)}`;
                    console.log(`🔍 Trying alternative query: ${altQueryUrl}`);
                    
                    const altQueryResponse = await $fetch<{ QueryResponse: { Invoice?: QboInvoice[] } }>(altQueryUrl, {
                        headers: { 
                            'Accept': 'application/json', 
                            'Authorization': `Bearer ${token.access_token}`,
                            'User-Agent': QBO_API_CONFIG.USER_AGENT
                        }
                    });
                    
                    const altQueryInvoice = altQueryResponse.QueryResponse.Invoice?.[0];
                    if (altQueryInvoice && altQueryInvoice.Line && altQueryInvoice.Line.length > 0) {
                        qboInvoice = altQueryInvoice;
                        lineItemsFound = true;
                        console.log(`✅ Alternative query returned ${altQueryInvoice.Line.length} line items`);
                        console.log(`🔍 Alternative Query Invoice Line items:`, altQueryInvoice.Line);
                    } else {
                        console.log(`⚠️ Alternative query also returned no line items`);
                    }
                } catch (altQueryError) {
                    console.error(`❌ Alternative query failed:`, altQueryError);
                }
            }
            
            if (!qboInvoice) {
                throw createError({ statusCode: 404, statusMessage: `Invoice ${resourceId} not found in QBO` });
            }
            
            console.log(`🔍 Final QBO Invoice for processing:`, JSON.stringify(qboInvoice, null, 2));
            console.log(`📦 Final Invoice Line items:`, qboInvoice.Line);
            console.log(`📦 Final Invoice Line count:`, qboInvoice.Line?.length || 0);

            const customer = await prisma.customer.findUnique({ where: { quickbooksCustomerId: qboInvoice.CustomerRef.value } });
            if (!customer || !qboInvoice.BillEmail?.Address) throw createError({ statusCode: 404, statusMessage: `Customer not found for Invoice ${resourceId}`});

            let linkedEstimateId: string | undefined;
            const linkedEstimateTxn = qboInvoice.LinkedTxn?.find(t => t.TxnType === 'Estimate');
            if(linkedEstimateTxn) {
                const foundEstimate = await prisma.estimate.findUnique({ where: { quickbooksEstimateId: linkedEstimateTxn.TxnId } });
                linkedEstimateId = foundEstimate?.id;
            }

            const orderData = {
                customerId: customer.id,
                estimateId: linkedEstimateId,
                salesOrderNumber: qboInvoice.DocNumber,
                transactionDate: qboInvoice.TxnDate ? new Date(qboInvoice.TxnDate) : undefined,
                dueDate: qboInvoice.DueDate ? new Date(qboInvoice.DueDate) : undefined,
                totalAmount: qboInvoice.TotalAmt || 0,
                contactEmail: qboInvoice.BillEmail.Address,
            };
            const existingOrder = await unenhancedPrisma.order.findUnique({ where: { quickbooksOrderId: resourceId } });
            const order = await prisma.order.upsert({
                where: { quickbooksOrderId: resourceId },
                update: orderData,
                create: { ...orderData, quickbooksOrderId: resourceId },
            });
            await recordAuditLog(event, { action: existingOrder ? 'QBO_ORDER_SYNC_UPDATE' : 'QBO_ORDER_SYNC_CREATE', entityName: 'Order', entityId: order.id, oldValue: existingOrder, newValue: order }, null);
            
            // Process line items for the order
            await processInvoiceLineItems(qboInvoice, order.id, event);
            
            return { success: true, synced: order };
        }

        if (resourceType === 'Customer') {
            const url = `${companyInfoUrl}/v3/company/${companyId}/customer/${resourceId}?minorversion=65`;
            const { Customer: qboCustomer } = await $fetch<{ Customer: QboCustomer }>(url, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

            let customerType: CustomerType = CustomerType.RETAILER;
            const customerTypeName = qboCustomer.CustomerTypeRef?.name;
            if (customerTypeName?.toLowerCase().includes('wholesale')) customerType = CustomerType.WHOLESALER;

            const customerData = {
                name: qboCustomer.DisplayName,
                email: qboCustomer.PrimaryEmailAddr?.Address,
                contactNumber: qboCustomer.PrimaryPhone?.FreeFormNumber,
                status: (qboCustomer.Active ? 'ACTIVE' : 'INACTIVE') as CustomerStatus,
                type: customerType,
            };

            const existingCustomer = await unenhancedPrisma.customer.findUnique({ where: { quickbooksCustomerId: resourceId }});
            const customer = await prisma.customer.upsert({
                where: { quickbooksCustomerId: resourceId },
                update: customerData,
                create: { ...customerData, quickbooksCustomerId: resourceId }
            });

            await recordAuditLog(event, { action: existingCustomer ? 'QBO_CUSTOMER_SYNC_UPDATE' : 'QBO_CUSTOMER_SYNC_CREATE', entityName: 'Customer', entityId: customer.id, oldValue: existingCustomer, newValue: customer }, null);
            return { success: true, synced: customer };
        }

        if (resourceType === 'Item') {
            const url = `${companyInfoUrl}/v3/company/${companyId}/item/${resourceId}?minorversion=65`;
            const { Item: qboItem } = await $fetch<{ Item: QboItem }>(url, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

            const itemData = {
                name: qboItem.Name,
                description: qboItem.Description,
                retailPrice: qboItem.UnitPrice,
                status: (qboItem.Active ? 'ACTIVE' : 'INACTIVE') as ItemStatus,
            };

            const existingItem = await unenhancedPrisma.item.findUnique({ where: { quickbooksItemId: resourceId }});
            const item = await prisma.item.upsert({
                where: { quickbooksItemId: resourceId },
                update: itemData,
                create: { ...itemData, quickbooksItemId: resourceId }
            });
            
            await recordAuditLog(event, { action: existingItem ? 'QBO_ITEM_SYNC_UPDATE' : 'QBO_ITEM_SYNC_CREATE', entityName: 'Item', entityId: item.id, oldValue: existingItem, newValue: item }, null);
            return { success: true, synced: item };
        }

    } catch (error: unknown) {
        const e = error as { 
            data?: { Fault?: { Error: { Detail?: string; Message?: string; }[] } }; 
            message?: string;
            statusCode?: number;
            statusMessage?: string;
        };
        
        // Handle token-related errors specifically
        if (e.statusCode === 401 || e.statusCode === 404) {
            console.error('QuickBooks authentication/connection error:', e.statusMessage || e.message);
            throw createError({
                statusCode: e.statusCode,
                statusMessage: e.statusMessage || 'QuickBooks connection issue. Please check your connection status.',
            });
        }
        
        console.error(`--- QBO Single Sync Error (${resourceType} ${resourceId}) ---`, JSON.stringify(e?.data || e, null, 2));
        const qboError = e.data?.Fault?.Error?.[0];
        const errorMessage = qboError?.Detail || qboError?.Message || `An unknown error occurred while syncing ${resourceType}.`;
        throw createError({ statusCode: 500, statusMessage: `Failed to sync ${resourceType} from QuickBooks.`, data: { message: errorMessage } });
    }
}); 