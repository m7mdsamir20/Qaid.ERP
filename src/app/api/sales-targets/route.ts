import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request: NextRequest, session: any) => {
    const companyId = (session.user as any).companyId;
    const url = new URL(request.url);

    const where: any = { companyId };

    const year = url.searchParams.get('year');
    if (year) where.year = parseInt(year);

    const month = url.searchParams.get('month');
    if (month) where.month = parseInt(month);

    const salesRepId = url.searchParams.get('salesRepId');
    if (salesRepId) where.salesRepId = salesRepId;

    const targets = await (prisma as any).salesTarget.findMany({
        where,
        include: {
            salesRep: { select: { id: true, name: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Compute achieved amount for each target
    const targetsWithAchieved = await Promise.all(
        targets.map(async (target: any) => {
            const startDate = new Date(target.year, target.month - 1, 1);
            const endDate = new Date(target.year, target.month, 1);

            const invoiceAgg = await prisma.invoice.aggregate({
                where: {
                    companyId,
                    salesRepresentativeId: target.salesRepId,
                    status: 'approved',
                    date: { gte: startDate, lt: endDate },
                },
                _sum: { total: true },
                _count: { id: true },
            });

            const achieved = invoiceAgg._sum.total || 0;
            const percentage = target.targetAmount > 0
                ? Math.round((achieved / target.targetAmount) * 100 * 100) / 100
                : 0;

            return {
                ...target,
                achieved,
                achievedCount: invoiceAgg._count.id || 0,
                percentage,
            };
        })
    );

    return NextResponse.json(targetsWithAchieved);
});

export const POST = withProtection(async (request: NextRequest, session: any, body: any) => {
    const companyId = (session.user as any).companyId;

    const { salesRepId, year, month, targetAmount, targetCount, notes } = body;

    if (!salesRepId) return NextResponse.json({ error: 'يرجى تحديد المندوب' }, { status: 400 });
    if (!year) return NextResponse.json({ error: 'يرجى تحديد السنة' }, { status: 400 });
    if (!month) return NextResponse.json({ error: 'يرجى تحديد الشهر' }, { status: 400 });
    if (!targetAmount || Number(targetAmount) <= 0) {
        return NextResponse.json({ error: 'يرجى إدخال مبلغ هدف صحيح' }, { status: 400 });
    }

    const target = await (prisma as any).salesTarget.upsert({
        where: {
            salesRepId_year_month: {
                salesRepId,
                year: parseInt(year),
                month: parseInt(month),
            },
        },
        update: {
            targetAmount: Number(targetAmount),
            targetCount: targetCount ? parseInt(targetCount) : null,
            notes: notes || null,
        },
        create: {
            salesRepId,
            year: parseInt(year),
            month: parseInt(month),
            targetAmount: Number(targetAmount),
            targetCount: targetCount ? parseInt(targetCount) : null,
            notes: notes || null,
            companyId,
        },
        include: {
            salesRep: { select: { id: true, name: true } },
        },
    });

    const ctx = extractLogContext(session, request);
    await logActivity({
        ...ctx,
        action: 'create',
        module: 'sales-targets',
        entityType: 'SalesTarget',
        entityId: target.id,
        description: `تم تعيين هدف مبيعات للمندوب ${target.salesRep?.name || ''} لشهر ${month}/${year}`,
        newData: { salesRepId, year, month, targetAmount },
    });

    return NextResponse.json(target, { status: 201 });
});
