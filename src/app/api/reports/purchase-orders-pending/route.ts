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
            status: { not: 'draft' } // Pending orders are approved/active orders, not draft
        };
        if (from) where.date = { ...where.date, gte: new Date(from) };
        if (to)   where.date = { ...where.date, lte: new Date(to + 'T23:59:59') };

        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        } else {
            const bf = getBranchFilter(session);
            if (bf.branchId) where.branchId = bf.branchId;
        }

        const allOrders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
                lines: true
            },
            orderBy: { date: 'desc' },
        });

        // Filter in-memory to keep only those that have not been fully received
        const pendingOrders = allOrders.filter(o => {
            if (o.lines.length === 0) return true; // If no lines, assume pending
            return o.lines.some(l => l.receivedQty < l.quantity);
        });

        const totalPendingValue = pendingOrders.reduce((s, o) => s + o.total, 0);
        const count = pendingOrders.length;

        // Calculate overdue count (expected delivery date is in the past, and not fully received)
        const now = new Date();
        const overdueCount = pendingOrders.filter(o => o.expectedDeliveryDate && new Date(o.expectedDeliveryDate) < now).length;

        return NextResponse.json({
            orders: pendingOrders,
            totalPendingValue,
            count,
            overdueCount
        });
    } catch (error) {
        console.error("Pending Purchase Orders Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير أوامر الشراء المعلقة" }, { status: 500 });
    }
});
