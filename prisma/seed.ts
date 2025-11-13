import type { ItemStatus } from '@prisma-app/client';
import { PrismaClient, UserStatus } from '@prisma-app/client';

const prisma = new PrismaClient();
const PLACEHOLDER_HASH = 'SEED_PLACEHOLDER_NEEDS_RESET_VIA_BETTER_AUTH_FLOW';

async function main() {
  console.log(`Start seeding ...`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminName = 'Super Admin';
  const superAdminRoleName = 'Super Admin';

  // 1. Find or Create the Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: superAdminRoleName },
    update: {},
    create: {
      name: superAdminRoleName,
      description: 'Super Administrator with full, unrestricted system access',
    },
  });
  console.log(`Ensured role '${superAdminRole.name}' exists with id: ${superAdminRole.id}`);

  // 2. Create or Update the Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: 'NOT_USED_FOR_CREDENTIALS_LOGIN', 
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Upserted admin user: ${adminUser.email} with id: ${adminUser.id}`);

  // 3. Create or Update the Admin's Credential Account
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
  console.log(`Ensured credential account for ${adminUser.email} exists.`);

  // 4. Ensure Admin User is linked to Super Admin Role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
    }
  });
  console.log(`Linked user ${adminUser.email} to role ${superAdminRole.name}`);

  // 5. Create Default Stations
  const stations = [
    { name: 'Cutting', description: 'Station for cutting operations' },
    { name: 'Sewing', description: 'Station for sewing operations' },
    { name: 'Foam Cutting', description: 'Station for foam cutting operations' },
  ];

  for (const stationData of stations) {
    await prisma.station.upsert({
      where: { name: stationData.name },
      update: {},
      create: stationData,
    });
    console.log(`Ensured station '${stationData.name}' exists`);
  }

  // 6. Create the 4 main Spacover Items
  console.log('Creating main Spacover items...');
  
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

  for (const itemData of spacoverItems) {
    // Check if item exists by name
    const existingItem = await prisma.item.findFirst({
      where: { name: itemData.name }
    });

    if (existingItem) {
      // Update existing item
      await prisma.item.update({
        where: { id: existingItem.id },
        data: {
          isSpacoverProduct: true,
          status: itemData.status as ItemStatus
        }
      });
    } else {
      // Create new item
      await prisma.item.create({
        data: {
          name: itemData.name,
          description: itemData.description,
          isSpacoverProduct: true,
          status: itemData.status as ItemStatus
        }
      });
    }
    console.log(`Ensured Spacover item '${itemData.name}' exists`);
  }

  // 6. Create All CRUD Permissions for All Models
  console.log('Creating comprehensive permission system...');
  
  const actions = ['create', 'read', 'update', 'delete'];
  
  // Core business models that need full permission management
  const coreModels = [
    { name: 'User', description: 'System users and their profiles' },
    { name: 'Role', description: 'User roles for access control' },
    { name: 'Permission', description: 'System permissions' },
    { name: 'Customer', description: 'Customer records and information' },
    { name: 'Item', description: 'Product items and inventory' },
    { name: 'Station', description: 'Production stations' },
    { name: 'Order', description: 'Customer orders' },
    { name: 'OrderItem', description: 'Individual items within orders' },
    { name: 'ItemProcessingLog', description: 'Production tracking logs' },
    { name: 'AuditLog', description: 'System audit trail' },
    { name: 'Estimate', description: 'Customer estimates' },
    { name: 'EstimateItem', description: 'Items within estimates' },
    { name: 'QuickbooksToken', description: 'QuickBooks integration tokens' },
    { name: 'BarcodeScanner', description: 'Barcode scanners for order processing' },
  ];

  // Join table models (need full CRUD for backend operations)
  const joinModels = [
    { name: 'UserRole', description: 'User-role associations' },
    { name: 'RolePermission', description: 'Role-permission associations' },
    { name: 'RoleStation', description: 'Role-station associations' },
  ];

  // Generate permissions for core models (full CRUD)
  for (const model of coreModels) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { action_subject: { action, subject: model.name } },
        update: {},
        create: {
          action,
          subject: model.name,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${model.description.toLowerCase()}`,
        },
      });
      console.log(`✓ Permission: ${action} ${model.name}`);
    }
  }

  // Generate full CRUD permissions for join tables (backend performs direct operations)
  for (const model of joinModels) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { action_subject: { action, subject: model.name } },
        update: {},
        create: {
          action,
          subject: model.name,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${model.description.toLowerCase()}`,
        },
      });
      console.log(`✓ Permission: ${action} ${model.name}`);
    }
  }

  // 7. Create Role Types (Templates)
  const roleTypes = [
    {
      name: 'Office Employee',
      description: 'General office staff with basic administrative access',
      color: '#10B981', // Green
      canUseStations: false,
      isSystem: true,
      displayOrder: 1,
      defaultPermissions: {
        subjects: ['Customer', 'Item', 'Order', 'Estimate'],
        actions: ['read']
      }
    },
    {
      name: 'Customer Service',
      description: 'Customer-facing staff who manage customer relationships and orders',
      color: '#3B82F6', // Blue
      canUseStations: false,
      isSystem: true,
      displayOrder: 2,
      defaultPermissions: {
        subjects: ['Customer', 'Item', 'Order', 'OrderItem', 'Estimate', 'EstimateItem'],
        actions: ['read', 'create', 'update']
      }
    },
    {
      name: 'Warehouse Staff',
      description: 'Production workers assigned to specific manufacturing stations',
      color: '#F59E0B', // Orange
      canUseStations: true,
      isSystem: true,
      displayOrder: 3,
      defaultPermissions: {
        subjects: ['Order', 'OrderItem', 'ItemProcessingLog', 'Station', 'BarcodeScanner'],
        actions: ['read', 'update']
      }
    },
    {
      name: 'Manager',
      description: 'Management staff with oversight and reporting capabilities',
      color: '#8B5CF6', // Purple
      canUseStations: false,
      isSystem: true,
      displayOrder: 4,
      defaultPermissions: {
        subjects: ['User', 'Customer', 'Item', 'Order', 'OrderItem', 'Station', 'ItemProcessingLog', 'AuditLog', 'Estimate'],
        actions: ['read', 'update']
      }
    },
    {
      name: 'Administrator',
      description: 'System administrators with broad access to most features',
      color: '#EF4444', // Red
      canUseStations: false,
      isSystem: true,
      displayOrder: 5,
      defaultPermissions: {
        subjects: ['User', 'Role', 'Permission', 'Customer', 'Item', 'Order', 'OrderItem', 'Station', 'AuditLog', 'Estimate', 'EstimateItem'],
        actions: ['read', 'create', 'update', 'delete']
      }
    }
  ];

  const roleTypeMap = new Map();

  for (const roleTypeData of roleTypes) {
    const roleType = await prisma.roleType.upsert({
      where: { name: roleTypeData.name },
      update: {},
      create: roleTypeData,
    });
    roleTypeMap.set(roleType.name, roleType);
    console.log(`Ensured role type '${roleType.name}' exists with id: ${roleType.id}`);
  }

  // 8. Create Additional Roles (now with role types)
  const additionalRoles = [
    { 
      name: 'Admin', 
      description: 'System administrator with broad access to most features',
      roleTypeName: 'Administrator',
      permissions: ['read', 'create', 'update', 'delete'], // Most permissions
      subjects: ['User', 'Role', 'Permission', 'Customer', 'Item', 'Order', 'OrderItem', 'Station', 'AuditLog', 'Estimate', 'EstimateItem']
    },
    { 
      name: 'Manager', 
      description: 'Operations manager with oversight access',
      roleTypeName: 'Manager',
      permissions: ['read', 'update'],
      subjects: ['User', 'Customer', 'Item', 'Order', 'OrderItem', 'Station', 'ItemProcessingLog', 'AuditLog', 'Estimate']
    },
    { 
      name: 'Customer Service', 
      description: 'Customer service representative',
      roleTypeName: 'Customer Service',
      permissions: ['read', 'create', 'update'],
      subjects: ['Customer', 'Item', 'Order', 'OrderItem', 'Estimate', 'EstimateItem']
    },
    { 
      name: 'Warehouse Staff', 
      description: 'Production worker assigned to specific stations',
      roleTypeName: 'Warehouse Staff',
      permissions: ['read', 'update'],
      subjects: ['Order', 'OrderItem', 'ItemProcessingLog', 'Station', 'BarcodeScanner']
    }
  ];

  const roleMap = new Map();
  roleMap.set(superAdminRole.name, superAdminRole);

  for (const roleData of additionalRoles) {
    const roleType = roleTypeMap.get(roleData.roleTypeName);
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: {
        name: roleData.name,
        description: roleData.description,
        roleTypeId: roleType.id,
      },
    });
    roleMap.set(role.name, role);
    console.log(`Ensured role '${role.name}' exists with id: ${role.id} (type: ${roleData.roleTypeName})`);
  }

  // 8. Assign Station Associations for Warehouse Staff
  console.log('Setting up station assignments...');
  
  const warehouseStaffRole = roleMap.get('Warehouse Staff');
  const allStations = await prisma.station.findMany();
  
  // Assign Warehouse Staff to all stations (they can work at any station)
  for (const station of allStations) {
    await prisma.roleStation.upsert({
      where: { 
        roleId_stationId: { 
          roleId: warehouseStaffRole.id, 
          stationId: station.id 
        } 
      },
      update: {},
      create: {
        roleId: warehouseStaffRole.id,
        stationId: station.id,
      },
    });
    console.log(`✓ Assigned Warehouse Staff to ${station.name} station`);
  }

  // 9. Assign Permissions to Roles
  console.log('Assigning permissions to roles...');
  
  const allPermissions = await prisma.permission.findMany();
  
  // Super Admin gets all permissions
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
  }
  console.log(`✅ Assigned ${allPermissions.length} permissions to Super Admin role`);

  // Assign specific permissions to other roles
  for (const roleData of additionalRoles) {
    const role = roleMap.get(roleData.name);
    let assignedCount = 0;
    
    for (const permission of allPermissions) {
      const shouldAssign = roleData.permissions.includes(permission.action) && 
                          roleData.subjects.includes(permission.subject);
      
      if (shouldAssign) {
        await prisma.rolePermission.upsert({
          where: { 
            roleId_permissionId: { 
              roleId: role.id, 
              permissionId: permission.id 
            } 
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
        assignedCount++;
      }
    }
    console.log(`✅ Assigned ${assignedCount} permissions to ${role.name} role`);
  }
  
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 