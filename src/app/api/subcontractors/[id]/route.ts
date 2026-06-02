import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        const sub = await prisma.subcontractor.findUnique({
            where: { id, companyId: session.companyId },
            include: { subContracts: { include: { project: true } } }
        });
        if (!sub) return NextResponse.json({ error: 'مقاول الباطن غير موجود' }, { status: 404 });
        return NextResponse.json(sub);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        const sub = await prisma.subcontractor.update({
            where: { id, companyId: session.companyId },
            data: {
                name: body.name,
                phone: body.phone,
                address: body.address,
                specialty: body.specialty,
                taxNumber: body.taxNumber,
                notes: body.notes
            }
        });
        return NextResponse.json(sub);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        await prisma.subcontractor.delete({
            where: { id, companyId: session.companyId }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'لا يمكن حذف مقاول الباطن لوجود عمليات مرتبطة به' }, { status: 400 });
    }
});
