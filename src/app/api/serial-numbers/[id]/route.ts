import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, _body, { params }) => {
    const companyId = (session.user as any).companyId;
    const { id } = await params;

    const record = await prisma.serialNumber.findFirst({
        where: { id, companyId },
        include: {
            item: { select: { name: true, code: true } },
        },
    });

    if (!record) {
        return NextResponse.json({ error: 'الرقم التسلسلي غير موجود' }, { status: 404 });
    }

    const [customerData, warehouseData] = await Promise.all([
        record.customerId ? prisma.customer.findUnique({ where: { id: record.customerId }, select: { name: true } }) : null,
        record.warehouseId ? prisma.warehouse.findUnique({ where: { id: record.warehouseId }, select: { name: true } }) : null,
    ]);

    return NextResponse.json({
        ...record,
        customerName: customerData?.name || null,
        warehouseName: warehouseData?.name || null,
    });
});

export const PUT = withProtection(async (request, session, body, { params }) => {
    const companyId = (session.user as any).companyId;
    const { id } = await params;
    const ctx = extractLogContext(session, request);

    const existing = await prisma.serialNumber.findFirst({
        where: { id, companyId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'الرقم التسلسلي غير موجود' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.warehouseId !== undefined) updateData.warehouseId = body.warehouseId || null;
    if (body.warrantyEnd !== undefined) updateData.warrantyEnd = body.warrantyEnd ? new Date(body.warrantyEnd) : null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.soldAt !== undefined) updateData.soldAt = body.soldAt ? new Date(body.soldAt) : null;
    if (body.invoiceId !== undefined) updateData.invoiceId = body.invoiceId || null;

    const updated = await prisma.serialNumber.update({
        where: { id },
        data: updateData,
    });

    await logActivity({
        ...ctx,
        action: 'update',
        module: 'serial-numbers',
        entityType: 'SerialNumber',
        entityId: id,
        description: `تعديل الرقم التسلسلي ${existing.serial}`,
        oldData: { status: existing.status },
        newData: updateData,
    });

    return NextResponse.json(updated);
});

export const DELETE = withProtection(async (request, session, _body, { params }) => {
    const companyId = (session.user as any).companyId;
    const { id } = await params;
    const ctx = extractLogContext(session, request);

    const existing = await prisma.serialNumber.findFirst({
        where: { id, companyId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'الرقم التسلسلي غير موجود' }, { status: 404 });
    }

    if (existing.status !== 'in_stock') {
        return NextResponse.json({ error: 'لا يمكن حذف الرقم التسلسلي إلا إذا كان بحالة في المخزن' }, { status: 400 });
    }

    await prisma.serialNumber.delete({ where: { id } });

    await logActivity({
        ...ctx,
        action: 'delete',
        module: 'serial-numbers',
        entityType: 'SerialNumber',
        entityId: id,
        description: `حذف الرقم التسلسلي ${existing.serial}`,
        oldData: { serial: existing.serial, status: existing.status },
    });

    return NextResponse.json({ success: true });
});
