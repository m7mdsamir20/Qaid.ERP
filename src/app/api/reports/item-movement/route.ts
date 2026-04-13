import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');
        const branchId = searchParams.get('branchId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        if (!itemId) {
            const availableItems = await prisma.item.findMany({
                where: { companyId },
                select: { id: true, name: true, code: true }
            });
            return NextResponse.json({ items: availableItems });
        }

        const warehouseFilter = branchId && branchId !== 'all'
            ? { warehouse: { branchId } }
            : {};

        const dateFilter: { gte?: Date; lte?: Date } = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); dateFilter.lte = end; }

        const movements = await prisma.stockMovement.findMany({
            where: {
                itemId,
                companyId,
                ...(from || to ? { date: dateFilter } : {}),
                ...warehouseFilter
            },
            include: {
                item: true,
                warehouse: true,
            },
            orderBy: { date: 'desc' },
        });

        const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: { unit: true, category: true, stocks: { include: { warehouse: true } } }
        });

        if (!item || item.companyId !== companyId) {
            return NextResponse.json({ error: "الصنف غير موجود أو غير تابع للشركة" }, { status: 404 });
        }

        return NextResponse.json({
            movements,
            item: {
                id: item.id,
                name: item.name,
                code: item.code,
                unit: item.unit?.name || '—',
                category: item.category?.name || '—',
                totalStock: item.stocks.reduce((acc, s) => acc + s.quantity, 0),
                stockByWarehouse: item.stocks.map(s => ({ warehouse: s.warehouse.name, quantity: s.quantity }))
            }
        });
    } catch (error) {
        console.error("Item Movement API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير حركة الصنف" }, { status: 500 });
    }
});


