import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PUBLIC External Orders API
 * ---------------------------
 * This endpoint is accessible from external websites using an API key.
 * It creates orders in the POS system without requiring user login.
 * 
 * Headers required:
 *   x-api-key: qaid_live_xxxxx
 * 
 * Body (JSON):
 * {
 *   "type": "delivery" | "online" | "takeaway",
 *   "customerName": "اسم العميل",
 *   "customerPhone": "05xxxxxxxx",
 *   "deliveryAddress": "العنوان (للتوصيل)",
 *   "notes": "ملاحظات",
 *   "paymentMethod": "cash" | "card" | "online",
 *   "lines": [
 *     { "itemId": "xxx", "quantity": 2, "notes": "بدون بصل" },
 *     { "itemName": "بيتزا مارجريتا", "quantity": 1, "unitPrice": 85.00 }
 *   ]
 * }
 */
export async function POST(request: Request) {
    try {
        // 1. Validate API Key
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json(
                { error: 'مفتاح API مطلوب. أضف x-api-key في الـ Headers' },
                { status: 401 }
            );
        }

        const keyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });

        if (!keyRecord) {
            return NextResponse.json({ error: 'مفتاح API غير صالح' }, { status: 401 });
        }

        if (!keyRecord.isActive) {
            return NextResponse.json({ error: 'مفتاح API معطّل. تواصل مع المدير' }, { status: 403 });
        }

        // Check permissions
        const perms = keyRecord.permissions.split(',').map(p => p.trim());
        if (!perms.includes('orders')) {
            return NextResponse.json({ error: 'هذا المفتاح لا يملك صلاحية إنشاء طلبات' }, { status: 403 });
        }

        const companyId = keyRecord.companyId;

        // 2. Parse body
        const body = await request.json();
        const { type, customerName, customerPhone, deliveryAddress, notes, paymentMethod, lines } = body;

        if (!lines || !Array.isArray(lines) || lines.length === 0) {
            return NextResponse.json({ error: 'يجب إرسال أصناف الطلب (lines)' }, { status: 400 });
        }

        // 3. Resolve items and calculate totals
        const resolvedLines: any[] = [];
        for (const line of lines) {
            let itemName = line.itemName || '';
            let unitPrice = line.unitPrice || 0;

            // If itemId is provided, fetch from DB
            if (line.itemId) {
                const item = await prisma.item.findFirst({
                    where: { id: line.itemId, companyId }
                });
                if (item) {
                    itemName = item.name;
                    unitPrice = unitPrice || item.sellPrice || 0;
                }
            }

            if (!itemName) {
                return NextResponse.json(
                    { error: `صنف غير معروف. يرجى إرسال itemId أو itemName` },
                    { status: 400 }
                );
            }

            resolvedLines.push({
                itemId: line.itemId || null,
                itemName,
                quantity: line.quantity || 1,
                unitPrice,
                discount: line.discount || 0,
                total: (line.quantity || 1) * unitPrice - (line.discount || 0),
                notes: line.notes || '',
                modifiers: line.modifiers || null,
            });
        }

        // 4. Calculate totals
        const subtotal = resolvedLines.reduce((s, l) => s + l.total, 0);
        const taxAmount = body.taxAmount || 0;
        const discount = body.discount || 0;
        const total = subtotal - discount + taxAmount;

        // 5. Get next order number
        const last = await prisma.posOrder.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' }
        });
        const orderNumber = (last?.orderNumber ?? 0) + 1;

        // 6. Get active shift (if any)
        const activeShift = await prisma.shift.findFirst({
            where: { companyId, status: 'open' }
        });

        // 7. Create the order
        const order = await prisma.posOrder.create({
            data: {
                orderNumber,
                type: type || 'online',
                status: 'pending',
                source: 'website',
                externalRef: body.externalRef || null,
                deliveryName: customerName || null,
                deliveryPhone: customerPhone || null,
                deliveryAddress: deliveryAddress || null,
                notes: notes || null,
                subtotal,
                discount,
                taxAmount,
                total,
                paidAmount: 0,
                paymentMethod: paymentMethod || 'cash',
                shiftId: activeShift?.id || null,
                companyId,
                lines: {
                    create: resolvedLines,
                },
            },
            include: { lines: true },
        });

        // 8. Update API key usage
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 },
            }
        });

        // 9. Return success
        return NextResponse.json({
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            message: 'تم استقبال الطلب بنجاح'
        }, { status: 201 });

    } catch (error: any) {
        console.error('External Order API Error:', error);
        return NextResponse.json(
            { error: 'حدث خطأ أثناء معالجة الطلب', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET: Fetch menu items (public, requires API key)
 * Returns the list of active items for the company
 */
export async function GET(request: Request) {
    try {
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'مفتاح API مطلوب' }, { status: 401 });
        }

        const keyRecord = await prisma.apiKey.findUnique({ where: { key: apiKey } });
        if (!keyRecord || !keyRecord.isActive) {
            return NextResponse.json({ error: 'مفتاح API غير صالح أو معطّل' }, { status: 401 });
        }

        const perms = keyRecord.permissions.split(',').map(p => p.trim());
        if (!perms.includes('menu') && !perms.includes('orders')) {
            return NextResponse.json({ error: 'هذا المفتاح لا يملك صلاحية عرض المنيو' }, { status: 403 });
        }

        const companyId = keyRecord.companyId;

        const items = await prisma.item.findMany({
            where: { companyId, status: 'active', isPosEligible: true },
            select: {
                id: true,
                name: true,
                description: true,
                sellPrice: true,
                category: { select: { id: true, name: true } },
                imageUrl: true,
            },
            orderBy: { name: 'asc' },
        });

        // Update usage
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date(), usageCount: { increment: 1 } }
        });

        return NextResponse.json({ items });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
