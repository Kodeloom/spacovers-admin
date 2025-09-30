#!/usr/bin/env tsx
/**
 * Safe and Easy Superadmin User Creation Script
 * 
 * This script provides a safe way to create the first superadmin user
 * even when the database is completely empty or after migrations.
 * 
 * Usage:
 *   npm run create-superadmin
 *   npm run create-superadmin -- --email admin@company.com --name "Admin User"
 *   npm run create-superadmin -- --interactive
 *   npm run create-superadmin -- --reset-password admin@company.com
 */

import { PrismaClient } from '@prisma-app/client';
import { createHash, randomBytes } from 'crypto';
import * as readline from 'readline';

const prisma = new PrismaClient();
const PLACEHOLDER_HASH = 'SEED_PLACEHOLDER_NEEDS_RESET_VIA_BETTER_AUTH_FLOW';

interface SuperAdminConfig {
    email: string;
    name: string;
    generateTempPassword?: boolean;
    resetExisting?: boolean;
}

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

function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

function generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function ensureSuperAdminRole() {
    console.log(colorize('🔧 Ensuring Super Admin role exists...', 'blue'));
    
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: {
            name: 'Super Admin',
            description: 'Super Administrator with full, unrestricted system access',
        },
    });
    
    console.log(colorize(`✅ Super Admin role ready (ID: ${superAdminRole.id})`, 'green'));
    return superAdminRole;
}

async function ensureBasicPermissions() {
    console.log(colorize('🔧 Ensuring basic permissions exist...', 'blue'));
    
    const actions = ['create', 'read', 'update', 'delete'];
    const coreSubjects = ['User', 'Role', 'Permission', 'Customer', 'Item', 'Order', 'Station'];
    
    const permissions = [];
    
    for (const subject of coreSubjects) {
        for (const action of actions) {
            const permission = await prisma.permission.upsert({
                where: { action_subject: { action, subject } },
                update: {},
                create: {
                    action,
                    subject,
                    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${subject.toLowerCase()}`,
                },
            });
            permissions.push(permission);
        }
    }
    
    console.log(colorize(`✅ ${permissions.length} basic permissions ready`, 'green'));
    return permissions;
}

async function assignAllPermissionsToSuperAdmin(superAdminRole: any) {
    console.log(colorize('🔧 Assigning all permissions to Super Admin role...', 'blue'));
    
    const allPermissions = await prisma.permission.findMany();
    let assignedCount = 0;
    
    for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
            where: { 
                roleId_permissionId: { 
                    roleId: superAdminRole.id, 
                    permissionId: permission.id 
                } 
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: permission.id,
            },
        });
        assignedCount++;
    }
    
    console.log(colorize(`✅ Assigned ${assignedCount} permissions to Super Admin`, 'green'));
}

async function createSuperAdminUser(config: SuperAdminConfig) {
    console.log(colorize(`🔧 Creating/updating superadmin user: ${config.email}`, 'blue'));
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: config.email },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    });
    
    if (existingUser && !config.resetExisting) {
        const isSuperAdmin = existingUser.roles.some(ur => ur.role.name === 'Super Admin');
        if (isSuperAdmin) {
            console.log(colorize(`⚠️  User ${config.email} already exists and is a Super Admin`, 'yellow'));
            console.log(colorize(`   Use --reset-password flag to reset their password`, 'yellow'));
            return existingUser;
        }
    }
    
    // Create or update the user
    const adminUser = await prisma.user.upsert({
        where: { email: config.email },
        update: {
            name: config.name,
            status: 'ACTIVE',
        },
        create: {
            email: config.email,
            name: config.name,
            passwordHash: 'NOT_USED_FOR_CREDENTIALS_LOGIN',
            status: 'ACTIVE',
        },
    });
    
    console.log(colorize(`✅ User created/updated: ${adminUser.email} (ID: ${adminUser.id})`, 'green'));
    
    // Create or update the credential account
    await prisma.account.upsert({
        where: { 
            providerId_accountId: {
                providerId: 'credential',
                accountId: adminUser.email 
            }
        },
        update: { 
            password: PLACEHOLDER_HASH 
        },
        create: {
            userId: adminUser.id,
            providerId: 'credential',
            accountId: adminUser.email,
            password: PLACEHOLDER_HASH,
        },
    });
    
    console.log(colorize(`✅ Credential account ready for ${adminUser.email}`, 'green'));
    
    return adminUser;
}

async function linkUserToSuperAdminRole(user: any, superAdminRole: any) {
    console.log(colorize(`🔧 Linking user to Super Admin role...`, 'blue'));
    
    await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } },
        update: {},
        create: {
            userId: user.id,
            roleId: superAdminRole.id,
        }
    });
    
    console.log(colorize(`✅ User ${user.email} is now a Super Admin`, 'green'));
}

async function interactiveSetup(): Promise<SuperAdminConfig> {
    const rl = createReadlineInterface();
    
    console.log(colorize('\n🚀 Interactive Superadmin Setup', 'cyan'));
    console.log(colorize('================================', 'cyan'));
    
    const email = await askQuestion(rl, colorize('Enter admin email: ', 'yellow'));
    if (!email || !email.includes('@')) {
        rl.close();
        throw new Error('Valid email is required');
    }
    
    const name = await askQuestion(rl, colorize('Enter admin name: ', 'yellow')) || 'Super Admin';
    
    const resetExisting = (await askQuestion(rl, colorize('Reset password if user exists? (y/N): ', 'yellow'))).toLowerCase() === 'y';
    
    rl.close();
    
    return { email, name, resetExisting };
}

async function displaySetupInstructions(email: string) {
    console.log(colorize('\n🎉 Superadmin Setup Complete!', 'green'));
    console.log(colorize('================================', 'green'));
    console.log(colorize(`📧 Email: ${email}`, 'cyan'));
    console.log(colorize(`🔑 Password: Not set yet (requires setup)`, 'yellow'));
    console.log('');
    console.log(colorize('Next Steps:', 'bright'));
    console.log(colorize('1. Start your application', 'white'));
    console.log(colorize('2. Navigate to the admin setup page', 'white'));
    console.log(colorize('3. Set the initial password for this user', 'white'));
    console.log('');
    console.log(colorize('Alternative: Use the set-password API endpoint:', 'bright'));
    console.log(colorize(`POST /api/admin-setup/set-password`, 'cyan'));
    console.log(colorize(`Body: { "email": "${email}", "password": "your-secure-password" }`, 'cyan'));
    console.log('');
}

async function resetUserPassword(email: string) {
    console.log(colorize(`🔧 Resetting password setup for: ${email}`, 'blue'));
    
    const user = await prisma.user.findUnique({
        where: { email }
    });
    
    if (!user) {
        throw new Error(`User ${email} not found`);
    }
    
    // Reset the credential account to placeholder
    await prisma.account.upsert({
        where: { 
            providerId_accountId: {
                providerId: 'credential',
                accountId: email 
            }
        },
        update: { 
            password: PLACEHOLDER_HASH 
        },
        create: {
            userId: user.id,
            providerId: 'credential',
            accountId: email,
            password: PLACEHOLDER_HASH,
        },
    });
    
    console.log(colorize(`✅ Password reset for ${email}. They can now set a new password.`, 'green'));
}

async function validateDatabaseConnection() {
    try {
        await prisma.$connect();
        console.log(colorize('✅ Database connection successful', 'green'));
    } catch (error) {
        console.error(colorize('❌ Database connection failed:', 'red'), error);
        throw new Error('Cannot connect to database. Please check your DATABASE_URL.');
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    console.log(colorize('🛡️  Superadmin Creation Tool', 'bright'));
    console.log(colorize('===========================', 'bright'));
    
    try {
        await validateDatabaseConnection();
        
        // Parse command line arguments
        const emailIndex = args.indexOf('--email');
        const nameIndex = args.indexOf('--name');
        const interactive = args.includes('--interactive');
        const resetPasswordIndex = args.indexOf('--reset-password');
        
        // Handle password reset
        if (resetPasswordIndex !== -1) {
            const email = args[resetPasswordIndex + 1];
            if (!email) {
                throw new Error('Email is required for password reset');
            }
            await resetUserPassword(email);
            return;
        }
        
        let config: SuperAdminConfig;
        
        if (interactive) {
            config = await interactiveSetup();
        } else {
            const email = emailIndex !== -1 ? args[emailIndex + 1] : process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
            const name = nameIndex !== -1 ? args[nameIndex + 1] : 'Super Admin';
            const resetExisting = args.includes('--reset');
            
            config = { email, name, resetExisting };
        }
        
        console.log(colorize(`\n🎯 Target Configuration:`, 'bright'));
        console.log(colorize(`   Email: ${config.email}`, 'cyan'));
        console.log(colorize(`   Name: ${config.name}`, 'cyan'));
        console.log(colorize(`   Reset if exists: ${config.resetExisting ? 'Yes' : 'No'}`, 'cyan'));
        console.log('');
        
        // Step 1: Ensure Super Admin role exists
        const superAdminRole = await ensureSuperAdminRole();
        
        // Step 2: Ensure basic permissions exist
        await ensureBasicPermissions();
        
        // Step 3: Assign all permissions to Super Admin role
        await assignAllPermissionsToSuperAdmin(superAdminRole);
        
        // Step 4: Create/update the superadmin user
        const adminUser = await createSuperAdminUser(config);
        
        // Step 5: Link user to Super Admin role
        await linkUserToSuperAdminRole(adminUser, superAdminRole);
        
        // Step 6: Display setup instructions
        await displaySetupInstructions(config.email);
        
    } catch (error) {
        console.error(colorize('❌ Setup failed:', 'red'), error);
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

export { main as createSuperAdmin };