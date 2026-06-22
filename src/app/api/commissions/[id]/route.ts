import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const PATCH = withProtection(async (request: NextRequest, session: any, body: any, context: any) => {
    const { id } = await context.params;
    const companyId = (session.user as any).companyId;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { action, treasuryId } = body;

    const commission = await (prisma as any).commissionPayment.findFirst({
        where: { id, companyId },
    });

    if (!commission) {
        return NextResponse.json({ error: 'العمولة غير موجودة' }, { status: 404 });
    }

    if (action === 'approve') {
        // Only admin can approve
        if (userRole !== 'admin' && !(session.user as any).isSuperAdmin) {
            return NextResponse.json({ error: 'لا تملك صلاحية اعتماد العمولات' }, { status: 403 });
        }

        const updated = await (prisma as any).commissionPayment.update({
            where: { id },
            data: {
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date(),
            },
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'approve',
            module: 'commissions',
            entityType: 'CommissionPayment',
            entityId: id,
            description: `اعتمد عمولة بمبلغ ${commission.commissionAmount}`,
            oldData: { status: commission.status },
            newData: { status: 'approved' },
        });

        return NextResponse.json(updated);
    }

    if (action === 'pay') {
        if (commission.status !== 'approved') {
            return NextResponse.json({ error: 'يمكن صرف العمولات المعتمدة فقط' }, { status: 400 });
        }
        if (!treasuryId) {
            return NextResponse.json({ error: 'يرجى تحديد الخزينة' }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            // Deduct from treasury
            await (tx as any).treasury.update({
                where: { id: treasuryId },
                data: { balance: { decrement: commission.commissionAmount } },
            });

            // Update commission
            return await (tx as any).commissionPayment.update({
                where: { id },
                data: {
                    status: 'paid',
                    paidBy: userId,
                    paidAt: new Date(),
                    treasuryId,
                },
            });
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'approve',
            module: 'commissions',
            entityType: 'CommissionPayment',
            entityId: id,
            description: `تم صرف عمولة بمبلغ ${commission.commissionAmount} من الخزينة`,
            oldData: { status: commission.status },
            newData: { status: 'paid', treasuryId },
        });

        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
});
