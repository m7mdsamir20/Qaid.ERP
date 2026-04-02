import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI;

// SAFEGUARD: Don't instantiate Prisma at all if we're in the build phase on Vercel
export const prisma = globalForPrisma.prisma ?? (isBuild ? null : new PrismaClient()) as unknown as PrismaClient;

if (!isBuild && process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
