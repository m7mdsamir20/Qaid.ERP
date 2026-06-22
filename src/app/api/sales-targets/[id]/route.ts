import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const PUT = withProtection(async (request: NextRequest, session: any, body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;

    const { targetAmount, targetCount, notes } = body;

    if (!targetAmount || Number(targetAmount) <= 0) {
        return NextResponse.json({ error: 'يرجى إدخال مبلغ هدف صحيح' }, { status: 400 });
    }

    const existing = await (prisma as any).salesTarget.findFirst({
        where: { id, companyId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'الهدف غير موجود' }, { status: 404 });
    }

    const target = await (prisma as any).salesTarget.update({
        where: { id },
        data: {
            targetAmount: Number(targetAmount),
            targetCount: targetCount ? parseInt(targetCount) : null,
            notes: notes || null,
        },
        include: {
            salesRep: { select: { id: true, name: true } },
        },
    });

    const ctx = extractLogContext(session, request);
    await logActivity({
        ...ctx,
        action: 'update',
        module: 'sales-targets',
        entityType: 'SalesTarget',
        entityId: id,
        description: `تم تحديث هدف المبيعات`,
        oldData: { targetAmount: existing.targetAmount },
        newData: { targetAmount },
    });

    return NextResponse.json(target);
});

export const DELETE = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;

    const existing = await (prisma as any).salesTarget.findFirst({
        where: { id, companyId },
    });

    if (!existing) {
        return NextResponse.json({ error: 'الهدف غير موجود' }, { status: 404 });
    }

    await (prisma as any).salesTarget.delete({ where: { id } });

    return NextResponse.json({ message: 'تم حذف الهدف بنجاح' });
});
