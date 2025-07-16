import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import { recordAuditLog } from '~/server/utils/auditLog';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { H3Event } from 'h3';

const SyncInputSchema = z.object({
    syncMode: z.enum(['UPSERT', 'CREATE_NEW']).default('UPSERT'),
});

interface QboRef { value: string; }
interface QboEstimate { Id: string; CustomerRef: QboRef; DocNumber?: string; TxnDate?: string; ExpirationDate?: string; TotalAmt?: number; }
interface QboInvoice { Id: string; CustomerRef: QboRef; LinkedTxn?: { TxnId: string; TxnType: string; }[]; DocNumber?: string; TxnDate?: string; DueDate?: string; TotalAmt?: number; }

async function syncEstimates(event: H3Event, prisma: PrismaClient, token: { access_token: string; realmId: string }, baseUrl: string, syncMode: 'UPSERT' | 'CREATE_NEW') {
    // Fetch estimates using REST API
    const estimateQuery = "SELECT * FROM Estimate";
    const estimateQueryUrl = `${baseUrl}/v3/company/${token.realmId}/query?query=${encodeURIComponent(estimateQuery)}`;
    
    const estimateResponse: { QueryResponse: { Estimate?: QboEstimate[] } } = await $fetch(estimateQueryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
    });
    
    const estimates = estimateResponse.QueryResponse.Estimate || [];
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

            const created = await prisma.estimate.create({
                data: {
                    quickbooksEstimateId: estimate.Id,
                    customer: { connect: { id: customer.id } },
                    estimateNumber: estimate.DocNumber,
                    transactionDate: estimate.TxnDate ? new Date(estimate.TxnDate) : null,
                    expirationDate: estimate.ExpirationDate ? new Date(estimate.ExpirationDate) : null,
                    totalAmount: estimate.TotalAmt || 0,
                },
            });
            await recordAuditLog(event, { action: 'QBO_ESTIMATE_SYNC_CREATE', entityName: 'Estimate', entityId: created.id, newValue: created }, null);
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
            count++;
        }
    }
    return count;
}

async function syncInvoices(event: H3Event, prisma: PrismaClient, token: { access_token: string; realmId: string }, baseUrl: string, syncMode: 'UPSERT' | 'CREATE_NEW') {
    // Fetch invoices using REST API
    const invoiceQuery = "SELECT * FROM Invoice";
    const invoiceQueryUrl = `${baseUrl}/v3/company/${token.realmId}/query?query=${encodeURIComponent(invoiceQuery)}`;
    
    const invoiceResponse: { QueryResponse: { Invoice?: QboInvoice[] } } = await $fetch(invoiceQueryUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
    });
    
    const invoices = invoiceResponse.QueryResponse.Invoice || [];
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

            const created = await prisma.order.create({
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

    const { oauthClient, token } = await getQboClient(event);
    const prisma = await getEnhancedPrismaClient(event);
    
    const baseUrl = oauthClient.environment === 'sandbox' 
        ? 'https://sandbox-quickbooks.api.intuit.com' 
        : 'https://quickbooks.api.intuit.com';

    try {
        const estimatesSynced = await syncEstimates(event, prisma, token, baseUrl, syncMode);
        const invoicesSynced = await syncInvoices(event, prisma, token, baseUrl, syncMode);

        return {
            success: true,
            estimatesSynced,
            invoicesSynced,
        };
    }
    catch (error: unknown) {
        const e = error as { Fault?: { Error: { Detail: string }[] } };
        console.error(e);
        throw createError({
            statusCode: 500,
            statusMessage: e.Fault?.Error[0]?.Detail || 'An error occurred during QBO sync.',
        });
    }
}); 