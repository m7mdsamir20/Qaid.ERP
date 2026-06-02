import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const projectId = params.id;
        const phases = await prisma.projectPhase.findMany({
            where: { projectId, companyId: session.companyId },
            orderBy: { sortOrder: 'asc' }
        });
        return NextResponse.json(phases);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body, { params }) => {
    try {
        const projectId = params.id;
        const phase = await prisma.projectPhase.create({
            data: {
                projectId,
                name: body.name,
                sortOrder: Number(body.sortOrder) || 0,
                estimatedCost: Number(body.estimatedCost) || 0,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null,
                status: body.status || 'pending',
                notes: body.notes,
                companyId: session.companyId
            }
        });
        return NextResponse.json(phase, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
