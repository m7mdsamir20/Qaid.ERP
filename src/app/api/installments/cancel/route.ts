import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

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
        const totalPaid = plan.installments.reduce(
            (s, i) => s + (i.paidAmount || 0), 0
        );
        // Remaining amount on customer
        const remainingOnCustomer = (plan.grandTotal) - totalPaid;

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

            // ③ Decrease customer balance by remaining amount
            await tx.customer.update({
                where: { id: plan.customerId },
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

                    const ratio = plan.grandTotal > 0 ? remainingOnCustomer / plan.grandTotal : 1;
                    const salesCredit = plan.totalAmount * ratio;
                    const interestCredit = (plan.totalInterest || 0) * ratio;

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
                        } else {
                            // مفيش حساب فوائد — أضف الفوائد على حساب المبيعات للحفاظ على توازن القيد
                            reversalLines[0].debit += interestCredit;
                        }
                    }

                    // ⑤ Refund paid amounts if needed
                    if (totalPaid > 0 && refundTreasuryId) {
                        const treasury = await tx.treasury.findUnique({
                            where: { id: refundTreasuryId, companyId },
                            select: { accountId: true },
                        });

                        if (treasury?.accountId) {
                            reversalLines.push(
                                {
                                    accountId: receivablesAcc.id,
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
                                where: { id: refundTreasuryId },
                                data: { balance: { decrement: totalPaid } },
                            });

                            await tx.customer.update({
                                where: { id: plan.customerId },
                                data: { balance: { decrement: totalPaid } },
                            });
                        }
                    }

                    await tx.journalEntry.create({
                        data: {
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
        return NextResponse.json({ error: 'فشل الإلغاء', details: error.message }, { status: 500 });
    }
});
