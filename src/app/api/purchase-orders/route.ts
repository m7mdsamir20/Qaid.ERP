import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request: NextRequest, session: any) => {
    const companyId = (session.user as any).companyId;
    const url = new URL(request.url);

    if (url.searchParams.get('nextNum')) {
        const last = await prisma.purchaseOrder.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } });
        return NextResponse.json({ nextNum: (last?.orderNumber || 0) + 1 });
    }

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;

    const branchFilter = getBranchFilter(session);

    const where: any = { companyId, ...branchFilter };

    const status = url.searchParams.get('status');
    if (status) where.status = status;

    const supplierId = url.searchParams.get('supplierId');
    if (supplierId) where.supplierId = supplierId;

    const projectId = url.searchParams.get('projectId');
    if (projectId) where.projectId = projectId;

    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const search = url.searchParams.get('search');
    if (search) {
        where.OR = [
            { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ];
        const numSearch = parseInt(search);
        if (!isNaN(numSearch)) {
            where.OR.push({ orderNumber: numSearch });
        }
    }

    const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                supplier: { select: { id: true, name: true } },
                warehouse: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
                lines: { select: { id: true, quantity: true, receivedQty: true } },
            },
        }),
        prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
});

export const POST = withProtection(async (request: NextRequest, session: any, body: any) => {
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const activeBranchId = (session.user as any).activeBranchId;

    const {
        supplierId, warehouseId, projectId, date, expectedDeliveryDate,
        notes, taxRate, lines, discount,
    } = body;

    if (!supplierId) return NextResponse.json({ error: 'يرجى تحديد المورد' }, { status: 400 });
    if (!lines || lines.length === 0) return NextResponse.json({ error: 'يرجى إضافة بند واحد على الأقل' }, { status: 400 });

    const subtotal = lines.reduce((s: number, l: any) => {
        return s + (Number(l.quantity) * Number(l.price) - Number(l.discount || 0));
    }, 0);
    const discountVal = Number(discount || 0);
    const afterDiscount = Math.max(0, subtotal - discountVal);
    const taxAmount = afterDiscount * (Number(taxRate || 0) / 100);
    const total = afterDiscount + taxAmount;

    const result = await prisma.$transaction(async (tx) => {
        const lastOrder = await tx.purchaseOrder.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
        });
        const orderNumber = (lastOrder?.orderNumber || 0) + 1;

        const supplier = await tx.supplier.findUnique({
            where: { id: supplierId, companyId },
            select: { name: true },
        });

        const order = await tx.purchaseOrder.create({
            data: {
                orderNumber,
                date: date ? new Date(date) : new Date(),
                expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
                supplierId,
                warehouseId: warehouseId || null,
                projectId: projectId || null,
                status: 'draft',
                subtotal,
                discount: discountVal,
                taxRate: Number(taxRate || 0),
                taxAmount,
                total,
                notes: notes || null,
                companyId,
                branchId: activeBranchId && activeBranchId !== 'all' ? activeBranchId : null,
                lines: {
                    create: lines.map((l: any) => ({
                        itemId: l.itemId,
                        description: l.description || null,
                        quantity: Number(l.quantity),
                        receivedQty: 0,
                        price: Number(l.price),
                        discount: Number(l.discount || 0),
                        total: Number(l.quantity) * Number(l.price) - Number(l.discount || 0),
                        unit: l.unit || null,
                    })),
                },
            },
            include: {
                supplier: true,
                warehouse: true,
                lines: true,
            },
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'create',
            module: 'purchase-orders',
            entityType: 'PurchaseOrder',
            entityId: order.id,
            entityRef: `PO-${String(orderNumber).padStart(5, '0')}`,
            description: `أنشأ أمر شراء رقم PO-${String(orderNumber).padStart(5, '0')} للمورد ${supplier?.name || ''}`,
            newData: { orderNumber, supplierId, total },
        });

        return order;
    });

    return NextResponse.json(result, { status: 201 });
});
