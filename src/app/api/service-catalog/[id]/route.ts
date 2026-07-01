import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity } from '@/lib/activityLog';

export const PUT = withProtection(async (_req, session, body, context) => {
    const companyId = (session.user as any).companyId;
    const { id } = await context.params;
    const { name, description, isActive } = body;

    const item = await (prisma as any).serviceCatalog.update({
        where: { id, companyId },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description: description || null }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    await logActivity({ session, module: 'service_catalog', action: 'update', entityId: id, description: `تعديل خدمة: ${item.name}` });
    return NextResponse.json(item);
});

export const DELETE = withProtection(async (_req, session, _body, context) => {
    const companyId = (session.user as any).companyId;
    const { id } = await context.params;

    await (prisma as any).serviceCatalog.delete({ where: { id, companyId } });
    return NextResponse.json({ success: true });
});
