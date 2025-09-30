#!/usr/bin/env tsx
/**
 * Emergency Database Recovery Script
 * 
 * This script is designed to recover from complete database loss or corruption.
 * It will recreate the essential system structure and create a superadmin user.
 * 
 * Usage:
 *   npm run emergency-recovery
 *   npm run emergency-recovery -- --confirm
 */

import { PrismaClient } from '@prisma-app/client';
import { createSuperAdmin } from './create-superadmin';

const prisma = new PrismaClient();

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
}

async function checkDatabaseState() {
    console.log(colorize('🔍 Checking database state...', 'blue'));
    
    try {
        const userCount = await prisma.user.count();
        const roleCount = await prisma.role.count();
        const permissionCount = await prisma.permission.count();
        const stationCount = await prisma.station.count();
        
        console.log(colorize(`📊 Current database state:`, 'cyan'));
        console.log(colorize(`   Users: ${userCount}`, 'white'));
        console.log(colorize(`   Roles: ${roleCount}`, 'white'));
        console.log(colorize(`   Permissions: ${permissionCount}`, 'white'));
        console.log(colorize(`   Stations: ${stationCount}`, 'white'));
        
        const isEmpty = userCount === 0 && roleCount === 0 && permissionCount === 0;
        
        if (isEmpty) {
            console.log(colorize('⚠️  Database appears to be empty - recovery needed', 'yellow'));
        } else {
            console.log(colorize('ℹ️  Database has existing data', 'blue'));
        }
        
        return { userCount, roleCount, permissionCount, stationCount, isEmpty };
    } catch (error) {
        console.error(colorize('❌ Failed to check database state:', 'red'), error);
        throw error;
    }
}

async function createEssentialStations() {
    console.log(colorize('🏭 Creating essential production stations...', 'blue'));
    
    const stations = [
        { name: 'Cutting', description: 'Station for cutting operations' },
        { name: 'Sewing', description: 'Station for sewing operations' },
        { name: 'Foam Cutting', description: 'Station for foam cutting operations' },
        { name: 'Packaging', description: 'Station for packaging operations' },
    ];

    let createdCount = 0;
    
    for (const stationData of stations) {
        const station = await prisma.station.upsert({
            where: { name: stationData.name },
            update: {},
            create: stationData,
        });
        createdCount++;
        console.log(colorize(`✅ Station: ${station.name}`, 'green'));
    }
    
    console.log(colorize(`✅ ${createdCount} stations ready`, 'green'));
}

async function createEssentialItems() {
    console.log(colorize('📦 Creating essential Spacover items...', 'blue'));
    
    const spacoverItems = [
        { 
            name: 'Spacovers Out Of State Retail',
            description: 'Spacover product for out-of-state retail customers',
            isSpacoverProduct: true,
            status: 'ACTIVE'
        },
        { 
            name: 'Spacovers Out Of State Wholesale',
            description: 'Spacover product for out-of-state wholesale customers',
            isSpacoverProduct: true,
            status: 'ACTIVE'
        },
        { 
            name: 'Spacovers CA Retail',
            description: 'Spacover product for California retail customers',
            isSpacoverProduct: true,
            status: 'ACTIVE'
        },
        { 
            name: 'Spacovers CA Wholesale',
            description: 'Spacover product for California wholesale customers',
            isSpacoverProduct: true,
            status: 'ACTIVE'
        }
    ];

    let createdCount = 0;
    
    for (const itemData of spacoverItems) {
        // Check if item exists by name
        const existingItem = await prisma.item.findFirst({
            where: { name: itemData.name }
        });

        let item;
        if (existingItem) {
            // Update existing item
            item = await prisma.item.update({
                where: { id: existingItem.id },
                data: {
                    isSpacoverProduct: true,
                    status: itemData.status as any,
                    description: itemData.description
                }
            });
        } else {
            // Create new item
            item = await prisma.item.create({
                data: {
                    name: itemData.name,
                    description: itemData.description,
                    isSpacoverProduct: true,
                    status: itemData.status as any
                }
            });
        }
        createdCount++;
        console.log(colorize(`✅ Item: ${item.name}`, 'green'));
    }
    
    console.log(colorize(`✅ ${createdCount} essential items ready`, 'green'));
}

async function createRoleTypes() {
    console.log(colorize('👥 Creating role types...', 'blue'));
    
    const roleTypes = [
        {
            name: 'Office Employee',
            description: 'General office staff with basic administrative access',
            color: '#10B981',
            canUseStations: false,
            isSystem: true,
            displayOrder: 1,
        },
        {
            name: 'Customer Service',
            description: 'Customer-facing staff who manage customer relationships and orders',
            color: '#3B82F6',
            canUseStations: false,
            isSystem: true,
            displayOrder: 2,
        },
        {
            name: 'Warehouse Staff',
            description: 'Production workers assigned to specific manufacturing stations',
            color: '#F59E0B',
            canUseStations: true,
            isSystem: true,
            displayOrder: 3,
        },
        {
            name: 'Manager',
            description: 'Management staff with oversight and reporting capabilities',
            color: '#8B5CF6',
            canUseStations: false,
            isSystem: true,
            displayOrder: 4,
        },
        {
            name: 'Administrator',
            description: 'System administrators with broad access to most features',
            color: '#EF4444',
            canUseStations: false,
            isSystem: true,
            displayOrder: 5,
        }
    ];

    let createdCount = 0;
    
    for (const roleTypeData of roleTypes) {
        const roleType = await prisma.roleType.upsert({
            where: { name: roleTypeData.name },
            update: {},
            create: roleTypeData,
        });
        createdCount++;
        console.log(colorize(`✅ Role Type: ${roleType.name}`, 'green'));
    }
    
    console.log(colorize(`✅ ${createdCount} role types ready`, 'green'));
}

async function runFullRecovery() {
    console.log(colorize('\n🚨 EMERGENCY RECOVERY MODE', 'red'));
    console.log(colorize('========================', 'red'));
    console.log(colorize('This will recreate essential system components.', 'yellow'));
    console.log('');
    
    try {
        // Step 1: Check current state
        const dbState = await checkDatabaseState();
        
        // Step 2: Create essential infrastructure
        await createEssentialStations();
        await createEssentialItems();
        await createRoleTypes();
        
        // Step 3: Create superadmin user (this handles roles and permissions)
        console.log(colorize('\n🛡️  Creating superadmin user...', 'blue'));
        await createSuperAdmin();
        
        console.log(colorize('\n🎉 EMERGENCY RECOVERY COMPLETE!', 'green'));
        console.log(colorize('================================', 'green'));
        console.log(colorize('Your system has been restored with:', 'white'));
        console.log(colorize('✅ Essential production stations', 'green'));
        console.log(colorize('✅ Core Spacover items', 'green'));
        console.log(colorize('✅ Role types and permissions', 'green'));
        console.log(colorize('✅ Superadmin user account', 'green'));
        console.log('');
        console.log(colorize('Next: Set the superadmin password via the web interface', 'yellow'));
        
    } catch (error) {
        console.error(colorize('❌ Recovery failed:', 'red'), error);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const confirmed = args.includes('--confirm');
    
    console.log(colorize('🚨 Emergency Database Recovery Tool', 'bright'));
    console.log(colorize('==================================', 'bright'));
    
    if (!confirmed) {
        console.log(colorize('⚠️  WARNING: This script will recreate essential system components.', 'yellow'));
        console.log(colorize('   It is designed for emergency recovery situations.', 'yellow'));
        console.log('');
        console.log(colorize('Usage:', 'bright'));
        console.log(colorize('  npm run emergency-recovery -- --confirm', 'cyan'));
        console.log('');
        console.log(colorize('This will create:', 'white'));
        console.log(colorize('  • Essential production stations', 'white'));
        console.log(colorize('  • Core Spacover items', 'white'));
        console.log(colorize('  • Role types and permissions', 'white'));
        console.log(colorize('  • Superadmin user account', 'white'));
        console.log('');
        return;
    }
    
    try {
        await prisma.$connect();
        await runFullRecovery();
    } catch (error) {
        console.error(colorize('❌ Emergency recovery failed:', 'red'), error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error(colorize('❌ Fatal error:', 'red'), error);
        process.exit(1);
    });
}