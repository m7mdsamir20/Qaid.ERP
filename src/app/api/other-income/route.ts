import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';

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
                                branchId: body?.branchId || null,
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
        return NextResponse.json({ error: safeErrorMsg(err, 'حدث خطأ في الخادم') }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session!.user as any).companyId;
        const { id, date, amount, accountId, notes, treasuryId } = body;

        if (!id) return NextResponse.json({ error: 'معرف الإيراد مطلوب' }, { status: 400 });
        if (!date || !amount || !accountId || !treasuryId) {
            return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
        }

        const existing = await prisma.journalEntry.findFirst({
            where: { id, companyId, referenceType: 'other_income' },
            include: { lines: true },
        });
        if (!existing) return NextResponse.json({ error: 'الإيراد غير موجود' }, { status: 404 });

        const numAmount = Number(amount);
        // The debit line holds the treasury amount for income entries
        const oldAmount = (existing.lines as any[]).find((l: any) => l.debit > 0)?.debit || 0;
        const oldTreasuryId = existing.referenceId;

        await prisma.$transaction(async (tx: any) => {
            // 1. Reverse old treasury income (decrement to undo the original increment)
            if (oldTreasuryId) {
                await tx.treasury.update({
                    where: { id: oldTreasuryId, companyId },
                    data: { balance: { decrement: oldAmount } },
                });
            }

            // 2. Apply new income to the new treasury
            const newTreasury = await tx.treasury.findUnique({ where: { id: treasuryId, companyId } });
            if (!newTreasury) throw new Error('الخزينة غير موجودة');
            await tx.treasury.update({
                where: { id: treasuryId },
                data: { balance: { increment: numAmount } },
            });

            // 3. Find debit account for the new treasury (same priority as POST)
            const debitAccount = newTreasury.accountId
                ? await tx.account.findUnique({ where: { id: newTreasury.accountId } })
                : await tx.account.findFirst({
                    where: {
                        companyId,
                        type: 'asset',
                        accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'صندوق' } },
                            { name: { contains: 'بنك' } },
                        ],
                    },
                });
            if (!debitAccount) {
                throw new Error('لا يوجد حساب نقدية أو بنك متاح لهذا الفرع لتسجيل القيد');
            }

            // 4. Replace lines and update the journal entry
            await tx.journalEntry.update({
                where: { id },
                data: {
                    date: new Date(date),
                    description: notes || 'إيرادات أخرى',
                    referenceId: treasuryId,
                    lines: {
                        deleteMany: {},
                        create: [
                            {
                                accountId: debitAccount.id,
                                debit: numAmount,
                                credit: 0,
                                description: notes || 'إيرادات أخرى',
                            },
                            {
                                accountId,
                                debit: 0,
                                credit: numAmount,
                                description: notes || 'إيرادات أخرى',
                            },
                        ],
                    },
                },
            });
        });

        const updated = await prisma.journalEntry.findUnique({
            where: { id },
            include: { lines: { include: { account: true } } },
        });
        return NextResponse.json(updated);
    } catch (err: any) {
        console.error('PUT OtherIncome Error:', err);
        return NextResponse.json({ error: safeErrorMsg(err, 'حدث خطأ في الخادم') }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session!.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'معرف الإيراد مطلوب' }, { status: 400 });

        const existing = await prisma.journalEntry.findFirst({
            where: { id, companyId, referenceType: 'other_income' },
            include: { lines: true },
        });
        if (!existing) return NextResponse.json({ error: 'الإيراد غير موجود' }, { status: 404 });

        // The debit line holds the treasury amount for income entries
        const amount = (existing.lines as any[]).find((l: any) => l.debit > 0)?.debit || 0;
        const treasuryId = existing.referenceId;

        await prisma.$transaction(async (tx: any) => {
            // Reverse the income: decrement the treasury balance
            if (treasuryId) {
                await tx.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: { decrement: amount } },
                });
            }
            // JournalEntryLine has onDelete: Cascade — no manual line deletion needed
            await tx.journalEntry.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('DELETE OtherIncome Error:', err);
        return NextResponse.json({ error: safeErrorMsg(err, 'حدث خطأ في الخادم') }, { status: 500 });
    }
});
