import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
    try {
        // Rate-limit public QR-code endpoint by IP
        const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
        const { allowed, retryAfter } = rateLimit(`menu-order:${ip}`, { max: 30, windowMs: 60 * 1000 });
        if (!allowed) {
            return NextResponse.json({ error: 'طلبات كثيرة، حاول لاحقاً' }, { status: 429, headers: { 'Retry-After': retryAfter.toString() } });
        }

        const body = await request.json();
        const { companyId, tableId, items } = body;

        if (!companyId || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
        if (!company) {
            return NextResponse.json({ error: 'Invalid company' }, { status: 404 });
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
                unitPrice = item.sellPrice || 0;
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
