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

        const bizType = (session.user as any).businessType?.toUpperCase() || 'TRADING';
        const isRestaurant = bizType === 'RESTAURANTS';
        const itemTypeFilter = isRestaurant ? { in: ['raw', 'product'] } : 'product';

        // Fetch all items with their stocks, units, and categories
        const items = await prisma.item.findMany({
            where: { companyId, type: itemTypeFilter },
            include: {
                stocks: {
                    include: {
                        warehouse: true
                    }
                },
                unit: true,
                category: true,
            }
        });

        // Filter items where total quantity is less than or equal to minLimit (per branch if filtered)
        const lowStockItems = items.map(item => {
            const filteredStocks = (branchId && branchId !== 'all')
                ? item.stocks.filter(s => s.warehouse.branchId === branchId)
                : item.stocks;

            const totalStock = filteredStocks.reduce((sum, s) => sum + s.quantity, 0);
            const normalizedStock = (Math.abs(totalStock) < 0.001) ? 0 : totalStock;
            const val = normalizedStock * (item.averageCost || item.costPrice || 0);

            return {
                id: item.id,
                code: item.code,
                name: item.name,
                totalStock: normalizedStock,
                minLimit: item.minLimit || 0,
                unit: item.unit?.name || '—',
                category: item.category?.name || '—',
                averageCost: item.averageCost || 0,
                value: val === 0 ? 0 : val
            };
        }).filter(item => item.totalStock <= item.minLimit);

        return NextResponse.json(lowStockItems);
    } catch (error) {
        console.error("Low Stock Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير النواقص" }, { status: 500 });
    }
});
