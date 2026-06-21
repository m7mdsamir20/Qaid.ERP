import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, { params }) => {
    const { id } = await params;
    const companyId = (session.user as any).companyId;
    const report = await prisma.dailySiteReport.findUnique({
        where: { id, companyId },
        include: { project: { select: { id: true, name: true, projectNumber: true } } },
    });
    if (!report) return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });
    return NextResponse.json(report);
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    const { id } = await params;
    const companyId = (session.user as any).companyId;

    const existing = await prisma.dailySiteReport.findUnique({
        where: { id, companyId },
    });
    if (!existing) return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });

    const updateData: any = {};
    if (body.weather !== undefined) updateData.weather = body.weather || null;
    if (body.workersCount !== undefined) updateData.workersCount = Number(body.workersCount) || 0;
    if (body.workDescription !== undefined) updateData.workDescription = body.workDescription;
    if (body.issues !== undefined) updateData.issues = body.issues || null;
    if (body.safetyIncidents !== undefined) updateData.safetyIncidents = body.safetyIncidents || null;
    if (body.completionPercent !== undefined) updateData.completionPercent = body.completionPercent !== null ? Number(body.completionPercent) : null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;

    const report = await prisma.dailySiteReport.update({
        where: { id, companyId },
        data: updateData,
        include: { project: { select: { id: true, name: true, projectNumber: true } } },
    });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'update',
        module: 'daily-site-reports',
        entityType: 'DailySiteReport',
        entityId: report.id,
        entityRef: `DSR-${String(existing.reportNumber).padStart(5, '0')}`,
        description: `عدّل التقرير اليومي رقم DSR-${String(existing.reportNumber).padStart(5, '0')}`,
        oldData: existing,
        newData: report,
    });

    return NextResponse.json(report);
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    const { id } = await params;
    const companyId = (session.user as any).companyId;

    const existing = await prisma.dailySiteReport.findUnique({
        where: { id, companyId },
    });
    if (!existing) return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });

    await prisma.dailySiteReport.delete({ where: { id, companyId } });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'delete',
        module: 'daily-site-reports',
        entityType: 'DailySiteReport',
        entityId: id,
        entityRef: `DSR-${String(existing.reportNumber).padStart(5, '0')}`,
        description: `حذف التقرير اليومي رقم DSR-${String(existing.reportNumber).padStart(5, '0')}`,
    });

    return NextResponse.json({ success: true });
});
