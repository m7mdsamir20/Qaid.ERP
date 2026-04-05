import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (url && !url.includes('pgbouncer=true') && url.includes('pooler.supabase.com')) {
        return url.includes('?') ? `${url}&pgbouncer=true&connection_limit=1` : `${url}?pgbouncer=true&connection_limit=1`;
    }
    return url;
};

export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'],
    datasources: { db: { url: getDatabaseUrl() } },
})) as unknown as PrismaClient;

if (!isBuild && prisma) {
    globalForPrisma.prisma = prisma;
}

