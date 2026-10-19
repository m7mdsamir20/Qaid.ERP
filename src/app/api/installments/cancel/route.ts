import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';
import { roundMoney } from '@/lib/currency';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { planId, refundTreasuryId } = body;

        if (!planId) {
            return NextResponse.json({ error: 'planId مطلوب' }, { status: 400 });
        }

        const plan = await prisma.installmentPlan.findFirst({
            where: { id: planId, companyId },
            include: { customer: true, installments: true },
        });

        if (!plan) {
            return NextResponse.json({ error: 'الخطة غير موجودة أو غير تابعة للشركة' }, { status: 404 });
        }
        if (plan.status === 'cancelled') {
            return NextResponse.json({ error: 'الخطة ملغاة بالفعل' }, { status: 400 });
        }

        // Amount actually paid
        const totalPaid = roundMoney(plan.installments.reduce(
            (s, i) => s + (i.paidAmount || 0), 0
        ));
        // المتبقي على العميل من الخطة = الأقساط اللي لسه ماتدفعتش (المقدم والمحصّل اتخصموا قبل كده)
        const remainingOnCustomer = roundMoney(plan.grandTotal - totalPaid);

        await prisma.$transaction(async (tx) => {
            // ① Cancel the plan
            await tx.installmentPlan.update({
                where: { id: planId },
                data: { status: 'cancelled' },
            });

            // ② Cancel all unpaid installments
            await tx.installment.updateMany({
                where: { planId, status: { notIn: ['paid'] } },
                data: { status: 'cancelled' as any },
            });

            // ③ Revert invoice status if linked
            if (plan.invoiceId) {
                const inv = await tx.invoice.findUnique({ where: { id: plan.invoiceId } });
                if (inv) {
                    // الفاتورة تفضل فاتورة تقسيط ومقفولة — تحويلها لآجل كان بيرجّع مديونيتها على العميل
                    // تاني (وتظهر في كشف الحساب) مع إن الرصيد اتعكس تحت
                    await tx.invoice.update({
                        where: { id: plan.invoiceId },
                        data: {
                            remaining: 0,
                            notes: inv.notes?.replace(`تمت جدولتها إلى خطة تقسيط رقم ${plan.planNumber}`, '').trim()
                        }
                    });
                }
            }

            // ③ Decrease customer balance by remaining amount
            await tx.customer.update({
                where: { id: plan.customerId, companyId },
                data: { balance: { decrement: remainingOnCustomer } },
            });

            // ④ Reversal journal entries
            const fy = await tx.financialYear.findFirst({
                where: { companyId, isOpen: true },
            });

            if (fy) {
                const [receivablesAcc, salesAcc, interestAcc] = await Promise.all([
                    tx.account.findFirst({
                        where: { companyId, type: 'asset', accountCategory: 'detail',
                            OR: [{ name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }] },
                    }),
                    tx.account.findFirst({
                        where: { companyId, type: 'revenue', accountCategory: 'detail',
                            OR: [{ name: { contains: 'مبيعات' } }, { name: { contains: 'إيرادات المبيعات' } }] },
                    }),
                    tx.account.findFirst({
                        where: { companyId, type: 'revenue', accountCategory: 'detail',
                            OR: [{ name: { contains: 'فوائد' } }, { name: { contains: 'إيرادات فوائد' } }] },
                    }),
                ]);

                if (receivablesAcc && salesAcc) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where: { companyId }, orderBy: { entryNumber: 'desc' }, select: { entryNumber: true },
                    });

                    // عكس الإيراد بنفس قيمة الذمم المعكوسة عشان القيد يتوازن — الفوائد بنسبتها والباقي من المبيعات
                    const ratio = plan.grandTotal > 0 ? remainingOnCustomer / plan.grandTotal : 1;
                    const interestCredit = roundMoney((plan.totalInterest || 0) * ratio);
                    const salesCredit = roundMoney(remainingOnCustomer - (interestAcc ? interestCredit : 0));

                    const reversalLines: any[] = [
                        {
                            accountId: salesAcc.id,
                            debit: salesCredit,
                            credit: 0,
                            description: `إلغاء خطة تقسيط #${plan.planNumber} - ${plan.customer.name}`,
                        },
                        {
                            accountId: receivablesAcc.id,
                            debit: 0,
                            credit: remainingOnCustomer,
                            description: `إلغاء خطة تقسيط #${plan.planNumber}`,
                        },
                    ];

                    if (interestCredit > 0) {
                        if (interestAcc) {
                            reversalLines.push({
                                accountId: interestAcc.id,
                                debit: interestCredit,
                                credit: 0,
                                description: `عكس فوائد تقسيط #${plan.planNumber}`,
                            });
                        }
                    }

                    // ⑤ Refund paid amounts if needed
                    if (totalPaid > 0 && refundTreasuryId) {
                        const treasury = await tx.treasury.findUnique({
                            where: { id: refundTreasuryId, companyId },
                            select: { accountId: true },
                        });

                        if (treasury?.accountId) {
                            // رد الأقساط المحصّلة = عكس إيرادها ودفعها من الخزينة، ورصيد العميل مابيتغيرش.
                            // (كان بيتخصم من رصيده تاني، فيطلع إن ليه فلوس عندنا مع إنها اترجعتله)
                            reversalLines.push(
                                {
                                    accountId: salesAcc.id,
                                    debit: totalPaid,
                                    credit: 0,
                                    description: `رد مبالغ مدفوعة - خطة #${plan.planNumber}`,
                                },
                                {
                                    accountId: treasury.accountId,
                                    debit: 0,
                                    credit: totalPaid,
                                    description: `رد مبالغ مدفوعة - خطة #${plan.planNumber}`,
                                }
                            );

                            await tx.treasury.update({
                                where: { id: refundTreasuryId, companyId },
                                data: { balance: { decrement: totalPaid } },
                            });

                        }
                    }

                    await tx.journalEntry.create({
                        data: {
                                branchId: body?.branchId || null,
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: new Date(),
                            description: `إلغاء خطة تقسيط #${plan.planNumber} - ${plan.customer.name}`,
                            referenceType: 'installment_cancel',
                            referenceId: plan.id,
                            financialYearId: fy.id,
                            companyId,
                            isPosted: true,
                            lines: { create: reversalLines },
                        },
                    });
                }
            }
        });

        return NextResponse.json({ success: true, message: "تم إلغاء خطة التقسيط بنجاح وتم عكس القيود المحاسبية" });
    } catch (error: any) {
        console.error("Installment Cancel API Error:", error);
        return NextResponse.json({ error: 'فشل الإلغاء' }, { status: 500 });
    }
});
