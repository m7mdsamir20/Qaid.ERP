import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        const financialYearId = request.nextUrl.searchParams.get('financialYearId');

        // ① تحديد السنة المالية للحصول على نطاق التواريخ والأرصدة الافتتاحية
        let currentYear = null;
        if (financialYearId) {
            currentYear = await prisma.financialYear.findUnique({ where: { id: financialYearId } });
        } else {
            currentYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true },
                orderBy: { startDate: 'desc' }
            });
        }

        if (!currentYear) {
            return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة" }, { status: 400 });
        }

        // ② جلب كافة الحسابات
        const accounts = await prisma.account.findMany({
            where: { companyId, accountCategory: 'detail' },
            include: {
                openingBalances: {
                    where: { financialYearId: currentYear.id }
                },
                journalEntryLines: {
                    where: {
                        journalEntry: {
                            isPosted: true,
                            date: {
                                gte: currentYear.startDate,
                                lte: currentYear.endDate
                            }
                        }
                    }
                }
            }
        });

        // ③ تجميع البيانات لميزان المراجعة
        const report = accounts.map(acc => {
            // الرصيد الافتتاحي من جدول الافتتاحيات
            const opDebit = acc.openingBalances.reduce((s, b) => s + b.debit, 0);
            const opCredit = acc.openingBalances.reduce((s, b) => s + b.credit, 0);

            // الحركات خلال الفترة (بناءً على التواريخ لضمان الدقة وتجنب نقص البيانات)
            const transDebit = acc.journalEntryLines.reduce((s, l) => s + l.debit, 0);
            const transCredit = acc.journalEntryLines.reduce((s, l) => s + l.credit, 0);

            // الإجماليات (الافتتاحي + الحركة)
            const totalDebit = opDebit + transDebit;
            const totalCredit = opCredit + transCredit;

            const netBalance = totalDebit - totalCredit;

            return {
                code: acc.code,
                name: acc.name,
                totalDebit,
                totalCredit,
                balanceDebit: netBalance > 0 ? netBalance : 0,
                balanceCredit: netBalance < 0 ? Math.abs(netBalance) : 0,
            };
        })
        .filter(acc => acc.totalDebit !== 0 || acc.totalCredit !== 0) // إخفاء الحسابات الصفرية
        .sort((a, b) => a.code.localeCompare(b.code));

        return NextResponse.json(report);
    } catch (e) {
        console.error("Trial Balance API Error:", e);
        return NextResponse.json({ error: 'Fails to generate Trial Balance' }, { status: 500 });
    }
});
