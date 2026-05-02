import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { companyId, tableId, items } = body;

        if (!companyId || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const resolvedLines: any[] = [];
        for (const line of items) {
            let itemName = '';
            let unitPrice = line.price || 0;

            const item = await prisma.item.findFirst({
                where: { id: line.itemId, companyId }
            });
            if (item) {
                itemName = line.itemName || item.name;
                unitPrice = line.price || item.sellPrice || 0;
            } else {
                continue;
            }

            resolvedLines.push({
                itemId: item.id,
                itemName,
                quantity: line.quantity || 1,
                unitPrice,
                total: (line.quantity || 1) * unitPrice,
            });
        }

        if (resolvedLines.length === 0) {
             return NextResponse.json({ error: 'No valid items' }, { status: 400 });
        }

        const subtotal = resolvedLines.reduce((s, l) => s + l.total, 0);
        const total = subtotal;

        const last = await prisma.posOrder.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' }
        });
        const orderNumber = (last?.orderNumber ?? 0) + 1;

        const activeShift = await prisma.shift.findFirst({
            where: { companyId, status: 'open' }
        });

        const order = await prisma.posOrder.create({
            data: {
                orderNumber,
                type: tableId ? 'dine-in' : 'online',
                status: 'pending',
                source: 'qr',
                tableId: tableId || null,
                subtotal,
                discount: 0,
                taxAmount: 0,
                total,
                paidAmount: 0,
                paymentMethod: 'cash',
                shiftId: activeShift?.id || null,
                companyId,
                lines: {
                    create: resolvedLines,
                },
            },
        });

        return NextResponse.json({ success: true, orderId: order.id }, { status: 201 });

    } catch (error: any) {
        console.error('Menu Order Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
