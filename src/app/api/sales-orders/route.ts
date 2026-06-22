import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const branchFilter = getBranchFilter(session);
        const { searchParams } = new URL(request.url);

        if (searchParams.get('nextNum')) {
            const last = await prisma.salesOrder.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } });
            return NextResponse.json({ nextNum: (last?.orderNumber || 0) + 1 });
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const skip = (page - 1) * limit;

        const status = searchParams.get('status');
        const customerId = searchParams.get('customerId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const salesRepId = searchParams.get('salesRepId');
        const search = searchParams.get('search') || '';

        const where: any = { companyId, ...branchFilter };

        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (salesRepId) where.salesRepId = salesRepId;
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) where.date.gte = new Date(dateFrom);
            if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
        }
        if (search) {
            where.OR = [
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { orderNumber: isNaN(parseInt(search)) ? undefined : parseInt(search) },
            ].filter(Boolean);
        }

        const [orders, total] = await Promise.all([
            prisma.salesOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    warehouse: { select: { id: true, name: true } },
                    lines: { select: { quantity: true, deliveredQty: true } },
                },
            }),
            prisma.salesOrder.count({ where }),
        ]);

        return NextResponse.json({ orders, total, page, limit });
    } catch (error: any) {
        console.error('GET /api/sales-orders Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const branchId = getBranchFilter(session).branchId || (session.user as any).activeBranchId || null;
        const logCtx = extractLogContext(session, request);

        // Get next order number
        const lastOrder = await prisma.salesOrder.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
        });
        const orderNumber = (lastOrder?.orderNumber || 0) + 1;

        // Calculate totals
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

        // Get customer name for log
        let customerName = 'عميل نقدي';
        if (body.customerId) {
            const customer = await prisma.customer.findFirst({
                where: { id: body.customerId, companyId },
                select: { name: true },
            });
            customerName = customer?.name || customerName;
        }

        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.salesOrder.create({
                data: {
                    orderNumber,
                    date: body.date ? new Date(body.date) : new Date(),
                    expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : null,
                    customerId: body.customerId || null,
                    warehouseId: body.warehouseId || null,
                    quotationId: body.quotationId || null,
                    salesRepId: body.salesRepId || null,
                    projectId: body.projectId || null,
                    status: 'draft',
                    subtotal,
                    taxRate,
                    taxAmount,
                    discount,
                    total,
                    notes: body.notes || null,
                    companyId,
                    branchId: typeof branchId === 'string' ? branchId : null,
                    lines: {
                        create: lines.map((l: any) => ({
                            itemId: l.itemId,
                            description: l.description || null,
                            quantity: parseFloat(l.quantity) || 0,
                            deliveredQty: 0,
                            invoicedQty: 0,
                            price: parseFloat(l.price) || 0,
                            discount: parseFloat(l.discount) || 0,
                            total: ((parseFloat(l.quantity) || 0) * (parseFloat(l.price) || 0)) - (parseFloat(l.discount) || 0),
                            unit: l.unit || null,
                        })),
                    },
                },
                include: {
                    customer: true,
                    lines: { include: { item: { include: { unit: true } } } },
                },
            });
            return newOrder;
        });

        const soCode = `SO-${String(orderNumber).padStart(5, '0')}`;
        await logActivity({
            ...logCtx,
            action: 'create',
            module: 'sales-orders',
            entityType: 'SalesOrder',
            entityId: order.id,
            entityRef: soCode,
            description: `أنشأ أمر بيع رقم ${soCode} للعميل ${customerName}`,
            newData: { orderNumber, total, status: 'draft', customerId: body.customerId },
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/sales-orders Error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء أمر البيع', details: error.message }, { status: 500 });
    }
});
