import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const financialYearId = request.nextUrl.searchParams.get('financialYearId');
        let yearFilter: any = {};

        if (financialYearId) {
            yearFilter = { financialYearId };
        } else {
            const openYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true },
            });
            if (openYear) yearFilter = { financialYearId: openYear.id };
        }

        const openingBalances = await prisma.openingBalance.findMany({
            where: { companyId, ...(yearFilter.financialYearId ? { financialYearId: yearFilter.financialYearId } : {}) },
            include: { account: true }
        });

        const lines = await prisma.journalEntryLine.findMany({
            where: {
                journalEntry: { companyId, isPosted: true, ...yearFilter },
                account: {
                    type: { in: ['asset', 'liability', 'equity', 'revenue', 'expense'] }
                }
            },
            include: { account: true }
        });

        const accountsMap = new Map<string, { code: string, name: string, type: string, balance: number }>();
        let netIncome = 0;

        for (const ob of openingBalances) {
            const accId = ob.accountId;
            if (!accountsMap.has(accId)) {
                accountsMap.set(accId, {
                    code: ob.account.code,
                    name: ob.account.name,
                    type: ob.account.type,
                    balance: 0
                });
            }
            const current = accountsMap.get(accId)!;
            if (ob.account.type === 'asset') {
                current.balance += (ob.debit - ob.credit);
            } else if (ob.account.type === 'liability' || ob.account.type === 'equity') {
                current.balance += (ob.credit - ob.debit);
            }
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

            if (current.type === 'asset') {
                current.balance += (line.debit - line.credit);
            }
            else if (current.type === 'liability' || current.type === 'equity') {
                current.balance += (line.credit - line.debit);
            }
            else if (current.type === 'revenue') {
                netIncome += (line.credit - line.debit);
            }
            else if (current.type === 'expense') {
                netIncome -= (line.debit - line.credit);
            }
        }

        const rawReport = Array.from(accountsMap.values());

        const assets = rawReport.filter(a => a.type === 'asset' && a.balance !== 0).sort((a, b) => a.code.localeCompare(b.code));
        const liabilities = rawReport.filter(a => a.type === 'liability' && a.balance !== 0).sort((a, b) => a.code.localeCompare(b.code));
        const equities = rawReport.filter(a => a.type === 'equity' && a.balance !== 0).sort((a, b) => a.code.localeCompare(b.code));

        const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
        let totalEquities = equities.reduce((s, a) => s + a.balance, 0);

        totalEquities += netIncome;

        return NextResponse.json({
            assets,
            liabilities,
            equities,
            netIncome,
            totalAssets,
            totalLiabilities,
            totalEquities,
            totalLiabilitiesAndEquities: totalLiabilities + totalEquities
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to generate Balance Sheet' }, { status: 500 });
    }
});
