import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateNextCode } from '@/lib/autoId';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const transfers = await prisma.warehouseTransfer.findMany({
            where: { companyId },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                lines: { include: { item: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(transfers);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    if ((session.user as any).businessType === 'SERVICES')
        return NextResponse.json({ error: 'النشاط الخدمي لا يدعم التحويل بين المخازن' }, { status: 403 });

    try {
        const companyId = (session.user as any).companyId;
        const { fromWarehouseId, toWarehouseId, lines, notes, date } = body;

        if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId || !lines || lines.length === 0) {
            return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
        }

        const lastTransferByNum = await prisma.warehouseTransfer.findFirst({
            where: { companyId },
            orderBy: { transferNumber: 'desc' },
        });
        const lastTransferByCode = await prisma.warehouseTransfer.findFirst({
            where: { companyId, code: { startsWith: 'TRS-' } },
            orderBy: { code: 'desc' },
        });

        const transferNumber = (lastTransferByNum?.transferNumber || 0) + 1;
        const code = generateNextCode(lastTransferByCode?.code, 'TRS-', 3);
        const transferDate = date ? new Date(date) : new Date();

        // ① Check open financial year
        const activeYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true }
        });
        if (!activeYear) {
            return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة. يرجى فتح سنة مالية أولاً" }, { status: 400 });
        }

        // ② Validate stock availability BEFORE creating the transfer
        for (const line of lines) {
            const stock = await prisma.stock.findUnique({
                where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: fromWarehouseId } }
            });
            const item = await prisma.item.findFirst({ where: { id: line.itemId, companyId }, select: { name: true } });
            if (!item) {
                return NextResponse.json(
                    { error: `الصنف ${line.itemId} غير موجود أو لا ينتمي لهذه الشركة` },
                    { status: 400 }
                );
            }
            if (!stock || stock.quantity < Number(line.quantity)) {
                return NextResponse.json({
                    error: `الكمية المتاحة غير كافية للصنف "${item.name}". المتاح: ${stock?.quantity ?? 0}`
                }, { status: 400 });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const transfer = await tx.warehouseTransfer.create({
                data: {
                    transferNumber,
                    code,
                    date: transferDate,
                    fromWarehouseId,
                    toWarehouseId,
                    notes: notes || null,
                    companyId,
                    lines: {
                        create: lines.map((l: any) => ({
                            itemId: l.itemId,
                            quantity: Number(l.quantity),
                        }))
                    }
                },
                include: { lines: true }
            });

            for (const line of lines) {
                await tx.stock.upsert({
                    where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: fromWarehouseId } },
                    update: { quantity: { decrement: line.quantity } },
                    create: { itemId: line.itemId, warehouseId: fromWarehouseId, quantity: -line.quantity },
                });

                await tx.stock.upsert({
                    where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: toWarehouseId } },
                    update: { quantity: { increment: line.quantity } },
                    create: { itemId: line.itemId, warehouseId: toWarehouseId, quantity: line.quantity },
                });

                await tx.stockMovement.create({
                    data: {
                        type: 'transfer',
                        date: transferDate,
                        itemId: line.itemId,
                        warehouseId: fromWarehouseId,
                        quantity: -line.quantity,
                        reference: code,
                        notes: `تحويل مخزني ${code} — صادر`,
                        companyId,
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        type: 'transfer',
                        date: transferDate,
                        itemId: line.itemId,
                        warehouseId: toWarehouseId,
                        quantity: line.quantity,
                        reference: code,
                        notes: `تحويل مخزني ${code} — وارد`,
                        companyId,
                    }
                });
            }

            return transfer;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Transfer error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء التحويل المخزني' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session!.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'معرف التحويل مطلوب' }, { status: 400 });

        const transfer = await prisma.warehouseTransfer.findFirst({
            where: { id, companyId },
            include: { lines: true },
        });
        if (!transfer) return NextResponse.json({ error: 'التحويل المخزني غير موجود' }, { status: 404 });

        if (transfer.status === 'approved') {
            return NextResponse.json({ error: 'لا يمكن حذف تحويل معتمد' }, { status: 400 });
        }

        await prisma.$transaction(async (tx: any) => {
            // Reverse stock changes only for pending transfers (stock was moved on creation)
            if (transfer.status === 'pending') {
                for (const line of transfer.lines) {
                    // Restore quantity to source warehouse
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: transfer.fromWarehouseId } },
                        update: { quantity: { increment: line.quantity } },
                        create: { itemId: line.itemId, warehouseId: transfer.fromWarehouseId, quantity: line.quantity },
                    });

                    // Deduct quantity from destination warehouse
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: transfer.toWarehouseId } },
                        update: { quantity: { decrement: line.quantity } },
                        create: { itemId: line.itemId, warehouseId: transfer.toWarehouseId, quantity: -line.quantity },
                    });

                    const ref = `DEL-${transfer.code || transfer.id}`;
                    await tx.stockMovement.create({
                        data: {
                            type: 'transfer',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId: transfer.fromWarehouseId,
                            quantity: line.quantity,
                            reference: ref,
                            notes: `عكس تحويل مخزني محذوف ${transfer.code || ''}`,
                            companyId,
                        },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: 'transfer',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId: transfer.toWarehouseId,
                            quantity: -line.quantity,
                            reference: ref,
                            notes: `عكس تحويل مخزني محذوف ${transfer.code || ''}`,
                            companyId,
                        },
                    });
                }
            }

            // WarehouseTransferLine has onDelete: Cascade — lines auto-delete with the transfer
            await tx.warehouseTransfer.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE Transfer error:', error);
        return NextResponse.json({ error: 'فشل في حذف التحويل المخزني' }, { status: 500 });
    }
});
