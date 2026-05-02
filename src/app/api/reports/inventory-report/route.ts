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

        const branchId = request.nextUrl.searchParams.get('branchId');
        const warehouseFilter = (() => {
            if (branchId && branchId !== 'all') return { branchId };
            const bf = getBranchFilter(session);
            if (bf.branchId) return { branchId: bf.branchId };
            return {};
        })();

        const stocks = await prisma.stock.findMany({
            where: { item: { companyId, type: 'raw' }, warehouse: { companyId, ...warehouseFilter } },
            include: {
                item: { select: { code: true, name: true, unit: { select: { name: true } }, costPrice: true, sellPrice: true, averageCost: true } },
                warehouse: { select: { name: true } },
            },
            orderBy: [{ item: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
        });

        const totalItemsCount = new Set(stocks.map(s => s.itemId)).size;
        const totalQuantity = stocks.reduce((s, st) => s + st.quantity, 0);
        const totalValue = stocks.reduce((s, st) => s + (st.quantity * (st.item.averageCost || st.item.costPrice || 0)), 0);

        return NextResponse.json({ 
            stocks: stocks.map(s => ({
                id: s.id,
                quantity: s.quantity,
                item: {
                    code: s.item.code,
                    name: s.item.name,
                    unit: s.item.unit?.name || '—',
                    costPrice: s.item.averageCost || s.item.costPrice || 0,
                    sellPrice: s.item.sellPrice || 0,
                    averageCost: s.item.averageCost || s.item.costPrice || 0
                },
                warehouse: {
                    name: s.warehouse.name
                }
            })), 
            totalItems: totalItemsCount, 
            totalQuantity, 
            totalValue 
        });
    } catch (error) {
        console.error("Inventory Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب التقرير" }, { status: 500 });
    }
});


