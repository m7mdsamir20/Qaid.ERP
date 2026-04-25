import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const drivers = await prisma.driver.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { orders: { where: { type: 'delivery' } } }
                }
            }
        });
        return NextResponse.json(drivers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const data = await request.json();
        const driver = await prisma.driver.create({
            data: {
                companyId,
                name: data.name,
                phone: data.phone,
                status: data.status || 'available'
            }
        });
        return NextResponse.json(driver);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const data = await request.json();
        
        // Ensure ownership
        const existing = await prisma.driver.findUnique({ where: { id: data.id } });
        if (!existing || existing.companyId !== companyId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const driver = await prisma.driver.update({
            where: { id: data.id },
            data: {
                name: data.name,
                phone: data.phone,
                status: data.status
            }
        });
        return NextResponse.json(driver);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const existing = await prisma.driver.findUnique({ where: { id } });
        if (!existing || existing.companyId !== companyId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await prisma.driver.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
