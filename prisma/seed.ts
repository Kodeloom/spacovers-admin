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

  // 7. Assign All Permissions to Super Admin Role
  console.log('Assigning all permissions to Super Admin role...');
  
  const allPermissions = await prisma.permission.findMany();
  
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