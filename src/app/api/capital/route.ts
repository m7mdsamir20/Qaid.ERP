import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const partners = await prisma.partner.findMany({
            where: { companyId },
            include: {
                transactions: {
                    where: { type: { in: ['capital_increase', 'capital_decrease'] } },
                    orderBy: { date: 'desc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(partners.map(p => ({
            ...p,
            changes: p.transactions.map(t => ({
                id: t.id,
                type: t.type === 'capital_increase' ? 'increase' : 'decrease',
                amount: t.amount,
                date: t.date,
                notes: t.notes,
            })),
        })));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const { partnerId, type, amount, date, notes, treasuryId } = body;
        if (!partnerId || !amount) return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });

        const amountNum = parseFloat(amount);
        const txType = type === 'increase' ? 'capital_increase' : 'capital_decrease';
        const capitalDelta = type === 'increase' ? amountNum : -amountNum;
        const txDate = new Date(date || new Date());

        const activeYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        await prisma.$transaction(async (tx) => {
            // ① سجّل معاملة الشريك
            await tx.partnerTransaction.create({
                data: { type: txType, amount: amountNum, date: txDate, notes: notes || null, partnerId, companyId },
            });

            // ② حدّث رأس مال الشريك
            await tx.partner.update({
                where: { id: partnerId },
                data: { capital: { increment: capitalDelta } },
            });

            // ③ حدّث رصيد الخزينة لو موجودة
            if (treasuryId) {
                const treasury = await tx.treasury.findUnique({ where: { id: treasuryId, companyId } });
                if (!treasury) throw new Error('الخزينة غير موجودة');
                if (type === 'increase' && treasury.balance + amountNum < 0)
                    throw new Error('رصيد الخزينة غير كافٍ');
                await tx.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: { increment: type === 'increase' ? amountNum : -amountNum } },
                });
            }

            // ④ القيد المحاسبي
            if (activeYear) {
                // حساب رأس المال (3100)
                const capitalAcc = await tx.account.findFirst({
                    where: { companyId, accountCategory: 'detail',
                        OR: [{ code: '3100' }, { type: 'equity', name: { contains: 'رأس المال' } }],
                    },
                });

                // حساب الطرف المقابل: خزينة لو موجودة، وإلا حساب الشركاء (3200)
                let counterAcc = null;
                if (treasuryId) {
                    const treasury = await tx.treasury.findUnique({ where: { id: treasuryId } });
                    if (treasury?.accountId) {
                        counterAcc = await tx.account.findUnique({ where: { id: treasury.accountId } });
                    }
                }
                if (!counterAcc) {
                    counterAcc = await tx.account.findFirst({
                        where: { companyId, accountCategory: 'detail',
                            OR: [{ code: '3200' }, { type: 'equity', name: { contains: 'حسابات الشركاء' } }],
                        },
                    });
                }

                if (capitalAcc && counterAcc) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where: { companyId, financialYearId: activeYear.id },
                        orderBy: { entryNumber: 'desc' },
                        select: { entryNumber: true },
                    });

                    // زيادة رأس المال: مدين (خزينة/شريك) / دائن (رأس المال)
                    // تخفيض رأس المال: مدين (رأس المال) / دائن (خزينة/شريك)
                    const isIncrease = type === 'increase';
                    const partner = await tx.partner.findUnique({ where: { id: partnerId }, select: { name: true } });

                    await tx.journalEntry.create({
                        data: {
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: txDate,
                            description: `${isIncrease ? 'زيادة' : 'تخفيض'} رأس مال الشريك ${partner?.name || ''}`,
                            referenceType: 'capital',
                            referenceId: partnerId,
                            financialYearId: activeYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    {
                                        accountId: isIncrease ? counterAcc.id : capitalAcc.id,
                                        debit: amountNum,
                                        credit: 0,
                                        description: isIncrease ? `إيداع رأس مال — ${partner?.name || ''}` : `سحب رأس مال — ${partner?.name || ''}`,
                                    },
                                    {
                                        accountId: isIncrease ? capitalAcc.id : counterAcc.id,
                                        debit: 0,
                                        credit: amountNum,
                                        description: isIncrease ? `زيادة رأس مال — ${partner?.name || ''}` : `تخفيض رأس مال — ${partner?.name || ''}`,
                                    },
                                ],
                            },
                        },
                    });
                }
            }
        });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});
