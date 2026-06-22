import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const PATCH = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const userId = (session.user as any).id;
        const { id } = await params;
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
                hasApprove = perms['/stocktakings']?.approve === true;
            } catch { hasApprove = false; }
            if (!hasApprove) return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
        }

        const stocktaking = await prisma.stocktaking.findUnique({ where: { id } });

        if (!stocktaking) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        if (stocktaking.companyId !== companyId) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
        if (stocktaking.status !== 'draft') {
            return NextResponse.json({ error: 'لا يمكن اعتماد جرد غير مسودة' }, { status: 400 });
        }
        // Creator should not approve their own
        if ((stocktaking as any).createdBy && (stocktaking as any).createdBy === userId) {
            return NextResponse.json({ error: 'لا يمكنك اعتماد طلبك الخاص' }, { status: 403 });
        }

        const updated = await prisma.stocktaking.update({
            where: { id },
            data: { status: 'approved' },
        });

        await logActivity({
            ...extractLogContext(session, request),
            action: 'approve',
            module: 'stocktakings',
            entityType: 'Stocktaking',
            entityId: id,
            entityRef: stocktaking.code ?? undefined,
            description: `اعتمد الجرد رقم ${stocktaking.code ?? stocktaking.stocktakingNum}`,
            oldData: { status: 'draft' },
            newData: { status: 'approved' },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Stocktaking approve error:', error);
        return NextResponse.json({ error: 'فشل في اعتماد الجرد' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await params;

        const stocktaking = await prisma.stocktaking.findUnique({
            where: { id: id }
        });

        if (!stocktaking) {
            return NextResponse.json({ error: "غير موجود" }, { status: 404 });
        }
        if (stocktaking.companyId !== companyId) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
        }
        if (stocktaking.status !== 'draft') {
            return NextResponse.json({ error: "لا يمكن إزالة جرد معتمد" }, { status: 400 });
        }

        await prisma.stocktaking.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
    }
});
