import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const transfer = await prisma.warehouseTransfer.findFirst({
            where: { id, companyId },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                lines: { include: { item: true } },
            },
        });

        if (!transfer) return NextResponse.json({ error: 'التحويل غير موجود' }, { status: 404 });

        return NextResponse.json(transfer);
    } catch (error) {
        return NextResponse.json({ error: 'فشل في جلب التحويل' }, { status: 500 });
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
                hasApprove = perms['/warehouse-transfers']?.approve === true;
            } catch { hasApprove = false; }
            if (!hasApprove) return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
        }

        const transfer = await prisma.warehouseTransfer.findFirst({ where: { id, companyId } });

        if (!transfer) return NextResponse.json({ error: 'التحويل غير موجود' }, { status: 404 });
        if (transfer.status === 'approved') {
            return NextResponse.json({ error: 'التحويل معتمد مسبقاً' }, { status: 400 });
        }
        // Creator should not approve their own
        if ((transfer as any).createdBy && (transfer as any).createdBy === userId) {
            return NextResponse.json({ error: 'لا يمكنك اعتماد طلبك الخاص' }, { status: 403 });
        }

        const updated = await prisma.warehouseTransfer.update({
            where: { id },
            data: {
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date(),
            },
            include: {
                fromWarehouse: true,
                toWarehouse: true,
                lines: { include: { item: true } },
            },
        });

        await logActivity({
            ...extractLogContext(session, request),
            action: 'approve',
            module: 'warehouse-transfers',
            entityType: 'WarehouseTransfer',
            entityId: id,
            entityRef: transfer.code || String(transfer.transferNumber),
            description: `اعتمد التحويل المخزني رقم ${transfer.code || transfer.transferNumber}`,
            oldData: { status: transfer.status },
            newData: { status: 'approved' },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Warehouse transfer approve error:', error);
        return NextResponse.json({ error: 'فشل في اعتماد التحويل' }, { status: 500 });
    }
});
