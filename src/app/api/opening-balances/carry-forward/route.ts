import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { targetYearId } = body;

        if (!targetYearId) {
            return NextResponse.json({ error: 'السنة المستهدفة مطلوبة' }, { status: 400 });
        }

        // 1. Get Target Year
        const targetYear = await prisma.financialYear.findFirst({
            where: { id: targetYearId, companyId }
        });

        if (!targetYear) {
            return NextResponse.json({ error: 'السنة المالية غير موجودة أو غير تابعة للشركة' }, { status: 404 });
        }

        // 2. Find Previous Year (based on startDate)
        const previousYear = await prisma.financialYear.findFirst({
            where: {
                companyId,
                startDate: { lt: targetYear.startDate }
            },
            orderBy: { startDate: 'desc' }
        });

        if (!previousYear) {
            return NextResponse.json({ error: 'لا توجد سنة مالية سابقة للترحيل منها' }, { status: 400 });
        }

        // 3. Fetch all accounts with their opening balances and journal lines for the PREVIOUS year
        const accounts = await prisma.account.findMany({
            where: {
                companyId,
                isParent: false
            },
            include: {
                openingBalances: {
                    where: { financialYearId: previousYear.id }
                },
                journalEntryLines: {
                    where: {
                        journalEntry: {
                            financialYearId: previousYear.id,
                            isPosted: true
                        }
                    }
                }
            }
        });

        const results = [];

        // 4. Calculate and Upsert Opening Balances for Target Year
        for (const acc of accounts) {
            const prevOpening = acc.openingBalances[0] || { debit: 0, credit: 0 };
            const movements = acc.journalEntryLines.reduce((sum, line) => ({
                debit: sum.debit + line.debit,
                credit: sum.credit + line.credit
            }), { debit: 0, credit: 0 });

            const finalDebit = prevOpening.debit + movements.debit;
            const finalCredit = prevOpening.credit + movements.credit;

            let balance = finalDebit - finalCredit;
            
            let targetDebit = 0;
            let targetCredit = 0;

            if (balance > 0) {
                targetDebit = balance;
            } else if (balance < 0) {
                targetCredit = Math.abs(balance);
            }

            if (targetDebit === 0 && targetCredit === 0) continue;

            const res = await prisma.openingBalance.upsert({
                where: {
                    accountId_financialYearId: {
                        accountId: acc.id,
                        financialYearId: targetYearId
                    }
                },
                update: {
                    debit: targetDebit,
                    credit: targetCredit
                },
                create: {
                    accountId: acc.id,
                    financialYearId: targetYearId,
                    debit: targetDebit,
                    credit: targetCredit,
                    companyId
                }
            });
            results.push(res);
        }

        return NextResponse.json({
            success: true,
            message: `تم ترحيل ${results.length} حساب بنجاح من ${previousYear.name}`,
            count: results.length
        });

    } catch (e: any) {
        console.error('CARRY_FORWARD_ERROR:', e);
        return NextResponse.json({ error: 'فشل في عملية الترحيل' }, { status: 500 });
    }
});
