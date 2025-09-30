/**
 * Script to diagnose and fix OrderItem isolation issues
 * This script identifies and resolves cross-order contamination problems
 */

import { unenhancedPrisma as prisma } from '~/server/lib/db';
import { validateOrderItemIsolation, fixOrderItemRelationships } from '~/server/utils/orderItemSyncValidation';

interface IsolationIssue {
    orderId: string;
    orderNumber: string;
    issues: string[];
    itemCount: number;
}

async function diagnoseOrderItemIsolation(): Promise<IsolationIssue[]> {
    console.log('🔍 Diagnosing OrderItem isolation issues...\n');
    
    // Get all orders with OrderItems
    const orders = await prisma.order.findMany({
        where: {
            orderItems: {
                some: {}
            }
        },
        select: {
            id: true,
            salesOrderNumber: true,
            quickbooksOrderId: true,
            _count: {
                select: {
                    orderItems: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`📊 Found ${orders.length} orders with items to validate\n`);

    const issuesFound: IsolationIssue[] = [];
    let validatedCount = 0;
    let issueCount = 0;

    for (const order of orders) {
        const validation = await validateOrderItemIsolation(order.id);
        validatedCount++;
        
        if (!validation.isValid) {
            issueCount++;
            issuesFound.push({
                orderId: order.id,
                orderNumber: order.salesOrderNumber || 'Unknown',
                issues: validation.issues,
                itemCount: validation.itemCount
            });
            
            console.log(`❌ Order ${order.salesOrderNumber} (${order.id}):`);
            validation.issues.forEach(issue => {
                console.log(`   - ${issue}`);
            });
            console.log(`   Items: ${validation.itemCount}\n`);
        } else {
            console.log(`✅ Order ${order.salesOrderNumber} - OK (${validation.itemCount} items)`);
        }
    }

    console.log(`\n📈 Validation Summary:`);
    console.log(`   Total orders validated: ${validatedCount}`);
    console.log(`   Orders with issues: ${issueCount}`);
    console.log(`   Orders without issues: ${validatedCount - issueCount}`);

    return issuesFound;
}

async function findCrossOrderContamination(): Promise<void> {
    console.log('\n🔍 Searching for cross-order contamination...\n');
    
    // Find QuickBooks line IDs that appear in multiple orders
    const duplicateLineIds = await prisma.$queryRaw<Array<{
        quickbooksOrderLineId: string;
        orderCount: number;
        orderIds: string[];
    }>>`
        SELECT 
            "quickbooksOrderLineId",
            COUNT(DISTINCT "orderId") as "orderCount",
            ARRAY_AGG(DISTINCT "orderId") as "orderIds"
        FROM "OrderItem" 
        WHERE "quickbooksOrderLineId" IS NOT NULL
        GROUP BY "quickbooksOrderLineId"
        HAVING COUNT(DISTINCT "orderId") > 1
        ORDER BY "orderCount" DESC
    `;

    if (duplicateLineIds.length === 0) {
        console.log('✅ No cross-order contamination found!');
        return;
    }

    console.log(`❌ Found ${duplicateLineIds.length} QuickBooks line IDs shared across multiple orders:\n`);

    for (const duplicate of duplicateLineIds) {
        console.log(`📋 Line ID: ${duplicate.quickbooksOrderLineId}`);
        console.log(`   Appears in ${duplicate.orderCount} orders:`);
        
        // Get order details
        const orders = await prisma.order.findMany({
            where: {
                id: { in: duplicate.orderIds }
            },
            select: {
                id: true,
                salesOrderNumber: true,
                quickbooksOrderId: true,
                orderItems: {
                    where: {
                        quickbooksOrderLineId: duplicate.quickbooksOrderLineId
                    },
                    select: {
                        id: true,
                        quantity: true,
                        pricePerItem: true,
                        itemStatus: true,
                        item: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        orders.forEach(order => {
            console.log(`   - Order ${order.salesOrderNumber} (${order.id}):`);
            order.orderItems.forEach(item => {
                console.log(`     * ${item.item.name} x${item.quantity} @ $${item.pricePerItem} [${item.itemStatus}]`);
            });
        });
        console.log('');
    }
}

async function fixIsolationIssues(dryRun: boolean = true): Promise<void> {
    console.log(`\n🔧 ${dryRun ? 'Simulating' : 'Executing'} isolation fixes...\n`);
    
    const issues = await diagnoseOrderItemIsolation();
    
    if (issues.length === 0) {
        console.log('✅ No isolation issues found to fix!');
        return;
    }

    console.log(`Found ${issues.length} orders with isolation issues:\n`);

    for (const issue of issues) {
        console.log(`🔧 ${dryRun ? 'Would fix' : 'Fixing'} Order ${issue.orderNumber} (${issue.orderId}):`);
        
        if (!dryRun) {
            const result = await fixOrderItemRelationships(issue.orderId);
            console.log(`   Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
            console.log(`   Message: ${result.message}`);
            console.log(`   Items processed: ${result.itemsProcessed}`);
        } else {
            console.log(`   Issues to fix:`);
            issue.issues.forEach(issueText => {
                console.log(`   - ${issueText}`);
            });
        }
        console.log('');
    }

    if (dryRun) {
        console.log('💡 This was a dry run. To execute fixes, run with --fix flag');
    }
}

async function generateIsolationReport(): Promise<void> {
    console.log('📊 Generating OrderItem isolation report...\n');
    
    // Overall statistics
    const totalOrders = await prisma.order.count();
    const ordersWithItems = await prisma.order.count({
        where: {
            orderItems: {
                some: {}
            }
        }
    });
    const totalOrderItems = await prisma.orderItem.count();
    
    console.log('📈 Overall Statistics:');
    console.log(`   Total orders: ${totalOrders}`);
    console.log(`   Orders with items: ${ordersWithItems}`);
    console.log(`   Total order items: ${totalOrderItems}`);
    console.log(`   Average items per order: ${ordersWithItems > 0 ? (totalOrderItems / ordersWithItems).toFixed(2) : 0}\n`);
    
    // QuickBooks integration statistics
    const qboOrderItems = await prisma.orderItem.count({
        where: {
            quickbooksOrderLineId: { not: null }
        }
    });
    
    const qboOrders = await prisma.order.count({
        where: {
            quickbooksOrderId: { not: null }
        }
    });
    
    console.log('🔗 QuickBooks Integration:');
    console.log(`   Orders synced from QBO: ${qboOrders}`);
    console.log(`   Order items with QBO line IDs: ${qboOrderItems}`);
    console.log(`   QBO integration coverage: ${totalOrderItems > 0 ? ((qboOrderItems / totalOrderItems) * 100).toFixed(1) : 0}%\n`);
    
    // Run isolation diagnosis
    await diagnoseOrderItemIsolation();
    
    // Check for cross-order contamination
    await findCrossOrderContamination();
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'report';
    const isDryRun = !args.includes('--fix');
    
    try {
        switch (command) {
            case 'report':
                await generateIsolationReport();
                break;
                
            case 'diagnose':
                await diagnoseOrderItemIsolation();
                break;
                
            case 'contamination':
                await findCrossOrderContamination();
                break;
                
            case 'fix':
                await fixIsolationIssues(isDryRun);
                break;
                
            default:
                console.log('Usage: npm run fix-orderitem-isolation [command] [--fix]');
                console.log('');
                console.log('Commands:');
                console.log('  report       Generate full isolation report (default)');
                console.log('  diagnose     Diagnose isolation issues');
                console.log('  contamination Check for cross-order contamination');
                console.log('  fix          Fix isolation issues (add --fix to execute)');
                console.log('');
                console.log('Examples:');
                console.log('  npm run fix-orderitem-isolation report');
                console.log('  npm run fix-orderitem-isolation fix --fix');
                break;
        }
    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch(console.error);