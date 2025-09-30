#!/usr/bin/env tsx
/**
 * Admin Status Check Script
 * 
 * This script checks the current state of admin users and system setup.
 * Useful for diagnosing issues and understanding what needs to be done.
 * 
 * Usage:
 *   npm run check-admin-status
 */

import { PrismaClient } from '@prisma-app/client';

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

async function checkDatabaseConnection() {
    try {
        await prisma.$connect();
        console.log(colorize('✅ Database connection: OK', 'green'));
        return true;
    } catch (error) {
        console.log(colorize('❌ Database connection: FAILED', 'red'));
        console.log(colorize(`   Error: ${error}`, 'red'));
        return false;
    }
}

async function checkSystemCounts() {
    console.log(colorize('\n📊 System Overview', 'cyan'));
    console.log(colorize('==================', 'cyan'));
    
    try {
        const counts = {
            users: await prisma.user.count(),
            roles: await prisma.role.count(),
            permissions: await prisma.permission.count(),
            stations: await prisma.station.count(),
            customers: await prisma.customer.count(),
            orders: await prisma.order.count(),
            items: await prisma.item.count(),
        };
        
        console.log(colorize(`Users: ${counts.users}`, 'white'));
        console.log(colorize(`Roles: ${counts.roles}`, 'white'));
        console.log(colorize(`Permissions: ${counts.permissions}`, 'white'));
        console.log(colorize(`Stations: ${counts.stations}`, 'white'));
        console.log(colorize(`Customers: ${counts.customers}`, 'white'));
        console.log(colorize(`Orders: ${counts.orders}`, 'white'));
        console.log(colorize(`Items: ${counts.items}`, 'white'));
        
        const isEmpty = Object.values(counts).every(count => count === 0);
        if (isEmpty) {
            console.log(colorize('\n⚠️  Database appears to be completely empty!', 'yellow'));
            console.log(colorize('   Consider running: npm run emergency-recovery -- --confirm', 'yellow'));
        }
        
        return counts;
    } catch (error) {
        console.log(colorize('❌ Failed to get system counts', 'red'));
        console.log(colorize(`   Error: ${error}`, 'red'));
        return null;
    }
}

async function checkAdminUsers() {
    console.log(colorize('\n👥 Admin Users', 'cyan'));
    console.log(colorize('==============', 'cyan'));
    
    try {
        // Find Super Admin role
        const superAdminRole = await prisma.role.findUnique({
            where: { name: 'Super Admin' }
        });
        
        if (!superAdminRole) {
            console.log(colorize('❌ Super Admin role not found', 'red'));
            console.log(colorize('   Run: npm run create-superadmin', 'yellow'));
            return;
        }
        
        console.log(colorize(`✅ Super Admin role exists (ID: ${superAdminRole.id})`, 'green'));
        
        // Find users with Super Admin role
        const superAdmins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        roleId: superAdminRole.id
                    }
                }
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        
        if (superAdmins.length === 0) {
            console.log(colorize('❌ No Super Admin users found', 'red'));
            console.log(colorize('   Run: npm run create-superadmin -- --interactive', 'yellow'));
            return;
        }
        
        console.log(colorize(`\n📋 Super Admin Users (${superAdmins.length}):`, 'bright'));
        
        for (const user of superAdmins) {
            console.log(colorize(`\n👤 ${user.name} (${user.email})`, 'white'));
            console.log(colorize(`   ID: ${user.id}`, 'white'));
            console.log(colorize(`   Status: ${user.status}`, user.status === 'ACTIVE' ? 'green' : 'yellow'));
            console.log(colorize(`   Created: ${user.createdAt.toISOString()}`, 'white'));
            
            // Check credential account
            const credentialAccount = await prisma.account.findUnique({
                where: {
                    providerId_accountId: {
                        providerId: 'credential',
                        accountId: user.email
                    }
                }
            });
            
            if (!credentialAccount) {
                console.log(colorize(`   🔐 Credential Account: ❌ Missing`, 'red'));
                console.log(colorize(`      Run: npm run create-superadmin -- --reset-password ${user.email}`, 'yellow'));
            } else if (credentialAccount.password === 'SEED_PLACEHOLDER_NEEDS_RESET_VIA_BETTER_AUTH_FLOW') {
                console.log(colorize(`   🔐 Credential Account: ⚠️  Password not set`, 'yellow'));
                console.log(colorize(`      Set password at: /admin-setup?email=${user.email}`, 'yellow'));
            } else {
                console.log(colorize(`   🔐 Credential Account: ✅ Password set`, 'green'));
            }
            
            // List roles
            const roleNames = user.roles.map(ur => ur.role.name).join(', ');
            console.log(colorize(`   🎭 Roles: ${roleNames}`, 'white'));
        }
        
    } catch (error) {
        console.log(colorize('❌ Failed to check admin users', 'red'));
        console.log(colorize(`   Error: ${error}`, 'red'));
    }
}

async function checkRoleSystem() {
    console.log(colorize('\n🎭 Role System', 'cyan'));
    console.log(colorize('==============', 'cyan'));
    
    try {
        const roles = await prisma.role.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        permissions: true
                    }
                }
            }
        });
        
        if (roles.length === 0) {
            console.log(colorize('❌ No roles found', 'red'));
            console.log(colorize('   Run: npm run create-superadmin', 'yellow'));
            return;
        }
        
        console.log(colorize(`📋 Roles (${roles.length}):`, 'bright'));
        
        const essentialRoles = ['Super Admin', 'Admin', 'Manager', 'Customer Service', 'Warehouse Staff'];
        
        for (const roleName of essentialRoles) {
            const role = roles.find(r => r.name === roleName);
            if (role) {
                console.log(colorize(`✅ ${roleName}: ${role._count.users} users, ${role._count.permissions} permissions`, 'green'));
            } else {
                console.log(colorize(`❌ ${roleName}: Missing`, 'red'));
            }
        }
        
        // Show other roles
        const otherRoles = roles.filter(r => !essentialRoles.includes(r.name));
        if (otherRoles.length > 0) {
            console.log(colorize(`\n📋 Other Roles:`, 'bright'));
            for (const role of otherRoles) {
                console.log(colorize(`   ${role.name}: ${role._count.users} users, ${role._count.permissions} permissions`, 'white'));
            }
        }
        
    } catch (error) {
        console.log(colorize('❌ Failed to check role system', 'red'));
        console.log(colorize(`   Error: ${error}`, 'red'));
    }
}

async function checkEssentialData() {
    console.log(colorize('\n🏭 Essential Data', 'cyan'));
    console.log(colorize('=================', 'cyan'));
    
    try {
        // Check stations
        const stations = await prisma.station.findMany();
        const essentialStations = ['Cutting', 'Sewing', 'Foam Cutting', 'Packaging'];
        
        console.log(colorize(`🏭 Production Stations:`, 'bright'));
        for (const stationName of essentialStations) {
            const station = stations.find(s => s.name === stationName);
            if (station) {
                console.log(colorize(`   ✅ ${stationName}`, 'green'));
            } else {
                console.log(colorize(`   ❌ ${stationName}: Missing`, 'red'));
            }
        }
        
        // Check Spacover items
        const spacoverItems = await prisma.item.findMany({
            where: { isSpacoverProduct: true }
        });
        
        console.log(colorize(`\n📦 Spacover Items:`, 'bright'));
        const essentialItems = [
            'Spacovers Out Of State Retail',
            'Spacovers Out Of State Wholesale', 
            'Spacovers CA Retail',
            'Spacovers CA Wholesale'
        ];
        
        for (const itemName of essentialItems) {
            const item = spacoverItems.find(i => i.name === itemName);
            if (item) {
                console.log(colorize(`   ✅ ${itemName}`, 'green'));
            } else {
                console.log(colorize(`   ❌ ${itemName}: Missing`, 'red'));
            }
        }
        
        const missingStations = essentialStations.filter(name => !stations.find(s => s.name === name));
        const missingItems = essentialItems.filter(name => !spacoverItems.find(i => i.name === name));
        
        if (missingStations.length > 0 || missingItems.length > 0) {
            console.log(colorize('\n⚠️  Missing essential data detected', 'yellow'));
            console.log(colorize('   Run: npm run emergency-recovery -- --confirm', 'yellow'));
        }
        
    } catch (error) {
        console.log(colorize('❌ Failed to check essential data', 'red'));
        console.log(colorize(`   Error: ${error}`, 'red'));
    }
}

async function generateRecommendations(systemCounts: any) {
    console.log(colorize('\n💡 Recommendations', 'cyan'));
    console.log(colorize('==================', 'cyan'));
    
    if (!systemCounts) {
        console.log(colorize('❌ Cannot generate recommendations due to database issues', 'red'));
        return;
    }
    
    const recommendations = [];
    
    // Check if database is empty
    const isEmpty = Object.values(systemCounts).every(count => count === 0);
    if (isEmpty) {
        recommendations.push({
            priority: 'HIGH',
            action: 'Complete system setup needed',
            command: 'npm run emergency-recovery -- --confirm'
        });
    } else {
        // Check specific issues
        if (systemCounts.users === 0) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Create first admin user',
                command: 'npm run create-superadmin -- --interactive'
            });
        }
        
        if (systemCounts.roles === 0) {
            recommendations.push({
                priority: 'HIGH',
                action: 'Setup role system',
                command: 'npm run create-superadmin'
            });
        }
        
        if (systemCounts.stations === 0) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Create production stations',
                command: 'npm run db:seed'
            });
        }
        
        if (systemCounts.items === 0) {
            recommendations.push({
                priority: 'MEDIUM',
                action: 'Create essential items',
                command: 'npm run db:seed'
            });
        }
    }
    
    if (recommendations.length === 0) {
        console.log(colorize('✅ System appears to be properly configured!', 'green'));
        console.log(colorize('   Next: Ensure admin passwords are set via /admin-setup', 'white'));
    } else {
        recommendations.forEach((rec, index) => {
            const priorityColor = rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'yellow' : 'blue';
            console.log(colorize(`${index + 1}. [${rec.priority}] ${rec.action}`, priorityColor));
            console.log(colorize(`   Command: ${rec.command}`, 'cyan'));
        });
    }
}

async function main() {
    console.log(colorize('🔍 Admin Status Check', 'bright'));
    console.log(colorize('====================', 'bright'));
    
    try {
        // Check database connection
        const dbConnected = await checkDatabaseConnection();
        if (!dbConnected) {
            console.log(colorize('\n❌ Cannot proceed without database connection', 'red'));
            process.exit(1);
        }
        
        // Get system overview
        const systemCounts = await checkSystemCounts();
        
        // Check admin users
        await checkAdminUsers();
        
        // Check role system
        await checkRoleSystem();
        
        // Check essential data
        await checkEssentialData();
        
        // Generate recommendations
        await generateRecommendations(systemCounts);
        
        console.log(colorize('\n✅ Status check complete!', 'green'));
        
    } catch (error) {
        console.error(colorize('❌ Status check failed:', 'red'), error);
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