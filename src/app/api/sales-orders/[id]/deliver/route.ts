import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const POST = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;
        const logCtx = extractLogContext(session, request);

        const order = await prisma.salesOrder.findFirst({
            where: { id, companyId },
            include: {
                lines: { include: { item: true } },
                warehouse: true,
                customer: true,
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'أمر البيع غير موجود' }, { status: 404 });
        }
        if (!['approved', 'partially_delivered', 'processing'].includes(order.status)) {
            return NextResponse.json({ error: 'يجب أن يكون أمر البيع معتمداً لتسجيل التسليم' }, { status: 400 });
        }
        if (!order.warehouseId) {
            return NextResponse.json({ error: 'يجب تحديد المخزن قبل تسجيل التسليم' }, { status: 400 });
        }

        const deliveryLines: { lineId: string; deliveredQty: number }[] = body.lines || [];

        // Validate stock availability for each line
        for (const dl of deliveryLines) {
            const line = order.lines.find((l) => l.id === dl.lineId);
            if (!line) {
                return NextResponse.json({ error: `البند ${dl.lineId} غير موجود في هذا الأمر` }, { status: 400 });
            }
            const deliveredQty = parseFloat(String(dl.deliveredQty)) || 0;
            if (deliveredQty <= 0) continue;

            const stock = await prisma.stock.findFirst({
                where: { itemId: line.itemId, warehouseId: order.warehouseId },
            });
            const available = stock?.quantity || 0;
            if (available < deliveredQty) {
                return NextResponse.json({
                    error: `الكمية المتاحة من "${line.item.name}" في المخزن هي ${available} فقط`,
                }, { status: 400 });
            }
        }

        const soCode = `SO-${String(order.orderNumber).padStart(5, '0')}`;

        await prisma.$transaction(async (tx) => {
            for (const dl of deliveryLines) {
                const line = order.lines.find((l) => l.id === dl.lineId)!;
                const deliveredQty = parseFloat(String(dl.deliveredQty)) || 0;
                if (deliveredQty <= 0) continue;

                const newDelivered = line.deliveredQty + deliveredQty;

                // Update line's delivered quantity
                await tx.salesOrderLine.update({
                    where: { id: dl.lineId },
                    data: { deliveredQty: newDelivered },
                });

                // Decrement stock
                await tx.stock.updateMany({
                    where: { itemId: line.itemId, warehouseId: order.warehouseId! },
                    data: { quantity: { decrement: deliveredQty } },
                });

                // Create stock movement (out)
                await tx.stockMovement.create({
                    data: {
                        type: 'out',
                        date: new Date(),
                        itemId: line.itemId,
                        warehouseId: order.warehouseId!,
                        quantity: deliveredQty,
                        unitPrice: line.price,
                        reference: soCode,
                        notes: `تسليم من أمر البيع ${soCode}`,
                        companyId,
                    },
                });
            }

            // Determine new order status
            const updatedLines = await tx.salesOrderLine.findMany({
                where: { salesOrderId: id },
            });

            const allDelivered = updatedLines.every((l) => l.deliveredQty >= l.quantity);
            const anyDelivered = updatedLines.some((l) => l.deliveredQty > 0);

            const newStatus = allDelivered ? 'delivered' : anyDelivered ? 'partially_delivered' : order.status;

            await tx.salesOrder.update({
                where: { id },
                data: { status: newStatus },
            });
        });

        await logActivity({
            ...logCtx,
            action: 'update',
            module: 'sales-orders',
            entityType: 'SalesOrder',
            entityId: id,
            entityRef: soCode,
            description: `سجّل تسليم جزئي/كلي لأمر البيع ${soCode} للعميل ${order.customer?.name || 'عميل نقدي'}`,
        });

        const updated = await prisma.salesOrder.findFirst({
            where: { id },
            include: {
                customer: true,
                warehouse: true,
                lines: { include: { item: { include: { unit: true } } } },
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('POST /api/sales-orders/[id]/deliver Error:', error);
        return NextResponse.json({ error: 'فشل في تسجيل التسليم', details: error.message }, { status: 500 });
    }
});
