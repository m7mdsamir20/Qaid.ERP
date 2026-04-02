import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id: treasuryId } = await params;

        const existingInfo = await prisma.treasury.findUnique({
            where: { id: treasuryId, companyId }
        });

        if (!existingInfo) {
            return NextResponse.json({ error: "الخزينة غير موجودة" }, { status: 404 });
        }

        const updatedTreasury = await prisma.treasury.update({
            where: {
                id: treasuryId,
                companyId: companyId
            },
            data: {
                name: body.name,
                type: body.type,
                bankName: body.bankName || null,
                accountNumber: body.accountNumber || null,
                accountId: body.accountId !== undefined ? body.accountId : existingInfo.accountId,
            },
        });

        return NextResponse.json(updatedTreasury);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "فشل في تحديث بيانات الخزينة" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id: treasuryId } = await params;

        // ① جيب بيانات الخزينة والحساب المرتبط بها
        const treasury = await prisma.treasury.findUnique({
            where: { id: treasuryId, companyId },
            include: { account: true }
        });

        if (!treasury) {
            return NextResponse.json({ error: "الخزينة غير موجودة" }, { status: 404 });
        }

        const accountId = treasury.accountId;

        // ② تحقق من سندات مالية (قبض/صرف)
        const hasVouchers = await prisma.voucher.findFirst({
            where: { treasuryId, companyId }
        });
        if (hasVouchers) {
            return NextResponse.json({ error: "لا يمكن حذف الخزينة لارتباطها بحركات مالية" }, { status: 400 });
        }

        // ③ تحقق من سلف الموظفين
        const hasAdvances = await (prisma.advance as any).findFirst({
            where: { treasuryId, companyId }
        });
        if (hasAdvances) {
            return NextResponse.json({ error: "لا يمكن حذف الخزينة لارتباطها بحركات مالية" }, { status: 400 });
        }

        // ④ تحقق من أقساط مسجلة
        const hasInstallments = await (prisma.installment as any).findFirst({
            where: { treasuryId, companyId }
        });
        if (hasInstallments) {
            return NextResponse.json({ error: "لا يمكن حذف الخزينة لارتباطها بحركات مالية" }, { status: 400 });
        }

        // ⑤ تحقق من قيود محاسبية مسجلة لهذا الحساب
        if (accountId) {
            const hasJournalLines = await prisma.journalEntryLine.findFirst({
                where: { accountId }
            });
            if (hasJournalLines) {
                return NextResponse.json({ error: "لا يمكن حذف الخزينة لارتباطها بقيود محاسبية مسجلة" }, { status: 400 });
            }
        }

        // ⑥ تنفيذ عملية الحذف التسلسلي
        await prisma.$transaction(async (tx) => {
            // أ. حذف الرصيد الافتتاحي إن وجد للحساب المرتبط
            if (accountId) {
                await tx.openingBalance.deleteMany({
                    where: { accountId, companyId }
                });
            }

            // ب. حذف الخزينة نفسها
            await tx.treasury.delete({
                where: { id: treasuryId, companyId }
            });

            // ج. حذف الحساب من شجرة الحسابات (حسب طلب المستخدم)
            if (accountId) {
                // التأكد أن الحساب غير مستخدم في مكان آخر قبل حذفه (كأمان إضافي)
                const isUsedByOtherTreasury = await tx.treasury.findFirst({
                    where: { accountId, id: { not: treasuryId }, companyId }
                });
                
                if (!isUsedByOtherTreasury) {
                    await tx.account.delete({
                        where: { id: accountId, companyId }
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("DELETE Treasury Error:", e);
        return NextResponse.json({ error: "فشل في عملية الحذف: " + (e.message || "") }, { status: 500 });
    }
});
