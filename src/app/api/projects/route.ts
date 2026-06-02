import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const skip = parseInt(searchParams.get('skip') || '0');
        const take = parseInt(searchParams.get('take') || '50');

        const where: any = { companyId: session.companyId };
        
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { location: { contains: search } },
            ];
            // Try matching projectNumber if search is numeric
            if (!isNaN(Number(search))) {
                where.OR.push({ projectNumber: Number(search) });
            }
        }
        
        if (status && status !== 'all') {
            where.status = status;
        }

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: {
                    customer: { select: { name: true } },
                    manager: { select: { name: true } },
                    _count: { select: { phases: true, progressBills: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.project.count({ where })
        ]);

        return NextResponse.json({ projects, total });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const lastProject = await prisma.project.findFirst({
            where: { companyId: session.companyId },
            orderBy: { projectNumber: 'desc' }
        });
        const nextNumber = (lastProject?.projectNumber || 0) + 1;

        const project = await prisma.project.create({
            data: {
                projectNumber: nextNumber,
                name: body.name,
                description: body.description,
                customerId: body.customerId || null,
                location: body.location,
                projectType: body.projectType || 'residential',
                contractValue: Number(body.contractValue) || 0,
                estimatedCost: Number(body.estimatedCost) || 0,
                expectedProfit: Number(body.expectedProfit) || 0,
                startDate: new Date(body.startDate),
                expectedEndDate: body.expectedEndDate ? new Date(body.expectedEndDate) : null,
                managerId: body.managerId || null,
                status: body.status || 'active',
                notes: body.notes,
                companyId: session.companyId,
                branchId: session.branchId || null
            }
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
