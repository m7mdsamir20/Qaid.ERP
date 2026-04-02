import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const now     = new Date();
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [
            totalCompanies,
            activeCompanies,
            expiringSoon,
            expiredSubs,
            totalUsers,
            trialCompanies,
        ] = await Promise.all([
            prisma.company.count(),
            prisma.company.count({ where: { isActive: true } }),
            (prisma as any).subscription.count({
                where: { isActive: true, endDate: { gte: now, lte: in30Days } },
            }),
            (prisma as any).subscription.count({
                where: { endDate: { lt: now } },
            }),
            prisma.user.count(),
            (prisma as any).subscription.count({
                where: { plan: 'trial', isActive: true },
            }),
        ]);

        return NextResponse.json({
            totalCompanies,
            activeCompanies,
            inactiveCompanies: totalCompanies - activeCompanies,
            expiringSoon,
            expiredSubs,
            totalUsers,
            trialCompanies,
        });
    } catch (error) {
        console.error('Super admin stats error:', error);
        return NextResponse.json({}, { status: 500 });
    }
}, { requireSuperAdmin: true });
