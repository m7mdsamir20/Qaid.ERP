import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const profitTxs = await prisma.partnerTransaction.findMany({
            where: { companyId, type: 'profit_share' },
            orderBy: { date: 'desc' },
            include: { partner: { select: { name: true, share: true } } },
        });

        const batchMap = new Map<string, any>();
        for (const tx of profitTxs) {
            const batchMatch = tx.notes?.match(/@batch:(\S+)/);
            const key = batchMatch ? batchMatch[1] : `solo_${tx.id}`;
            if (!batchMap.has(key)) {
                batchMap.set(key, {
                    id: key,
                    date: tx.date,
                    period: tx.notes?.match(/@period:(\S+)/)?.[1] || 'custom',
                    notes: tx.notes?.replace(/@batch:\S+/g, '').replace(/@period:\S+/g, '').trim() || null,
                    totalAmount: 0,
                    lines: [],
                });
            }
            const batch = batchMap.get(key);
            batch.totalAmount += tx.amount;
            batch.lines.push({ partnerName: tx.partner.name, share: tx.partner.share, amount: tx.amount });
        }

        return NextResponse.json(Array.from(batchMap.values()));
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { totalAmount, period, date, notes, lines, treasuryId } = body;

        if (!totalAmount || !lines?.length) return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });

        const batchId = `dist_${Date.now()}`;
        const txDate = new Date(date || new Date());
        const batchNotes = `${notes ? notes + ' ' : ''}@batch:${batchId} @period:${period}`;
        const immediatePayment = !!treasuryId;

        // تحقق من الخزينة لو الصرف فوري
        let treasury = null;
        if (immediatePayment) {
            treasury = await prisma.treasury.findUnique({ where: { id: treasuryId, companyId } });
            if (!treasury) return NextResponse.json({ error: 'الخزينة غير موجودة' }, { status: 400 });
            if (treasury.balance < Number(totalAmount)) {
                return NextResponse.json({
                    error: `رصيد الخزينة غير كافٍ. المتاح: ${treasury.balance.toLocaleString()}`
                }, { status: 400 });
            }
        }

        const activeYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' }
        });

        await prisma.$transaction(async (tx) => {
            // سجّل معاملات الشركاء
            for (const l of lines as { partnerId: string; amount: number }[]) {
                await tx.partnerTransaction.create({
                    data: { type: 'profit_share', amount: l.amount, date: txDate, notes: batchNotes, partnerId: l.partnerId, companyId },
                });
                // أرصدة الشركاء: تزيد فقط لو التوزيع مؤجل؛ الصرف الفوري لا يغيّر الرصيد الدفتري
                if (!immediatePayment) {
                    await tx.partner.update({
                        where: { id: l.partnerId, companyId },
                        data: { balance: { increment: l.amount } },
                    });
                }
            }

            // خصم الخزينة لو صرف فوري
            if (immediatePayment && treasury) {
                await tx.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: { decrement: Number(totalAmount) } },
                });
            }

            // القيد المحاسبي
            if (activeYear) {
                const plAccount = await tx.account.findFirst({
                    where: { companyId, OR: [
                        { code: '3500' },
                        { type: 'equity', name: { contains: 'أرباح وخسائر' } },
                        { type: 'equity', name: { contains: 'الأرباح المحتجزة' } },
                        { type: 'equity', name: { contains: 'أرباح العام' } },
                    ]}
                });

                const lastEntry = await tx.journalEntry.findFirst({
                    where: { companyId, financialYearId: activeYear.id },
                    orderBy: { entryNumber: 'desc' }
                });

                if (plAccount) {
                    let creditAccountId: string | null = null;

                    if (immediatePayment && treasury?.accountId) {
                        creditAccountId = treasury.accountId;
                    } else {
                        // حساب الشركاء من شجرة الحسابات
                        const partnersAccount = await tx.account.findFirst({
                            where: { companyId, type: 'equity', accountCategory: 'detail',
                                OR: [{ name: { contains: 'شركاء' } }, { name: { contains: 'حسابات الشركاء' } }]
                            }
                        });
                        creditAccountId = partnersAccount?.id || null;
                    }

                    if (creditAccountId) {
                        // بناء وصف تفصيلي لحصة كل شريك
                        const partnerIds = (lines as { partnerId: string; amount: number }[]).map(l => l.partnerId);
                        const partnerNames = await tx.partner.findMany({
                            where: { id: { in: partnerIds }, companyId },
                            select: { id: true, name: true },
                        });
                        const nameMap = Object.fromEntries(partnerNames.map(p => [p.id, p.name]));
                        const detailStr = (lines as { partnerId: string; amount: number }[])
                            .map(l => `${nameMap[l.partnerId] || l.partnerId}: ${Number(l.amount).toLocaleString('en-US')}`)
                            .join(' | ');

                        const entryDescription = `توزيع أرباح ${period}${immediatePayment ? ' (صرف فوري)' : ''} — ${notes || ''} [${detailStr}]`;
                        const lineDescription = immediatePayment
                            ? `صرف أرباح نقداً — ${detailStr}`
                            : `حصص الشركاء — ${detailStr}`;

                        await tx.journalEntry.create({
                            data: {
                                entryNumber: (lastEntry?.entryNumber || 0) + 1,
                                date: txDate,
                                description: entryDescription,
                                referenceType: 'profit_distribution',
                                referenceId: batchId,
                                financialYearId: activeYear.id,
                                companyId,
                                isPosted: true,
                                lines: {
                                    create: [
                                        { accountId: plAccount.id, debit: Number(totalAmount), credit: 0, description: `توزيع أرباح — ${detailStr}` },
                                        { accountId: creditAccountId, debit: 0, credit: Number(totalAmount), description: lineDescription },
                                    ]
                                }
                            }
                        });
                    }
                }
            }
        });

        return NextResponse.json({ success: true, batchId }, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: 'فشل توزيع الأرباح' }, { status: 500 });
    }
});
