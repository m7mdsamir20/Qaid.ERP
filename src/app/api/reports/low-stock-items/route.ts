import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        // Fetch all items with their stocks and units
        const items = await prisma.item.findMany({
            where: { companyId },
            include: {
                stocks: true,
                unit: true,
                category: true,
            }
        });

        // Filter items where total quantity is less than or equal to minLimit
        const lowStockItems = items.filter(item => {
            const totalStock = item.stocks.reduce((sum, s) => sum + s.quantity, 0);
            return totalStock <= (item.minLimit || 0);
        }).map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            totalStock: item.stocks.reduce((sum, s) => sum + s.quantity, 0),
            minLimit: item.minLimit,
            unit: item.unit?.name || '—',
            category: item.category?.name || '—',
            averageCost: item.averageCost || 0,
            value: item.stocks.reduce((sum, s) => sum + s.quantity, 0) * (item.averageCost || item.costPrice || 0)
        }));

        return NextResponse.json(lowStockItems);
    } catch (error) {
        console.error("Low Stock Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير النواقص" }, { status: 500 });
    }
});


