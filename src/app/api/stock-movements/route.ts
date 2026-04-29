import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const itemId      = searchParams.get('itemId');
        const warehouseId = searchParams.get('warehouseId');
        const type        = searchParams.get('type');

        const where: any = { companyId, item: { type: 'raw' } };
        if (itemId)      where.itemId      = itemId;
        if (warehouseId) where.warehouseId = warehouseId;
        if (type)        where.type        = type;

        const movements = await prisma.stockMovement.findMany({
            where,
            include: {
                item: { include: { unit: true } },
                warehouse: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        return NextResponse.json(movements);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});
