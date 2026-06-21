import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const order = await prisma.salesOrder.findFirst({
            where: { id, companyId },
            include: {
                customer: true,
                warehouse: true,
                project: true,
                lines: {
                    include: {
                        item: { include: { unit: true, stocks: true } },
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'أمر البيع غير موجود' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error: any) {
        console.error('GET /api/sales-orders/[id] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;
        const logCtx = extractLogContext(session, request);
        const userId = (session.user as any).id;
        const userName = (session.user as any).name;

        const existing = await prisma.salesOrder.findFirst({
            where: { id, companyId },
            include: { customer: true },
        });
        if (!existing) {
            return NextResponse.json({ error: 'أمر البيع غير موجود' }, { status: 404 });
        }

        const soCode = `SO-${String(existing.orderNumber).padStart(5, '0')}`;

        // Status-only update (approve, cancel, processing)
        if (body.action) {
            let newStatus = existing.status;
            let extraData: any = {};

            if (body.action === 'approve') {
                if (existing.status !== 'draft') {
                    return NextResponse.json({ error: 'لا يمكن اعتماد هذا الأمر في حالته الحالية' }, { status: 400 });
                }
                newStatus = 'approved';
                extraData = { approvedBy: userId, approvedAt: new Date() };
            } else if (body.action === 'cancel') {
                if (['delivered', 'invoiced', 'cancelled'].includes(existing.status)) {
                    return NextResponse.json({ error: 'لا يمكن إلغاء هذا الأمر في حالته الحالية' }, { status: 400 });
                }
                newStatus = 'cancelled';
            } else if (body.action === 'processing') {
                if (existing.status !== 'approved') {
                    return NextResponse.json({ error: 'يجب اعتماد الأمر أولاً' }, { status: 400 });
                }
                newStatus = 'processing';
            }

            const updated = await prisma.salesOrder.update({
                where: { id },
                data: { status: newStatus, ...extraData },
                include: {
                    customer: true,
                    warehouse: true,
                    lines: { include: { item: { include: { unit: true } } } },
                },
            });

            await logActivity({
                ...logCtx,
                action: body.action === 'approve' ? 'approve' : body.action === 'cancel' ? 'reject' : 'update',
                module: 'sales-orders',
                entityType: 'SalesOrder',
                entityId: id,
                entityRef: soCode,
                description: body.action === 'approve'
                    ? `اعتمد أمر البيع ${soCode} للعميل ${existing.customer?.name || 'عميل نقدي'}`
                    : body.action === 'cancel'
                        ? `ألغى أمر البيع ${soCode}`
                        : `غيّر حالة أمر البيع ${soCode} إلى ${newStatus}`,
                oldData: { status: existing.status },
                newData: { status: newStatus },
            });

            return NextResponse.json(updated);
        }

        // Full data update (only allowed on draft)
        if (existing.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن تعديل الأمر بعد اعتماده' }, { status: 400 });
        }

        const lines: any[] = body.lines || [];
        const subtotal = lines.reduce((sum: number, l: any) => {
            const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.price) || 0);
            const lineDisc = parseFloat(l.discount) || 0;
            return sum + lineTotal - lineDisc;
        }, 0);

        const taxRate = parseFloat(body.taxRate) || 0;
        const discount = parseFloat(body.discount) || 0;
        const afterDiscount = Math.max(0, subtotal - discount);
        const taxAmount = afterDiscount * (taxRate / 100);
        const total = afterDiscount + taxAmount;

        const updated = await prisma.$transaction(async (tx) => {
            // Delete existing lines
            await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } });

            return tx.salesOrder.update({
                where: { id },
                data: {
                    date: body.date ? new Date(body.date) : existing.date,
                    expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : existing.expectedDeliveryDate,
                    customerId: body.customerId ?? existing.customerId,
                    warehouseId: body.warehouseId ?? existing.warehouseId,
                    salesRepId: body.salesRepId ?? existing.salesRepId,
                    projectId: body.projectId ?? existing.projectId,
                    subtotal,
                    taxRate,
                    taxAmount,
                    discount,
                    total,
                    notes: body.notes ?? existing.notes,
                    lines: {
                        create: lines.map((l: any) => ({
                            itemId: l.itemId,
                            description: l.description || null,
                            quantity: parseFloat(l.quantity) || 0,
                            deliveredQty: l.deliveredQty || 0,
                            invoicedQty: l.invoicedQty || 0,
                            price: parseFloat(l.price) || 0,
                            discount: parseFloat(l.discount) || 0,
                            total: ((parseFloat(l.quantity) || 0) * (parseFloat(l.price) || 0)) - (parseFloat(l.discount) || 0),
                            unit: l.unit || null,
                        })),
                    },
                },
                include: {
                    customer: true,
                    warehouse: true,
                    lines: { include: { item: { include: { unit: true } } } },
                },
            });
        });

        await logActivity({
            ...logCtx,
            action: 'update',
            module: 'sales-orders',
            entityType: 'SalesOrder',
            entityId: id,
            entityRef: soCode,
            description: `عدّل بيانات أمر البيع ${soCode}`,
            oldData: { subtotal: existing.subtotal, total: existing.total },
            newData: { subtotal, total },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('PUT /api/sales-orders/[id] Error:', error);
        return NextResponse.json({ error: 'فشل في تحديث أمر البيع', details: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;
        const logCtx = extractLogContext(session, request);

        const existing = await prisma.salesOrder.findFirst({
            where: { id, companyId },
            include: { customer: true },
        });
        if (!existing) {
            return NextResponse.json({ error: 'أمر البيع غير موجود' }, { status: 404 });
        }
        if (existing.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن حذف إلا أوامر البيع في حالة المسودة' }, { status: 400 });
        }

        const soCode = `SO-${String(existing.orderNumber).padStart(5, '0')}`;

        await prisma.$transaction(async (tx) => {
            await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } });
            await tx.salesOrder.delete({ where: { id } });
        });

        await logActivity({
            ...logCtx,
            action: 'delete',
            module: 'sales-orders',
            entityType: 'SalesOrder',
            entityId: id,
            entityRef: soCode,
            description: `حذف أمر البيع ${soCode} للعميل ${existing.customer?.name || 'عميل نقدي'}`,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/sales-orders/[id] Error:', error);
        return NextResponse.json({ error: 'فشل في حذف أمر البيع', details: error.message }, { status: 500 });
    }
});
