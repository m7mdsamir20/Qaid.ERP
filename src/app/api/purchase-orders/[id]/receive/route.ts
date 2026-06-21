import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const POST = withProtection(async (request: NextRequest, session: any, body: any, context: any) => {
    const companyId = (session.user as any).companyId;
    const { id } = context.params;

    const { lines: receiveLines } = body;

    if (!receiveLines || receiveLines.length === 0) {
        return NextResponse.json({ error: 'يرجى تحديد الكميات المستلمة' }, { status: 400 });
    }

    const order = await prisma.purchaseOrder.findUnique({
        where: { id, companyId },
        include: {
            lines: true,
        },
    });

    if (!order) return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });

    if (!['approved', 'partially_received'].includes(order.status)) {
        return NextResponse.json({ error: 'لا يمكن تسجيل الاستلام إلا لأوامر الشراء المعتمدة أو المستلمة جزئياً' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        // Update each line's receivedQty
        for (const rl of receiveLines) {
            const line = order.lines.find((l) => l.id === rl.lineId);
            if (!line) continue;

            const newReceivedQty = Number(line.receivedQty) + Number(rl.receivedQty);

            await tx.purchaseOrderLine.update({
                where: { id: rl.lineId },
                data: { receivedQty: newReceivedQty },
            });

            // Update stock if warehouse is set
            if (order.warehouseId && Number(rl.receivedQty) > 0) {
                await tx.stock.upsert({
                    where: {
                        itemId_warehouseId: {
                            itemId: line.itemId,
                            warehouseId: order.warehouseId,
                        },
                    },
                    update: { quantity: { increment: Number(rl.receivedQty) } },
                    create: {
                        itemId: line.itemId,
                        warehouseId: order.warehouseId,
                        quantity: Number(rl.receivedQty),
                    },
                });

                // Create StockMovement entry
                await (tx.stockMovement as any).create({
                    data: {
                        type: 'in',
                        date: new Date(),
                        itemId: line.itemId,
                        warehouseId: order.warehouseId,
                        quantity: Number(rl.receivedQty),
                        reference: `PO-${String(order.orderNumber).padStart(5, '0')}`,
                        notes: `استلام بضاعة — أمر شراء رقم PO-${String(order.orderNumber).padStart(5, '0')}`,
                        companyId,
                    },
                });
            }
        }

        // Re-fetch updated lines to determine new status
        const updatedLines = await tx.purchaseOrderLine.findMany({
            where: { purchaseOrderId: id },
        });

        const allReceived = updatedLines.every((l) => Number(l.receivedQty) >= Number(l.quantity));
        const anyReceived = updatedLines.some((l) => Number(l.receivedQty) > 0);

        const newStatus = allReceived ? 'received' : anyReceived ? 'partially_received' : order.status;

        const updatedOrder = await tx.purchaseOrder.update({
            where: { id },
            data: { status: newStatus },
        });

        return updatedOrder;
    });

    const ctx = extractLogContext(session, request);
    const poRef = `PO-${String(order.orderNumber).padStart(5, '0')}`;
    await logActivity({
        ...ctx,
        action: 'receive',
        module: 'purchase-orders',
        entityType: 'PurchaseOrder',
        entityId: id,
        entityRef: poRef,
        description: `سجّل استلام بضاعة لأمر الشراء ${poRef}`,
        newData: { lines: receiveLines },
    });

    return NextResponse.json(result);
});
