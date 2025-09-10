import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { QBO_API_CONFIG } from '~/server/lib/qbo-client';
import { ItemStatus } from '@prisma-app/client';

interface QboItem {
    Id: string;
    Name: string;
    Description?: string;
    Active: boolean;
    UnitPrice?: number;
    PurchaseCost?: number;
    Type?: string; // e.g., 'Service', 'Inventory'
    SubItem?: boolean;
    ParentRef?: { name: string; value: string; };
}

export default defineEventHandler(async (event) => {
    try {
        const { oauthClient, token } = await getQboClient(event);
        const prisma = await getEnhancedPrismaClient(event);

        const companyId = token.realmId;
        if (!companyId) {
            throw createError({ statusCode: 400, statusMessage: 'QuickBooks Realm ID not found.' });
        }
        const companyInfoUrl = oauthClient.environment === 'sandbox'
            ? 'https://sandbox-quickbooks.api.intuit.com'
            : 'https://quickbooks.api.intuit.com';
        const apiVersion = QBO_API_CONFIG.VERSION;
        const query = 'SELECT * FROM Item';
        const url = `${companyInfoUrl}/${apiVersion}/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        console.log(`🔍 Using QBO API version: ${apiVersion}`);
        console.log(`🔍 Items query: ${query}`);
        console.log(`🔍 Query URL: ${url}`);

        const response: { QueryResponse?: { Item: QboItem[] } } = await $fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`,
                'User-Agent': QBO_API_CONFIG.USER_AGENT
            },
        });

        // The actual items are nested under QueryResponse.Item
        let qboItems = response?.QueryResponse?.Item || [];
        
        // QBO API might return a single object if there's only one result.
        if (qboItems && !Array.isArray(qboItems)) {
            qboItems = [qboItems];
        }

        if (!qboItems || qboItems.length === 0) {
            return { created: 0, updated: 0, message: 'No items found in QuickBooks to sync.' };
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const qboItem of qboItems) {
            const status = qboItem.Active ? ItemStatus.ACTIVE : ItemStatus.INACTIVE;
            const data = {
                name: qboItem.Name,
                description: qboItem.Description,
                // QBO doesn't have a simple 'category', using Type as a stand-in
                // It could be 'Service' or 'Inventory'.
                category: qboItem.Type,
                wholesalePrice: qboItem.UnitPrice, // Assuming UnitPrice is wholesale
                retailPrice: qboItem.UnitPrice, // No distinct retail price in this structure
                cost: qboItem.PurchaseCost,
                status,
            };

            const existingItem = await prisma.item.findUnique({
                where: { quickbooksItemId: qboItem.Id },
            });

            if (existingItem) {
                await prisma.item.update({
                    where: { id: existingItem.id },
                    data,
                });
                updatedCount++;
            } else {
                await prisma.item.create({
                    data: {
                        ...data,
                        quickbooksItemId: qboItem.Id,
                    },
                });
                createdCount++;
            }
        }

        return { created: createdCount, updated: updatedCount };
    } catch (error: unknown) {
        // More specific type for the caught error
        const e = error as { 
            data?: { 
                Fault?: { 
                    Error: { Detail?: string; Message?: string; }[] 
                } 
            }; 
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
        
        console.error('--- QuickBooks API Error Details ---', JSON.stringify(e?.data || e, null, 2));

        const qboError = e.data?.Fault?.Error?.[0];
        const errorMessage = qboError?.Detail || qboError?.Message || e.message || 'An unknown error occurred while syncing items.';

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to sync items from QuickBooks.',
            data: { message: errorMessage },
        });
    }
}); 