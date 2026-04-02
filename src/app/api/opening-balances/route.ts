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

        if (!body.accountId || !body.financialYearId) {
            return NextResponse.json({ error: 'الحقول الأساسية مطلوبة' }, { status: 400 });
        }

        const debit  = parseFloat(body.debit)  || 0;
        const credit = parseFloat(body.credit) || 0;

        // 1. حفظ/تحديث الرصيد الافتتاحي
        const balance = await prisma.openingBalance.upsert({
            where: {
                accountId_financialYearId: {
                    accountId: body.accountId,
                    financialYearId: body.financialYearId
                }
            },
            update:  { debit, credit },
            create:  { accountId: body.accountId, financialYearId: body.financialYearId, debit, credit, companyId },
        });

        // 2. أنشئ/حدّث قيد الأرصدة الافتتاحية لهذه السنة المالية
        // جيب كل الأرصدة الافتتاحية للسنة المالية بعد التحديث
        const allBalances = await prisma.openingBalance.findMany({
            where: { companyId, financialYearId: body.financialYearId },
            include: { account: true }
        });

        const nonZeroBalances = allBalances.filter(b => b.debit !== 0 || b.credit !== 0);

        if (nonZeroBalances.length > 0) {
            const existingEntry = await prisma.journalEntry.findFirst({
                where: {
                    companyId,
                    financialYearId: body.financialYearId,
                    referenceType: 'opening_balance',
                    referenceId: body.financialYearId,
                }
            });

            if (existingEntry) {
                // احذف السطور القديمة وأعد إنشاءها
                await prisma.journalEntryLine.deleteMany({
                    where: { journalEntryId: existingEntry.id }
                });
                await Promise.all(nonZeroBalances.map(b => 
                    prisma.journalEntryLine.create({
                        data: {
                            journalEntryId: existingEntry.id,
                            accountId: b.accountId,
                            debit:  b.debit,
                            credit: b.credit,
                            description: `رصيد افتتاحي — ${b.account.name}`,
                        }
                    })
                ));
            } else {
                // أنشئ قيداً جديداً
                const lastEntry = await prisma.journalEntry.findFirst({
                    where: { companyId, financialYearId: body.financialYearId },
                    orderBy: { entryNumber: 'desc' },
                    select: { entryNumber: true }
                });

                await prisma.journalEntry.create({
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
                                debit:  b.debit,
                                credit: b.credit,
                                description: `رصيد افتتاحي — ${b.account.name}`,
                            }))
                        }
                    }
                });
            }
        }

        return NextResponse.json(balance, { status: 201 });
    } catch (e) {
        console.error('OPENING_BALANCE_ERROR:', e);
        return NextResponse.json({ error: 'فشل في حفظ الرصيد الافتتاحي' }, { status: 500 });
    }
});
