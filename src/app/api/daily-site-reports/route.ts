import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const companyId = (session.user as any).companyId;

    const where: any = { companyId };
    if (projectId) where.projectId = projectId;
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const reports = await prisma.dailySiteReport.findMany({
        where,
        include: { project: { select: { id: true, name: true, projectNumber: true } } },
        orderBy: { date: 'desc' },
    });

    return NextResponse.json({ reports, total: reports.length });
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const user = session.user as any;

    const project = await prisma.project.findUnique({
        where: { id: body.projectId, companyId },
        select: { name: true },
    });
    if (!project) return NextResponse.json({ error: 'المشروع غير موجود' }, { status: 404 });

    const last = await prisma.dailySiteReport.findFirst({
        where: { companyId },
        orderBy: { reportNumber: 'desc' },
    });
    const nextNumber = (last?.reportNumber || 0) + 1;

    const report = await prisma.dailySiteReport.create({
        data: {
            reportNumber: nextNumber,
            projectId: body.projectId,
            date: new Date(body.date),
            weather: body.weather || null,
            workersCount: Number(body.workersCount) || 0,
            workDescription: body.workDescription,
            issues: body.issues || null,
            safetyIncidents: body.safetyIncidents || null,
            completionPercent: body.completionPercent !== undefined ? Number(body.completionPercent) : null,
            notes: body.notes || null,
            submittedBy: user.name || null,
            companyId,
        },
        include: { project: true },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'create',
        module: 'daily-site-reports',
        entityType: 'DailySiteReport',
        entityId: report.id,
        entityRef: `DSR-${String(nextNumber).padStart(5, '0')}`,
        description: `أنشأ تقرير يومي رقم DSR-${String(nextNumber).padStart(5, '0')} للمشروع ${project.name}`,
        newData: report,
    });

    return NextResponse.json(report, { status: 201 });
});
