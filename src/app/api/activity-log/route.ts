import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request: NextRequest, session: any) => {
    try {
        const user = session.user as any;
        const companyId = user.companyId;
        const isSuperAdmin = !!user.isSuperAdmin;

        const { searchParams } = new URL(request.url);
        const page     = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
        const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
        const skip     = (page - 1) * limit;

        const userId     = searchParams.get('userId')     || undefined;
        const action     = searchParams.get('action')     || undefined;
        const module     = searchParams.get('module')     || undefined;
        const entityType = searchParams.get('entityType') || undefined;
        const dateFrom   = searchParams.get('dateFrom')   || undefined;
        const dateTo     = searchParams.get('dateTo')     || undefined;
        const search     = searchParams.get('search')     || undefined;

        // Build where clause
        const where: any = {};

        // Super admins see all companies; regular users see only their company
        if (!isSuperAdmin) {
            where.companyId = companyId;
        }

        if (userId)     where.userId     = userId;
        if (action)     where.action     = action;
        if (module)     where.module     = module;
        if (entityType) where.entityType = entityType;

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
                // Include the full end day
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        if (search) {
            where.description = { contains: search, mode: 'insensitive' };
        }

        const [logs, total] = await Promise.all([
            (prisma as any).activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    userId: true,
                    userName: true,
                    action: true,
                    module: true,
                    entityType: true,
                    entityId: true,
                    entityRef: true,
                    description: true,
                    oldData: true,
                    newData: true,
                    ipAddress: true,
                    userAgent: true,
                    companyId: true,
                    branchId: true,
                    createdAt: true,
                },
            }),
            (prisma as any).activityLog.count({ where }),
        ]);

        return NextResponse.json({ logs, total, page, limit });
    } catch (e: any) {
        console.error('activity-log GET error:', e);
        return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل النشاط' }, { status: 500 });
    }
});
