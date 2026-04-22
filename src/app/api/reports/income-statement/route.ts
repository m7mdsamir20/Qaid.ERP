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
            if (openYear) yearFilter = { financialYearId: openYear.id };
        }

        const lines = await prisma.journalEntryLine.findMany({
            where: {
                journalEntry: { 
                    companyId, 
                    isPosted: true, 
                    ...yearFilter,
                    referenceType: { not: 'opening_balance' }
                },
                account: {
                    type: { in: ['revenue', 'expense'] }
                }
            },
            include: { account: true }
        });

        const openingBalances = await prisma.openingBalance.findMany({
            where: { companyId, ...(yearFilter.financialYearId ? { financialYearId: yearFilter.financialYearId } : {}) },
            include: { account: { select: { code: true, name: true, type: true } } }
        });

        const accountsMap = new Map<string, { code: string, name: string, type: string, balance: number }>();

        for (const ob of openingBalances) {
            if (ob.account.type !== 'revenue' && ob.account.type !== 'expense') continue;
            const accId = ob.accountId;
            if (!accountsMap.has(accId)) {
                accountsMap.set(accId, { code: ob.account.code, name: ob.account.name, type: ob.account.type, balance: 0 });
            }
            const current = accountsMap.get(accId)!;
            if (ob.account.type === 'revenue') current.balance += (ob.credit - ob.debit);
            else if (ob.account.type === 'expense') current.balance += (ob.debit - ob.credit);
        }

        for (const line of lines) {
            const accId = line.accountId;
            if (!accountsMap.has(accId)) {
                accountsMap.set(accId, {
                    code: line.account.code,
                    name: line.account.name,
                    type: line.account.type,
                    balance: 0
                });
            }
            const current = accountsMap.get(accId)!;

            if (current.type === 'revenue') {
                current.balance += (line.credit - line.debit);
            } else if (current.type === 'expense') {
                current.balance += (line.debit - line.credit);
            }
        }

        const report = Array.from(accountsMap.values()).map(acc => ({
            ...acc,
            balance: acc.balance > 0 ? acc.balance : 0,
        })).sort((a, b) => a.code.localeCompare(b.code));

        const revenues = report.filter(a => a.type === 'revenue');
        const expenses = report.filter(a => a.type === 'expense');

        const totalRevenue = revenues.reduce((sum, r) => sum + r.balance, 0);
        const totalExpense = expenses.reduce((sum, r) => sum + r.balance, 0);
        const netIncome = totalRevenue - totalExpense;

        return NextResponse.json({
            revenues,
            expenses,
            totalRevenue,
            totalExpense,
            netIncome
        });
    } catch (e) {
        console.error("Income Statement API Error:", e);
        return NextResponse.json({ error: 'Failed to generate Income Statement' }, { status: 500 });
    }
});

