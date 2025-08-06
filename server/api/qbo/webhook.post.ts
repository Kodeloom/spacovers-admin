import crypto from 'crypto';
import { getQboClientForWebhook } from '~/server/lib/qbo-client';
import { CustomerType, CustomerStatus } from '@prisma-app/client';
import type { H3Event } from 'h3';

/**
 * Verifies the QuickBooks webhook signature.
 * @param signature The signature from the 'intuit-signature' header.
 * @param payload The raw request body.
 * @returns True if the signature is valid, false otherwise.
 */
function verifyWebhookSignature(signature: string, payload: string): boolean {
    const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
    if (!verifierToken) {
        console.error('QBO_WEBHOOK_VERIFIER_TOKEN is not set. Cannot verify webhook signature.');
        return false;
    }

    const hash = crypto.createHmac('sha256', verifierToken).update(payload).digest('base64');
    return hash === signature;
}

// Define a more specific type for the QBO Customer object based on the log
interface QboCustomerPayload {
    Id: string;
    DisplayName: string;
    PrimaryEmailAddr?: { Address: string };
    PrimaryPhone?: { FreeFormNumber: string };
    ShipAddr?: {
        Line1?: string;
        Line2?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    Active: boolean;
    CustomerTypeRef?: {
        value: string;
        name: string;
    };
}


/**
 * Fetches the complete customer details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchCustomerDetails(customerId: string, event: H3Event): Promise<QboCustomerPayload | null> {
    console.log(`Starting fetchCustomerDetails for customer ID: ${customerId}`);
    
    try {
        const { oauthClient, token } = await getQboClientForWebhook(event);
        console.log(`QBO client obtained successfully. Realm ID: ${token.realmId}`);
        
        const companyId = token.realmId;
        if (!companyId) {
            console.error('QuickBooks Realm ID not found.');
            return null;
        }
        
        const companyInfoUrl = oauthClient.environment === 'sandbox' 
            ? 'https://sandbox-quickbooks.api.intuit.com' 
            : 'https://quickbooks.api.intuit.com';

        const query = `SELECT * FROM Customer WHERE Id = '${customerId}'`;
        const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        console.log(`Fetching customer details from QBO API: ${queryUrl}`);
        console.log(`Using access token: ${token.access_token.substring(0, 20)}...`);

        const response: { QueryResponse: { Customer: QboCustomerPayload[] } } = await $fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        console.log(`QBO API response received:`, {
            hasQueryResponse: !!response.QueryResponse,
            customerCount: response.QueryResponse?.Customer?.length || 0
        });
        
        const customer = response.QueryResponse.Customer?.[0] || null;
        console.log(`Customer details fetched:`, customer ? {
            Id: customer.Id,
            DisplayName: customer.DisplayName,
            Email: customer.PrimaryEmailAddr?.Address,
            Active: customer.Active
        } : 'No customer found');
        
        return customer;
    } catch(e) {
        console.error(`Failed to fetch full customer details for ID ${customerId}:`, e);
        console.error(`Error details:`, {
            message: e instanceof Error ? e.message : 'Unknown error',
            stack: e instanceof Error ? e.stack : undefined
        });
        return null;
    }
}


/**
 * Upserts a customer record from a QBO payload into the local database.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboCustomer The customer data from QuickBooks.
 */
async function upsertCustomer(qboCustomer: QboCustomerPayload, _event: H3Event) {
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    let customerType: CustomerType = CustomerType.RETAILER; // Default value
    const customerTypeName = qboCustomer.CustomerTypeRef?.name;

    if (customerTypeName?.toLowerCase().includes('wholesale')) {
        customerType = CustomerType.WHOLESALER;
    } else if (customerTypeName?.toLowerCase().includes('retail')) {
        customerType = CustomerType.RETAILER;
    }

    const data = {
        name: qboCustomer.DisplayName,
        email: qboCustomer.PrimaryEmailAddr?.Address,
        contactNumber: qboCustomer.PrimaryPhone?.FreeFormNumber,
        shippingAddressLine1: qboCustomer.ShipAddr?.Line1,
        shippingAddressLine2: qboCustomer.ShipAddr?.Line2,
        shippingCity: qboCustomer.ShipAddr?.City,
        shippingState: qboCustomer.ShipAddr?.CountrySubDivisionCode,
        shippingZipCode: qboCustomer.ShipAddr?.PostalCode,
        shippingCountry: qboCustomer.ShipAddr?.Country,
        status: qboCustomer.Active ? CustomerStatus.ACTIVE : CustomerStatus.INACTIVE,
        type: customerType,
    };

    console.log(`Upserting customer with data:`, {
        quickbooksCustomerId: qboCustomer.Id,
        name: data.name,
        email: data.email,
        type: data.type,
        status: data.status
    });

    try {
        const result = await prisma.customer.upsert({
            where: { quickbooksCustomerId: qboCustomer.Id },
            update: data,
            create: {
                ...data,
                quickbooksCustomerId: qboCustomer.Id,
            }
        });
        console.log(`Successfully upserted customer ${qboCustomer.Id} from webhook. Database ID: ${result.id}`);
    } catch (error) {
        console.error(`Failed to upsert customer ${qboCustomer.Id}:`, error);
        throw error;
    }
}


export default defineEventHandler(async (event) => {
    const signature = getHeader(event, 'intuit-signature');
    const body = await readRawBody(event);

    if (!signature || !body) {
        console.error('Webhook request is missing signature or body.');
        throw createError({ statusCode: 400, statusMessage: 'Missing signature or body' });
    }

    if (!verifyWebhookSignature(signature, body)) {
        console.warn('Webhook signature validation failed.');
        throw createError({ statusCode: 401, statusMessage: 'Invalid signature' });
    }

    console.log('Webhook signature verified successfully.');
    const payload = JSON.parse(body);

    // Process each notification
    if (payload.eventNotifications) {
        for (const notification of payload.eventNotifications) {
            for (const entity of notification.dataChangeEvent.entities) {
                if (entity.name === 'Customer' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                    console.log(`Processing ${entity.operation} event for Customer ID: ${entity.id}`);
                    const customerDetails = await fetchCustomerDetails(entity.id, event);
                    if (customerDetails) {
                        console.log(`Customer details found, proceeding to upsert...`);
                        await upsertCustomer(customerDetails, event);
                    } else {
                        console.error(`Failed to fetch customer details for ID: ${entity.id}`);
                    }
                }
            }
        }
    }

    return { status: 'success' };
}); 