import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import { recordAuditLog } from '~/server/utils/auditLog';
import { z } from 'zod';
import { CustomerType, type CustomerStatus, type ItemStatus } from '@prisma-app/client';

const SyncInputSchema = z.object({
    resourceType: z.enum(['Estimate', 'Invoice', 'Customer', 'Item', 'EstimateWithInvoices']),
    resourceId: z.string(),
});

interface QboRef { value: string; name: string; }
interface QboEstimate { Id: string; CustomerRef: QboRef; DocNumber?: string; TxnDate?: string; ExpirationDate?: string; TotalAmt?: number; }
interface QboInvoice { Id: string; CustomerRef: QboRef; DocNumber?: string; TxnDate?: string; DueDate?: string; BillEmail?: { Address: string; }; TotalAmt?: number; LinkedTxn?: { TxnId: string; TxnType: string; }[]; }
interface QboCustomer { Id: string; DisplayName: string; PrimaryEmailAddr?: { Address: string }; PrimaryPhone?: { FreeFormNumber: string }; ShipAddr?: { Line1?: string; Line2?: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string; Country?: string; }; Active: boolean; CustomerTypeRef?: { name: string; }; }
interface QboItem { Id: string; Name: string; Description?: string; UnitPrice?: number; Active: boolean; }

export default defineEventHandler(async (event) => {
    const result = await readValidatedBody(event, body => SyncInputSchema.safeParse(body));
    if (!result.success) throw createError({ statusCode: 400, data: result.error.flatten() });

    const { resourceType, resourceId } = result.data;

    const { oauthClient, token } = await getQboClient(event);
    const prisma = await getEnhancedPrismaClient(event);
    const companyId = token.realmId;
    if (!companyId) throw createError({ statusCode: 400, statusMessage: 'QuickBooks Realm ID not found.' });

    const companyInfoUrl = oauthClient.environment === 'sandbox' 
        ? 'https://sandbox-quickbooks.api.intuit.com' 
        : 'https://quickbooks.api.intuit.com';

    try {
        if (resourceType === 'Estimate') {
            const url = `${companyInfoUrl}/v3/company/${companyId}/estimate/${resourceId}?minorversion=65`;
            const { Estimate: qboEstimate } = await $fetch<{ Estimate: QboEstimate }>(url, {
                 headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

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
            return { success: true, synced: estimate };
        }

        if (resourceType === 'Invoice') {
            const url = `${companyInfoUrl}/v3/company/${companyId}/invoice/${resourceId}?minorversion=65`;
            const { Invoice: qboInvoice } = await $fetch<{ Invoice: QboInvoice }>(url, {
                 headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

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

        if (resourceType === 'EstimateWithInvoices') {
            // First sync the estimate
            const estimateUrl = `${companyInfoUrl}/v3/company/${companyId}/estimate/${resourceId}?minorversion=65`;
            const { Estimate: qboEstimate } = await $fetch<{ Estimate: QboEstimate }>(estimateUrl, {
                 headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

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

            // Now find and sync all invoices linked to this estimate
            // QuickBooks doesn't support querying by LinkedTxn fields directly
            // So we need to fetch all invoices and filter them in code
            const allInvoicesQuery = "SELECT * FROM Invoice";
            const allInvoicesUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(allInvoicesQuery)}`;
            
            const allInvoicesResponse: { QueryResponse: { Invoice?: QboInvoice[] } } = await $fetch(allInvoicesUrl, {
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
            });

            const allInvoices = allInvoicesResponse.QueryResponse.Invoice || [];
            // Filter invoices that are linked to this estimate
            const linkedInvoices = allInvoices.filter(invoice => 
                invoice.LinkedTxn?.some(txn => txn.TxnId === resourceId && txn.TxnType === 'Estimate')
            );
            const syncedInvoices = [];

            for (const qboInvoice of linkedInvoices) {
                const orderData = {
                    customerId: customer.id,
                    estimateId: estimate.id,
                    salesOrderNumber: qboInvoice.DocNumber,
                    transactionDate: qboInvoice.TxnDate ? new Date(qboInvoice.TxnDate) : undefined,
                    dueDate: qboInvoice.DueDate ? new Date(qboInvoice.DueDate) : undefined,
                    totalAmount: qboInvoice.TotalAmt || 0,
                    contactEmail: qboInvoice.BillEmail?.Address || customer.email || 'no-email@example.com',
                };
                const existingOrder = await unenhancedPrisma.order.findUnique({ where: { quickbooksOrderId: qboInvoice.Id } });
                const order = await prisma.order.upsert({
                    where: { quickbooksOrderId: qboInvoice.Id },
                    update: orderData,
                    create: { ...orderData, quickbooksOrderId: qboInvoice.Id },
                });
                await recordAuditLog(event, { action: existingOrder ? 'QBO_ORDER_SYNC_UPDATE' : 'QBO_ORDER_SYNC_CREATE', entityName: 'Order', entityId: order.id, oldValue: existingOrder, newValue: order }, null);
                syncedInvoices.push(order);
            }

            return { 
                success: true, 
                synced: estimate,
                linkedInvoices: syncedInvoices,
                message: `Synced estimate and ${syncedInvoices.length} linked invoices`
            };
        }

    } catch (error: unknown) {
        const e = error as { data?: { Fault?: { Error: { Detail?: string; Message?: string; }[] } }; message?: string; };
        console.error(`--- QBO Single Sync Error (${resourceType} ${resourceId}) ---`, JSON.stringify(e?.data || e, null, 2));
        const qboError = e.data?.Fault?.Error?.[0];
        const errorMessage = qboError?.Detail || qboError?.Message || `An unknown error occurred while syncing ${resourceType}.`;
        throw createError({ statusCode: 500, statusMessage: `Failed to sync ${resourceType} from QuickBooks.`, data: { message: errorMessage } });
    }
}); 