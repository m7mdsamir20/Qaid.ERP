import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request: NextRequest, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const url = new URL(request.url);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const branchId = url.searchParams.get('branchId');

        let whereClause: any = {
            companyId,
            type: 'out',
            OR: [
                { notes: { contains: 'هالك' } },
                { notes: { contains: 'تالف' } },
                { notes: { contains: 'waste', mode: 'insensitive' } },
                { notes: { contains: 'spoilage', mode: 'insensitive' } },
                { reference: { contains: 'waste', mode: 'insensitive' } },
                { type: 'waste' }
            ]
        };

        if (from || to) {
            whereClause.date = {};
            if (from) whereClause.date.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                whereClause.date.lte = toDate;
            }
        }

        if (branchId && branchId !== 'all') {
            whereClause.warehouse = { branchId: branchId };
        }

        const movements = await prisma.stockMovement.findMany({
            where: whereClause,
            include: {
                item: { select: { name: true, code: true, unit: { select: { name: true } } } },
                warehouse: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        const totalLoss = movements.reduce((sum: number, m: any) => sum + ((m.quantity * (m.unitPrice || 0))), 0);

        return NextResponse.json({
            wasteMovements: movements,
            totalLoss
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
});
