#!/usr/bin/env tsx

/**
 * Script to ensure SUPER_ADMIN role exists in the database
 * This script creates the Super Admin role if it doesn't exist
 */

import { PrismaClient } from '@prisma-app/client';

const prisma = new PrismaClient();

async function ensureSuperAdminRole() {
  try {
    console.log('🔍 Checking for Super Admin role...');

    // Check if Super Admin role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: 'Super Admin' }
    });

    if (existingRole) {
      console.log('✅ Super Admin role already exists');
      return existingRole;
    }

    console.log('📝 Creating Super Admin role...');

    // Create Super Admin role type if it doesn't exist
    let superAdminRoleType = await prisma.roleType.findUnique({
      where: { name: 'Super Administrator' }
    });

    if (!superAdminRoleType) {
      superAdminRoleType = await prisma.roleType.create({
        data: {
          name: 'Super Administrator',
          description: 'Highest level administrative access with override capabilities',
          color: '#DC2626', // Red color to indicate high privilege
          canUseStations: true,
          isSystem: true,
          displayOrder: 0, // Highest priority
          defaultPermissions: {
            subjects: ['*'], // All subjects
            actions: ['*']   // All actions
          }
        }
      });
      console.log('✅ Created Super Administrator role type');
    }

    // Create Super Admin role
    const superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Super Administrator with full system access and override capabilities',
        roleTypeId: superAdminRoleType.id
      }
    });

    console.log('✅ Created Super Admin role');

    // Create all necessary permissions for Super Admin
    const permissions = [
      // Order permissions
      { action: 'create', subject: 'Order' },
      { action: 'read', subject: 'Order' },
      { action: 'update', subject: 'Order' },
      { action: 'delete', subject: 'Order' },
      { action: 'override', subject: 'Order' }, // Special override permission
      
      // OrderItem permissions
      { action: 'create', subject: 'OrderItem' },
      { action: 'read', subject: 'OrderItem' },
      { action: 'update', subject: 'OrderItem' },
      { action: 'delete', subject: 'OrderItem' },
      { action: 'override', subject: 'OrderItem' }, // Special override permission
      
      // ProductAttribute permissions
      { action: 'create', subject: 'ProductAttribute' },
      { action: 'read', subject: 'ProductAttribute' },
      { action: 'update', subject: 'ProductAttribute' },
      { action: 'delete', subject: 'ProductAttribute' },
      { action: 'override', subject: 'ProductAttribute' }, // Special override permission
      
      // User management permissions
      { action: 'create', subject: 'User' },
      { action: 'read', subject: 'User' },
      { action: 'update', subject: 'User' },
      { action: 'delete', subject: 'User' },
      
      // System permissions
      { action: 'read', subject: 'AuditLog' },
      { action: 'create', subject: 'AuditLog' },
    ];

    console.log('📝 Creating permissions...');

    for (const permData of permissions) {
      // Create permission if it doesn't exist
      let permission = await prisma.permission.findUnique({
        where: {
          action_subject: {
            action: permData.action,
            subject: permData.subject
          }
        }
      });

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            action: permData.action,
            subject: permData.subject,
            description: `${permData.action} access to ${permData.subject}`
          }
        });
      }

      // Assign permission to Super Admin role
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        });
      }
    }

    console.log('✅ Assigned permissions to Super Admin role');
    console.log('🎉 Super Admin role setup completed successfully!');

    return superAdminRole;

  } catch (error) {
    console.error('❌ Error setting up Super Admin role:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  ensureSuperAdminRole()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { ensureSuperAdminRole };