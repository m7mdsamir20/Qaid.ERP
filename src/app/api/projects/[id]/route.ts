import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        const project = await prisma.project.findUnique({
            where: { id, companyId: session.companyId },
            include: {
                customer: true,
                manager: true,
                phases: { orderBy: { sortOrder: 'asc' } },
                progressBills: {
                    orderBy: { date: 'desc' },
                    include: { lines: true }
                },
                subContracts: {
                    include: { subcontractor: true }
                }
            }
        });

        if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });

        return NextResponse.json(project);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        
        const project = await prisma.project.update({
            where: { id, companyId: session.companyId },
            data: {
                name: body.name,
                description: body.description,
                customerId: body.customerId || null,
                location: body.location,
                projectType: body.projectType,
                contractValue: Number(body.contractValue) || 0,
                estimatedCost: Number(body.estimatedCost) || 0,
                expectedProfit: Number(body.expectedProfit) || 0,
                startDate: new Date(body.startDate),
                expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null,
                actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : null,
                managerId: body.managerId || null,
                status: body.status,
                completionPercent: Number(body.completionPercent) || 0,
                notes: body.notes
            }
        });

        return NextResponse.json(project);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const id = params.id;
        await prisma.project.delete({
            where: { id, companyId: session.companyId }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'لا يمكن حذف المشروع لوجود عمليات مرتبطة به' }, { status: 400 });
    }
});
