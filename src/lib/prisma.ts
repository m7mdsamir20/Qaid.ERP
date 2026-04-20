import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// استخدام الرابط كما هو من البيئة لضمان عدم وجود أخطاء في الـ Authentication
export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'],
})) as unknown as PrismaClient;

if (!isBuild && prisma) {
    globalForPrisma.prisma = prisma;
}

if (typeof process !== 'undefined' && !isBuild) {
    const cleanup = async () => {
        if (globalForPrisma.prisma) await globalForPrisma.prisma.$disconnect();
    };
    process.on('SIGINT', () => cleanup().then(() => process.exit(0)));
    process.on('SIGTERM', () => cleanup().then(() => process.exit(0)));
}
