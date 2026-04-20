import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// نستخدم الرابط الخام كما هو من إعدادات Vercel
export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'],
})) as unknown as PrismaClient;

if (!isBuild && prisma) {
    globalForPrisma.prisma = prisma;
}

// تنظيف الاتصالات بشكل عدواني عند خروج أي طلب
if (typeof process !== 'undefined' && !isBuild) {
    const cleanup = async () => {
        if (globalForPrisma.prisma) await globalForPrisma.prisma.$disconnect();
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}
