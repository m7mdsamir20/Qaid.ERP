import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    const itemId = url.searchParams.get('itemId') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);
    const skip = (page - 1) * pageSize;

    const where: any = { companyId };
    if (search) {
        where.serial = { contains: search, mode: 'insensitive' };
    }
    if (status) {
        where.status = status;
    }
    if (itemId) {
        where.itemId = itemId;
    }

    const [records, total] = await Promise.all([
        prisma.serialNumber.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
                item: { select: { name: true, code: true } },
                customer: { select: { name: true } },
                warehouse: { select: { name: true } },
            },
        }),
        prisma.serialNumber.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, pageSize });
});

export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const ctx = extractLogContext(session, request);

    const serials: string[] = Array.isArray(body.serials)
        ? body.serials.map((s: string) => s.trim()).filter(Boolean)
        : body.serial
        ? [body.serial.trim()]
        : [];

    if (!body.itemId || serials.length === 0) {
        return NextResponse.json({ error: 'الصنف والرقم التسلسلي مطلوبان' }, { status: 400 });
    }

    const existing = await prisma.serialNumber.findMany({
        where: { companyId, serial: { in: serials } },
        select: { serial: true },
    });

    if (existing.length > 0) {
        const dups = existing.map((e) => e.serial).join(', ');
        return NextResponse.json({ error: `الأرقام التسلسلية التالية مسجلة مسبقاً: ${dups}` }, { status: 400 });
    }

    const created = await prisma.serialNumber.createMany({
        data: serials.map((serial) => ({
            itemId: body.itemId,
            serial,
            warehouseId: body.warehouseId || null,
            warrantyEnd: body.warrantyEnd ? new Date(body.warrantyEnd) : null,
            notes: body.notes || null,
            status: 'in_stock',
            companyId,
        })),
    });

    await logActivity({
        ...ctx,
        action: 'create',
        module: 'serial-numbers',
        entityType: 'SerialNumber',
        description: `إضافة ${created.count} رقم تسلسلي للصنف`,
        newData: { itemId: body.itemId, count: created.count },
    });

    return NextResponse.json({ count: created.count }, { status: 201 });
});
