import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// في حالة الـ Build فقط، لا نُنشئ اتصال بقاعدة البيانات
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})) as unknown as PrismaClient;

// نحفظ الـ instance في globalThis في جميع البيئات (development + production) لمنع تعدد الاتصالات
if (!isBuild) {
    globalForPrisma.prisma = prisma;
}

