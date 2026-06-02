import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        
        const where: any = { companyId: session.companyId };
        if (projectId) where.projectId = projectId;

        const contracts = await prisma.subContract.findMany({
            where,
            include: {
                project: { select: { name: true } },
                subcontractor: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(contracts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const lastContract = await prisma.subContract.findFirst({
            where: { companyId: session.companyId },
            orderBy: { contractNumber: 'desc' }
        });
        const nextNumber = (lastContract?.contractNumber || 0) + 1;

        const contract = await prisma.subContract.create({
            data: {
                contractNumber: nextNumber,
                projectId: body.projectId,
                subcontractorId: body.subcontractorId,
                description: body.description,
                contractValue: Number(body.contractValue) || 0,
                startDate: body.startDate ? new Date(body.startDate) : null,
                endDate: body.endDate ? new Date(body.endDate) : null,
                notes: body.notes,
                companyId: session.companyId
            }
        });

        // Update Subcontractor Balance and Project Actual Cost or similar logic could go here
        
        return NextResponse.json(contract, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
