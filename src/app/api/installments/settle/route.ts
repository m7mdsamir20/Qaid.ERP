import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { planId, paidAmount, treasuryId, notes } = body;

        if (!planId || !paidAmount || !treasuryId)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        const amountToPay = parseFloat(paidAmount);

        // Fetch the plan and unsettled installments
        const plan = await prisma.installmentPlan.findUnique({
            where: { id: planId },
            include: { 
                installments: { 
                    where: { status: { not: 'paid' } },
                    orderBy: { installmentNo: 'asc' } 
                },
                customer: true
            }
        });

        if (!plan) return NextResponse.json({ error: 'الخطة غير موجودة' }, { status: 404 });
        if (plan.status !== 'active') return NextResponse.json({ error: 'الخطة غير نشطة' }, { status: 400 });

        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });
        if (!currentYear) return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });

        // Calculate totals from unsettled installments
        const totalRemaining = plan.installments.reduce((s, i) => s + i.remaining, 0);
        const totalRemainingPrincipal = plan.installments.reduce((s, i) => s + i.principal, 0); // Roughly
        // Note: in current system, installment.amount = principal + interest.
        // installment.remaining is what's left of installment.amount.
        
        // We'll calculate the 'interest portion' to waive
        const totalInterestToWaive = totalRemaining - amountToPay;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update all unsettled installments to paid
            for (const inst of plan.installments) {
                await tx.installment.update({
                    where: { id: inst.id },
                    data: {
                        paidAmount: inst.amount,
                        remaining: 0,
                        status: 'paid',
                        paidAt: new Date(),
                        treasuryId,
                        notes: notes ? `${notes} (تكييش)` : 'سداد معجل (تكييش)'
                    }
                });
            }

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

                // لو في تنازل عن فوائد — ادين حساب الفوائد لعكسها
                if (totalInterestToWaive > 0) {
                    if (interestRevenueAcc) {
                        lines.push({
                            accountId: interestRevenueAcc.id,
                            debit: totalInterestToWaive,
                            credit: 0,
                            description: `خصم/تنازل عن فوائد متبقية — تكييش خطة #${plan.planNumber}`,
                        });
                    } else {
                        // مفيش حساب فوائد — قلل الدائن (ذمم العملاء) بقيمة التنازل للحفاظ على التوازن
                        lines[1].credit = amountToPay;
                    }
                }

                await tx.journalEntry.create({
                    data: {
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
        return NextResponse.json({ error: 'فشل في تكييش الخطة', details: error.message }, { status: 500 });
    }
});
