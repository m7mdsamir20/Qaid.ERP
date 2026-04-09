import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () => {
    let url = process.env.DATABASE_URL || '';
    
    // If using Supabase or common cloud poolers, enforce strict single-connection pooling
    if (url.includes('pooler.supabase.com')) {
        const hasParams = url.includes('?');
        if (!url.includes('pgbouncer=true')) {
            url += (hasParams ? '&' : '?') + 'pgbouncer=true';
        }
        if (!url.includes('connection_limit=')) {
            url += '&connection_limit=1';
        }
    }
    return url;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

// Definitive export with casting to avoid "possibly null" errors in the rest of the app
export const prisma = (globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'], // Keep logs minimal to save overhead
    datasources: {
        db: {
            url: getDatabaseUrl(),
        },
    },
}))) as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
    if (!isBuild && prisma) {
        globalForPrisma.prisma = prisma;
    }
}
