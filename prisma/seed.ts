import { PrismaClient, UserStatus } from '#shared/generated/prisma'; // Adjusted import path

const prisma = new PrismaClient();
const PLACEHOLDER_HASH = 'SEED_PLACEHOLDER_NEEDS_RESET_VIA_BETTER_AUTH_FLOW';

async function main() {
  console.log(`Start seeding ...`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  // const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Password123!'; // Not used directly in this seed approach
  const adminName = 'Super Admin';
  const adminRoleName = 'Admin';

  // 1. Find or Create the Admin Role
  const adminRole = await prisma.role.upsert({
    where: { name: adminRoleName },
    update: {},
    create: {
      name: adminRoleName,
      description: 'Administrator with full system access',
    },
  });
  console.log(`Ensured role '${adminRole.name}' exists with id: ${adminRole.id}`);

  // 2. Create or Update the Admin User directly with Prisma
  // Password will need to be set via a Better-Auth flow (e.g., admin UI for first-time setup or password reset for this user)
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      status: UserStatus.ACTIVE,
      // emailVerified: new Date(), // Optionally mark as verified for seed
    },
    create: {
      email: adminEmail,
      name: adminName,
      // User.passwordHash might be unused by Better-Auth for direct email/password;
      // it uses the Account table. Set to a non-sensitive value or null.
      passwordHash: 'NOT_USED_FOR_CREDENTIALS_LOGIN', 
      status: UserStatus.ACTIVE,
      // emailVerified: new Date(), // Optionally mark as verified for seed
    },
  });
  console.log(`Upserted admin user: ${adminUser.email} with id: ${adminUser.id}`);

  // 3. Create or Update the Admin's Credential Account with Placeholder Password
  await prisma.account.upsert({
    where: { 
      providerId_accountId: { // Use the @@unique constraint from schema.zmodel
        providerId: 'credential',
        accountId: adminUser.email 
      }
    },
    update: { 
      // If we want to reset it to placeholder during seed, do it here.
      // Only do this if we are sure this seed runs before any manual setup.
      password: PLACEHOLDER_HASH 
    },
    create: {
      userId: adminUser.id,
      providerId: 'credential',
      accountId: adminUser.email, // Typically email or a unique ID for the credential
      password: PLACEHOLDER_HASH, // Placeholder for Better-Auth to overwrite
    },
  });
  console.log(`Ensured credential account for ${adminUser.email} exists with placeholder password.`);

  // 4. Ensure Admin User is linked to Admin Role
  const adminLink = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
  });
  if (!adminLink) {
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    console.log(`Linked user ${adminUser.email} to role ${adminRole.name}`);
  } else {
    console.log(`User ${adminUser.email} already linked to role ${adminRole.name}`);
  }

  // Seed a basic Warehouse Staff role for later use
  const staffRoleName = 'Warehouse Staff';
  const staffRole = await prisma.role.upsert({
    where: { name: staffRoleName },
    update: {},
    create: {
      name: staffRoleName,
      description: 'Staff member for warehouse operations',
    },
  });
  console.log(`Ensured role '${staffRole.name}' exists with id: ${staffRole.id}`);

  // Example: Create a basic warehouse user (password will also need to be set via an admin flow)
  const warehouseUserEmail = 'staff@example.com';
  const warehouseUserName = 'Warehouse Joe';
  const warehouseUser = await prisma.user.upsert({
    where: { email: warehouseUserEmail },
    update: { name: warehouseUserName, status: UserStatus.ACTIVE },
    create: {
      email: warehouseUserEmail,
      name: warehouseUserName,
      passwordHash: 'NOT_USED_FOR_CREDENTIALS_LOGIN', 
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Upserted warehouse user: ${warehouseUser.email} with id: ${warehouseUser.id}`);

  // Also create a credential account for warehouseUser if they might log in with password
  await prisma.account.upsert({
    where: { 
      providerId_accountId: {
        providerId: 'credential',
        accountId: warehouseUser.email 
      }
    },
    update: { password: PLACEHOLDER_HASH }, // Reset to placeholder if seed is re-run
    create: {
      userId: warehouseUser.id,
      providerId: 'credential',
      accountId: warehouseUser.email,
      password: PLACEHOLDER_HASH,
    },
  });
  console.log(`Ensured credential account for ${warehouseUser.email} exists with placeholder password.`);

  // Link warehouse user to Warehouse Staff role
  const warehouseLink = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: warehouseUser.id, roleId: staffRole.id } },
  });
  if (!warehouseLink) {
    await prisma.userRole.create({
      data: {
        userId: warehouseUser.id,
        roleId: staffRole.id,
      },
    });
    console.log(`Linked user ${warehouseUser.email} to role ${staffRole.name}`);
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