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

    const status = url.searchParams.get('status');
    if (status) where.status = status;

    const commissions = await (prisma as any).commissionPayment.findMany({
        where,
        include: {
            salesRep: { select: { id: true, name: true } },
            treasury: { select: { id: true, name: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json(commissions);
});

export const POST = withProtection(async (request: NextRequest, session: any, body: any) => {
    const companyId = (session.user as any).companyId;

    const { year, month, salesRepId } = body;

    if (!year) return NextResponse.json({ error: 'يرجى تحديد السنة' }, { status: 400 });
    if (!month) return NextResponse.json({ error: 'يرجى تحديد الشهر' }, { status: 400 });

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 1);

    // Get the reps to calculate for
    const repsWhere: any = { companyId, isActive: true };
    if (salesRepId) repsWhere.id = salesRepId;

    const reps = await prisma.salesRepresentative.findMany({
        where: repsWhere,
        select: {
            id: true,
            name: true,
            commissionRate: true,
            commissionType: true,
        },
    });

    const calculated: any[] = [];

    for (const rep of reps) {
        // Total approved invoices for this rep in the month
        const invoiceAgg = await prisma.invoice.aggregate({
            where: {
                companyId,
                salesRepresentativeId: rep.id,
                status: 'approved',
                date: { gte: startDate, lt: endDate },
            },
            _sum: { total: true },
        });
        const totalSales = invoiceAgg._sum.total || 0;

        // Total deposited collections for this rep in the month
        const collectionAgg = await (prisma as any).collection.aggregate({
            where: {
                companyId,
                salesRepId: rep.id,
                status: 'deposited',
                date: { gte: startDate, lt: endDate },
            },
            _sum: { amount: true },
        });
        const totalCollected = collectionAgg._sum.amount || 0;

        const commissionBase =
            rep.commissionType === 'invoice_total' ? totalSales : totalCollected;
        const commissionAmount = commissionBase * (rep.commissionRate / 100);

        const commission = await (prisma as any).commissionPayment.upsert({
            where: {
                salesRepId_year_month: {
                    salesRepId: rep.id,
                    year: parseInt(year),
                    month: parseInt(month),
                },
            },
            update: {
                totalSales,
                totalCollected,
                commissionBase,
                commissionRate: rep.commissionRate,
                commissionAmount,
                status: 'calculated',
            },
            create: {
                salesRepId: rep.id,
                year: parseInt(year),
                month: parseInt(month),
                totalSales,
                totalCollected,
                commissionBase,
                commissionRate: rep.commissionRate,
                commissionAmount,
                status: 'calculated',
                companyId,
            },
            include: {
                salesRep: { select: { id: true, name: true } },
            },
        });

        calculated.push(commission);
    }

    const ctx = extractLogContext(session, request);
    await logActivity({
        ...ctx,
        action: 'create',
        module: 'commissions',
        entityType: 'CommissionPayment',
        description: `تم احتساب عمولات شهر ${month}/${year} لـ ${calculated.length} مندوب`,
        newData: { year, month, count: calculated.length },
    });

    return NextResponse.json(calculated, { status: 201 });
});
