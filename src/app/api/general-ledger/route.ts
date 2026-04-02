import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');

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
                    date: {
                        gte: fromDate ? new Date(fromDate) : new Date('2000-01-01'),
                        lte: toDate ? new Date(toDate) : new Date('2100-01-01'),
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
            return {
                id: line.id,
                date: line.journalEntry.date,
                entryNumber: String(line.journalEntry.entryNumber),
                description: line.description || line.journalEntry.description || '',
                reference: line.journalEntry.reference,
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
