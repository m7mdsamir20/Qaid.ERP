import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;

        if (!body.code || !body.name || !body.type) {
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
        }

        const natureMap: Record<string, string> = {
            asset: 'debit', expense: 'debit',
            liability: 'credit', equity: 'credit', revenue: 'credit',
        };
        const nature = natureMap[body.type] || body.nature || 'debit';

        const account = await prisma.account.update({
            where: { id, companyId: (session.user as any).companyId },
            data: {
                code: body.code,
                name: body.name,
                nameEn: body.nameEn || null,
                nature,
                type: body.type,
                accountCategory: body.accountCategory || 'detail',
                level: body.level || 1,
                isParent: body.isParent || false,
                parentId: body.parentId || null,
            },
        });

        if (body.parentId) {
            await prisma.account.update({
                where: { id: body.parentId },
                data: { isParent: true },
            });
        }

        return NextResponse.json(account);
    } catch {
        return NextResponse.json({ error: 'فشل في تحديث الحساب' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;

        const hasChildren = await prisma.account.findFirst({
            where: { parentId: id, companyId: (session.user as any).companyId },
        });
        if (hasChildren) {
            return NextResponse.json({ error: 'لا يمكن حذف حساب له حسابات فرعية' }, { status: 400 });
        }

        const hasEntries = await prisma.journalEntryLine.findFirst({
            where: { accountId: id }
        });
        if (hasEntries) {
            return NextResponse.json({ error: 'لا يمكن حذف الحساب نظراً لوجود قيود يومية مسجلة عليه حالياً' }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // ① احذف الأرصدة الافتتاحية المرتبطة بالحساب
            await tx.openingBalance.deleteMany({
                where: { accountId: id }
            });

            // ② احذف الحساب نفسه
            await tx.account.delete({
                where: { id, companyId: (session.user as any).companyId },
            });
        });

        return NextResponse.json({ message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
        console.error('DELETE ACCOUNT ERROR:', error);
        return NextResponse.json({ error: 'فشل في حذف الحساب' }, { status: 500 });
    }
});
