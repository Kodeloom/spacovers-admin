import crypto from 'crypto';
import { getQboClientForWebhook } from '~/server/lib/qbo-client';
import { CustomerType, CustomerStatus, OrderSystemStatus, ItemStatus } from '@prisma-app/client';
import type { H3Event } from 'h3';
import { parseProductDescription, findOrCreateProduct } from '~/server/utils/productParser';

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

// Define interfaces for QBO Invoice/Order objects
interface QboInvoicePayload {
    Id: string;
    CustomerRef: { value: string; name: string };
    DocNumber: string;
    TxnDate: string;
    BillEmail?: { Address: string };
    BillAddr?: {
        Line1?: string;
        Line2?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    ShipAddr?: {
        Line1?: string;
        Line2?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    Line: QboInvoiceLineItem[];
    TotalAmt: number;
    PrivateNote?: string;
}

interface QboInvoiceLineItem {
    Id: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
        ItemRef: { value: string; name: string };
        Qty: number;
        UnitPrice: number;
        Description?: string;
    };
    DescriptionLineDetail?: {
        Amount: number;
        Description?: string;
    };
}

// Define interfaces for QBO Item objects
interface QboItemPayload {
    Id: string;
    Name: string;
    Description?: string;
    Active: boolean;
    Type: string;
    UnitPrice?: number;
    PurchaseCost?: number;
    IncomeAccountRef?: { value: string; name: string };
    ExpenseAccountRef?: { value: string; name: string };
    AssetAccountRef?: { value: string; name: string };
    MetaData?: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
}

// Define interfaces for QBO Estimate objects
interface QboEstimatePayload {
    Id: string;
    CustomerRef: { value: string; name: string };
    DocNumber: string;
    TxnDate: string;
    BillEmail?: { Address: string };
    BillAddr?: {
        Line1?: string;
        Line2?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    ShipAddr?: {
        Line1?: string;
        Line2?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    Line: QboEstimateLineItem[];
    TotalAmt: number;
    PrivateNote?: string;
    EmailStatus?: string;
}

interface QboEstimateLineItem {
    Id: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
        ItemRef: { value: string; name: string };
        Qty: number;
        UnitPrice: number;
        Description?: string;
    };
    DescriptionLineDetail?: {
        Amount: number;
        Description?: string;
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
 * Fetches the complete invoice details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchInvoiceDetails(invoiceId: string, event: H3Event): Promise<QboInvoicePayload | null> {
    console.log(`Starting fetchInvoiceDetails for invoice ID: ${invoiceId}`);
    
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

        const query = `SELECT * FROM Invoice WHERE Id = '${invoiceId}'`;
        const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        console.log(`Fetching invoice details from QBO API: ${queryUrl}`);
        console.log(`Using access token: ${token.access_token.substring(0, 20)}...`);

        const response: { QueryResponse: { Invoice: QboInvoicePayload[] } } = await $fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        console.log(`QBO API response received:`, {
            hasQueryResponse: !!response.QueryResponse,
            invoiceCount: response.QueryResponse?.Invoice?.length || 0
        });
        
        const invoice = response.QueryResponse.Invoice?.[0] || null;
        console.log(`Invoice details fetched:`, invoice ? {
            Id: invoice.Id,
            DocNumber: invoice.DocNumber,
            Customer: invoice.CustomerRef.name,
            TotalAmt: invoice.TotalAmt,
            LineCount: invoice.Line?.length || 0
        } : 'No invoice found');
        
        return invoice;
    } catch(e) {
        console.error(`Failed to fetch full invoice details for ID ${invoiceId}:`, e);
        console.error(`Error details:`, {
            message: e instanceof Error ? e.message : 'Unknown error',
            stack: e instanceof Error ? e.stack : undefined
        });
        return null;
    }
}

/**
 * Fetches the complete item details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchItemDetails(itemId: string, event: H3Event): Promise<QboItemPayload | null> {
    console.log(`Starting fetchItemDetails for item ID: ${itemId}`);
    
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

        const query = `SELECT * FROM Item WHERE Id = '${itemId}'`;
        const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        console.log(`Fetching item details from QBO API: ${queryUrl}`);
        console.log(`Using access token: ${token.access_token.substring(0, 20)}...`);

        const response: { QueryResponse: { Item: QboItemPayload[] } } = await $fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        console.log(`QBO API response received:`, {
            hasQueryResponse: !!response.QueryResponse,
            itemCount: response.QueryResponse?.Item?.length || 0
        });
        
        const item = response.QueryResponse.Item?.[0] || null;
        console.log(`Item details fetched:`, item ? {
            Id: item.Id,
            Name: item.Name,
            Type: item.Type,
            Active: item.Active,
            UnitPrice: item.UnitPrice
        } : 'No item found');
        
        return item;
    } catch(e) {
        console.error(`Failed to fetch full item details for ID ${itemId}:`, e);
        console.error(`Error details:`, {
            message: e instanceof Error ? e.message : 'Unknown error',
            stack: e instanceof Error ? e.stack : undefined
        });
        return null;
    }
}

/**
 * Fetches the complete estimate details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchEstimateDetails(estimateId: string, event: H3Event): Promise<QboEstimatePayload | null> {
    console.log(`Starting fetchEstimateDetails for estimate ID: ${estimateId}`);
    
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

        const query = `SELECT * FROM Estimate WHERE Id = '${estimateId}'`;
        const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        console.log(`Fetching estimate details from QBO API: ${queryUrl}`);
        console.log(`Using access token: ${token.access_token.substring(0, 20)}...`);

        const response: { QueryResponse: { Estimate: QboEstimatePayload[] } } = await $fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            }
        });
        
        console.log(`QBO API response received:`, {
            hasQueryResponse: !!response.QueryResponse,
            estimateCount: response.QueryResponse?.Estimate?.length || 0
        });
        
        const estimate = response.QueryResponse.Estimate?.[0] || null;
        console.log(`Estimate details fetched:`, estimate ? {
            Id: estimate.Id,
            DocNumber: estimate.DocNumber,
            Customer: estimate.CustomerRef.name,
            TotalAmt: estimate.TotalAmt,
            LineCount: estimate.Line?.length || 0
        } : 'No estimate found');
        
        return estimate;
    } catch(e) {
        console.error(`Failed to fetch full estimate details for ID ${estimateId}:`, e);
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

/**
 * Upserts an item record from a QBO payload into the local database.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboItem The item data from QuickBooks.
 */
async function upsertItem(qboItem: QboItemPayload, _event: H3Event) {
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`Upserting item ${qboItem.Id} (Name: ${qboItem.Name})`);
    
    try {
        // Determine if this is a Spacover product based on description
        let isSpacoverProduct = false;
        if (qboItem.Description) {
            const parsedProduct = parseProductDescription(qboItem.Description);
            isSpacoverProduct = !!parsedProduct;
        }
        
        const data = {
            quickbooksItemId: qboItem.Id,
            name: qboItem.Name,
            description: qboItem.Description,
            category: qboItem.Type,
            wholesalePrice: qboItem.UnitPrice,
            retailPrice: qboItem.UnitPrice,
            cost: qboItem.PurchaseCost,
            status: qboItem.Active ? ItemStatus.ACTIVE : ItemStatus.INACTIVE,
            isSpacoverProduct: isSpacoverProduct
        };
        
        console.log(`Upserting item with data:`, {
            quickbooksItemId: qboItem.Id,
            name: data.name,
            category: data.category,
            isSpacoverProduct: data.isSpacoverProduct
        });
        
        const result = await prisma.item.upsert({
            where: { quickbooksItemId: qboItem.Id },
            update: data,
            create: data
        });
        
        console.log(`Successfully upserted item ${qboItem.Id} from webhook. Database ID: ${result.id}`);
        
        // If this is a Spacover product, also create/update the Product record
        if (isSpacoverProduct && qboItem.Description) {
            const parsedProduct = parseProductDescription(qboItem.Description);
            if (parsedProduct) {
                const { product: createdProduct, created } = await findOrCreateProduct({
                    size: parsedProduct.specs.size,
                    shape: parsedProduct.specs.shape,
                    pieces: parsedProduct.specs.pieces,
                    foamThickness: parsedProduct.specs.foamThickness,
                    skit: parsedProduct.specs.skit,
                    tiedown: parsedProduct.specs.tiedown,
                    color: parsedProduct.specs.color
                });
                console.log(`Product ${created ? 'created' : 'found'} from item description: ${qboItem.Description}`);
            }
        }
        
    } catch (error) {
        console.error(`Failed to upsert item ${qboItem.Id}:`, error);
        throw error;
    }
}

/**
 * Upserts an order record from a QBO invoice payload into the local database.
 * Creates products from line item descriptions and links everything together.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboInvoice The invoice data from QuickBooks.
 */
async function upsertOrder(qboInvoice: QboInvoicePayload, _event: H3Event) {
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`Upserting order from invoice ${qboInvoice.Id} (DocNumber: ${qboInvoice.DocNumber})`);
    
    try {
        // First, ensure the customer exists
        const customer = await prisma.customer.findFirst({
            where: { quickbooksCustomerId: qboInvoice.CustomerRef.value }
        });
        
        if (!customer) {
            console.error(`Customer ${qboInvoice.CustomerRef.value} not found for invoice ${qboInvoice.Id}`);
            throw new Error(`Customer not found: ${qboInvoice.CustomerRef.value}`);
        }
        
        // Create or update the order
        const orderData = {
            quickbooksOrderId: qboInvoice.Id,
            customerId: customer.id,
            salesOrderNumber: qboInvoice.DocNumber,
            contactEmail: qboInvoice.BillEmail?.Address || customer.email || '',
            contactPhoneNumber: customer.contactNumber,
            billingAddressLine1: qboInvoice.BillAddr?.Line1,
            billingAddressLine2: qboInvoice.BillAddr?.Line2,
            billingCity: qboInvoice.BillAddr?.City,
            billingState: qboInvoice.BillAddr?.CountrySubDivisionCode,
            billingZipCode: qboInvoice.BillAddr?.PostalCode,
            billingCountry: qboInvoice.BillAddr?.Country,
            shippingAddressLine1: qboInvoice.ShipAddr?.Line1,
            shippingAddressLine2: qboInvoice.ShipAddr?.Line2,
            shippingCity: qboInvoice.ShipAddr?.City,
            shippingState: qboInvoice.ShipAddr?.CountrySubDivisionCode,
            shippingZipCode: qboInvoice.ShipAddr?.PostalCode,
            shippingCountry: qboInvoice.ShipAddr?.Country,
            orderStatus: OrderSystemStatus.PENDING,
            notes: qboInvoice.PrivateNote,
            transactionDate: new Date(qboInvoice.TxnDate)
        };
        
        const order = await prisma.order.upsert({
            where: { quickbooksOrderId: qboInvoice.Id },
            update: orderData,
            create: orderData
        });
        
        console.log(`Order upserted successfully. Database ID: ${order.id}`);
        
        // Log the initial order creation as a system change
        try {
            const { OrderTrackingService } = await import('~/server/utils/orderTrackingService');
            await OrderTrackingService.logOrderStatusChange({
                orderId: order.id,
                fromStatus: undefined, // No previous status
                toStatus: 'PENDING',
                userId: undefined, // System change
                changeReason: 'Order created via QuickBooks webhook',
                triggeredBy: 'system',
                notes: `Invoice ${qboInvoice.DocNumber} synced from QuickBooks`,
            });
        } catch (logError) {
            console.error('Failed to log order creation:', logError);
            // Don't fail the webhook if logging fails
        }
        
        // Process line items to create products and order items
        for (const lineItem of qboInvoice.Line) {
            if (lineItem.DetailType === 'SalesItemLineDetail' && lineItem.SalesItemLineDetail) {
                const detail = lineItem.SalesItemLineDetail;
                
                // Try to parse product from description
                let product = null;
                if (detail.Description) {
                    const parsedProduct = parseProductDescription(detail.Description);
                    if (parsedProduct) {
                        const { product: createdProduct, created: _created } = await findOrCreateProduct({
                            size: parsedProduct.specs.size,
                            shape: parsedProduct.specs.shape,
                            pieces: parsedProduct.specs.pieces,
                            foamThickness: parsedProduct.specs.foamThickness,
                            skit: parsedProduct.specs.skit,
                            tiedown: parsedProduct.specs.tiedown,
                            color: parsedProduct.specs.color
                        });
                        product = createdProduct;
                        console.log(`Product ${_created ? 'created' : 'found'} from description: ${detail.Description}`);
                    }
                }
                
                // Create order item
                const orderItemData = {
                    orderId: order.id,
                    itemId: detail.ItemRef.value, // Link to QBO item if available
                    quickbooksOrderLineId: lineItem.Id,
                    quantity: detail.Qty,
                    pricePerItem: detail.UnitPrice,
                    productId: product?.id, // Link to parsed product if available
                    notes: detail.Description
                };
                
                await prisma.orderItem.upsert({
                    where: { quickbooksOrderLineId: lineItem.Id },
                    update: orderItemData,
                    create: orderItemData
                });
                
                console.log(`Order item created for line ${lineItem.Id}: ${detail.Qty}x ${detail.ItemRef.name}`);
            }
        }
        
        console.log(`Successfully processed invoice ${qboInvoice.Id} with ${qboInvoice.Line.length} line items`);
        
    } catch (error) {
        console.error(`Failed to upsert order from invoice ${qboInvoice.Id}:`, error);
        throw error;
    }
}

/**
 * Upserts an estimate record from a QBO payload into the local database.
 * Creates products from line item descriptions and links everything together.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboEstimate The estimate data from QuickBooks.
 */
async function upsertEstimate(qboEstimate: QboEstimatePayload, _event: H3Event) {
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    console.log(`Upserting estimate ${qboEstimate.Id} (DocNumber: ${qboEstimate.DocNumber})`);
    
    try {
        // First, ensure the customer exists
        const customer = await prisma.customer.findFirst({
            where: { quickbooksCustomerId: qboEstimate.CustomerRef.value }
        });
        
        if (!customer) {
            console.error(`Customer ${qboEstimate.CustomerRef.value} not found for estimate ${qboEstimate.Id}`);
            throw new Error(`Customer not found: ${qboEstimate.CustomerRef.value}`);
        }
        
        // Create or update the estimate
        const estimateData = {
            quickbooksEstimateId: qboEstimate.Id,
            customerId: customer.id,
            estimateNumber: qboEstimate.DocNumber,
            contactEmail: qboEstimate.BillEmail?.Address || customer.email || '',
            contactPhoneNumber: customer.contactNumber,
            billingAddressLine1: qboEstimate.BillAddr?.Line1,
            billingAddressLine2: qboEstimate.BillAddr?.Line2,
            billingCity: qboEstimate.BillAddr?.City,
            billingState: qboEstimate.BillAddr?.CountrySubDivisionCode,
            billingZipCode: qboEstimate.BillAddr?.PostalCode,
            billingCountry: qboEstimate.BillAddr?.Country,
            shippingAddressLine1: qboEstimate.ShipAddr?.Line1,
            shippingAddressLine2: qboEstimate.ShipAddr?.Line2,
            shippingCity: qboEstimate.ShipAddr?.City,
            shippingState: qboEstimate.ShipAddr?.CountrySubDivisionCode,
            shippingZipCode: qboEstimate.ShipAddr?.PostalCode,
            shippingCountry: qboEstimate.ShipAddr?.Country,
            totalAmount: qboEstimate.TotalAmt,
            notes: qboEstimate.PrivateNote,
            transactionDate: new Date(qboEstimate.TxnDate)
        };
        
        const estimate = await prisma.estimate.upsert({
            where: { quickbooksEstimateId: qboEstimate.Id },
            update: estimateData,
            create: estimateData
        });
        
        console.log(`Estimate upserted successfully. Database ID: ${estimate.id}`);
        
        // Process line items to create products and estimate items
        for (const lineItem of qboEstimate.Line) {
            if (lineItem.DetailType === 'SalesItemLineDetail' && lineItem.SalesItemLineDetail) {
                const detail = lineItem.SalesItemLineDetail;
                
                // Try to parse product from description
                let product = null;
                if (detail.Description) {
                    const parsedProduct = parseProductDescription(detail.Description);
                    if (parsedProduct) {
                        const { product: createdProduct, created: _created } = await findOrCreateProduct({
                            size: parsedProduct.specs.size,
                            shape: parsedProduct.specs.shape,
                            pieces: parsedProduct.specs.pieces,
                            foamThickness: parsedProduct.specs.foamThickness,
                            skit: parsedProduct.specs.skit,
                            tiedown: parsedProduct.specs.tiedown,
                            color: parsedProduct.specs.color
                        });
                        product = createdProduct;
                        console.log(`Product ${_created ? 'created' : 'found'} from description: ${detail.Description}`);
                    }
                }
                
                // Create estimate item
                const estimateItemData = {
                    estimateId: estimate.id,
                    itemId: detail.ItemRef.value, // Link to QBO item if available
                    quickbooksEstimateLineId: lineItem.Id,
                    quantity: detail.Qty,
                    pricePerItem: detail.UnitPrice,
                    productId: product?.id, // Link to parsed product if available
                    notes: detail.Description
                };
                
                await prisma.estimateItem.upsert({
                    where: { quickbooksEstimateLineId: lineItem.Id },
                    update: estimateItemData,
                    create: estimateItemData
                });
                
                console.log(`Estimate item created for line ${lineItem.Id}: ${detail.Qty}x ${detail.ItemRef.name}`);
            }
        }
        
        console.log(`Successfully processed estimate ${qboEstimate.Id} with ${qboEstimate.Line.length} line items`);
        
    } catch (error) {
        console.error(`Failed to upsert estimate ${qboEstimate.Id}:`, error);
        throw error;
    }
}


export default defineEventHandler(async (event) => {
    const signature = getHeader(event, 'intuit-signature');
    const body = await readRawBody(event);

    if (!signature || !body) {
        console.log('Webhook request is missing signature or body.');
        throw createError({ statusCode: 400, statusMessage: 'Missing signature or body' });
    }

    if (!verifyWebhookSignature(signature, body)) {
        console.log('Webhook signature validation failed.');
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
                } else if (entity.name === 'Invoice' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                    console.log(`Processing ${entity.operation} event for Invoice ID: ${entity.id}`);
                    const invoiceDetails = await fetchInvoiceDetails(entity.id, event);
                    if (invoiceDetails) {
                        console.log(`Invoice details found, proceeding to upsert order...`);
                        await upsertOrder(invoiceDetails, event);
                    } else {
                        console.error(`Failed to fetch invoice details for ID: ${entity.id}`);
                    }
                } else if (entity.name === 'Item' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                    console.log(`Processing ${entity.operation} event for Item ID: ${entity.id}`);
                    const itemDetails = await fetchItemDetails(entity.id, event);
                    if (itemDetails) {
                        console.log(`Item details found, proceeding to upsert...`);
                        await upsertItem(itemDetails, event);
                    } else {
                        console.error(`Failed to fetch item details for ID: ${entity.id}`);
                    }
                } else if (entity.name === 'Estimate' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                    console.log(`Processing ${entity.operation} event for Estimate ID: ${entity.id}`);
                    const estimateDetails = await fetchEstimateDetails(entity.id, event);
                    if (estimateDetails) {
                        console.log(`Estimate details found, proceeding to upsert...`);
                        await upsertEstimate(estimateDetails, event);
                    } else {
                        console.error(`Failed to fetch estimate details for ID: ${entity.id}`);
                    }
                }
            }
        }
    }

    return { status: 'success' };
}); 