import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const partnerId = request.nextUrl.searchParams.get('partnerId');

        const txs = await prisma.partnerTransaction.findMany({
            where: {
                companyId,
                ...(partnerId ? { partnerId } : {})
            },
            include: { partner: true },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(txs);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { partnerId, type, amount, date, notes, treasuryId } = body;

        if (!partnerId || !type || !amount || !date) {
            return NextResponse.json({ error: "بيانات الحركة ناقصة" }, { status: 400 });
        }

        const activeYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' }
        });

        if (!activeYear) return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة" }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            const pTx = await tx.partnerTransaction.create({
                data: {
                    type,
                    amount: Number(amount),
                    date: new Date(date),
                    notes,
                    partnerId,
                    companyId
                }
            });

            if (type === 'capital_increase' || type === 'capital_decrease') {
                const capitalAdj = type === 'capital_increase' ? Number(amount) : -Number(amount);
                await tx.partner.update({
                    where: { id: partnerId, companyId },
                    data: { capital: { increment: capitalAdj } }
                });

                const allPartners = await tx.partner.findMany({ where: { companyId } });
                const totalCapital = allPartners.reduce((acc, p) => acc + (p.capital || 0), 0);

                if (totalCapital > 0) {
                    for (const p of allPartners) {
                        const newShare = (p.capital / totalCapital) * 100;
                        await tx.partner.update({
                            where: { id: p.id },
                            data: { share: Number(newShare.toFixed(4)) }
                        });
                    }
                }
            } else {
                let balanceAdjustment = 0;
                if (type === 'deposit' || type === 'profit_share') balanceAdjustment = Number(amount);
                else if (type === 'withdrawal') balanceAdjustment = -Number(amount);

                await tx.partner.update({
                    where: { id: partnerId, companyId },
                    data: { balance: { increment: balanceAdjustment } }
                });
            }

            // قيد خاص بـ profit_share (بدون خزينة)
            if (type === 'profit_share') {
                const plAccount = await tx.account.findFirst({
                    where: { companyId, OR: [
                        { code: '3500' },
                        { type: 'equity', name: { contains: 'أرباح وخسائر' } },
                        { type: 'equity', name: { contains: 'أرباح العام' } },
                    ]}
                });
                const partnersAccount = await tx.account.findFirst({
                    where: { companyId, type: 'equity', accountCategory: 'detail', OR: [
                        { name: { contains: 'شركاء' } },
                        { name: { contains: 'حسابات الشركاء' } },
                    ]}
                });

                if (plAccount && partnersAccount) {
                    const lastJE = await tx.journalEntry.findFirst({
                        where: { companyId, financialYearId: activeYear.id },
                        orderBy: { entryNumber: 'desc' }
                    });
                    await tx.journalEntry.create({
                        data: {
                            entryNumber: (lastJE?.entryNumber || 0) + 1,
                            date: new Date(date),
                            description: `حصة أرباح شريك — ${notes || ''}`,
                            reference: `PT-${pTx.id.slice(-6)}`,
                            referenceType: 'partner_transaction',
                            referenceId: pTx.id,
                            financialYearId: activeYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    { accountId: plAccount.id, debit: Number(amount), credit: 0, description: 'توزيع أرباح شريك' },
                                    { accountId: partnersAccount.id, debit: 0, credit: Number(amount), description: 'حصة الشريك' },
                                ]
                            }
                        }
                    });
                }
            }

            const cashTypes = ['deposit', 'withdrawal', 'capital_increase', 'capital_decrease'];
            if (cashTypes.includes(type)) {
                if (!treasuryId) throw new Error("يجب تحديد الخزينة لهذه الحركة");

                const treasuryInfo = await tx.treasury.findUnique({
                    where: { id: treasuryId, companyId },
                    select: { accountId: true }
                });
                const drAcc = treasuryInfo?.accountId
                    ? await tx.account.findUnique({ where: { id: treasuryInfo.accountId } })
                    : null;
                const crAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'equity', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'شركاء' } },
                            { name: { contains: 'رأس المال' } },
                        ]
                    }
                });

                if (!drAcc || !crAcc) {
                    throw new Error("دليل الحسابات ينقصه تصنيفات الأصول/حقوق الملكية");
                }

                const isIncoming = type === 'deposit' || type === 'capital_increase';
                if (isIncoming) {
                    await tx.treasury.update({
                        where: { id: treasuryId },
                        data: { balance: { increment: Number(amount) } }
                    });
                } else {
                    const treasury = await tx.treasury.findUnique({ where: { id: treasuryId } });
                    if (!treasury || treasury.balance < Number(amount)) {
                        throw new Error("رصيد الخزينة/البنك غير كافٍ لإتمام العملية");
                    }
                    await tx.treasury.update({
                        where: { id: treasuryId },
                        data: { balance: { decrement: Number(amount) } }
                    });
                }

                const lastVoucher = await tx.voucher.findFirst({
                    where: { companyId },
                    orderBy: { voucherNumber: 'desc' },
                });
                await tx.voucher.create({
                    data: {
                        voucherNumber: (lastVoucher?.voucherNumber || 0) + 1,
                        type: isIncoming ? 'receipt' : 'payment',
                        date: new Date(date),
                        amount: Number(amount),
                        description: `حركة شريك (${type}) - ${notes || ''}`,
                        treasuryId: treasuryId,
                        financialYearId: activeYear.id,
                        companyId,
                    }
                });

                const lastJE = await tx.journalEntry.findFirst({
                    where: { companyId, financialYearId: activeYear.id },
                    orderBy: { entryNumber: 'desc' },
                });
                await tx.journalEntry.create({
                    data: {
                        entryNumber: (lastJE?.entryNumber || 0) + 1,
                        date: new Date(date),
                        description: `حركة شريك (${type}) - ${notes || ''}`,
                        reference: `PT-${pTx.id.slice(-6)}`,
                        referenceType: "partner_transaction",
                        referenceId: pTx.id,
                        financialYearId: activeYear.id,
                        companyId,
                        isPosted: true,
                        lines: {
                            create: isIncoming ? [
                                { accountId: drAcc.id, debit: Number(amount), credit: 0, description: "إيداع من شريك" },
                                { accountId: crAcc.id, debit: 0, credit: Number(amount), description: type.includes('capital') ? "زيادة رأس المال" : "جاري الشريك" }
                            ] : [
                                { accountId: crAcc.id, debit: Number(amount), credit: 0, description: type.includes('capital') ? "تخفيض رأس المال" : "مسحوبات جاري الشريك" },
                                { accountId: drAcc.id, debit: 0, credit: Number(amount), description: "سحب شريك من الخزينة" }
                            ]
                        }
                    }
                });
            }

            return pTx;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "حدث خطأ أثناء تنفيذ الحركة" }, { status: 500 });
    }
});
