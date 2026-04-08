import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const plan = await prisma.installmentPlan.findFirst({
            where: { id, companyId },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                installments: { orderBy: { installmentNo: 'asc' } },
            },
        });

        if (!plan)
            return NextResponse.json(null, { status: 404 });

        return NextResponse.json(plan);
    } catch {
        return NextResponse.json(null, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const plan = await prisma.installmentPlan.findFirst({
            where: { id, companyId },
            include: { installments: { where: { status: { notIn: ['cancelled'] } } } },
        });

        if (!plan) return NextResponse.json({ error: 'الخطة غير موجودة' }, { status: 404 });

        // منع الحذف لو في أقساط نشطة أو مدفوعة — يجب الإلغاء أولاً
        if (plan.status !== 'cancelled') {
            return NextResponse.json({
                error: 'لا يمكن حذف الخطة مباشرةً — استخدم زر الإلغاء أولاً لعكس القيود والأرصدة، ثم احذف'
            }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // حذف الأقساط
            await tx.installment.deleteMany({ where: { planId: id } });
            // حذف الخطة
            await tx.installmentPlan.delete({ where: { id, companyId } });
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'فشل حذف الخطة' }, { status: 500 });
    }
});
