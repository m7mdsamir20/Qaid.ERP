import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET: Restaurant performance report
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');

        const dateFilter: any = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            dateFilter.lte = toDate;
        }
        const where: any = { companyId, ...(from || to ? { createdAt: dateFilter } : {}) };
        const wherePaid = { ...where, status: { not: 'cancelled' } };

        // 1. Sales summary
        const salesAgg = await prisma.posOrder.aggregate({
            where: wherePaid,
            _sum: { total: true, taxAmount: true, discount: true, subtotal: true },
            _count: { id: true },
            _avg: { total: true },
        });

        // 2. Cancelled orders
        const cancelledCount = await prisma.posOrder.count({
            where: { ...where, status: 'cancelled' }
        });

        // 3. Order type breakdown
        const ordersByType = await prisma.posOrder.groupBy({
            by: ['type'],
            where: wherePaid,
            _sum: { total: true },
            _count: { id: true }
        });

        // 4. Payment method breakdown
        const paymentBreakdown = await prisma.posPayment.groupBy({
            by: ['paymentMethod'],
            where: { order: { ...wherePaid } },
            _sum: { amount: true },
            _count: { id: true }
        });

        // 5. Top selling items
        const topItems = await prisma.posOrderLine.groupBy({
            by: ['itemId', 'itemName'],
            where: { order: { ...wherePaid } },
            _sum: { total: true, quantity: true },
            _count: { id: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10
        });

        // 6. Hourly distribution (today only if no date filter)
        const hourlyOrders = await prisma.posOrder.findMany({
            where: wherePaid,
            select: { createdAt: true, total: true },
            orderBy: { createdAt: 'asc' }
        });

        const hourlyMap: Record<number, { count: number; total: number }> = {};
        for (const o of hourlyOrders) {
            const h = new Date(o.createdAt).getHours();
            if (!hourlyMap[h]) hourlyMap[h] = { count: 0, total: 0 };
            hourlyMap[h].count++;
            hourlyMap[h].total += o.total;
        }

        // 7. Shifts summary
        const shifts = await prisma.shift.findMany({
            where: { companyId, ...(from || to ? { openedAt: dateFilter } : {}) },
            select: { id: true, shiftNumber: true, totalSales: true, totalOrders: true, status: true, openedAt: true, closedAt: true, difference: true },
            orderBy: { openedAt: 'desc' },
            take: 10
        });

        return NextResponse.json({
            sales: {
                totalRevenue: salesAgg._sum.total ?? 0,
                totalTax: salesAgg._sum.taxAmount ?? 0,
                totalDiscount: salesAgg._sum.discount ?? 0,
                totalSubtotal: salesAgg._sum.subtotal ?? 0,
                totalOrders: salesAgg._count.id,
                averageOrderValue: salesAgg._avg.total ?? 0,
                cancelledOrders: cancelledCount,
            },
            ordersByType: ordersByType.map(t => ({
                type: t.type,
                count: t._count.id,
                total: t._sum.total ?? 0
            })),
            paymentBreakdown: paymentBreakdown.map(p => ({
                method: p.paymentMethod,
                count: p._count.id,
                total: p._sum.amount ?? 0
            })),
            topItems: topItems.map(t => ({
                itemId: t.itemId,
                itemName: t.itemName,
                quantitySold: t._sum.quantity ?? 0,
                totalRevenue: t._sum.total ?? 0,
                orderCount: t._count.id
            })),
            hourlyDistribution: Object.entries(hourlyMap).map(([h, v]) => ({
                hour: parseInt(h),
                count: v.count,
                total: v.total
            })).sort((a, b) => a.hour - b.hour),
            recentShifts: shifts
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
