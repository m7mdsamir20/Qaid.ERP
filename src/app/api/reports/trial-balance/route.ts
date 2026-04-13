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

        let yearFilter: { financialYearId?: string } = {};
        if (financialYearId) {
            yearFilter = { financialYearId };
        } else {
            const openYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true },
            });
            if (openYear) {
                yearFilter = { financialYearId: openYear.id };
            }
        }

        const lines = await prisma.journalEntryLine.findMany({
            where: {
                journalEntry: {
                    companyId,
                    isPosted: true,
                    ...yearFilter
                }
            },
            include: { account: true }
        });

        // Aggregate Trial Balance
        const tbMap = new Map<string, { code: string, name: string, debitMatch: number, creditMatch: number }>();

        for (const line of lines) {
            const accId = line.accountId;
            if (!tbMap.has(accId)) {
                tbMap.set(accId, {
                    code: line.account.code,
                    name: line.account.name,
                    debitMatch: 0,
                    creditMatch: 0
                });
            }
            const current = tbMap.get(accId)!;
            current.debitMatch += line.debit;
            current.creditMatch += line.credit;
        }

        const report = Array.from(tbMap.values()).map(acc => {
            const balanceDetails = acc.debitMatch - acc.creditMatch;
            return {
                code: acc.code,
                name: acc.name,
                totalDebit: acc.debitMatch,
                totalCredit: acc.creditMatch,
                balanceDebit: balanceDetails > 0 ? balanceDetails : 0,
                balanceCredit: balanceDetails < 0 ? Math.abs(balanceDetails) : 0,
            };
        }).sort((a, b) => a.code.localeCompare(b.code));

        return NextResponse.json(report);
    } catch (e) {
        console.error("Trial Balance API Error:", e);
        return NextResponse.json({ error: 'Failed to generate Trial Balance' }, { status: 500 });
    }
});

