import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const bill = await prisma.progressBill.findFirst({
            where: { id, companyId },
            include: {
                project: { select: { name: true } },
                lines: true,
            },
        });

        if (!bill) return NextResponse.json({ error: 'المستخلص غير موجود' }, { status: 404 });

        return NextResponse.json(bill);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PATCH = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const userId = (session.user as any).id;
        const { id } = await context.params;
        const { action } = body;

        if (action !== 'approve') {
            return NextResponse.json({ error: 'إجراء غير مدعوم' }, { status: 400 });
        }

        // Permission check
        if (!(session.user as any).isSuperAdmin && (session.user as any).role !== 'admin') {
            let hasApprove = false;
            try {
                const dbUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { customRole: { select: { permissions: true } } }
                });
                const perms = dbUser?.customRole?.permissions ? JSON.parse(dbUser.customRole.permissions) : {};
                hasApprove = perms['/progress-bills']?.approve === true;
            } catch { hasApprove = false; }
            if (!hasApprove) return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
        }

        const bill = await prisma.progressBill.findFirst({ where: { id, companyId } });

        if (!bill) return NextResponse.json({ error: 'المستخلص غير موجود' }, { status: 404 });
        if (bill.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن اعتماد مستخلص غير مسودة' }, { status: 400 });
        }
        // Creator should not approve their own
        if ((bill as any).createdBy && (bill as any).createdBy === userId) {
            return NextResponse.json({ error: 'لا يمكنك اعتماد طلبك الخاص' }, { status: 403 });
        }

        const updated = await prisma.progressBill.update({
            where: { id },
            data: { status: 'approved' },
            include: { project: { select: { name: true } }, lines: true },
        });

        await logActivity({
            ...extractLogContext(session, request),
            action: 'approve',
            module: 'progress-bills',
            entityType: 'ProgressBill',
            entityId: id,
            entityRef: `PB-${String(bill.billNumber).padStart(5, '0')}`,
            description: `اعتمد المستخلص رقم PB-${String(bill.billNumber).padStart(5, '0')}`,
            oldData: { status: 'draft' },
            newData: { status: 'approved' },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const bill = await prisma.progressBill.findFirst({ where: { id, companyId } });
        if (!bill) return NextResponse.json({ error: 'المستخلص غير موجود' }, { status: 404 });
        if (bill.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن حذف مستخلص غير مسودة' }, { status: 400 });
        }

        await prisma.progressBill.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
