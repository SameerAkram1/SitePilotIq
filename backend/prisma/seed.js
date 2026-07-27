"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
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
//# sourceMappingURL=seed.js.map