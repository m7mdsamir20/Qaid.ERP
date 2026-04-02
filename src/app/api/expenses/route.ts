import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        const where: any = {
            companyId,
            referenceType: 'other_expense',
        };

        if (fromDate && toDate) {
            where.date = {
                gte: new Date(fromDate),
                lte: new Date(toDate),
            };
        } else if (month && year) {
            where.date = {
                gte: new Date(Number(year), Number(month) - 1, 1),
                lt: new Date(Number(year), Number(month), 1),
            };
        }

        const entries = await prisma.journalEntry.findMany({
            where,
            include: {
                lines: { include: { account: true, costCenter: true } },
            },
            orderBy: { date: 'desc' },
        });

        const treasuries = await prisma.treasury.findMany({
            where: { companyId },
            select: { id: true, name: true, type: true }
        });

        const enhancedEntries = entries.map(entry => {
            const creditLine = entry.lines.find((l: any) => l.credit > 0);
            let sourceName = creditLine?.account?.name || '—';
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
    } catch (error) {
        console.error('GET Expenses Error:', error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const { date, amount, accountId, notes, treasuryId, costCenterId } = body;

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

            const oldTreasury = await tx.treasury.findUnique({ where: { id: treasuryId, companyId } });
            if (!oldTreasury || oldTreasury.balance < numAmount) {
                throw new Error("رصيد الخزينة/البنك غير كافٍ لإتمام العملية");
            }

            const treasury = await tx.treasury.update({
                where: { id: treasuryId },
                data: { balance: { decrement: numAmount } }
            });

            let creditAccount = await tx.account.findFirst({
                where: {
                    companyId,
                    name: treasury.name,
                    accountCategory: 'detail'
                }
            });

            if (!creditAccount) {
                creditAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        name: { contains: treasury.name },
                        type: 'asset',
                        accountCategory: 'detail'
                    }
                });
            }

            if (!creditAccount) {
                creditAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        type: 'asset',
                        accountCategory: 'detail'
                    },
                    orderBy: { code: 'desc' }
                });
            }

            if (!creditAccount) {
                throw new Error('لا يوجد حساب نقدية أو بنك متاح لهذا الفرع لتسجيل القيد. نوصي بإنشاء حساب بنفس اسم الخزينة.');
            }

            const newEntry = await tx.journalEntry.create({
                data: {
                    entryNumber: nextEntryNumber,
                    date: new Date(date),
                    description: notes || 'مصروفات أخرى',
                    referenceType: 'other_expense',
                    referenceId: treasuryId,
                    financialYearId: financialYear.id,
                    companyId: companyId,
                    isPosted: true,
                    lines: {
                        create: [
                            {
                                accountId: accountId,
                                debit: numAmount,
                                credit: 0,
                                description: notes || 'مصروفات أخرى',
                                costCenterId: costCenterId || null
                            },
                            {
                                accountId: creditAccount.id,
                                debit: 0,
                                credit: numAmount,
                                description: notes || 'مصروفات أخرى'
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
