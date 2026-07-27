import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@sitepilotiq.com';

  if (!superAdminPassword) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD environment variable is required. Generate a strong password and set it before running the seed.',
    );
  }

  const passwordHash = await argon2.hash(superAdminPassword);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      email: superAdminEmail,
      role: 'SUPER_ADMIN',
    },
  });

  if (existingAdmin) {
    console.log('SUPER_ADMIN already exists:', existingAdmin.email);
  } else {
    await prisma.$executeRaw`
      INSERT INTO "User" (id, "tenantId", "fullName", email, "passwordHash", role, status, "emailVerified", "isFirstLogin", "failedLoginCount", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), NULL, 'Platform Admin', ${superAdminEmail}, ${passwordHash}, 'SUPER_ADMIN', 'ACTIVE', true, false, 0, NOW(), NOW())
    `;
    console.log('SUPER_ADMIN created:', superAdminEmail);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
