import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// إضافة pgbouncer=true تلقائياً إذا لم تكن موجودة في الـ URL
const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (url && !url.includes('pgbouncer=true') && url.includes('pooler.supabase.com')) {
        return url.includes('?') ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
    }
    return url;
};

export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: { db: { url: getDatabaseUrl() } },
})) as unknown as PrismaClient;

if (!isBuild) {
    globalForPrisma.prisma = prisma;
}

