import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const financialYearId = searchParams.get('financialYearId');

        const balances = await prisma.openingBalance.findMany({
            where: {
                companyId,
                ...(financialYearId ? { financialYearId } : {}),
            },
            include: {
                account: true,
                financialYear: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(balances);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // ── Batch Save Mode (new) ──
        if (body.batch && Array.isArray(body.balances)) {
            const financialYearId = body.financialYearId;
            if (!financialYearId) {
                return NextResponse.json({ error: 'السنة المالية مطلوبة' }, { status: 400 });
            }

            // Use a transaction to ensure atomicity
            await prisma.$transaction(async (tx) => {
                // 1. Upsert all opening balances
                for (const item of body.balances) {
                    if (!item.accountId) continue;
                    const debit = parseFloat(item.debit) || 0;
                    const credit = parseFloat(item.credit) || 0;

                    await tx.openingBalance.upsert({
                        where: {
                            accountId_financialYearId: {
                                accountId: item.accountId,
                                financialYearId,
                            }
                        },
                        update: { debit, credit },
                        create: { accountId: item.accountId, financialYearId, debit, credit, companyId },
                    });
                }

                // 2. Rebuild the journal entry ONCE after all balances are saved
                const allBalances = await tx.openingBalance.findMany({
                    where: { companyId, financialYearId },
                    include: { account: true }
                });

                const nonZeroBalances = allBalances.filter(b => b.debit !== 0 || b.credit !== 0);

                // Find or create the journal entry
                const existingEntry = await tx.journalEntry.findFirst({
                    where: {
                        companyId,
                        financialYearId,
                        referenceType: 'opening_balance',
                        referenceId: financialYearId,
                    }
                });

                if (nonZeroBalances.length > 0) {
                    if (existingEntry) {
                        // Delete old lines and recreate
                        await tx.journalEntryLine.deleteMany({
                            where: { journalEntryId: existingEntry.id }
                        });
                        await Promise.all(nonZeroBalances.map(b =>
                            tx.journalEntryLine.create({
                                data: {
                                    journalEntryId: existingEntry.id,
                                    accountId: b.accountId,
                                    debit: b.debit,
                                    credit: b.credit,
                                    description: `رصيد افتتاحي — ${b.account.name}`,
                                }
                            })
                        ));
                    } else {
                        // Create new journal entry
                        const lastEntry = await tx.journalEntry.findFirst({
                            where: { companyId, financialYearId },
                            orderBy: { entryNumber: 'desc' },
                            select: { entryNumber: true }
                        });

                        await tx.journalEntry.create({
                            data: {
                                entryNumber: (lastEntry?.entryNumber || 0) + 1,
                                date: new Date(),
                                description: 'أرصدة افتتاحية',
                                referenceType: 'opening_balance',
                                referenceId: financialYearId,
                                financialYearId,
                                companyId,
                                isPosted: true,
                                lines: {
                                    create: nonZeroBalances.map(b => ({
                                        accountId: b.accountId,
                                        debit: b.debit,
                                        credit: b.credit,
                                        description: `رصيد افتتاحي — ${b.account.name}`,
                                    }))
                                }
                            }
                        });
                    }
                } else if (existingEntry) {
                    // All balances are zero → clean up the journal entry
                    await tx.journalEntryLine.deleteMany({
                        where: { journalEntryId: existingEntry.id }
                    });
                    await tx.journalEntry.delete({
                        where: { id: existingEntry.id }
                    });
                }
            });

            return NextResponse.json({ success: true }, { status: 201 });
        }

        // ── Legacy Single Save Mode (backward compatible) ──
        if (!body.accountId || !body.financialYearId) {
            return NextResponse.json({ error: 'الحقول الأساسية مطلوبة' }, { status: 400 });
        }

        const debit  = parseFloat(body.debit)  || 0;
        const credit = parseFloat(body.credit) || 0;

        const balance = await prisma.$transaction(async (tx) => {
            // 1. Upsert the opening balance
            const bal = await tx.openingBalance.upsert({
                where: {
                    accountId_financialYearId: {
                        accountId: body.accountId,
                        financialYearId: body.financialYearId
                    }
                },
                update: { debit, credit },
                create: { accountId: body.accountId, financialYearId: body.financialYearId, debit, credit, companyId },
            });

            // 2. Rebuild journal entry
            const allBalances = await tx.openingBalance.findMany({
                where: { companyId, financialYearId: body.financialYearId },
                include: { account: true }
            });

            const nonZeroBalances = allBalances.filter(b => b.debit !== 0 || b.credit !== 0);

            if (nonZeroBalances.length > 0) {
                const existingEntry = await tx.journalEntry.findFirst({
                    where: {
                        companyId,
                        financialYearId: body.financialYearId,
                        referenceType: 'opening_balance',
                        referenceId: body.financialYearId,
                    }
                });

                if (existingEntry) {
                    await tx.journalEntryLine.deleteMany({
                        where: { journalEntryId: existingEntry.id }
                    });
                    await Promise.all(nonZeroBalances.map(b =>
                        tx.journalEntryLine.create({
                            data: {
                                journalEntryId: existingEntry.id,
                                accountId: b.accountId,
                                debit: b.debit,
                                credit: b.credit,
                                description: `رصيد افتتاحي — ${b.account.name}`,
                            }
                        })
                    ));
                } else {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where: { companyId, financialYearId: body.financialYearId },
                        orderBy: { entryNumber: 'desc' },
                        select: { entryNumber: true }
                    });

                    await tx.journalEntry.create({
                        data: {
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: new Date(),
                            description: 'أرصدة افتتاحية',
                            referenceType: 'opening_balance',
                            referenceId: body.financialYearId,
                            financialYearId: body.financialYearId,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: nonZeroBalances.map(b => ({
                                    accountId: b.accountId,
                                    debit: b.debit,
                                    credit: b.credit,
                                    description: `رصيد افتتاحي — ${b.account.name}`,
                                }))
                            }
                        }
                    });
                }
            }

            return bal;
        });

        return NextResponse.json(balance, { status: 201 });
    } catch (e) {
        console.error('OPENING_BALANCE_ERROR:', e);
        return NextResponse.json({ error: 'فشل في حفظ الرصيد الافتتاحي' }, { status: 500 });
    }
});
