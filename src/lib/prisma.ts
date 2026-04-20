import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

const getDatabaseUrl = () => {
    const url = process.env.DATABASE_URL || '';
    if (!url) return url;
    const params: string[] = [];
    // إضافة pgbouncer=true فقط إذا كان المنفذ هو 6543 (Transaction Mode)
    if (!url.includes('pgbouncer=true') && url.includes('pooler.supabase.com') && url.includes(':6543')) {
        params.push('pgbouncer=true');
    }
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

// تنظيف الاتصالات عند إيقاف السيرفر
if (typeof process !== 'undefined') {
    const cleanup = async () => {
        if (globalForPrisma.prisma) {
            await globalForPrisma.prisma.$disconnect();
        }
    };
    process.on('beforeExit', cleanup);
    process.on('SIGINT', () => { cleanup().then(() => process.exit(0)); });
    process.on('SIGTERM', () => { cleanup().then(() => process.exit(0)); });
}
