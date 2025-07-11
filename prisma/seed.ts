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