import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const tables = await prisma.restaurantTable.findMany({
            where: { companyId },
            include: { _count: { select: { orders: { where: { status: { in: ['pending', 'preparing', 'ready'] } } } } } },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(tables);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const table = await prisma.restaurantTable.create({
            data: {
                name: body.name,
                capacity: body.capacity ?? 4,
                section: body.section,
                posX: body.posX,
                posY: body.posY,
                companyId,
            },
        });
        return NextResponse.json(table, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.restaurantTable.updateMany({
            where: { id: body.id, companyId },
            data: {
                name: body.name,
                capacity: body.capacity,
                section: body.section,
                status: body.status,
                posX: body.posX,
                posY: body.posY,
            },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const id = new URL(request.url).searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await prisma.restaurantTable.deleteMany({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
