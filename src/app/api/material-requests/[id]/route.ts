import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, { params }) => {
    const companyId = (session.user as any).companyId;
    const mr = await prisma.materialRequest.findUnique({
        where: { id: params.id, companyId },
        include: {
            project: { select: { id: true, name: true, projectNumber: true } },
            phase: { select: { id: true, name: true } },
            lines: { include: { item: { select: { id: true, name: true, code: true } } } },
        },
    });
    if (!mr) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    return NextResponse.json(mr);
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    const companyId = (session.user as any).companyId;

    const existing = await prisma.materialRequest.findUnique({
        where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.requiredDate !== undefined) updateData.requiredDate = body.requiredDate ? new Date(body.requiredDate) : null;

    const mr = await prisma.materialRequest.update({
        where: { id: params.id, companyId },
        data: updateData,
        include: {
            project: { select: { name: true } },
            lines: { include: { item: true } },
        },
    });

    const actionLabel = body.status === 'approved' ? 'approve' :
        body.status === 'rejected' ? 'reject' : 'update';

    await logActivity({
        ...extractLogContext(session, request),
        action: actionLabel as any,
        module: 'material-requests',
        entityType: 'MaterialRequest',
        entityId: mr.id,
        entityRef: `MR-${String(existing.requestNumber).padStart(5, '0')}`,
        description: `${actionLabel === 'approve' ? 'اعتمد' : actionLabel === 'reject' ? 'رفض' : 'عدّل'} طلب المواد رقم MR-${String(existing.requestNumber).padStart(5, '0')}`,
        oldData: existing,
        newData: mr,
    });

    return NextResponse.json(mr);
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    const companyId = (session.user as any).companyId;
    const existing = await prisma.materialRequest.findUnique({
        where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (existing.status !== 'pending') {
        return NextResponse.json({ error: 'لا يمكن حذف طلب غير معلق' }, { status: 400 });
    }

    await prisma.materialRequest.delete({ where: { id: params.id, companyId } });

    await logActivity({
        ...extractLogContext(session, request),
        action: 'delete',
        module: 'material-requests',
        entityType: 'MaterialRequest',
        entityId: params.id,
        entityRef: `MR-${String(existing.requestNumber).padStart(5, '0')}`,
        description: `حذف طلب المواد رقم MR-${String(existing.requestNumber).padStart(5, '0')}`,
    });

    return NextResponse.json({ success: true });
});
