import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { financialYearId, targetAccountId } = body;

        if (!financialYearId) {
            return NextResponse.json({ error: "Financial Year ID is required" }, { status: 400 });
        }

        const [year, draftCount, existingClosing] = await Promise.all([
            prisma.financialYear.findUnique({ where: { id: financialYearId, companyId } }),
            prisma.journalEntry.count({ where: { companyId, financialYearId, isPosted: false } }),
            prisma.journalEntry.findFirst({ where: { companyId, financialYearId, referenceType: 'closing' } })
        ]);

        if (!year) return NextResponse.json({ error: "سنة مالية غير صالحة" }, { status: 400 });
        if (existingClosing) return NextResponse.json({ error: "تم إقفال هذه السنة مسبقاً" }, { status: 400 });
        if (draftCount > 0) {
            return NextResponse.json({ error: `يوجد ${draftCount} قيود "مسودة" غير مؤرشفة. يجب تأريفها أو حذفها قبل الإقفال.` }, { status: 400 });
        }

        const accountsWithLines = await prisma.account.findMany({
            where: { companyId, accountCategory: 'detail', type: { in: ['revenue', 'expense'] } },
            include: {
                journalEntryLines: {
                    where: { journalEntry: { financialYearId, isPosted: true } }
                }
            }
        });

        let plAccount = null;
        if (targetAccountId) {
            plAccount = await prisma.account.findUnique({ where: { id: targetAccountId, companyId } });
        } else {
            plAccount = await prisma.account.findFirst({ where: { companyId, code: '3500' } });
        }

        if (!plAccount) {
            return NextResponse.json({ error: "حساب الإيرادات والأرباح الختامي غير موجود" }, { status: 400 });
        }

        const linesToCreate = [];
        let totalRevenue = 0;
        let totalExpense = 0;

        for (const acc of accountsWithLines) {
            const balance = acc.journalEntryLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
            if (Math.abs(balance) < 0.001) continue;

            if (acc.type === 'revenue') {
                totalRevenue += (-balance);
                linesToCreate.push({
                    accountId: acc.id,
                    debit: -balance,
                    credit: 0,
                    description: `إقفال حساب ${acc.name} - ${year.name}`
                });
            } else {
                totalExpense += balance;
                linesToCreate.push({
                    accountId: acc.id,
                    debit: 0,
                    credit: balance,
                    description: `إقفال حساب ${acc.name} - ${year.name}`
                });
            }
        }

        if (linesToCreate.length === 0) {
            return NextResponse.json({ error: "لا توجد أرصدة للحسابات الختامية لإقفالها" }, { status: 400 });
        }

        const netIncome = totalRevenue - totalExpense;

        if (netIncome > 0) {
            linesToCreate.push({
                accountId: plAccount.id,
                debit: 0,
                credit: netIncome,
                description: `ترحيل صافي ربح العام - ${year.name}`
            });
        } else if (netIncome < 0) {
            linesToCreate.push({
                accountId: plAccount.id,
                debit: Math.abs(netIncome),
                credit: 0,
                description: `ترحيل صافي خسارة العام - ${year.name}`
            });
        }

        const entry = await prisma.$transaction(async (tx) => {
            const lastJE = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            });
            const nextEntryNumber = (lastJE?.entryNumber || 0) + 1;

            return tx.journalEntry.create({
                data: {
                    entryNumber: nextEntryNumber,
                    date: new Date(year.endDate),
                    description: `قيود إقفال الحسابات الختامية للسنة المالية ${year.name}`,
                    reference: `CLS-${year.name}`,
                    referenceType: 'closing',
                    financialYearId: year.id,
                    companyId: companyId,
                    isPosted: true,
                    lines: {
                        create: linesToCreate
                    }
                }
            });
        });

        return NextResponse.json({
            revenueTotal: totalRevenue,
            expenseTotal: totalExpense,
            netIncome: netIncome,
            isProfit: netIncome >= 0,
            entriesCreated: 1,
            entryId: entry.id
        });

    } catch (error) {
        console.error("Closing Execution Error:", error);
        return NextResponse.json({ error: "فشل تنفيذ عملية الإقفال" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const financialYearId = searchParams.get('financialYearId');

        if (!financialYearId) {
            return NextResponse.json({ error: "Financial Year ID is required" }, { status: 400 });
        }

        const closingEntry = await prisma.journalEntry.findFirst({
            where: {
                companyId,
                financialYearId,
                referenceType: 'closing'
            }
        });

        if (!closingEntry) {
            return NextResponse.json({ error: "لا يوجد قيد إقفال لهذه السنة" }, { status: 404 });
        }

        await prisma.journalEntry.delete({
            where: { id: closingEntry.id, companyId }
        });

        return NextResponse.json({
            message: "تم إلغاء الإقفال بنجاح وحذف القيد المحاسبي المرتبط"
        });

    } catch (error) {
        console.error("Undo Closing Error:", error);
        return NextResponse.json({ error: "فشل إلغاء عملية الإقفال" }, { status: 500 });
    }
});
