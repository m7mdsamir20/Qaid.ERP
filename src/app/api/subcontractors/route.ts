import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const subcontractors = await prisma.subcontractor.findMany({
            where: {
                companyId: session.companyId,
                OR: [
                    { name: { contains: search } },
                    { phone: { contains: search } }
                ]
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(subcontractors);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const sub = await prisma.subcontractor.create({
            data: {
                name: body.name,
                phone: body.phone,
                address: body.address,
                specialty: body.specialty,
                taxNumber: body.taxNumber,
                notes: body.notes,
                companyId: session.companyId
            }
        });
        return NextResponse.json(sub, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
