import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    const params: string[] = [];
    if (!url.includes('pgbouncer=true') && url.includes('pooler.supabase.com')) params.push('pgbouncer=true');
    if (!url.includes('connection_limit=')) params.push('connection_limit=1');
    if (!url.includes('pool_timeout=')) params.push('pool_timeout=10');
    if (params.length === 0) return url;
    return url.includes('?') ? `${url}&${params.join('&')}` : `${url}?${params.join('&')}`;
};

export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'],
    datasources: { db: { url: getDatabaseUrl() } },
})) as unknown as PrismaClient;

if (!isBuild && prisma) {
    globalForPrisma.prisma = prisma;
}

