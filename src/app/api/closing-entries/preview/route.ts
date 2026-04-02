import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const financialYearId = searchParams.get('financialYearId');

        if (!financialYearId) {
            return NextResponse.json({ error: "Financial Year ID is required" }, { status: 400 });
        }

        // 1. Get Financial Year
        const year = await prisma.financialYear.findFirst({
            where: { id: financialYearId, companyId },
        });

        if (!year) {
            return NextResponse.json({ error: "السنة المالية غير موجودة أو غير تابعة للشركة" }, { status: 404 });
        }

        // 2. Check for Draft Entries
        const draftCount = await prisma.journalEntry.count({
            where: {
                companyId,
                financialYearId,
                isPosted: false
            }
        });

        // 3. Check if already closed (Check if a closing entry exists)
        const closingEntry = await prisma.journalEntry.findFirst({
            where: {
                companyId,
                financialYearId,
                referenceType: 'closing'
            }
        });

        // 4. Fetch revenue and expense accounts and their balances
        const accountsWithLines = await prisma.account.findMany({
            where: {
                companyId,
                accountCategory: 'detail',
                type: { in: ['revenue', 'expense'] }
            },
            include: {
                journalEntryLines: {
                    where: {
                        journalEntry: {
                            financialYearId,
                            isPosted: true
                        }
                    }
                }
            }
        });

        const previewAccounts = accountsWithLines.map(acc => {
            const balance = acc.journalEntryLines.reduce((sum, line) => {
                return sum + (line.debit - line.credit);
            }, 0);
            
            let displayBalance = balance;
            if (acc.type === 'revenue') {
                displayBalance = -balance;
            }

            return {
                id: acc.id,
                code: acc.code,
                name: acc.name,
                type: acc.type as 'revenue' | 'expense',
                balance: displayBalance
            };
        }).filter(a => Math.abs(a.balance) > 0.001);

        const revenueTotal = previewAccounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
        const expenseTotal = previewAccounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);

        return NextResponse.json({
            accounts: previewAccounts,
            draftCount,
            alreadyClosed: !!closingEntry,
            closingDate: closingEntry?.date,
            entryId: closingEntry?.id,
            revenueTotal,
            expenseTotal,
            netResult: revenueTotal - expenseTotal
        });

    } catch (error: any) {
        console.error("Closing Preview Error:", error);
        return NextResponse.json({ error: "Failed to generate closing preview" }, { status: 500 });
    }
});
