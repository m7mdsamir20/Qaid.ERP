import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { installmentId, paidAmount, treasuryId, notes } = body;

        if (!installmentId || !paidAmount || !treasuryId)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        const paid = parseFloat(paidAmount);

        const installment = await prisma.installment.findUnique({
            where:   { id: installmentId },
            include: { plan: { include: { customer: true } } },
        });

        if (!installment)
            return NextResponse.json({ error: 'القسط غير موجود' }, { status: 404 });
        if (installment.status === 'paid')
            return NextResponse.json({ error: 'القسط مدفوع بالفعل' }, { status: 400 });
        if (paid > (installment.remaining + 0.05))
            return NextResponse.json({ error: 'المبلغ أكبر من المتبقي' }, { status: 400 });

        const currentYear = await prisma.financialYear.findFirst({
            where:   { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });
        if (!currentYear)
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const newPaid      = installment.paidAmount + paid;
            const newRemaining = installment.amount - newPaid;
            const isPaid       = newRemaining <= 0.01;

            // ① تحديث القسط
            const updated = await tx.installment.update({
                where: { id: installmentId },
                data: {
                    paidAmount: newPaid,
                    remaining:  Math.max(0, newRemaining),
                    status:     isPaid ? 'paid' : 'partial',
                    paidAt:     isPaid ? new Date() : null,
                    treasuryId,
                    notes:      notes || null,
                },
            });

            // ② هل كل الأقساط اتدفعت؟
            const allInstallments = await tx.installment.findMany({
                where: { planId: installment.planId },
            });
            const allPaid = allInstallments.every((i: any) =>
                i.id === installmentId ? isPaid : i.status === 'paid'
            );
            if (allPaid) {
                await tx.installmentPlan.update({
                    where: { id: installment.planId },
                    data:  { status: 'completed' },
                });
            }

            // ③ تحديث الخزينة
            const treasury = await tx.treasury.findUnique({
                where:  { id: treasuryId },
                select: { accountId: true, balance: true },
            });
            await tx.treasury.update({
                where: { id: treasuryId },
                data:  { balance: { increment: paid } },
            });

            // ④ تحديث رصيد العميل
            await tx.customer.update({
                where: { id: installment.plan.customerId },
                data:  { balance: { decrement: paid } },
            });

            // ⑤ قيد محاسبي
            const receivablesAcc = await tx.account.findFirst({
                where: {
                    companyId, type: 'asset', accountCategory: 'detail',
                    OR: [
                        { name: { contains: 'ذمم'   } },
                        { name: { contains: 'عملاء' } },
                    ],
                },
            });

            const interestRevenueAcc = await tx.account.findFirst({
                where: {
                    companyId, type: 'revenue', accountCategory: 'detail',
                    OR: [
                        { name: { contains: 'فوائد'        } },
                        { name: { contains: 'إيرادات فوائد'} },
                    ],
                },
            });

            if (!treasury?.accountId) {
                throw new Error("الخزينة المختارة غير مرتبطة بحساب محاسبي. يرجى ربط الخزينة بحساب في دليل الحسابات.");
            }
            if (!receivablesAcc) {
                throw new Error("لا يوجد حساب ذمم عملاء في دليل الحسابات.");
            }

            if (treasury?.accountId && receivablesAcc) {
                const lastEntry = await tx.journalEntry.findFirst({
                    where:   { companyId },
                    orderBy: { entryNumber: 'desc' },
                    select:  { entryNumber: true },
                });

                const interestRatio    = installment.amount > 0 ? installment.interest / installment.amount : 0;
                const interestPortion  = paid * interestRatio;
                const principalPortion = paid - interestPortion;

                const journalLines: any[] = [
                    // مدين: الخزينة
                    {
                        accountId:   treasury.accountId,
                        debit:       paid,
                        credit:      0,
                        description: `تحصيل قسط ${installment.installmentNo} — خطة ${installment.plan.planNumber}`,
                    },
                    // دائن: ذمم العملاء (الأصل)
                    {
                        accountId:   receivablesAcc.id,
                        debit:       0,
                        credit:      principalPortion,
                        description: `أصل قسط ${installment.installmentNo}`,
                    },
                ];

                // دائن: إيرادات الفوائد
                if (interestPortion > 0) {
                    if (interestRevenueAcc) {
                        journalLines.push({
                            accountId:   interestRevenueAcc.id,
                            debit:       0,
                            credit:      interestPortion,
                            description: `فوائد قسط ${installment.installmentNo}`,
                        });
                    } else {
                        // لو مفيش حساب فوائد — أضفها لذمم العملاء
                        journalLines[1].credit += interestPortion;
                    }
                }

                await tx.journalEntry.create({
                    data: {
                        entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                        date:            new Date(),
                        description:     `تحصيل قسط ${installment.installmentNo} من ${installment.plan.customer.name}`,
                        referenceType:   'installment_collect',
                        referenceId:     installmentId,
                        financialYearId: currentYear.id,
                        companyId,
                        isPosted:        true,
                        lines: { create: journalLines },
                    },
                });
            }

            return updated;
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: 'فشل في تحصيل القسط', details: error.message }, { status: 500 });
    }
});
