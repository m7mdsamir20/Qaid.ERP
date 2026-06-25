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
        const branchId = searchParams.get('branchId');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        const where: any = { 
            companyId,
            status: { not: 'draft' }
        };
        if (from) where.date = { ...where.date, gte: new Date(from) };
        if (to)   where.date = { ...where.date, lte: new Date(to + 'T23:59:59') };

        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        } else {
            const bf = getBranchFilter(session);
            if (bf.branchId) where.branchId = bf.branchId;
        }

        const allOrders = await prisma.salesOrder.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                lines: true
            },
            orderBy: { date: 'desc' },
        });

        // Filter pending (not fully delivered)
        const pendingOrders = allOrders.filter(o => {
            if (o.lines.length === 0) return true;
            return o.lines.some(l => l.deliveredQty < l.quantity);
        });

        const totalPendingValue = pendingOrders.reduce((s, o) => s + o.total, 0);
        const count = pendingOrders.length;

        // Calculate overdue count (expected delivery date in past, not fully delivered)
        const now = new Date();
        const overdueCount = pendingOrders.filter(o => o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < now).length;

        return NextResponse.json({
            orders: pendingOrders,
            totalPendingValue,
            count,
            overdueCount
        });
    } catch (error) {
        console.error("Pending Sales Orders Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير أوامر البيع المعلقة" }, { status: 500 });
    }
});
