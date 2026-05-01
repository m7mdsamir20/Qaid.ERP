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
        const branchId = searchParams.get('branchId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const type = searchParams.get('type');
        const branchFilter = (() => {
            if (branchId && branchId !== 'all') return { branchId };
            if (branchId === 'all') return {}; // Show everything for the company if 'all' is selected
            const bf = getBranchFilter(session);
            if (bf.branchId) return { branchId: bf.branchId };
            return {};
        })();

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); dateFilter.lte = end; }

        const fetchReturns = await prisma.invoice.findMany({
            where: {
                companyId,
                type: type && type !== 'all' ? type : { in: ['sale_return', 'purchase_return'] },
                ...(from || to ? { date: dateFilter } : {}),
                ...branchFilter
            },
            include: {
                customer: { select: { name: true } },
                supplier: { select: { name: true } },
                lines: { include: { item: { select: { name: true } } } }
            },
            orderBy: { date: 'desc' },
        });

        const totalSaleReturns = fetchReturns.filter(r => r.type === 'sale_return').reduce((s, i) => s + i.total, 0);
        const totalPurchaseReturns = fetchReturns.filter(r => r.type === 'purchase_return').reduce((s, i) => s + i.total, 0);

        return NextResponse.json({
            returns: fetchReturns.map(r => ({
                id: r.id,
                invoiceNumber: r.invoiceNumber,
                type: r.type,
                date: r.date,
                party: r.customer?.name || r.supplier?.name || '—',
                total: r.total,
                itemCount: r.lines.length,
            })),
            totalSaleReturns,
            totalPurchaseReturns,
        });
    } catch (error) {
        console.error("Returns Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير المرتجعات" }, { status: 500 });
    }
});


