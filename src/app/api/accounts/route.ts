import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        // ✅ السنة المالية المفتوحة
        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });

        const accounts = await prisma.account.findMany({
            where: { companyId },
            include: {
                journalEntryLines: {
                    where: {
                        journalEntry: {
                            companyId,
                            isPosted: true,
                            // ✅ نعتمد على تاريخ الحركة ليكون ضمن السنة المالية المفتوحة
                            // بدلاً من الاعتماد فقط على الربط بـ ID السنة المالية
                            date: currentYear ? {
                                gte: currentYear.startDate,
                                lte: currentYear.endDate
                            } : undefined
                        }
                    },
                    select: { debit: true, credit: true }
                },
                openingBalances: {
                    where: { financialYearId: currentYear?.id },
                    select: { debit: true, credit: true }
                },
            },
            orderBy: { code: 'asc' },
        });

        const accountList = accounts.map(acc => {
            const debits  = acc.journalEntryLines.reduce((s, l) => s + l.debit,  0)
                          + acc.openingBalances.reduce((s, b) => s + b.debit,  0);
            const credits = acc.journalEntryLines.reduce((s, l) => s + l.credit, 0)
                          + acc.openingBalances.reduce((s, b) => s + b.credit, 0);

            return {
                ...acc,
                journalEntryLines: undefined,
                openingBalances:   undefined,
                baseBalance: debits - credits,
            };
        });

        const getFullBalance = (accountId: string): number => {
            const acc      = accountList.find(a => a.id === accountId);
            if (!acc) return 0;
            const children = accountList.filter(a => a.parentId === accountId);
            if (children.length === 0) return acc.baseBalance;
            return children.reduce((sum, child) => sum + getFullBalance(child.id), 0);
        };

        const finalAccounts = accountList.map(acc => ({
            ...acc,
            balance:     acc.accountCategory === 'summary'
                ? getFullBalance(acc.id)
                : acc.baseBalance,
            baseBalance: undefined,
        }));

        return NextResponse.json(finalAccounts);
    } catch (error) {
        console.error("Accounts API Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}, { cache: 20 });

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        if (!body.code || !body.name || !body.type)
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });

        const natureMap: Record<string, string> = {
            asset: 'debit', expense: 'debit',
            liability: 'credit', equity: 'credit', revenue: 'credit',
        };
        const nature = natureMap[body.type] || body.nature || 'debit';

        const account = await prisma.account.create({
            data: {
                code:            body.code,
                name:            body.name,
                nameEn:          body.nameEn || null,
                nature,
                type:            body.type,
                accountCategory: body.accountCategory || 'detail',
                level:           body.level || 1,
                isParent:        body.isParent || false,
                parentId:        body.parentId || null,
                companyId,
            },
        });

        if (body.parentId) {
            await prisma.account.update({
                where: { id: body.parentId },
                data:  { isParent: true },
            });
        }

        return NextResponse.json(account, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'فشل في إنشاء الحساب' }, { status: 500 });
    }
});
