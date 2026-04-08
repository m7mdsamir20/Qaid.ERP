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
            const item = await prisma.item.findUnique({ where: { id: line.itemId }, select: { name: true } });
            if (!stock || stock.quantity < Number(line.quantity)) {
                return NextResponse.json({
                    error: `الكمية المتاحة غير كافية للصنف "${item?.name || line.itemId}". المتاح: ${stock?.quantity ?? 0}`
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
