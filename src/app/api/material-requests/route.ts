import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const companyId = (session.user as any).companyId;

    const where: any = { companyId };
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;
    if (dateFrom || dateTo) {
        where.requestDate = {};
        if (dateFrom) where.requestDate.gte = new Date(dateFrom);
        if (dateTo) where.requestDate.lte = new Date(dateTo + 'T23:59:59');
    }

    const requests = await prisma.materialRequest.findMany({
        where,
        include: {
            project: { select: { id: true, name: true, projectNumber: true } },
            phase: { select: { id: true, name: true } },
            lines: { include: { item: { select: { id: true, name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests, total: requests.length });
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const user = session.user as any;

    const last = await prisma.materialRequest.findFirst({
        where: { companyId },
        orderBy: { requestNumber: 'desc' },
    });
    const nextNumber = (last?.requestNumber || 0) + 1;

    const project = await prisma.project.findUnique({
        where: { id: body.projectId, companyId },
        select: { name: true },
    });
    if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });

    const mr = await prisma.materialRequest.create({
        data: {
            requestNumber: nextNumber,
            projectId: body.projectId,
            phaseId: body.phaseId || null,
            requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
            notes: body.notes || null,
            requestedBy: user.name || null,
            status: 'pending',
            companyId,
            lines: {
                create: (body.lines || []).map((l: any) => ({
                    itemId: l.itemId,
                    quantity: Number(l.quantity),
                    unit: l.unit || null,
                    notes: l.notes || null,
                })),
            },
        },
        include: { lines: true, project: true },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'material-requests',
        entityType: 'MaterialRequest',
        entityId: mr.id,
        entityRef: `MR-${String(nextNumber).padStart(5, '0')}`,
        description: `أنشأ طلب مواد رقم MR-${String(nextNumber).padStart(5, '0')} للمشروع ${project.name}`,
        newData: mr,
    });

    return NextResponse.json(mr, { status: 201 });
});
