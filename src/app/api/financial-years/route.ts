import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const years = await prisma.financialYear.findMany({
        where: { companyId },
        orderBy: { startDate: 'desc' },
    });

    // Aggregate stats per year in parallel
    const withStats = await Promise.all(years.map(async (fy) => {
        const [journalCount, salesAgg, purchasesAgg, vouchersCount] = await Promise.all([
            prisma.journalEntry.count({ where: { financialYearId: fy.id } }),
            prisma.invoice.aggregate({
                where: { companyId, type: 'sale', date: { gte: fy.startDate, lte: fy.endDate } },
                _count: { id: true }, _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { companyId, type: 'purchase', date: { gte: fy.startDate, lte: fy.endDate } },
                _count: { id: true }, _sum: { total: true },
            }),
            (prisma as any).voucher?.count({ where: { financialYearId: fy.id } }).catch(() => 0) ?? 0,
        ]);

        return {
            ...fy,
            stats: {
                journalEntries: journalCount,
                salesCount: salesAgg._count.id,
                salesTotal: salesAgg._sum.total ?? 0,
                purchasesCount: purchasesAgg._count.id,
                purchasesTotal: purchasesAgg._sum.total ?? 0,
                vouchersCount,
            }
        };
    }));

    return NextResponse.json(withStats);
});

export const PUT = withProtection(async (request, session, body) => {
    const user = session.user as any;
    if (!user?.companyId || (user.role !== 'admin' && !user.isSuperAdmin)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = user.companyId;
    const { action, data } = body;

    if (action === 'create_first') {
        const existing = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
        if (existing) return NextResponse.json({ error: 'توجد سنة مالية نشطة بالفعل.' }, { status: 400 });

        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (endDate <= startDate) return NextResponse.json({ error: 'تاريخ النهاية يجب أن يكون بعد البداية.' }, { status: 400 });

        const sy = startDate.getFullYear(), ey = endDate.getFullYear();
        const name = data.name || (sy === ey ? `السنة المالية ${sy}` : `السنة المالية ${sy}/${ey}`);

        const fy = await prisma.financialYear.create({ data: { name, startDate, endDate, companyId, isOpen: true } });
        return NextResponse.json(fy);
    }

    if (action === 'close') {
        const result = await prisma.$transaction(async (tx) => {
            const closed = await tx.financialYear.update({ where: { id: data.id, companyId }, data: { isOpen: false } });
            const newStart = new Date(closed.endDate);
            newStart.setDate(newStart.getDate() + 1);
            let newEnd = new Date(newStart);
            newEnd.setFullYear(newEnd.getFullYear() + 1);
            newEnd.setDate(newEnd.getDate() - 1);
            const sy = newStart.getFullYear(), ey = newEnd.getFullYear();
            const newName = sy === ey ? `السنة المالية ${sy}` : `السنة المالية ${sy}/${ey}`;
            const next = await tx.financialYear.create({
                data: { name: newName, startDate: newStart, endDate: newEnd, companyId, isOpen: true }
            });
            return { closed, next };
        });
        return NextResponse.json(result);
    }

    if (action === 'rename') {
        const updated = await prisma.financialYear.update({
            where: { id: data.id, companyId },
            data: { name: data.name }
        });
        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
});
