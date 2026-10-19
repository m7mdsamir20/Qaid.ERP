import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';
import { roundMoney } from '@/lib/currency';
import { SETTLE_NOTE_TAG } from '@/lib/installmentEntries';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { planId, paidAmount, treasuryId, notes } = body;

        if (!planId || !paidAmount || !treasuryId)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        const amountToPay = roundMoney(parseFloat(paidAmount));
        if (isNaN(amountToPay) || amountToPay <= 0)
            return NextResponse.json({ error: 'المبلغ يجب أن يكون رقماً موجباً' }, { status: 400 });

        // Fetch the plan and unsettled installments
        const plan = await prisma.installmentPlan.findFirst({
            where: { id: planId, companyId },
            include: {
                installments: {
                    where: { status: { not: 'paid' } },
                    orderBy: { installmentNo: 'asc' }
                },
                customer: true
            }
        });

        if (!plan) return NextResponse.json({ error: 'الخطة غير موجودة' }, { status: 404 });

        const treasuryCheck = await prisma.treasury.findFirst({ where: { id: treasuryId, companyId } });
        if (!treasuryCheck) return NextResponse.json({ error: 'الخزينة غير موجودة' }, { status: 404 });
        if (plan.status !== 'active') return NextResponse.json({ error: 'الخطة غير نشطة' }, { status: 400 });

        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });
        if (!currentYear) return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });

        // Calculate totals from unsettled installments
        const totalRemaining = roundMoney(plan.installments.reduce((s, i) => s + i.remaining, 0));
        // موجب = خصم فوائد متبقية للعميل، سالب = رسوم سداد معجل
        const totalInterestToWaive = roundMoney(totalRemaining - amountToPay);

        const result = await prisma.$transaction(async (tx) => {
            // 1. توزيع المبلغ المدفوع فعلاً على الأقساط (الأقدم الأول) — والأخير بياخد الباقي
            // كده الفرق بين قيمة القسط والمدفوع فيه = الخصم (أو الرسوم)، وبيظهر في كشف الحساب
            let leftToApply = amountToPay;
            for (const [idx, inst] of plan.installments.entries()) {
                const isLast = idx === plan.installments.length - 1;
                const applied = isLast ? leftToApply : Math.min(leftToApply, inst.remaining);
                leftToApply = roundMoney(leftToApply - applied);
                await tx.installment.update({
                    where: { id: inst.id },
                    data: {
                        paidAmount: roundMoney(inst.paidAmount + applied),
                        remaining: 0,
                        status: 'paid',
                        paidAt: new Date(),
                        treasuryId,
                        notes: notes ? `${notes} ${SETTLE_NOTE_TAG}` : `سداد معجل ${SETTLE_NOTE_TAG}`
                    }
                });
            }

            // سند قبض بالمبلغ المدفوع — زي تحصيل القسط، عشان يظهر في كشف حساب العميل وتقارير الخزينة
            const lastVoucher = await tx.voucher.findFirst({
                where: { companyId, type: 'receipt' },
                orderBy: { voucherNumber: 'desc' },
            });
            await tx.voucher.create({
                data: {
                    voucherNumber:   (lastVoucher?.voucherNumber || 0) + 1,
                    type:            'receipt',
                    date:            new Date(),
                    amount:          amountToPay,
                    description:     `سداد معجل (تكييش) — خطة ${plan.planNumber}`,
                    customerId:      plan.customerId,
                    treasuryId,
                    financialYearId: currentYear.id,
                    companyId,
                }
            });

            // 2. Mark plan as completed
            await tx.installmentPlan.update({
                where: { id: planId },
                data: { status: 'completed' }
            });

            // 3. Update customer balance (decrement the FULL remaining amount including interest)
            await tx.customer.update({
                where: { id: plan.customerId },
                data: { balance: { decrement: totalRemaining } }
            });

            // 4. Update treasury
            const treasury = await tx.treasury.findUnique({
                where: { id: treasuryId },
                select: { accountId: true }
            });
            await tx.treasury.update({
                where: { id: treasuryId },
                data: { balance: { increment: amountToPay } }
            });

            // 5. Journal Entry
            const receivablesAcc = await tx.account.findFirst({
                where: {
                    companyId, type: 'asset', accountCategory: 'detail',
                    OR: [{ name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }],
                },
            });
            const interestRevenueAcc = await tx.account.findFirst({
                where: {
                    companyId, type: 'revenue', accountCategory: 'detail',
                    OR: [{ name: { contains: 'فوائد' } }, { name: { contains: 'إيرادات فوائد' } }],
                },
            });

            if (treasury?.accountId && receivablesAcc) {
                const lastEntry = await tx.journalEntry.findFirst({
                    where: { companyId },
                    orderBy: { entryNumber: 'desc' },
                    select: { entryNumber: true },
                });

                const lines = [
                    {
                        accountId: treasury.accountId,
                        debit: amountToPay,
                        credit: 0,
                        description: `تكييش خطة تقسيط #${plan.planNumber} — سداد معجل`,
                    },
                    {
                        accountId: receivablesAcc.id,
                        debit: 0,
                        credit: totalRemaining, // Credit the full amount to close it
                        description: `إغلاق مديونية خطة تقسيط #${plan.planNumber}`,
                    }
                ];

                // الفرق بيروح على حساب الفوائد (أو المبيعات لو مفيش) — الذمم بتتقفل دايماً بالمتبقي كله
                // زي ما رصيد العميل بيتخصم منه المتبقي كله
                const adjAcc = interestRevenueAcc || await tx.account.findFirst({
                    where: { companyId, type: 'revenue', accountCategory: 'detail', OR: [{ name: { contains: 'مبيعات' } }, { name: { contains: 'إيرادات' } }] },
                });
                if (totalInterestToWaive !== 0 && adjAcc) {
                    lines.push({
                        accountId: adjAcc.id,
                        debit: totalInterestToWaive > 0 ? totalInterestToWaive : 0,
                        credit: totalInterestToWaive < 0 ? -totalInterestToWaive : 0,
                        description: totalInterestToWaive > 0
                            ? `خصم/تنازل عن فوائد متبقية — تكييش خطة #${plan.planNumber}`
                            : `رسوم سداد معجل — تكييش خطة #${plan.planNumber}`,
                    });
                }

                await tx.journalEntry.create({
                    data: {
                                branchId: body?.branchId || null,
                        entryNumber: (lastEntry?.entryNumber || 0) + 1,
                        date: new Date(),
                        description: `تكييش خطة تقسيط #${plan.planNumber} للعميل ${plan.customer.name}`,
                        referenceType: 'installment_settle',
                        referenceId: plan.id,
                        financialYearId: currentYear.id,
                        companyId,
                        isPosted: true,
                        lines: { create: lines },
                    },
                });
            }

            return { success: true };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في تكييش الخطة') }, { status: 500 });
    }
});
