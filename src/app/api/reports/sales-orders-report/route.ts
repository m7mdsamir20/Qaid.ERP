import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const status = searchParams.get('status');
        const branchId = searchParams.get('branchId');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        const where: any = { companyId };
        if (from) where.date = { ...where.date, gte: new Date(from) };
        if (to)   where.date = { ...where.date, lte: new Date(to + 'T23:59:59') };
        if (status && status !== 'all') where.status = status;

        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        } else {
            const bf = getBranchFilter(session);
            if (bf.branchId) where.branchId = bf.branchId;
        }

        const orders = await prisma.salesOrder.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                lines: true
            },
            orderBy: { date: 'desc' },
        });

        // Compute stats
        const totalAmount = orders.reduce((s, o) => s + o.total, 0);
        const count = orders.length;

        // Check delivery stats
        let fullyDeliveredCount = 0;
        let partiallyDeliveredCount = 0;
        orders.forEach(o => {
            if (o.lines.length === 0) return;
            const allDelivered = o.lines.every(l => l.deliveredQty >= l.quantity);
            const someDelivered = o.lines.some(l => l.deliveredQty > 0);
            if (allDelivered) {
                fullyDeliveredCount++;
            } else if (someDelivered) {
                partiallyDeliveredCount++;
            }
        });

        return NextResponse.json({
            orders,
            totalAmount,
            count,
            fullyDeliveredCount,
            partiallyDeliveredCount
        });
    } catch (error) {
        console.error("Sales Orders Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير أوامر البيع" }, { status: 500 });
    }
});
