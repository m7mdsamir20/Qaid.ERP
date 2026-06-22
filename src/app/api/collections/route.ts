import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request: NextRequest, session: any) => {
    const companyId = (session.user as any).companyId;
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    // Data isolation: if user is linked to a sales rep, restrict to that rep only
    const linkedRep = await (prisma as any).salesRepresentative.findFirst({
        where: { userId: (session.user as any).id, companyId },
        select: { id: true },
    });
    if (linkedRep) {
        where.salesRepId = linkedRep.id;
    } else {
        const salesRepId = url.searchParams.get('salesRepId');
        if (salesRepId) where.salesRepId = salesRepId;
    }

    const customerId = url.searchParams.get('customerId');
    if (customerId) where.customerId = customerId;

    const status = url.searchParams.get('status');
    if (status) where.status = status;

    const method = url.searchParams.get('method');
    if (method) where.method = method;

    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59');
    }

    const [collections, total] = await Promise.all([
        (prisma as any).collection.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                salesRep: { select: { id: true, name: true } },
                customer: { select: { id: true, name: true } },
                invoice: { select: { id: true, invoiceNumber: true } },
                treasury: { select: { id: true, name: true } },
            },
        }),
        (prisma as any).collection.count({ where }),
    ]);

    return NextResponse.json({ collections, total, page, limit });
});

export const POST = withProtection(async (request: NextRequest, session: any, body: any) => {
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;

    const {
        salesRepId,
        customerId,
        invoiceId,
        date,
        amount,
        method,
        checkNumber,
        bankName,
        checkDueDate,
        notes,
    } = body;

    if (!salesRepId) return NextResponse.json({ error: 'يرجى تحديد المندوب' }, { status: 400 });
    if (!customerId) return NextResponse.json({ error: 'يرجى تحديد العميل' }, { status: 400 });
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'يرجى إدخال مبلغ صحيح' }, { status: 400 });

    const collection = await (prisma as any).collection.create({
        data: {
            salesRepId,
            customerId,
            invoiceId: invoiceId || null,
            date: date ? new Date(date) : new Date(),
            amount: Number(amount),
            method: method || 'cash',
            checkNumber: checkNumber || null,
            bankName: bankName || null,
            checkDueDate: checkDueDate ? new Date(checkDueDate) : null,
            notes: notes || null,
            status: 'pending',
            companyId,
        },
        include: {
            salesRep: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
        },
    });

    const METHOD_AR: Record<string, string> = { cash: 'نقدي', check: 'شيك', transfer: 'تحويل بنكي' };
    const ctx = extractLogContext(session, request);
    await logActivity({
        ...ctx,
        action: 'create',
        module: 'collections',
        entityType: 'Collection',
        entityId: collection.id,
        entityRef: collection.customer?.name,
        description: `أنشأ تحصيلاً بمبلغ ${amount} للعميل ${collection.customer?.name || ''}`,
        newData: {
            العميل: collection.customer?.name,
            المندوب: collection.salesRep?.name,
            المبلغ: Number(amount),
            'طريقة الدفع': METHOD_AR[method] || method,
        },
    });

    return NextResponse.json(collection, { status: 201 });
});
