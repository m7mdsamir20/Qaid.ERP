import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET: list shifts (with optional status filter)
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const status = new URL(request.url).searchParams.get('status');
        const shifts = await prisma.shift.findMany({
            where: { companyId, ...(status ? { status } : {}) },
            include: { _count: { select: { orders: true } } },
            orderBy: { openedAt: 'desc' },
            take: 30,
        });
        return NextResponse.json(shifts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST: open a new shift
export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const userId = (session.user as any).id;

        // Close any open shifts first
        await prisma.shift.updateMany({
            where: { companyId, status: 'open' },
            data: { status: 'closed', closedAt: new Date() },
        });

        // Get next shift number
        const last = await prisma.shift.findFirst({ where: { companyId }, orderBy: { shiftNumber: 'desc' } });
        const shiftNumber = (last?.shiftNumber ?? 0) + 1;

        const shift = await prisma.shift.create({
            data: {
                shiftNumber,
                openingBalance: body.openingBalance ?? 0,
                notes: body.notes,
                userId,
                companyId,
            },
        });
        return NextResponse.json(shift, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT: close a shift
export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Calculate total sales from orders in this shift
        const agg = await prisma.posOrder.aggregate({
            where: { shiftId: body.id, companyId, status: { not: 'cancelled' } },
            _sum: { total: true },
            _count: { id: true },
        });

        const totalSales = agg._sum.total ?? 0;
        const totalOrders = agg._count.id;
        const closingBalance = (body.closingBalance ?? 0);
        const expectedBalance = (body.openingBalance ?? 0) + totalSales;
        const difference = closingBalance - expectedBalance;

        await prisma.shift.updateMany({
            where: { id: body.id, companyId },
            data: {
                status: 'closed',
                closedAt: new Date(),
                closingBalance,
                expectedBalance,
                difference,
                totalSales,
                totalOrders,
                notes: body.notes,
            },
        });
        return NextResponse.json({ success: true, totalSales, totalOrders, difference });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
