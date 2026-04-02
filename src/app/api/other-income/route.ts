import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const entries = await prisma.journalEntry.findMany({
            where: {
                companyId,
                referenceType: 'other_income'
            },
            include: {
                lines: { include: { account: true } },
            },
            orderBy: { date: 'desc' },
        });

        const treasuries = await prisma.treasury.findMany({
            where: { companyId },
            select: { id: true, name: true, type: true }
        });

        const enhancedEntries = entries.map(entry => {
            const debitLine = entry.lines.find((l: any) => l.debit > 0);
            let sourceName = debitLine?.account?.name || '—';
            let sourceType = 'cash';

            if (entry.referenceId) {
                const treasury = treasuries.find(t => t.id === entry.referenceId);
                if (treasury) {
                    sourceName = treasury.name;
                    sourceType = treasury.type;
                }
            }

            return {
                ...entry,
                sourceName,
                sourceType
            };
        });

        return NextResponse.json(enhancedEntries);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const { date, amount, accountId, notes, treasuryId } = body;

        if (!date || !amount || !accountId || !treasuryId) {
            return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
        }

        const financialYear = await prisma.financialYear.findFirst({
            where: {
                companyId,
                isOpen: true,
                startDate: { lte: new Date(date) },
                endDate: { gte: new Date(date) },
            },
        });

        if (!financialYear) {
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة لهذا التاريخ' }, { status: 400 });
        }

        const entry = await prisma.$transaction(async (tx) => {
            const lastEntry = await tx.journalEntry.findFirst({
                where: { financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
            });
            const nextEntryNumber = (lastEntry?.entryNumber || 0) + 1;

            const numAmount = Number(amount);

            const treasury = await tx.treasury.update({
                where: { id: treasuryId, companyId },
                data: { balance: { increment: numAmount } }
            });

            const debitAccount = treasury.accountId
                ? await tx.account.findUnique({ where: { id: treasury.accountId } })
                : await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'صندوق' } },
                            { name: { contains: 'بنك' } },
                        ]
                    }
                });

            if (!debitAccount) {
                throw new Error('لا يوجد حساب نقدية أو بنك متاح لهذا الفرع لتسجيل القيد');
            }

            const newEntry = await tx.journalEntry.create({
                data: {
                    entryNumber: nextEntryNumber,
                    date: new Date(date),
                    description: notes || 'إيرادات أخرى',
                    referenceType: 'other_income',
                    referenceId: treasuryId,
                    financialYearId: financialYear.id,
                    companyId: companyId,
                    isPosted: true,
                    lines: {
                        create: [
                            {
                                accountId: debitAccount.id,
                                debit: numAmount,
                                credit: 0,
                                description: notes || 'إيرادات أخرى'
                            },
                            {
                                accountId: accountId,
                                debit: 0,
                                credit: numAmount,
                                description: notes || 'إيرادات أخرى'
                            }
                        ]
                    }
                }
            });
            return newEntry;
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'فشل في حفظ العملية' }, { status: 500 });
    }
});
