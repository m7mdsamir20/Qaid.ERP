import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');
        const toDateEnd = toDate ? new Date(toDate) : null;
        if (toDateEnd) toDateEnd.setHours(23, 59, 59, 999);

        if (!accountId) {
            return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
        }

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        let initialOpening = 0;
        if (financialYear) {
            const ob = await prisma.openingBalance.findUnique({
                where: {
                    accountId_financialYearId: {
                        accountId,
                        financialYearId: financialYear.id
                    }
                }
            });
            if (ob) initialOpening = ob.debit - ob.credit;
        }

        const openingLines = await prisma.journalEntryLine.findMany({
            where: {
                accountId,
                journalEntry: {
                    companyId,
                    isPosted: true,
                    date: fromDate ? { lt: new Date(fromDate) } : undefined,
                },
            },
            select: { debit: true, credit: true }
        });

        const transactionsBefore = openingLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
        const openingBalance = initialOpening + transactionsBefore;

        const lines = await prisma.journalEntryLine.findMany({
            where: {
                accountId,
                journalEntry: {
                    companyId,
                    isPosted: true,
                    date: {
                        gte: fromDate ? new Date(fromDate) : new Date('2000-01-01'),
                        lte: toDateEnd || new Date('2100-01-01'),
                    },
                },
            },
            include: {
                journalEntry: true,
                costCenter: true,
            },
            orderBy: {
                journalEntry: {
                    date: 'asc',
                },
            },
        });

        let currentBalance = openingBalance;
        const resultLines = lines.map(line => {
            currentBalance += (line.debit - line.credit);
            
            let displayDesc = line.description || line.journalEntry.description || '';
            const ref = line.journalEntry.reference || '';
            
            // تحسين الوصف ليظهر الكود الاحترافي بدلاً من الرقم البسيط (للبيانات القديمة والجديدة)
            if (displayDesc.includes('فاتورة') && ref) {
                // إذا كان المرجع SAL-1 أو PUR-1، نحوله لـ SAL-00001
                const parts = ref.split('-');
                if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                    const paddedRef = `${parts[0]}-${parts[1].padStart(5, '0')}`;
                    displayDesc = displayDesc.replace(/فاتورة\s+\d+/, `فاتورة ${paddedRef}`);
                    // لو الوصف مفيهوش رقم بس فيه كلمة فاتورة
                    if (!displayDesc.includes(paddedRef)) displayDesc += ` (${paddedRef})`;
                }
            }
            
            return {
                id: line.id,
                date: line.journalEntry.date,
                entryNumber: String(line.journalEntry.entryNumber),
                description: displayDesc,
                reference: ref,
                debit: line.debit,
                credit: line.credit,
                balance: currentBalance,
                costCenter: line.costCenter ? { name: line.costCenter.name } : null,
            };
        });

        return NextResponse.json({
            openingBalance,
            lines: resultLines
        });

    } catch (error) {
        console.error("General Ledger API Error:", error);
        return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
    }
});
