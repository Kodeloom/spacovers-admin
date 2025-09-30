import crypto from 'crypto';
import { getQboClientForWebhook } from '~/server/lib/qbo-client';
import { CustomerType, CustomerStatus, OrderSystemStatus, ItemStatus } from '@prisma-app/client';
import type { H3Event } from 'h3';
import { parseProductDescription, findOrCreateProduct } from '~/server/utils/productParser';

/**
 * Enhanced retry mechanism with exponential backoff and jitter for API calls
 * @param operation The async operation to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelayMs Base delay in milliseconds
 * @param maxDelayMs Maximum delay in milliseconds
 * @param jitter Whether to add random jitter to delays
 * @returns Promise with the operation result
 */
async function retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000,
    jitter: boolean = true
): Promise<T> {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            
            // Don't retry on certain error types
            if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
                QuickBooksLogger.debug('WebhookRetry', `Non-retryable error encountered`, {
                    attempt,
                    errorStatus: error.status,
                    errorMessage: error.message
                });
                throw error;
            }
            
            // Don't retry on last attempt
            if (attempt === maxRetries) {
                break;
            }
            
            // Calculate delay with exponential backoff
            let delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            
            // Add jitter to prevent thundering herd
            if (jitter) {
                delay = delay * (0.5 + Math.random() * 0.5);
            }
            
            QuickBooksLogger.debug('WebhookRetry', `Retrying operation after delay`, {
                attempt,
                maxRetries,
                delayMs: Math.round(delay),
                errorStatus: error?.status,
                errorMessage: error?.message,
                isRateLimited: error?.status === 429
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Verifies the QuickBooks webhook signature.
 * @param signature The signature from the 'intuit-signature' header.
 * @param payload The raw request body.
 * @returns True if the signature is valid, false otherwise.
 */
function verifyWebhookSignature(signature: string, payload: string): boolean {
    const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;
    
    if (!verifierToken) {
        console.error('[WebhookSignature] QBO_WEBHOOK_VERIFIER_TOKEN is not set. Cannot verify webhook signature.');
        return false;
    }

    if (!signature || signature.length === 0) {
        console.error('[WebhookSignature] Empty or missing signature provided');
        return false;
    }

    if (!payload || payload.length === 0) {
        console.error('[WebhookSignature] Empty or missing payload provided');
        return false;
    }

    try {
        const hash = crypto.createHmac('sha256', verifierToken).update(payload).digest('base64');
        const isValid = hash === signature;
        
        console.log(`[WebhookSignature] Signature verification ${isValid ? 'succeeded' : 'failed'}`, {
            signatureLength: signature.length,
            payloadLength: payload.length,
            expectedHashPreview: hash.substring(0, 20) + '...',
            receivedSignaturePreview: signature.substring(0, 20) + '...',
            isValid
        });
        
        return isValid;
    } catch (error) {
        console.error('[WebhookSignature] Error during signature verification:', error);
        return false;
    }
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
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    QuickBooksLogger.info('WebhookFetch', `Starting fetchCustomerDetails for customer ID: ${customerId}`);
    
    try {
        const result = await retryWithExponentialBackoff(
            async () => {
            const startTime = Date.now();
            
            QuickBooksLogger.debug('WebhookFetch', 'Obtaining QBO client for webhook operation');
            const { oauthClient, token } = await getQboClientForWebhook(event);
            
            // Validate token before making API calls
            const { validateAccessToken } = await import('~/server/lib/qbo-client');
            const tokenValidation = validateAccessToken(token.access_token);
            
            if (!tokenValidation.isValid) {
                QuickBooksLogger.error('WebhookFetch', 'Invalid access token detected before API call', {
                    errors: tokenValidation.errors,
                    tokenDetails: tokenValidation.details,
                    customerId,
                    operation: 'fetchCustomerDetails'
                });
                throw new Error(`Invalid access token: ${tokenValidation.errors.join(', ')}`);
            }
            
            QuickBooksLogger.debug('WebhookFetch', 'Access token validation passed', {
                tokenLength: tokenValidation.details.length,
                tokenFormat: tokenValidation.details.format,
                customerId,
                operation: 'fetchCustomerDetails'
            });
            
            const companyId = token.realmId;
            if (!companyId) {
                throw new Error('QuickBooks Realm ID not found in token');
            }
            
            QuickBooksLogger.debug('WebhookFetch', `QBO client obtained successfully`, {
                companyId,
                tokenLength: token.access_token.length,
                environment: oauthClient.environment,
                customerId,
                operation: 'fetchCustomerDetails'
            });
            
            const companyInfoUrl = oauthClient.environment === 'sandbox' 
                ? 'https://sandbox-quickbooks.api.intuit.com' 
                : 'https://quickbooks.api.intuit.com';

            const query = `SELECT * FROM Customer WHERE Id = '${customerId}'`;
            const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

            QuickBooksLogger.debug('WebhookFetch', `Making API request to fetch customer details`, {
                customerId,
                queryUrl,
                tokenPreview: token.access_token.substring(0, 20) + '...',
                requestHeaders: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token.access_token.substring(0, 20)}...`,
                    'User-Agent': 'Spacovers-Admin/1.0'
                },
                timeout: 30000
            });

            let response: { QueryResponse: { Customer: QboCustomerPayload[] } };
            try {
                response = await $fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': 'Spacovers-Admin/1.0'
                    },
                    timeout: 30000 // 30 second timeout
                });
            } catch (apiError: any) {
                const duration = Date.now() - startTime;
                QuickBooksLogger.error('WebhookFetch', `API request failed for customer details`, apiError, undefined, companyId);
                QuickBooksLogger.debug('WebhookFetch', `API request failure details`, {
                    customerId,
                    queryUrl,
                    duration,
                    errorStatus: apiError?.status || apiError?.statusCode,
                    errorMessage: apiError?.message,
                    errorData: apiError?.data,
                    headers: apiError?.headers
                });
                throw apiError;
            }
            
            const duration = Date.now() - startTime;
            QuickBooksLogger.debug('WebhookFetch', `QBO API response received`, {
                hasQueryResponse: !!response.QueryResponse,
                customerCount: response.QueryResponse?.Customer?.length || 0,
                duration,
                customerId,
                responseSize: JSON.stringify(response).length
            });
            
            const customer = response.QueryResponse.Customer?.[0] || null;
            
            if (customer) {
                QuickBooksLogger.info('WebhookFetch', `Customer details fetched successfully`, {
                    customerId: customer.Id,
                    displayName: customer.DisplayName,
                    email: customer.PrimaryEmailAddr?.Address,
                    active: customer.Active,
                    duration,
                    hasShippingAddress: !!customer.ShipAddr,
                    hasPhone: !!customer.PrimaryPhone
                });
            } else {
                QuickBooksLogger.warn('WebhookFetch', `No customer found for ID: ${customerId}`, { 
                    duration,
                    queryResponse: response.QueryResponse,
                    queryUrl 
                });
            }
            
            return customer;
            },
            3, // Max 3 retries
            1000, // 1 second base delay
            30000, // 30 second max delay
            true // Enable jitter
        );

        return result;
    } catch (error: any) {
        QuickBooksLogger.error('WebhookFetch', `Failed to fetch customer details after retries`, error, undefined, undefined);
        return null;
    }
}

/**
 * Fetches the complete invoice details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchInvoiceDetails(invoiceId: string, event: H3Event): Promise<QboInvoicePayload | null> {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    QuickBooksLogger.info('WebhookFetch', `Starting fetchInvoiceDetails for invoice ID: ${invoiceId}`);
    
    try {
        const result = await retryWithExponentialBackoff(
            async () => {
            const startTime = Date.now();
            
            const { oauthClient, token } = await getQboClientForWebhook(event);
            
            // Validate token before making API calls
            const { validateAccessToken } = await import('~/server/lib/qbo-client');
            const tokenValidation = validateAccessToken(token.access_token);
            
            if (!tokenValidation.isValid) {
                QuickBooksLogger.error('WebhookFetch', 'Invalid access token detected before invoice API call', {
                    errors: tokenValidation.errors,
                    tokenDetails: tokenValidation.details,
                    invoiceId,
                    operation: 'fetchInvoiceDetails'
                });
                throw new Error(`Invalid access token: ${tokenValidation.errors.join(', ')}`);
            }
            
            const companyId = token.realmId;
            if (!companyId) {
                throw new Error('QuickBooks Realm ID not found in token');
            }
            
            QuickBooksLogger.debug('WebhookFetch', `QBO client obtained for invoice fetch`, {
                invoiceId,
                companyId,
                environment: oauthClient.environment,
                tokenFormat: tokenValidation.details.format,
                operation: 'fetchInvoiceDetails'
            });
            
            const companyInfoUrl = oauthClient.environment === 'sandbox' 
                ? 'https://sandbox-quickbooks.api.intuit.com' 
                : 'https://quickbooks.api.intuit.com';

            const query = `SELECT * FROM Invoice WHERE Id = '${invoiceId}'`;
            const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

            QuickBooksLogger.debug('WebhookFetch', `Making API request to fetch invoice details`, {
                invoiceId,
                queryUrl,
                tokenPreview: token.access_token.substring(0, 20) + '...',
                requestHeaders: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token.access_token.substring(0, 20)}...`,
                    'User-Agent': 'Spacovers-Admin/1.0'
                },
                timeout: 30000
            });

            let response: { QueryResponse: { Invoice: QboInvoicePayload[] } };
            try {
                response = await $fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': 'Spacovers-Admin/1.0'
                    },
                    timeout: 30000
                });
            } catch (apiError: any) {
                const duration = Date.now() - startTime;
                QuickBooksLogger.error('WebhookFetch', `API request failed for invoice details`, apiError, undefined, companyId);
                QuickBooksLogger.debug('WebhookFetch', `Invoice API request failure details`, {
                    invoiceId,
                    queryUrl,
                    duration,
                    errorStatus: apiError?.status || apiError?.statusCode,
                    errorMessage: apiError?.message,
                    errorData: apiError?.data,
                    headers: apiError?.headers,
                    isRetryable: apiError?.status >= 500 || apiError?.status === 429
                });
                throw apiError;
            }
            
            const duration = Date.now() - startTime;
            QuickBooksLogger.debug('WebhookFetch', `Invoice API response received`, {
                hasQueryResponse: !!response.QueryResponse,
                invoiceCount: response.QueryResponse?.Invoice?.length || 0,
                duration,
                invoiceId,
                responseSize: JSON.stringify(response).length
            });
            
            const invoice = response.QueryResponse.Invoice?.[0] || null;
            
            if (invoice) {
                QuickBooksLogger.info('WebhookFetch', `Invoice details fetched successfully`, {
                    invoiceId: invoice.Id,
                    docNumber: invoice.DocNumber,
                    customer: invoice.CustomerRef.name,
                    customerId: invoice.CustomerRef.value,
                    totalAmount: invoice.TotalAmt,
                    lineCount: invoice.Line?.length || 0,
                    duration,
                    txnDate: invoice.TxnDate,
                    hasBillAddr: !!invoice.BillAddr,
                    hasShipAddr: !!invoice.ShipAddr
                });
            } else {
                QuickBooksLogger.warn('WebhookFetch', `No invoice found for ID: ${invoiceId}`, { 
                    duration,
                    queryResponse: response.QueryResponse,
                    queryUrl 
                });
            }
            
            return invoice;
            },
            3, // Max 3 retries
            1000, // 1 second base delay
            30000, // 30 second max delay
            true // Enable jitter
        );

        return result;
    } catch (error: any) {
        QuickBooksLogger.error('WebhookFetch', `Failed to fetch invoice details after retries`, error);
        return null;
    }
}

/**
 * Fetches the complete item details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchItemDetails(itemId: string, event: H3Event): Promise<QboItemPayload | null> {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    QuickBooksLogger.info('WebhookFetch', `Starting fetchItemDetails for item ID: ${itemId}`);
    
    try {
        const result = await retryWithExponentialBackoff(
            async () => {
            const startTime = Date.now();
            
            const { oauthClient, token } = await getQboClientForWebhook(event);
            
            // Validate token before making API calls
            const { validateAccessToken } = await import('~/server/lib/qbo-client');
            const tokenValidation = validateAccessToken(token.access_token);
            
            if (!tokenValidation.isValid) {
                QuickBooksLogger.error('WebhookFetch', 'Invalid access token detected before item API call', {
                    errors: tokenValidation.errors,
                    tokenDetails: tokenValidation.details,
                    itemId,
                    operation: 'fetchItemDetails'
                });
                throw new Error(`Invalid access token: ${tokenValidation.errors.join(', ')}`);
            }
            
            const companyId = token.realmId;
            if (!companyId) {
                throw new Error('QuickBooks Realm ID not found in token');
            }
            
            QuickBooksLogger.debug('WebhookFetch', `QBO client obtained for item fetch`, {
                itemId,
                companyId,
                environment: oauthClient.environment,
                tokenFormat: tokenValidation.details.format,
                operation: 'fetchItemDetails'
            });
            
            const companyInfoUrl = oauthClient.environment === 'sandbox' 
                ? 'https://sandbox-quickbooks.api.intuit.com' 
                : 'https://quickbooks.api.intuit.com';

            const query = `SELECT * FROM Item WHERE Id = '${itemId}'`;
            const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

            QuickBooksLogger.debug('WebhookFetch', `Making API request to fetch item details`, {
                itemId,
                queryUrl,
                tokenPreview: token.access_token.substring(0, 20) + '...',
                requestHeaders: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token.access_token.substring(0, 20)}...`,
                    'User-Agent': 'Spacovers-Admin/1.0'
                },
                timeout: 30000
            });

            let response: { QueryResponse: { Item: QboItemPayload[] } };
            try {
                response = await $fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': 'Spacovers-Admin/1.0'
                    },
                    timeout: 30000
                });
            } catch (apiError: any) {
                const duration = Date.now() - startTime;
                QuickBooksLogger.error('WebhookFetch', `API request failed for item details`, apiError, undefined, companyId);
                QuickBooksLogger.debug('WebhookFetch', `Item API request failure details`, {
                    itemId,
                    queryUrl,
                    duration,
                    errorStatus: apiError?.status || apiError?.statusCode,
                    errorMessage: apiError?.message,
                    errorData: apiError?.data,
                    headers: apiError?.headers,
                    isRetryable: apiError?.status >= 500 || apiError?.status === 429
                });
                throw apiError;
            }
            
            const duration = Date.now() - startTime;
            QuickBooksLogger.debug('WebhookFetch', `Item API response received`, {
                hasQueryResponse: !!response.QueryResponse,
                itemCount: response.QueryResponse?.Item?.length || 0,
                duration,
                itemId,
                responseSize: JSON.stringify(response).length
            });
            
            const item = response.QueryResponse.Item?.[0] || null;
            
            if (item) {
                QuickBooksLogger.info('WebhookFetch', `Item details fetched successfully`, {
                    itemId: item.Id,
                    name: item.Name,
                    type: item.Type,
                    active: item.Active,
                    unitPrice: item.UnitPrice,
                    purchaseCost: item.PurchaseCost,
                    duration,
                    hasDescription: !!item.Description,
                    hasIncomeAccount: !!item.IncomeAccountRef,
                    hasExpenseAccount: !!item.ExpenseAccountRef
                });
            } else {
                QuickBooksLogger.warn('WebhookFetch', `No item found for ID: ${itemId}`, { 
                    duration,
                    queryResponse: response.QueryResponse,
                    queryUrl 
                });
            }
            
            return item;
            },
            3, // Max 3 retries
            1000, // 1 second base delay
            30000, // 30 second max delay
            true // Enable jitter
        );

        return result;
    } catch (error: any) {
        QuickBooksLogger.error('WebhookFetch', `Failed to fetch item details after retries`, error);
        return null;
    }
}

/**
 * Fetches the complete estimate details from QBO.
 * The webhook only gives us the ID, so we need to fetch the full record.
 */
async function fetchEstimateDetails(estimateId: string, event: H3Event): Promise<QboEstimatePayload | null> {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    QuickBooksLogger.info('WebhookFetch', `Starting fetchEstimateDetails for estimate ID: ${estimateId}`);
    
    try {
        const result = await retryWithExponentialBackoff(
            async () => {
            const startTime = Date.now();
            
            const { oauthClient, token } = await getQboClientForWebhook(event);
            
            // Validate token before making API calls
            const { validateAccessToken } = await import('~/server/lib/qbo-client');
            const tokenValidation = validateAccessToken(token.access_token);
            
            if (!tokenValidation.isValid) {
                QuickBooksLogger.error('WebhookFetch', 'Invalid access token detected before estimate API call', {
                    errors: tokenValidation.errors,
                    tokenDetails: tokenValidation.details,
                    estimateId,
                    operation: 'fetchEstimateDetails'
                });
                throw new Error(`Invalid access token: ${tokenValidation.errors.join(', ')}`);
            }
            
            const companyId = token.realmId;
            if (!companyId) {
                throw new Error('QuickBooks Realm ID not found in token');
            }
            
            QuickBooksLogger.debug('WebhookFetch', `QBO client obtained for estimate fetch`, {
                estimateId,
                companyId,
                environment: oauthClient.environment,
                tokenFormat: tokenValidation.details.format,
                operation: 'fetchEstimateDetails'
            });
            
            const companyInfoUrl = oauthClient.environment === 'sandbox' 
                ? 'https://sandbox-quickbooks.api.intuit.com' 
                : 'https://quickbooks.api.intuit.com';

            const query = `SELECT * FROM Estimate WHERE Id = '${estimateId}'`;
            const queryUrl = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

            QuickBooksLogger.debug('WebhookFetch', `Making API request to fetch estimate details`, {
                estimateId,
                queryUrl,
                tokenPreview: token.access_token.substring(0, 20) + '...',
                requestHeaders: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token.access_token.substring(0, 20)}...`,
                    'User-Agent': 'Spacovers-Admin/1.0'
                },
                timeout: 30000
            });

            let response: { QueryResponse: { Estimate: QboEstimatePayload[] } };
            try {
                response = await $fetch(queryUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token.access_token}`,
                        'User-Agent': 'Spacovers-Admin/1.0'
                    },
                    timeout: 30000
                });
            } catch (apiError: any) {
                const duration = Date.now() - startTime;
                QuickBooksLogger.error('WebhookFetch', `API request failed for estimate details`, apiError, undefined, companyId);
                QuickBooksLogger.debug('WebhookFetch', `Estimate API request failure details`, {
                    estimateId,
                    queryUrl,
                    duration,
                    errorStatus: apiError?.status || apiError?.statusCode,
                    errorMessage: apiError?.message,
                    errorData: apiError?.data,
                    headers: apiError?.headers,
                    isRetryable: apiError?.status >= 500 || apiError?.status === 429
                });
                throw apiError;
            }
            
            const duration = Date.now() - startTime;
            QuickBooksLogger.debug('WebhookFetch', `Estimate API response received`, {
                hasQueryResponse: !!response.QueryResponse,
                estimateCount: response.QueryResponse?.Estimate?.length || 0,
                duration,
                estimateId,
                responseSize: JSON.stringify(response).length
            });
            
            const estimate = response.QueryResponse.Estimate?.[0] || null;
            
            if (estimate) {
                QuickBooksLogger.info('WebhookFetch', `Estimate details fetched successfully`, {
                    estimateId: estimate.Id,
                    docNumber: estimate.DocNumber,
                    customer: estimate.CustomerRef.name,
                    customerId: estimate.CustomerRef.value,
                    totalAmount: estimate.TotalAmt,
                    lineCount: estimate.Line?.length || 0,
                    duration,
                    txnDate: estimate.TxnDate,
                    emailStatus: estimate.EmailStatus,
                    hasBillAddr: !!estimate.BillAddr,
                    hasShipAddr: !!estimate.ShipAddr
                });
            } else {
                QuickBooksLogger.warn('WebhookFetch', `No estimate found for ID: ${estimateId}`, { 
                    duration,
                    queryResponse: response.QueryResponse,
                    queryUrl 
                });
            }
            
            return estimate;
            },
            3, // Max 3 retries
            1000, // 1 second base delay
            30000, // 30 second max delay
            true // Enable jitter
        );

        return result;
    } catch (error: any) {
        QuickBooksLogger.error('WebhookFetch', `Failed to fetch estimate details after retries`, error);
        return null;
    }
}

/**
 * Upserts a customer record from a QBO payload into the local database.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboCustomer The customer data from QuickBooks.
 */
async function upsertCustomer(qboCustomer: QboCustomerPayload, _event: H3Event) {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    const startTime = Date.now();
    QuickBooksLogger.info('WebhookUpsert', `Starting customer upsert for ID: ${qboCustomer.Id}`);
    
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

    QuickBooksLogger.debug('WebhookUpsert', `Prepared customer data for upsert`, {
        quickbooksCustomerId: qboCustomer.Id,
        name: data.name,
        email: data.email,
        type: data.type,
        status: data.status,
        hasShippingAddress: !!(data.shippingAddressLine1 || data.shippingCity),
        hasContactNumber: !!data.contactNumber,
        customerTypeName
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
        
        const duration = Date.now() - startTime;
        QuickBooksLogger.info('WebhookUpsert', `Successfully upserted customer from webhook`, {
            quickbooksCustomerId: qboCustomer.Id,
            databaseId: result.id,
            name: result.name,
            type: result.type,
            status: result.status,
            duration,
            wasUpdate: !!result.updatedAt
        });
        
        return result;
    } catch (error: any) {
        const duration = Date.now() - startTime;
        QuickBooksLogger.error('WebhookUpsert', `Failed to upsert customer ${qboCustomer.Id}`, error);
        QuickBooksLogger.debug('WebhookUpsert', `Customer upsert failure details`, {
            quickbooksCustomerId: qboCustomer.Id,
            duration,
            errorCode: error?.code,
            errorMessage: error?.message,
            errorMeta: error?.meta,
            customerData: data
        });
        
        const qbError = QuickBooksErrorHandler.createError(error, `upsertCustomer(${qboCustomer.Id})`);
        throw qbError;
    }
}

/**
 * Upserts an item record from a QBO payload into the local database.
 * Uses unenhanced Prisma client to bypass ZenStack policies for webhook operations.
 * @param qboItem The item data from QuickBooks.
 */
async function upsertItem(qboItem: QboItemPayload, _event: H3Event) {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    const startTime = Date.now();
    QuickBooksLogger.info('WebhookUpsert', `Starting item upsert for ID: ${qboItem.Id} (Name: ${qboItem.Name})`);
    
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    try {
        // Determine if this is a Spacover product based on description
        let isSpacoverProduct = false;
        let parsedProduct = null;
        if (qboItem.Description) {
            parsedProduct = parseProductDescription(qboItem.Description);
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
        
        QuickBooksLogger.debug('WebhookUpsert', `Prepared item data for upsert`, {
            quickbooksItemId: qboItem.Id,
            name: data.name,
            category: data.category,
            isSpacoverProduct: data.isSpacoverProduct,
            hasDescription: !!data.description,
            unitPrice: data.wholesalePrice,
            purchaseCost: data.cost,
            active: qboItem.Active
        });
        
        const result = await prisma.item.upsert({
            where: { quickbooksItemId: qboItem.Id },
            update: data,
            create: data
        });
        
        const duration = Date.now() - startTime;
        QuickBooksLogger.info('WebhookUpsert', `Successfully upserted item from webhook`, {
            quickbooksItemId: qboItem.Id,
            databaseId: result.id,
            name: result.name,
            category: result.category,
            isSpacoverProduct: result.isSpacoverProduct,
            duration,
            wasUpdate: !!result.updatedAt
        });
        
        // If this is a Spacover product, also create/update the Product record
        if (isSpacoverProduct && parsedProduct) {
            try {
                const productStartTime = Date.now();
                const { product: createdProduct, created } = await findOrCreateProduct({
                    size: parsedProduct.specs.size,
                    shape: parsedProduct.specs.shape,
                    pieces: parsedProduct.specs.pieces,
                    foamThickness: parsedProduct.specs.foamThickness,
                    skit: parsedProduct.specs.skit,
                    tiedown: parsedProduct.specs.tiedown,
                    color: parsedProduct.specs.color
                });
                
                const productDuration = Date.now() - productStartTime;
                QuickBooksLogger.info('WebhookUpsert', `Product ${created ? 'created' : 'found'} from item description`, {
                    itemId: qboItem.Id,
                    productId: createdProduct.id,
                    description: qboItem.Description,
                    productSpecs: parsedProduct.specs,
                    created,
                    duration: productDuration
                });
            } catch (productError: any) {
                QuickBooksLogger.error('WebhookUpsert', `Failed to create/find product for item ${qboItem.Id}`, productError);
                // Don't throw here - item upsert was successful, product creation is secondary
            }
        }
        
        return result;
        
    } catch (error: any) {
        const duration = Date.now() - startTime;
        QuickBooksLogger.error('WebhookUpsert', `Failed to upsert item ${qboItem.Id}`, error);
        QuickBooksLogger.debug('WebhookUpsert', `Item upsert failure details`, {
            quickbooksItemId: qboItem.Id,
            duration,
            errorCode: error?.code,
            errorMessage: error?.message,
            errorMeta: error?.meta,
            itemData: {
                name: qboItem.Name,
                type: qboItem.Type,
                active: qboItem.Active,
                hasDescription: !!qboItem.Description
            }
        });
        
        const qbError = QuickBooksErrorHandler.createError(error, `upsertItem(${qboItem.Id})`);
        throw qbError;
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
                
                // Find or create the local item record
                let localItem = await prisma.item.findUnique({
                    where: { quickbooksItemId: detail.ItemRef.value }
                });
                
                if (!localItem) {
                    console.warn(`Item ${detail.ItemRef.name} (QBO ID: ${detail.ItemRef.value}) not found in local DB. Creating placeholder.`);
                    localItem = await prisma.item.create({
                        data: {
                            quickbooksItemId: detail.ItemRef.value,
                            name: detail.ItemRef.name || `QBO Item ${detail.ItemRef.value}`,
                            status: 'ACTIVE',
                            category: 'QBO Imported'
                        }
                    });
                }
                
                // Create order item with proper order isolation
                const orderItemData = {
                    orderId: order.id,
                    itemId: localItem.id, // Use local item ID
                    quickbooksOrderLineId: lineItem.Id,
                    quantity: detail.Qty,
                    pricePerItem: detail.UnitPrice,
                    productId: product?.id, // Link to parsed product if available
                    notes: detail.Description
                };
                
                // Validate sync operation before proceeding
                const { validateOrderItemSync, logOrderItemSyncOperation } = await import('~/server/utils/orderItemSyncValidation');
                const validation = await validateOrderItemSync(order.id, lineItem.Id, 'create');
                
                if (!validation.isValid) {
                    console.warn(`[WebhookSync] OrderItem validation failed: ${validation.message}`);
                    await logOrderItemSyncOperation({
                        orderId: order.id,
                        quickbooksOrderLineId: lineItem.Id,
                        itemId: localItem.id,
                        operation: 'create',
                        source: 'webhook',
                        success: false,
                        error: validation.message
                    });
                    // Continue processing other items instead of failing the entire webhook
                    continue;
                }
                
                // Use compound unique constraint to ensure proper order isolation
                const orderItem = await prisma.orderItem.upsert({
                    where: { 
                        orderId_quickbooksOrderLineId: {
                            orderId: order.id,
                            quickbooksOrderLineId: lineItem.Id
                        }
                    },
                    update: orderItemData,
                    create: orderItemData
                });
                
                // Log successful sync operation
                await logOrderItemSyncOperation({
                    orderId: order.id,
                    quickbooksOrderLineId: lineItem.Id,
                    itemId: localItem.id,
                    operation: orderItem ? 'update' : 'create',
                    source: 'webhook',
                    success: true
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
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    const startTime = Date.now();
    QuickBooksLogger.info('WebhookUpsert', `Starting estimate upsert for ID: ${qboEstimate.Id} (DocNumber: ${qboEstimate.DocNumber})`);
    
    // Use unenhanced Prisma client to bypass ZenStack policies for webhook operations
    const { unenhancedPrisma } = await import('~/server/lib/db');
    const prisma = unenhancedPrisma;
    
    try {
        // First, ensure the customer exists
        const customer = await prisma.customer.findFirst({
            where: { quickbooksCustomerId: qboEstimate.CustomerRef.value }
        });
        
        if (!customer) {
            QuickBooksLogger.error('WebhookUpsert', `Customer not found for estimate`, {
                estimateId: qboEstimate.Id,
                customerId: qboEstimate.CustomerRef.value,
                customerName: qboEstimate.CustomerRef.name
            });
            throw new Error(`Customer not found: ${qboEstimate.CustomerRef.value}`);
        }
        
        QuickBooksLogger.debug('WebhookUpsert', `Customer found for estimate`, {
            estimateId: qboEstimate.Id,
            customerId: customer.id,
            customerName: customer.name
        });
        
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
        
        QuickBooksLogger.debug('WebhookUpsert', `Prepared estimate data for upsert`, {
            quickbooksEstimateId: qboEstimate.Id,
            estimateNumber: estimateData.estimateNumber,
            customerId: estimateData.customerId,
            totalAmount: estimateData.totalAmount,
            lineItemCount: qboEstimate.Line?.length || 0,
            hasBillingAddress: !!(estimateData.billingAddressLine1 || estimateData.billingCity),
            hasShippingAddress: !!(estimateData.shippingAddressLine1 || estimateData.shippingCity)
        });
        
        const estimate = await prisma.estimate.upsert({
            where: { quickbooksEstimateId: qboEstimate.Id },
            update: estimateData,
            create: estimateData
        });
        
        QuickBooksLogger.info('WebhookUpsert', `Estimate upserted successfully`, {
            quickbooksEstimateId: qboEstimate.Id,
            databaseId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            totalAmount: estimate.totalAmount,
            wasUpdate: !!estimate.updatedAt
        });
        
        // Process line items to create products and estimate items
        let processedLineItems = 0;
        let createdProducts = 0;
        
        for (const lineItem of qboEstimate.Line) {
            if (lineItem.DetailType === 'SalesItemLineDetail' && lineItem.SalesItemLineDetail) {
                const detail = lineItem.SalesItemLineDetail;
                
                // Try to parse product from description
                let product = null;
                if (detail.Description) {
                    try {
                        const parsedProduct = parseProductDescription(detail.Description);
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
                            product = createdProduct;
                            if (created) createdProducts++;
                            
                            QuickBooksLogger.debug('WebhookUpsert', `Product ${created ? 'created' : 'found'} from estimate line item`, {
                                estimateId: qboEstimate.Id,
                                lineItemId: lineItem.Id,
                                productId: createdProduct.id,
                                description: detail.Description,
                                created
                            });
                        }
                    } catch (productError: any) {
                        QuickBooksLogger.warn('WebhookUpsert', `Failed to parse/create product from estimate line item`, {
                            estimateId: qboEstimate.Id,
                            lineItemId: lineItem.Id,
                            description: detail.Description,
                            error: productError.message
                        });
                    }
                }
                
                // Find or create the local item record
                let localItem = await prisma.item.findUnique({
                    where: { quickbooksItemId: detail.ItemRef.value }
                });
                
                if (!localItem) {
                    console.warn(`Item ${detail.ItemRef.name} (QBO ID: ${detail.ItemRef.value}) not found in local DB. Creating placeholder.`);
                    localItem = await prisma.item.create({
                        data: {
                            quickbooksItemId: detail.ItemRef.value,
                            name: detail.ItemRef.name || `QBO Item ${detail.ItemRef.value}`,
                            status: 'ACTIVE',
                            category: 'QBO Imported'
                        }
                    });
                }
                
                // Create estimate item
                const estimateItemData = {
                    estimateId: estimate.id,
                    itemId: localItem.id, // Use local item ID
                    quickbooksEstimateLineId: lineItem.Id,
                    quantity: detail.Qty,
                    pricePerItem: detail.UnitPrice,
                    lineDescription: detail.Description
                };
                
                await prisma.estimateItem.upsert({
                    where: { quickbooksEstimateLineId: lineItem.Id },
                    update: estimateItemData,
                    create: estimateItemData
                });
                
                processedLineItems++;
                
                QuickBooksLogger.debug('WebhookUpsert', `Estimate item processed`, {
                    estimateId: qboEstimate.Id,
                    lineItemId: lineItem.Id,
                    itemName: detail.ItemRef.name,
                    quantity: detail.Qty,
                    unitPrice: detail.UnitPrice,
                    hasProduct: !!product
                });
            }
        }
        
        const duration = Date.now() - startTime;
        QuickBooksLogger.info('WebhookUpsert', `Successfully processed estimate from webhook`, {
            quickbooksEstimateId: qboEstimate.Id,
            databaseId: estimate.id,
            totalLineItems: qboEstimate.Line.length,
            processedLineItems,
            createdProducts,
            duration
        });
        
        return estimate;
        
    } catch (error: any) {
        const duration = Date.now() - startTime;
        QuickBooksLogger.error('WebhookUpsert', `Failed to upsert estimate ${qboEstimate.Id}`, error);
        QuickBooksLogger.debug('WebhookUpsert', `Estimate upsert failure details`, {
            quickbooksEstimateId: qboEstimate.Id,
            duration,
            errorCode: error?.code,
            errorMessage: error?.message,
            errorMeta: error?.meta,
            estimateData: {
                docNumber: qboEstimate.DocNumber,
                customerId: qboEstimate.CustomerRef.value,
                customerName: qboEstimate.CustomerRef.name,
                totalAmount: qboEstimate.TotalAmt,
                lineItemCount: qboEstimate.Line?.length || 0
            }
        });
        
        const qbError = QuickBooksErrorHandler.createError(error, `upsertEstimate(${qboEstimate.Id})`);
        throw qbError;
    }
}


export default defineEventHandler(async (event) => {
    const { QuickBooksLogger } = await import('~/server/lib/quickbooksLogger');
    const { QuickBooksErrorHandler } = await import('~/server/lib/quickbooksErrorHandler');
    
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    QuickBooksLogger.info('WebhookHandler', `Webhook request received [${requestId}]`);
    
    try {
        // Extract and validate request data
        const signature = getHeader(event, 'intuit-signature');
        const body = await readRawBody(event);
        const userAgent = getHeader(event, 'user-agent');
        const contentType = getHeader(event, 'content-type');

        QuickBooksLogger.debug('WebhookHandler', `Webhook request headers [${requestId}]`, {
            hasSignature: !!signature,
            signatureLength: signature?.length || 0,
            userAgent,
            contentType,
            hasBody: !!body,
            bodyLength: body?.length || 0
        });

        if (!signature || !body) {
            QuickBooksLogger.error('WebhookHandler', `Webhook request missing signature or body [${requestId}]`, {
                hasSignature: !!signature,
                hasBody: !!body,
                bodyLength: body?.length || 0,
                userAgent,
                contentType,
                headers: Object.keys(event.headers || {})
            });
            throw createError({ statusCode: 400, statusMessage: 'Missing signature or body' });
        }

        QuickBooksLogger.debug('WebhookHandler', `Webhook request data extracted [${requestId}]`, {
            signatureLength: signature.length,
            bodyLength: body.length,
            signaturePreview: signature.substring(0, 20) + '...',
            bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : ''),
            isValidJson: (() => {
                try { JSON.parse(body); return true; } catch { return false; }
            })()
        });

        // Verify webhook signature
        const signatureVerificationStart = Date.now();
        const isSignatureValid = verifyWebhookSignature(signature, body);
        const signatureVerificationDuration = Date.now() - signatureVerificationStart;
        
        if (!isSignatureValid) {
            QuickBooksLogger.error('WebhookHandler', `Webhook signature validation failed [${requestId}]`, {
                signature: signature.substring(0, 20) + '...',
                bodyLength: body.length,
                verificationDuration: signatureVerificationDuration,
                hasVerifierToken: !!process.env.QBO_WEBHOOK_VERIFIER_TOKEN,
                verifierTokenLength: process.env.QBO_WEBHOOK_VERIFIER_TOKEN?.length || 0
            });
            throw createError({ statusCode: 401, statusMessage: 'Invalid signature' });
        }

        QuickBooksLogger.info('WebhookHandler', `Webhook signature verified successfully [${requestId}]`, {
            verificationDuration: signatureVerificationDuration
        });
        
        // Parse payload
        let payload;
        const parseStart = Date.now();
        try {
            payload = JSON.parse(body);
        } catch (parseError: any) {
            const parseDuration = Date.now() - parseStart;
            QuickBooksLogger.error('WebhookHandler', `Failed to parse webhook payload [${requestId}]`, parseError);
            QuickBooksLogger.debug('WebhookHandler', `JSON parse failure details [${requestId}]`, {
                bodyLength: body.length,
                bodyPreview: body.substring(0, 200) + (body.length > 200 ? '...' : ''),
                parseError: parseError.message,
                parseDuration
            });
            throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' });
        }

        const parseDuration = Date.now() - parseStart;
        QuickBooksLogger.debug('WebhookHandler', `Webhook payload parsed [${requestId}]`, {
            hasEventNotifications: !!payload.eventNotifications,
            notificationCount: payload.eventNotifications?.length || 0,
            parseDuration,
            payloadKeys: Object.keys(payload || {}),
            payloadSize: JSON.stringify(payload).length
        });

        // Process each notification
        if (payload.eventNotifications) {
            let processedEntities = 0;
            let failedEntities = 0;
            const entityResults: Array<{ type: string; id: string; operation: string; success: boolean; error?: string }> = [];

            for (const notification of payload.eventNotifications) {
                const notificationStartTime = Date.now();
                QuickBooksLogger.debug('WebhookHandler', `Processing notification [${requestId}]`, {
                    realmId: notification.realmId,
                    entityCount: notification.dataChangeEvent?.entities?.length || 0,
                    hasDataChangeEvent: !!notification.dataChangeEvent,
                    eventTime: notification.eventTime,
                    notificationKeys: Object.keys(notification || {})
                });

                for (const entity of notification.dataChangeEvent.entities) {
                    const entityStartTime = Date.now();
                    
                    try {
                        QuickBooksLogger.info('WebhookHandler', `Processing ${entity.operation} event for ${entity.name} ID: ${entity.id} [${requestId}]`);

                        if (entity.name === 'Customer' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                            const customerDetails = await fetchCustomerDetails(entity.id, event);
                            if (customerDetails) {
                                QuickBooksLogger.debug('WebhookHandler', `Customer details found, proceeding to upsert [${requestId}]`, {
                                    customerId: entity.id,
                                    displayName: customerDetails.DisplayName,
                                    active: customerDetails.Active,
                                    hasEmail: !!customerDetails.PrimaryEmailAddr?.Address
                                });
                                await upsertCustomer(customerDetails, event);
                                entityResults.push({ type: 'Customer', id: entity.id, operation: entity.operation, success: true });
                                processedEntities++;
                            } else {
                                throw new Error(`Failed to fetch customer details for ID: ${entity.id}`);
                            }
                        } else if (entity.name === 'Invoice' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                            const invoiceDetails = await fetchInvoiceDetails(entity.id, event);
                            if (invoiceDetails) {
                                QuickBooksLogger.debug('WebhookHandler', `Invoice details found, proceeding to upsert order [${requestId}]`, {
                                    invoiceId: entity.id,
                                    docNumber: invoiceDetails.DocNumber,
                                    customerId: invoiceDetails.CustomerRef.value,
                                    customerName: invoiceDetails.CustomerRef.name,
                                    totalAmount: invoiceDetails.TotalAmt,
                                    lineItemCount: invoiceDetails.Line?.length || 0
                                });
                                await upsertOrder(invoiceDetails, event);
                                entityResults.push({ type: 'Invoice', id: entity.id, operation: entity.operation, success: true });
                                processedEntities++;
                            } else {
                                throw new Error(`Failed to fetch invoice details for ID: ${entity.id}`);
                            }
                        } else if (entity.name === 'Item' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                            const itemDetails = await fetchItemDetails(entity.id, event);
                            if (itemDetails) {
                                QuickBooksLogger.debug('WebhookHandler', `Item details found, proceeding to upsert [${requestId}]`, {
                                    itemId: entity.id,
                                    name: itemDetails.Name,
                                    type: itemDetails.Type,
                                    active: itemDetails.Active,
                                    hasDescription: !!itemDetails.Description
                                });
                                await upsertItem(itemDetails, event);
                                entityResults.push({ type: 'Item', id: entity.id, operation: entity.operation, success: true });
                                processedEntities++;
                            } else {
                                throw new Error(`Failed to fetch item details for ID: ${entity.id}`);
                            }
                        } else if (entity.name === 'Estimate' && (entity.operation === 'Create' || entity.operation === 'Update')) {
                            const estimateDetails = await fetchEstimateDetails(entity.id, event);
                            if (estimateDetails) {
                                QuickBooksLogger.debug('WebhookHandler', `Estimate details found, proceeding to upsert [${requestId}]`, {
                                    estimateId: entity.id,
                                    docNumber: estimateDetails.DocNumber,
                                    customerId: estimateDetails.CustomerRef.value,
                                    customerName: estimateDetails.CustomerRef.name,
                                    totalAmount: estimateDetails.TotalAmt,
                                    lineItemCount: estimateDetails.Line?.length || 0
                                });
                                await upsertEstimate(estimateDetails, event);
                                entityResults.push({ type: 'Estimate', id: entity.id, operation: entity.operation, success: true });
                                processedEntities++;
                            } else {
                                throw new Error(`Failed to fetch estimate details for ID: ${entity.id}`);
                            }
                        } else {
                            QuickBooksLogger.debug('WebhookHandler', `Skipping unsupported entity [${requestId}]`, {
                                entityName: entity.name,
                                operation: entity.operation,
                                id: entity.id,
                                supportedEntities: ['Customer', 'Invoice', 'Item', 'Estimate'],
                                supportedOperations: ['Create', 'Update']
                            });
                        }

                        const entityDuration = Date.now() - entityStartTime;
                        QuickBooksLogger.debug('WebhookHandler', `Entity processed successfully [${requestId}]`, {
                            entityType: entity.name,
                            entityId: entity.id,
                            operation: entity.operation,
                            duration: entityDuration
                        });

                    } catch (entityError: any) {
                        failedEntities++;
                        const entityDuration = Date.now() - entityStartTime;
                        const errorMessage = entityError instanceof Error ? entityError.message : 'Unknown error';
                        
                        QuickBooksLogger.error('WebhookHandler', `Failed to process entity [${requestId}]`, entityError, undefined, undefined);
                        
                        // Enhanced error logging for debugging
                        QuickBooksLogger.debug('WebhookHandler', `Entity processing failure details [${requestId}]`, {
                            entityType: entity.name,
                            entityId: entity.id,
                            operation: entity.operation,
                            duration: entityDuration,
                            errorType: entityError?.type || entityError?.name,
                            errorMessage: errorMessage,
                            errorStatus: entityError?.status || entityError?.statusCode,
                            isAuthError: errorMessage.toLowerCase().includes('auth') || errorMessage.toLowerCase().includes('token'),
                            isNetworkError: errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('timeout'),
                            isRetryable: entityError?.retryable !== false
                        });
                        
                        entityResults.push({ 
                            type: entity.name, 
                            id: entity.id, 
                            operation: entity.operation, 
                            success: false, 
                            error: errorMessage 
                        });

                        // Continue processing other entities even if one fails
                        QuickBooksLogger.warn('WebhookHandler', `Continuing with next entity after failure [${requestId}]`, {
                            failedEntityType: entity.name,
                            failedEntityId: entity.id,
                            duration: entityDuration,
                            remainingEntities: notification.dataChangeEvent.entities.length - (processedEntities + failedEntities)
                        });
                    }
                }
                
                const notificationDuration = Date.now() - notificationStartTime;
                QuickBooksLogger.debug('WebhookHandler', `Notification processing completed [${requestId}]`, {
                    realmId: notification.realmId,
                    entitiesProcessed: notification.dataChangeEvent?.entities?.length || 0,
                    duration: notificationDuration
                });
            }

            const totalDuration = Date.now() - startTime;
            
            // Log performance metrics
            QuickBooksLogger.logPerformanceMetrics('webhook-processing', {
                duration: totalDuration,
                success: failedEntities === 0,
                retryCount: 0
            });
            
            QuickBooksLogger.info('WebhookHandler', `Webhook processing completed [${requestId}]`, {
                totalEntities: processedEntities + failedEntities,
                processedEntities,
                failedEntities,
                duration: totalDuration,
                successRate: processedEntities > 0 ? ((processedEntities / (processedEntities + failedEntities)) * 100).toFixed(1) + '%' : '0%',
                averageEntityProcessingTime: processedEntities > 0 ? Math.round(totalDuration / processedEntities) : 0,
                entityResults: entityResults.map(r => ({
                    type: r.type,
                    id: r.id,
                    operation: r.operation,
                    success: r.success,
                    error: r.error ? r.error.substring(0, 100) + (r.error.length > 100 ? '...' : '') : undefined
                }))
            });

            // Return success even if some entities failed (partial success)
            return { 
                status: 'success', 
                processed: processedEntities, 
                failed: failedEntities,
                requestId,
                duration: totalDuration,
                successRate: processedEntities > 0 ? ((processedEntities / (processedEntities + failedEntities)) * 100).toFixed(1) + '%' : '0%'
            };
        } else {
            QuickBooksLogger.warn('WebhookHandler', `No event notifications found in payload [${requestId}]`);
            return { status: 'success', message: 'No notifications to process', requestId };
        }

    } catch (error: any) {
        const totalDuration = Date.now() - startTime;
        const qbError = QuickBooksErrorHandler.createError(error, `WebhookHandler[${requestId}]`);
        
        QuickBooksLogger.error('WebhookHandler', `Webhook processing failed [${requestId}]`, qbError, undefined, undefined);
        
        // Enhanced error context logging
        QuickBooksLogger.debug('WebhookHandler', `Webhook failure context [${requestId}]`, {
            duration: totalDuration,
            errorType: error?.type || error?.name || 'Unknown',
            errorStatus: error?.status || error?.statusCode,
            errorMessage: error?.message,
            isAuthError: error?.message?.toLowerCase().includes('auth') || error?.message?.toLowerCase().includes('token'),
            isNetworkError: error?.message?.toLowerCase().includes('network') || error?.message?.toLowerCase().includes('timeout'),
            isSignatureError: error?.message?.toLowerCase().includes('signature'),
            isParseError: error?.message?.toLowerCase().includes('json') || error?.message?.toLowerCase().includes('parse'),
            requestHeaders: {
                userAgent: getHeader(event, 'user-agent'),
                contentType: getHeader(event, 'content-type'),
                hasSignature: !!getHeader(event, 'intuit-signature')
            }
        });
        
        // Log performance metrics even for failures
        QuickBooksLogger.logPerformanceMetrics('webhook-processing', {
            duration: totalDuration,
            success: false,
            retryCount: 0
        });

        throw error;
    }
}); 