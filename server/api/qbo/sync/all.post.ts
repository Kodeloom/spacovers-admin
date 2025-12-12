import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import { recordAuditLog } from '~/server/utils/auditLog';
import { z } from 'zod';
// TODO: MAYBE CHANGE TO @PRISMA/CLIENT
import type { PrismaClient } from '@prisma-app/client';
import type { H3Event } from 'h3';
import { QBO_API_CONFIG } from '~/server/lib/qbo-client';

const SyncInputSchema = z.object({
    syncMode: z.enum(['UPSERT', 'CREATE_NEW']).default('UPSERT'),
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
        Qty: number;
        UnitPrice: number;
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
    LinkedTxn?: { TxnId: string; TxnType: string; }[]; 
    DocNumber?: string; 
    TxnDate?: string; 
    DueDate?: string; 
    TotalAmt?: number;
    Line?: QboLineItem[];
}

/**
 * Processes line items from a QBO invoice and creates/updates OrderItems
 */
async function processInvoiceLineItems(invoice: QboInvoice, orderId: string, event: H3Event) {
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`🔍 Processing invoice ${invoice.Id} (DocNumber: ${invoice.DocNumber})`);
    console.log(`📦 Invoice Line property:`, invoice.Line);
    console.log(`📦 Invoice Line length:`, invoice.Line?.length);
    
    if (!invoice.Line || invoice.Line.length === 0) {
        console.log(`⚠️ No line items found for invoice ${invoice.Id}`);
        console.log(`🔍 Full invoice structure:`, JSON.stringify(invoice, null, 2));
        return;
    }
    
    console.log(`✅ Found ${invoice.Line.length} line items to process`);
    
    for (const line of invoice.Line) {
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
            
            // Get the next product number for new items
            const { getNextProductNumber } = await import('~/server/utils/productNumber');
            
            // Check if this is a new item (doesn't exist yet)
            const existingItem = await prisma.orderItem.findUnique({
                where: { 
                    orderId_quickbooksOrderLineId: {
                        orderId: orderId,
                        quickbooksOrderLineId: line.Id
                    }
                }
            });
            
            // Only assign product number for new items
            const productNumber = existingItem?.productNumber || await getNextProductNumber();
            
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
                    productNumber, // Assign unique product number
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
async function processEstimateLineItems(estimate: QboEstimate, estimateId: string, event: H3Event) {
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`🔍 Processing estimate ${estimate.Id} (DocNumber: ${estimate.DocNumber})`);
    console.log(`📦 Estimate Line property:`, estimate.Line);
    console.log(`📦 Estimate Line length:`, estimate.Line?.length);
    
    if (!estimate.Line || estimate.Line.length === 0) {
        console.log(`⚠️ No line items found for estimate ${estimate.Id}`);
        console.log(`🔍 Full estimate structure:`, JSON.stringify(estimate, null, 2));
        return;
    }
    
    console.log(`✅ Found ${estimate.Line.length} line items to process`);
    
    for (const line of estimate.Line) {
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

async function syncEstimates(event: H3Event, prisma: PrismaClient, token: { access_token: string; realmId: string }, baseUrl: string, syncMode: 'UPSERT' | 'CREATE_NEW') {
    // Fetch estimates using REST API - use specific API version for stability
    const apiVersion = QBO_API_CONFIG.VERSION;
    let estimateQuery = "SELECT * FROM Estimate";
    let estimateQueryUrl = `${baseUrl}/${apiVersion}/company/${token.realmId}/query?query=${encodeURIComponent(estimateQuery)}`;
    
    console.log(`🔍 Using QBO API version: ${apiVersion}`);
    console.log(`🔍 Trying QBO query: ${estimateQuery}`);
    console.log(`🔍 Query URL: ${estimateQueryUrl}`);
    
    const estimateResponse: { QueryResponse: { Estimate?: QboEstimate[] } } = await $fetch(estimateQueryUrl, {
        method: 'GET',
        headers: { 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${token.access_token}`,
            'User-Agent': QBO_API_CONFIG.USER_AGENT
        }
    });
    
    console.log('🔍 QBO Estimate Response:', JSON.stringify(estimateResponse, null, 2));
    
    const estimates = estimateResponse.QueryResponse.Estimate || [];
    console.log(`📊 Found ${estimates.length} estimates to process`);
    
    // Debug first estimate structure
    if (estimates.length > 0) {
        console.log('🔍 First estimate structure:', JSON.stringify(estimates[0], null, 2));
        console.log('🔍 First estimate Line items:', estimates[0].Line);
        
        // If no line items, try different query approaches based on QBO documentation
        if (!estimates[0].Line || estimates[0].Line.length === 0) {
            console.log('⚠️ No line items found with SELECT *. Trying alternative approaches...');
            
            // Try different query strategies based on QBO documentation
            const alternativeQueries = [
                "SELECT *, Line.* FROM Estimate",
                "SELECT Id, DocNumber, CustomerRef, TxnDate, ExpirationDate, TotalAmt, Line FROM Estimate",
                "SELECT Id, DocNumber, CustomerRef, TxnDate, ExpirationDate, TotalAmt, Line.* FROM Estimate"
            ];
            
            for (const altQuery of alternativeQueries) {
                console.log(`🔍 Trying alternative query: ${altQuery}`);
                
                try {
                    const altQueryUrl = `${baseUrl}/${apiVersion}/company/${token.realmId}/query?query=${encodeURIComponent(altQuery)}`;
                    const altResponse: { QueryResponse?: { Estimate?: QboEstimate[] } } = await $fetch(altQueryUrl, {
                        method: 'GET',
                        headers: { 
                            'Accept': 'application/json', 
                            'Authorization': `Bearer ${token.access_token}`,
                            'User-Agent': QBO_API_CONFIG.USER_AGENT
                        }
                    });
                    
                    console.log(`🔍 Alternative query response for "${altQuery}":`, JSON.stringify(altResponse, null, 2));
                    
                    // Check if this query returned line items
                    if (altResponse.QueryResponse?.Estimate?.[0]?.Line?.length > 0) {
                        console.log(`✅ Query "${altQuery}" successfully returned line items!`);
                        // Update the estimates array with the successful response
                        if (altResponse.QueryResponse?.Estimate) {
                            Object.assign(estimates, altResponse.QueryResponse.Estimate);
                        }
                        break; // Use the first successful query
                    }
                } catch (altError) {
                    console.error(`❌ Alternative query "${altQuery}" failed:`, altError);
                }
            }
        }
    }
    
    let count = 0;

    if (syncMode === 'CREATE_NEW') {
        const qboIds = estimates.map(e => e.Id);
        const existingEstimateIds = await unenhancedPrisma.estimate.findMany({
            where: { quickbooksEstimateId: { in: qboIds } },
            select: { quickbooksEstimateId: true },
        });
        const existingIdsSet = new Set(existingEstimateIds.map(e => e.quickbooksEstimateId as string));
        const newEstimates = estimates.filter((e: QboEstimate) => !existingIdsSet.has(e.Id));

        for (const estimate of newEstimates) {
            const customer = await unenhancedPrisma.customer.findUnique({ where: { quickbooksCustomerId: estimate.CustomerRef.value } });
            if (!customer) continue;

            console.log(`🔄 Creating estimate for customer ${customer.id}, QBO ID: ${estimate.Id}`);
            try {
                const created = await unenhancedPrisma.estimate.create({
                    data: {
                        quickbooksEstimateId: estimate.Id,
                        customer: { connect: { id: customer.id } },
                        estimateNumber: estimate.DocNumber,
                        transactionDate: estimate.TxnDate ? new Date(estimate.TxnDate) : null,
                        expirationDate: estimate.ExpirationDate ? new Date(estimate.ExpirationDate) : null,
                        totalAmount: estimate.TotalAmt || 0,
                    },
                });
                console.log(`✅ Successfully created estimate ${created.id}`);
            } catch (createError) {
                console.error(`❌ Failed to create estimate for QBO ID ${estimate.Id}:`, createError);
                throw createError;
            }
            await recordAuditLog(event, { action: 'QBO_ESTIMATE_SYNC_CREATE', entityName: 'Estimate', entityId: created.id, newValue: created }, null);
            
            // Process line items for the estimate
            await processEstimateLineItems(estimate, created.id, event);
            
            count++;
        }
    }
    else { // UPSERT mode
        for (const estimate of estimates) {
            const customer = await unenhancedPrisma.customer.findUnique({ where: { quickbooksCustomerId: estimate.CustomerRef.value } });
            if (!customer) continue;

            const estimateData = {
                customer: { connect: { id: customer.id } },
                estimateNumber: estimate.DocNumber,
                transactionDate: estimate.TxnDate ? new Date(estimate.TxnDate) : null,
                expirationDate: estimate.ExpirationDate ? new Date(estimate.ExpirationDate) : null,
                totalAmount: estimate.TotalAmt || 0,
            };

            const existingEstimate = await unenhancedPrisma.estimate.findUnique({ where: { quickbooksEstimateId: estimate.Id } });
            const upserted = await prisma.estimate.upsert({
                where: { quickbooksEstimateId: estimate.Id },
                update: estimateData,
                create: { ...estimateData, quickbooksEstimateId: estimate.Id },
            });
            await recordAuditLog(event, { action: existingEstimate ? 'QBO_ESTIMATE_SYNC_UPDATE' : 'QBO_ESTIMATE_SYNC_CREATE', entityName: 'Estimate', entityId: upserted.id, oldValue: existingEstimate, newValue: upserted }, null);
            
            // Process line items for the estimate
            await processEstimateLineItems(estimate, upserted.id, event);
            
            count++;
        }
    }
    return count;
}

async function syncInvoices(event: H3Event, prisma: PrismaClient, token: { access_token: string; realmId: string }, baseUrl: string, syncMode: 'UPSERT' | 'CREATE_NEW') {
    // Fetch invoices using REST API - use specific API version for stability
    const apiVersion = QBO_API_CONFIG.VERSION;
    let invoiceQuery = "SELECT * FROM Invoice";
    let invoiceQueryUrl = `${baseUrl}/${apiVersion}/company/${token.realmId}/query?query=${encodeURIComponent(invoiceQuery)}`;
    
    console.log(`🔍 Using QBO API version: ${apiVersion}`);
    console.log(`🔍 Trying QBO query: ${invoiceQuery}`);
    console.log(`🔍 Query URL: ${invoiceQueryUrl}`);
    
    const invoiceResponse: { QueryResponse: { Invoice?: QboInvoice[] } } = await $fetch(invoiceQueryUrl, {
        method: 'GET',
        headers: { 
            'Accept': 'application/json', 
            'Authorization': `Bearer ${token.access_token}`,
            'User-Agent': QBO_API_CONFIG.USER_AGENT
        }
    });
    
    console.log('🔍 QBO Invoice Response:', JSON.stringify(invoiceResponse, null, 2));
    
    const invoices = invoiceResponse.QueryResponse.Invoice || [];
    console.log(`📊 Found ${invoices.length} invoices to process`);
    
    // Debug first invoice structure
    if (invoices.length > 0) {
        console.log('🔍 First invoice structure:', JSON.stringify(invoices[0], null, 2));
        console.log('🔍 First invoice Line items:', invoices[0].Line);
        
        // If no line items, try different query approaches based on QBO documentation
        if (!invoices[0].Line || invoices[0].Line.length === 0) {
            console.log('⚠️ No line items found with SELECT *. Trying alternative approaches...');
            
            // Try different query strategies based on QBO documentation
            const alternativeQueries = [
                "SELECT *, Line.* FROM Invoice",
                "SELECT Id, DocNumber, CustomerRef, TxnDate, DueDate, TotalAmt, Line FROM Invoice",
                "SELECT Id, DocNumber, CustomerRef, TxnDate, DueDate, TotalAmt, Line.* FROM Invoice"
            ];
            
            for (const altQuery of alternativeQueries) {
                console.log(`🔍 Trying alternative query: ${altQuery}`);
                
                try {
                    const altQueryUrl = `${baseUrl}/${apiVersion}/company/${token.realmId}/query?query=${encodeURIComponent(altQuery)}`;
                    const altResponse: { QueryResponse?: { Invoice?: QboInvoice[] } } = await $fetch(altQueryUrl, {
                        method: 'GET',
                        headers: { 
                            'Accept': 'application/json', 
                            'Authorization': `Bearer ${token.access_token}`,
                            'User-Agent': QBO_API_CONFIG.USER_AGENT
                        }
                    });
                    
                    console.log(`🔍 Alternative query response for "${altQuery}":`, JSON.stringify(altResponse, null, 2));
                    
                    // Check if this query returned line items
                    if (altResponse.QueryResponse?.Invoice?.[0]?.Line?.length > 0) {
                        console.log(`✅ Query "${altQuery}" successfully returned line items!`);
                        // Update the invoices array with the successful response
                        if (altResponse.QueryResponse?.Invoice) {
                            Object.assign(invoices, altResponse.QueryResponse.Invoice);
                        }
                        break; // Use the first successful query
                    }
                } catch (altError) {
                    console.error(`❌ Alternative query "${altQuery}" failed:`, altError);
                }
            }
        }
    }
    
    let count = 0;

    if (syncMode === 'CREATE_NEW') {
        const qboIds = invoices.map(i => i.Id);
        const existingInvoiceIds = await unenhancedPrisma.order.findMany({
            where: { quickbooksOrderId: { in: qboIds } },
            select: { quickbooksOrderId: true },
        });
        const existingIdsSet = new Set(existingInvoiceIds.map(o => o.quickbooksOrderId as string));
        const newInvoices = invoices.filter((i: QboInvoice) => !existingIdsSet.has(i.Id));

        for (const invoice of newInvoices) {
            const customer = await unenhancedPrisma.customer.findUnique({ where: { quickbooksCustomerId: invoice.CustomerRef.value } });
            if (!customer) continue;

            let estimateId: string | undefined;
            if (invoice.LinkedTxn) {
                const linkedEstimate = invoice.LinkedTxn.find((t: { TxnType: string; }) => t.TxnType === 'Estimate');
                if (linkedEstimate) {
                    const localEstimate = await unenhancedPrisma.estimate.findUnique({ where: { quickbooksEstimateId: linkedEstimate.TxnId } });
                    if (localEstimate) estimateId = localEstimate.id;
                }
            }

            console.log(`🔄 Creating order for customer ${customer.id}, QBO ID: ${invoice.Id}`);
            try {
                const created = await unenhancedPrisma.order.create({
                    data: {
                        quickbooksOrderId: invoice.Id,
                        customer: { connect: { id: customer.id } },
                        estimate: estimateId ? { connect: { id: estimateId } } : undefined,
                        salesOrderNumber: invoice.DocNumber,
                        transactionDate: invoice.TxnDate ? new Date(invoice.TxnDate) : null,
                        dueDate: invoice.DueDate ? new Date(invoice.DueDate) : null,
                        totalAmount: invoice.TotalAmt || 0,
                        contactEmail: customer.email || 'no-email@example.com', // Required field
                    },
                });
                console.log(`✅ Successfully created order ${created.id}`);
            } catch (createError) {
                console.error(`❌ Failed to create order for QBO ID ${invoice.Id}:`, createError);
                throw createError;
            }
            
            // Process line items for the new order
            await processInvoiceLineItems(invoice, created.id, event);
            
            await recordAuditLog(event, { action: 'QBO_ORDER_SYNC_CREATE', entityName: 'Order', entityId: created.id, newValue: created }, null);
            count++;
        }
    }
    else { // UPSERT mode
        for (const invoice of invoices) {
            const customer = await unenhancedPrisma.customer.findUnique({ where: { quickbooksCustomerId: invoice.CustomerRef.value } });
            if (!customer) continue;

            let estimateId: string | undefined;
            if (invoice.LinkedTxn) {
                const linkedEstimate = invoice.LinkedTxn.find((t: { TxnType: string; }) => t.TxnType === 'Estimate');
                if (linkedEstimate) {
                    const localEstimate = await unenhancedPrisma.estimate.findUnique({ where: { quickbooksEstimateId: linkedEstimate.TxnId } });
                    if (localEstimate) estimateId = localEstimate.id;
                }
            }
            
            const orderData = {
                customer: { connect: { id: customer.id } },
                estimate: estimateId ? { connect: { id: estimateId } } : undefined,
                salesOrderNumber: invoice.DocNumber,
                transactionDate: invoice.TxnDate ? new Date(invoice.TxnDate) : null,
                dueDate: invoice.DueDate ? new Date(invoice.DueDate) : null,
                totalAmount: invoice.TotalAmt || 0,
                contactEmail: customer.email || 'no-email@example.com', // Required field
            };

            const existingOrder = await unenhancedPrisma.order.findUnique({ where: { quickbooksOrderId: invoice.Id } });
            const upserted = await prisma.order.upsert({
                where: { quickbooksOrderId: invoice.Id },
                update: orderData,
                create: { ...orderData, quickbooksOrderId: invoice.Id },
            });

            // Process line items for the upserted order
            await processInvoiceLineItems(invoice, upserted.id, event);

            await recordAuditLog(event, { action: existingOrder ? 'QBO_ORDER_SYNC_UPDATE' : 'QBO_ORDER_SYNC_CREATE', entityName: 'Order', entityId: upserted.id, oldValue: existingOrder, newValue: upserted }, null);
            count++;
        }
    }
    return count;
}

export default defineEventHandler(async (event) => {
    const result = await readValidatedBody(event, body => SyncInputSchema.safeParse(body));
    if (!result.success) {
        throw createError({ statusCode: 400, data: result.error.flatten() });
    }
    const { syncMode } = result.data;

    try {
        const { oauthClient, token } = await getQboClient(event);
        const prisma = unenhancedPrisma;
        
        const baseUrl = oauthClient.environment === 'sandbox' 
            ? 'https://sandbox-quickbooks.api.intuit.com' 
            : 'https://quickbooks.api.intuit.com';

        console.log('🚀 Starting estimates sync...');
        const estimatesSynced = await syncEstimates(event, prisma, token, baseUrl, syncMode);
        console.log(`✅ Estimates sync completed. Synced: ${estimatesSynced}`);
        
        console.log('🚀 Starting invoices sync...');
        const invoicesSynced = await syncInvoices(event, prisma, token, baseUrl, syncMode);
        console.log(`✅ Invoices sync completed. Synced: ${invoicesSynced}`);

        return {
            success: true,
            estimatesSynced,
            invoicesSynced,
        };
    } catch (error: unknown) {
        const e = error as { 
            Fault?: { Error: { Detail: string }[] };
            statusCode?: number;
            statusMessage?: string;
            message?: string;
        };
        
        // Handle token-related errors specifically
        if (e.statusCode === 401 || e.statusCode === 404) {
            console.error('QuickBooks authentication/connection error:', e.statusMessage || e.message);
            throw createError({
                statusCode: e.statusCode,
                statusMessage: e.statusMessage || 'QuickBooks connection issue. Please check your connection status.',
            });
        }
        
        console.error('QBO sync error:', e);
        throw createError({
            statusCode: 500,
            statusMessage: e.Fault?.Error[0]?.Detail || e.message || 'An error occurred during QBO sync.',
        });
    }
}); 