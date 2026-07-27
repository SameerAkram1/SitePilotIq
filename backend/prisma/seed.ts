import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'sameer-construction' },
    update: {},
    create: {
      name: "Sameer's Construction",
      slug: 'sameer-construction',
      isActive: true,
    },
  });

  console.log('Tenant created:', tenant.id);

  // Create company settings
  await prisma.companySettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      companyName: "Sameer's Construction",
      country: 'AL',
      defaultCurrency: 'ALL',
      defaultLanguage: 'en',
      timezone: 'Europe/Tirane',
    },
  });

  // Create admin user
  const passwordHash = await argon2.hash('Sameer@1133');
  
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@sameer.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: 'Admin Sameer',
      email: 'admin@sameer.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log('Admin user created:', user);
  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Tenant Slug: sameer-construction');
  console.log('Email: admin@sameer.com');
  console.log('Password: Sameer@1133');
  console.log('========================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
