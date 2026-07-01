import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity } from '@/lib/activityLogger';

export const GET = withProtection(async (_req, session) => {
    const companyId = (session.user as any).companyId;
    const items = await (prisma as any).serviceCatalog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
});

export const POST = withProtection(async (_req, session, body) => {
    const companyId = (session.user as any).companyId;
    const { name, description } = body;

    if (!name) return NextResponse.json({ error: 'اسم الخدمة مطلوب' }, { status: 400 });

    const count = await (prisma as any).serviceCatalog.count({ where: { companyId } });
    const code = `SRV-${String(count + 1).padStart(3, '0')}`;

    const item = await (prisma as any).serviceCatalog.create({
        data: { code, name, description: description || null, companyId },
    });

    await logActivity({ session, module: 'service_catalog', action: 'create', entityId: item.id, description: `إضافة خدمة: ${name}` });
    return NextResponse.json(item, { status: 201 });
});
