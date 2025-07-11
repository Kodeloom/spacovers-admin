import { getQboClient } from '~/server/lib/qbo-client';
import { getEnhancedPrismaClient } from '~/server/lib/db';
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
        const query = 'SELECT * FROM Item';
        const url = `${companyInfoUrl}/v3/company/${companyId}/query?query=${encodeURIComponent(query)}`;

        const response: { QueryResponse?: { Item: QboItem[] } } = await $fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token.access_token}`,
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
        };
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