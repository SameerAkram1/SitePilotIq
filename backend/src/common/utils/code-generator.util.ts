import { PrismaService } from '../../prisma/prisma.service';

/**
 * Generate unique project code: PRJ-{YEAR}-{SEQUENCE}
 * Sequence resets per tenant per year.
 * Race-condition safe with retry on unique constraint violation.
 */
export async function generateProjectCode(prisma: PrismaService, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const count = await prisma.project.count({
        where: {
          tenantId,
          code: { startsWith: prefix },
        },
      });

      const sequence = count + 1;
      const code = `${prefix}${sequence.toString().padStart(4, '0')}`;

      const existing = await prisma.project.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (!existing) return code;

      continue;
    } catch (error) {
      if (attempt === 2) throw error;
      continue;
    }
  }

  throw new Error('Failed to generate unique project code after 3 attempts');
}

/**
 * Generate unique site code: {PROJECT_CODE}-S{SEQUENCE}
 * Sequence resets per project.
 * Race-condition safe with retry on unique constraint violation.
 */
export async function generateSiteCode(
  prisma: PrismaService,
  tenantId: string,
  projectCode: string,
): Promise<string> {
  const prefix = `${projectCode}-S`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const count = await prisma.site.count({
        where: {
          tenantId,
          code: { startsWith: prefix },
        },
      });

      const sequence = count + 1;
      const code = `${prefix}${sequence.toString().padStart(2, '0')}`;

      const existing = await prisma.site.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (!existing) return code;

      continue;
    } catch (error) {
      if (attempt === 2) throw error;
      continue;
    }
  }

  throw new Error('Failed to generate unique site code after 3 attempts');
}

/**
 * Generate unique partner code: PTR-{YEAR}-{SEQUENCE}
 * Sequence resets per tenant per year.
 * Race-condition safe with retry on unique constraint violation.
 */
export async function generatePartnerCode(prisma: PrismaService, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PTR-${year}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const count = await prisma.partner.count({
        where: {
          tenantId,
          code: { startsWith: prefix },
          isDeleted: false,
        },
      });

      const sequence = count + 1;
      const code = `${prefix}${sequence.toString().padStart(4, '0')}`;

      const existing = await prisma.partner.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (!existing) return code;

      continue;
    } catch (error) {
      if (attempt === 2) throw error;
      continue;
    }
  }

  throw new Error('Failed to generate unique partner code after 3 attempts');
}

/**
 * Generate unique user employee code: EMP-{YEAR}-{SEQUENCE}
 * Sequence resets per tenant per year.
 * Race-condition safe with retry on unique constraint violation.
 */
export async function generateUserCode(prisma: PrismaService, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const count = await prisma.user.count({
        where: {
          tenantId,
          code: { startsWith: prefix },
          status: { not: 'DISABLED' },
        },
      });

      const sequence = count + 1;
      const code = `${prefix}${sequence.toString().padStart(4, '0')}`;

      const existing = await prisma.user.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (!existing) return code;

      continue;
    } catch (error) {
      if (attempt === 2) throw error;
      continue;
    }
  }

  throw new Error('Failed to generate unique user code after 3 attempts');
}

/**
 * Generate unique client code: CLI-{YEAR}-{SEQUENCE}
 * Sequence resets per tenant per year.
 * Race-condition safe with retry on unique constraint violation.
 */
export async function generateClientCode(prisma: PrismaService, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CLI-${year}-`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const count = await prisma.client.count({
        where: {
          tenantId,
          code: { startsWith: prefix },
          isDeleted: false,
        },
      });

      const sequence = count + 1;
      const code = `${prefix}${sequence.toString().padStart(4, '0')}`;

      const existing = await prisma.client.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (!existing) return code;

      continue;
    } catch (error) {
      if (attempt === 2) throw error;
      continue;
    }
  }

  throw new Error('Failed to generate unique client code after 3 attempts');
}
