import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const getDatabaseUrl = () => {
    let url = process.env.DATABASE_URL || '';
    
    // We need to be careful with pgbouncer=true as it can break Prisma transactions ($transaction)
    // if the pooler is in 'Statement' mode. We will keep connection_limit=1 for stability
    // but remove pgbouncer=true if it was added manually by our logic to restore Save functionality.
    if (url.includes('pooler.supabase.com')) {
        if (!url.includes('connection_limit=')) {
            const hasParams = url.includes('?');
            url += (hasParams ? '&' : '?') + 'connection_limit=1';
        }
    }
    return url;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

export const prisma = (globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient({
    log: ['error'],
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
