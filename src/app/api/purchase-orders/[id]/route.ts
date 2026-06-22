import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
    const companyId = (session.user as any).companyId;
    const { id } = context.params;

    const order = await prisma.purchaseOrder.findUnique({
        where: { id, companyId },
        include: {
            supplier: true,
            warehouse: true,
            project: true,
            lines: {
                include: {
                    item: {
                        include: { unit: true },
                    },
                },
            },
        },
    });

    if (!order) return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });

    return NextResponse.json(order);
});

export const PUT = withProtection(async (request: NextRequest, session: any, body: any, context: any) => {
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const { id } = context.params;

    const existing = await prisma.purchaseOrder.findUnique({
        where: { id, companyId },
        select: { id: true, status: true, orderNumber: true, supplierId: true },
    });

    if (!existing) return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });

    const ctx = extractLogContext(session, request);
    const poRef = `PO-${String(existing.orderNumber).padStart(5, '0')}`;

    // Status-only update (approve / cancel)
    if (body.status) {
        const newStatus = body.status;

        if (newStatus === 'approved') {
            if (existing.status !== 'draft') {
                return NextResponse.json({ error: 'لا يمكن اعتماد أمر الشراء في حالته الحالية' }, { status: 400 });
            }
            // Permission check
            if (!(session.user as any).isSuperAdmin && (session.user as any).role !== 'admin') {
                let hasApprove = false;
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { customRole: { select: { permissions: true } } }
                    });
                    const perms = dbUser?.customRole?.permissions ? JSON.parse(dbUser.customRole.permissions) : {};
                    hasApprove = perms['/purchase-orders']?.approve === true;
                } catch { hasApprove = false; }
                if (!hasApprove) return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
            }
            // Creator should not approve their own (if createdBy is tracked in future)
            const updated = await prisma.purchaseOrder.update({
                where: { id },
                data: {
                    status: 'approved',
                    approvedBy: userId,
                    approvedAt: new Date(),
                },
            });
            await logActivity({
                ...ctx,
                action: 'approve',
                module: 'purchase-orders',
                entityType: 'PurchaseOrder',
                entityId: id,
                entityRef: poRef,
                description: `اعتمد أمر الشراء رقم ${poRef}`,
                oldData: { status: existing.status },
                newData: { status: 'approved' },
            });
            return NextResponse.json(updated);
        }

        if (newStatus === 'cancelled') {
            if (!['draft', 'approved'].includes(existing.status)) {
                return NextResponse.json({ error: 'لا يمكن إلغاء أمر الشراء في حالته الحالية' }, { status: 400 });
            }
            const updated = await prisma.purchaseOrder.update({
                where: { id },
                data: { status: 'cancelled' },
            });
            await logActivity({
                ...ctx,
                action: 'update',
                module: 'purchase-orders',
                entityType: 'PurchaseOrder',
                entityId: id,
                entityRef: poRef,
                description: `ألغى أمر الشراء رقم ${poRef}`,
                oldData: { status: existing.status },
                newData: { status: 'cancelled' },
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: 'حالة غير مدعومة' }, { status: 400 });
    }

    // Full data update (only allowed when draft)
    if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'لا يمكن تعديل أمر الشراء إلا عندما يكون في حالة مسودة' }, { status: 400 });
    }

    const {
        supplierId, warehouseId, projectId, date, expectedDeliveryDate,
        notes, taxRate, lines,
    } = body;

    const subtotal = lines
        ? lines.reduce((s: number, l: any) => s + (Number(l.quantity) * Number(l.price) - Number(l.discount || 0)), 0)
        : undefined;
    const taxAmount = subtotal !== undefined ? subtotal * (Number(taxRate || 0) / 100) : undefined;
    const total = subtotal !== undefined && taxAmount !== undefined ? subtotal + taxAmount : undefined;

    const updateData: any = {};
    if (supplierId !== undefined) updateData.supplierId = supplierId;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (date !== undefined) updateData.date = new Date(date);
    if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (taxRate !== undefined) updateData.taxRate = Number(taxRate);
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
    if (total !== undefined) updateData.total = total;

    const updated = await prisma.$transaction(async (tx) => {
        if (lines) {
            await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
            updateData.lines = {
                create: lines.map((l: any) => ({
                    itemId: l.itemId,
                    description: l.description || null,
                    quantity: Number(l.quantity),
                    receivedQty: 0,
                    price: Number(l.price),
                    discount: Number(l.discount || 0),
                    total: Number(l.quantity) * Number(l.price) - Number(l.discount || 0),
                    unit: l.unit || null,
                })),
            };
        }

        return tx.purchaseOrder.update({
            where: { id },
            data: updateData,
            include: { supplier: true, warehouse: true, lines: { include: { item: { include: { unit: true } } } } },
        });
    });

    await logActivity({
        ...ctx,
        action: 'update',
        module: 'purchase-orders',
        entityType: 'PurchaseOrder',
        entityId: id,
        entityRef: poRef,
        description: `عدّل أمر الشراء رقم ${poRef}`,
        newData: updateData,
    });

    return NextResponse.json(updated);
});

export const DELETE = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
    const companyId = (session.user as any).companyId;
    const { id } = context.params;

    const existing = await prisma.purchaseOrder.findUnique({
        where: { id, companyId },
        select: { id: true, status: true, orderNumber: true },
    });

    if (!existing) return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });
    if (existing.status !== 'draft') {
        return NextResponse.json({ error: 'لا يمكن حذف أمر الشراء إلا عندما يكون في حالة مسودة' }, { status: 400 });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    const ctx = extractLogContext(session, request);
    const poRef = `PO-${String(existing.orderNumber).padStart(5, '0')}`;
    await logActivity({
        ...ctx,
        action: 'delete',
        module: 'purchase-orders',
        entityType: 'PurchaseOrder',
        entityId: id,
        entityRef: poRef,
        description: `حذف أمر الشراء رقم ${poRef}`,
    });

    return NextResponse.json({ success: true });
});
