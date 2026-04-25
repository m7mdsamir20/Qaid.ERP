import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET: list orders with optional filters
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const shiftId = url.searchParams.get('shiftId');
        const limit = parseInt(url.searchParams.get('limit') ?? '50');

        const orders = await prisma.posOrder.findMany({
            where: {
                companyId,
                ...(status ? { status } : {}),
                ...(shiftId ? { shiftId } : {}),
            },
            include: {
                lines: true,
                table: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return NextResponse.json(orders);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST: create a new POS order
export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // Get next order number
        const last = await prisma.posOrder.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } });
        const orderNumber = (last?.orderNumber ?? 0) + 1;

        // Get active shift
        const activeShift = await prisma.shift.findFirst({ where: { companyId, status: 'open' } });

        const subtotal = (body.lines as any[]).reduce((s: number, l: any) => s + (l.quantity * l.unitPrice - (l.discount ?? 0)), 0);
        const taxAmount = body.taxAmount ?? 0;
        const discount = body.discount ?? 0;
        const total = subtotal - discount + taxAmount;

        const order = await prisma.posOrder.create({
            data: {
                orderNumber,
                type: body.type ?? 'dine-in',
                status: 'pending',
                tableId: body.tableId ?? null,
                shiftId: activeShift?.id ?? null,
                customerId: body.customerId ?? null,
                deliveryName: body.deliveryName,
                deliveryPhone: body.deliveryPhone,
                deliveryAddress: body.deliveryAddress,
                notes: body.notes,
                subtotal,
                discount,
                taxAmount,
                total,
                paymentMethod: body.paymentMethod,
                source: body.source ?? 'pos',
                externalRef: body.externalRef,
                companyId,
                lines: {
                    create: (body.lines as any[]).map((l: any) => ({
                        itemId: l.itemId,
                        itemName: l.itemName,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        discount: l.discount ?? 0,
                        total: l.quantity * l.unitPrice - (l.discount ?? 0),
                        notes: l.notes,
                        modifiers: l.modifiers ? JSON.stringify(l.modifiers) : null,
                    })),
                },
            },
            include: { lines: true, table: true },
        });

        // Update table status to occupied
        if (body.tableId) {
            await prisma.restaurantTable.updateMany({
                where: { id: body.tableId, companyId },
                data: { status: 'occupied' },
            });
        }

        // Update shift sales counter
        if (activeShift) {
            await prisma.shift.update({
                where: { id: activeShift.id },
                data: {
                    totalSales: { increment: total },
                    totalOrders: { increment: 1 },
                },
            });
        }

        // Auto-Deduction Logic (الخصم التلقائي من المخزون للمطاعم)
        const defaultWarehouse = await prisma.warehouse.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
        if (defaultWarehouse) {
            for (const line of body.lines as any[]) {
                const item = await prisma.item.findUnique({
                    where: { id: line.itemId },
                    include: { recipe: { include: { items: true } } }
                });

                if (!item) continue;

                // 1. If it has a recipe, deduct recipe ingredients
                if (item.recipe && item.recipe.items.length > 0) {
                    for (const ri of item.recipe.items) {
                        const deductionQty = ri.quantity * line.quantity;
                        await prisma.stock.upsert({
                            where: { itemId_warehouseId: { itemId: ri.itemId, warehouseId: defaultWarehouse.id } },
                            create: { itemId: ri.itemId, warehouseId: defaultWarehouse.id, quantity: -deductionQty },
                            update: { quantity: { decrement: deductionQty } }
                        });
                        await prisma.stockMovement.create({
                            data: {
                                type: 'out',
                                date: new Date(),
                                itemId: ri.itemId,
                                warehouseId: defaultWarehouse.id,
                                quantity: deductionQty,
                                reference: `POS-${order.orderNumber}`,
                                notes: `استهلاك مكونات لوجبة ${item.name}`,
                                companyId
                            }
                        });
                    }
                } else if (item.type !== 'service') {
                    // 2. No recipe, just a standard product, deduct directly
                    const deductionQty = line.quantity;
                    await prisma.stock.upsert({
                        where: { itemId_warehouseId: { itemId: item.id, warehouseId: defaultWarehouse.id } },
                        create: { itemId: item.id, warehouseId: defaultWarehouse.id, quantity: -deductionQty },
                        update: { quantity: { decrement: deductionQty } }
                    });
                    await prisma.stockMovement.create({
                        data: {
                            type: 'out',
                            date: new Date(),
                            itemId: item.id,
                            warehouseId: defaultWarehouse.id,
                            quantity: deductionQty,
                            reference: `POS-${order.orderNumber}`,
                            notes: `مبيعات كاشير (بدون وصفة)`,
                            companyId
                        }
                    });
                }
            }
        }

        return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT: update order status
export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await prisma.posOrder.updateMany({
            where: { id: body.id, companyId },
            data: {
                ...(body.status && { status: body.status }),
                ...(body.kitchenPrinted !== undefined && { kitchenPrinted: body.kitchenPrinted }),
                ...(body.paidAmount !== undefined && { paidAmount: body.paidAmount }),
                ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
            },
        });

        // If delivered/cancelled, free the table
        if (body.status === 'delivered' || body.status === 'cancelled') {
            const order = await prisma.posOrder.findUnique({ where: { id: body.id }, select: { tableId: true } });
            if (order?.tableId) {
                await prisma.restaurantTable.updateMany({
                    where: { id: order.tableId, companyId },
                    data: { status: 'available' },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
