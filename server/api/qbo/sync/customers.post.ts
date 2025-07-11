import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { CustomerType } from '@prisma-app/client';

// Define a more specific type for the QBO Customer object based on the log
interface QboCustomer {
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
        value: string; // This is the ID of the CustomerType
        name: string; // The name, e.g., "Wholesale"
    };
}

interface QboCustomerType {
    Id: string;
    Name: string;
}

export default defineEventHandler(async (event) => {
    const { oauthClient, token } = await getQboClient(event);
    const prisma = await getEnhancedPrismaClient(event);
    
    const companyId = token.realmId;
    if (!companyId) {
        throw createError({ statusCode: 400, statusMessage: 'QuickBooks Realm ID not found.' });
    }
    const companyInfoUrl = oauthClient.environment === 'sandbox' 
        ? 'https://sandbox-quickbooks.api.intuit.com' 
        : 'https://quickbooks.api.intuit.com';

    try {
        // Step 1: Fetch all CustomerTypes
        const customerTypeQuery = "SELECT * FROM CustomerType";
        const customerTypeQueryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(customerTypeQuery)}`;
        
        const customerTypeResponse: { QueryResponse: { CustomerType: QboCustomerType[] } } = await $fetch(customerTypeQueryUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
        });

        const customerTypeMap = new Map<string, string>();
        if (customerTypeResponse.QueryResponse.CustomerType) {
            for (const type of customerTypeResponse.QueryResponse.CustomerType) {
                customerTypeMap.set(type.Id, type.Name);
            }
        }

        // Step 2: Fetch all Customers
        const customerQuery = "SELECT * FROM Customer";
        const customerQueryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(customerQuery)}`;
        const customerResponse: { QueryResponse: { Customer: QboCustomer[] } } = await $fetch(customerQueryUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token.access_token}` }
        });
        
        const qboCustomers = customerResponse.QueryResponse.Customer || [];
        let syncedCount = 0;

        for (const qboCustomer of qboCustomers) {
            let customerType: CustomerType = CustomerType.RETAILER; // Default value
            
            const customerTypeName = qboCustomer.CustomerTypeRef?.name;

            if (customerTypeName?.toLowerCase().includes('wholesale')) {
                customerType = CustomerType.WHOLESALER;
            } else if (customerTypeName?.toLowerCase().includes('retail')) {
                customerType = CustomerType.RETAILER;
            }

            await prisma.customer.upsert({
                where: { quickbooksCustomerId: qboCustomer.Id },
                update: {
                    name: qboCustomer.DisplayName,
                    email: qboCustomer.PrimaryEmailAddr?.Address,
                    contactNumber: qboCustomer.PrimaryPhone?.FreeFormNumber,
                    shippingAddressLine1: qboCustomer.ShipAddr?.Line1,
                    shippingAddressLine2: qboCustomer.ShipAddr?.Line2,
                    shippingCity: qboCustomer.ShipAddr?.City,
                    shippingState: qboCustomer.ShipAddr?.CountrySubDivisionCode,
                    shippingZipCode: qboCustomer.ShipAddr?.PostalCode,
                    shippingCountry: qboCustomer.ShipAddr?.Country,
                    status: qboCustomer.Active ? 'ACTIVE' : 'INACTIVE',
                    type: customerType,
                },
                create: {
                    quickbooksCustomerId: qboCustomer.Id,
                    name: qboCustomer.DisplayName,
                    email: qboCustomer.PrimaryEmailAddr?.Address,
                    contactNumber: qboCustomer.PrimaryPhone?.FreeFormNumber,
                    shippingAddressLine1: qboCustomer.ShipAddr?.Line1,
                    shippingAddressLine2: qboCustomer.ShipAddr?.Line2,
                    shippingCity: qboCustomer.ShipAddr?.City,
                    shippingState: qboCustomer.ShipAddr?.CountrySubDivisionCode,
                    shippingZipCode: qboCustomer.ShipAddr?.PostalCode,
                    shippingCountry: qboCustomer.ShipAddr?.Country,
                    status: qboCustomer.Active ? 'ACTIVE' : 'INACTIVE',
                    type: customerType,
                }
            });
            syncedCount++;
        }
        
        console.log(`Synchronization complete. Synced ${syncedCount} customers.`);
        return { success: true, syncedCount };

    } catch (error: unknown) {
        type QboError = {
            data?: {
                Fault?: {
                    Error: { Detail: string }[];
                };
            };
            message?: string;
        };
        const err = error as QboError;
        if (err.data) {
            console.error('--- QuickBooks API Error Details ---', JSON.stringify(err.data, null, 2));
        }
        const message = err.data?.Fault?.Error[0]?.Detail || err.message || 'An unknown error occurred';
        console.error('Failed to fetch customers from QuickBooks:', message);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch customers from QuickBooks.',
            data: message,
        });
    }
}); 