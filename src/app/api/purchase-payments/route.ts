import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const vouchers = await prisma.voucher.findMany({
            where: { companyId, type: 'payment' },
            orderBy: { createdAt: 'desc' },
            include: { supplier: true, customer: true, treasury: true },
        });
        return NextResponse.json(vouchers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { supplierId, customerId, treasuryId, amount, paymentType, date, description } = body;

        if (!(supplierId || customerId) || !treasuryId || !amount) {
            return NextResponse.json({ error: 'المستفيد (المورد/العميل) والخزينة والمبلغ مطلوبون' }, { status: 400 });
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            return NextResponse.json({ error: 'المبلغ غير صالح' }, { status: 400 });
        }

        const financialYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
        if (!financialYear) {
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const lastVoucher = await tx.voucher.findFirst({
                where: { companyId, type: 'payment', voucherNumber: { lt: 1000000 } },
                orderBy: { voucherNumber: 'desc' },
            });
            const voucherNumber = (lastVoucher?.voucherNumber || 0) + 1;

            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const voucher = await tx.voucher.create({
                data: {
                    voucherNumber,
                    type: 'payment',
                    date: new Date(date || new Date()),
                    supplierId: supplierId || null,
                    customerId: customerId || null,
                    treasuryId,
                    amount: amountNum,
                    description: description || null,
                    companyId,
                    financialYearId: financialYear.id,
                },
                include: { supplier: true, customer: true, treasury: true },
            });

            if (supplierId) {
                await tx.supplier.update({
                    where: { id: supplierId, companyId },
                    data: { balance: { decrement: amountNum } },
                });
            } else if (customerId) {
                await tx.customer.update({
                    where: { id: customerId, companyId },
                    data: { balance: { increment: amountNum } },
                });
            }

            const treasury = await tx.treasury.findUnique({ where: { id: treasuryId, companyId } });
            if (!treasury || treasury.balance < amountNum) {
                throw new Error("رصيد الخزينة/البنك غير كافٍ لإتمام العملية");
            }

            await tx.treasury.update({
                where: { id: treasuryId },
                data: { balance: { decrement: amountNum } },
            });

            const partnerAcc = await tx.account.findFirst({
                where: {
                    companyId, accountCategory: 'detail',
                    AND: [
                        { OR: [{ nature: 'debit' }, { nature: 'credit' }] },
                        supplierId 
                          ? { OR: [{ name: { contains: 'موردين' } }, { name: { contains: 'دائنون' } }, { name: { contains: 'ذمم دائنة' } }] }
                          : { OR: [{ name: { contains: 'عملاء' } }, { name: { contains: 'مدينون' } }, { name: { contains: 'ذمم مدينة' } }] }
                    ]
                },
                orderBy: { code: 'asc' },
            });

            const treasuryAccountId = treasury.accountId;

            if (partnerAcc && treasuryAccountId) {
                const partnerName = supplierId ? (voucher.supplier?.name || 'مورد') : (voucher.customer?.name || 'عميل');
                await tx.journalEntry.create({
                    data: {
                        entryNumber,
                        date:           new Date(date || new Date()),
                        description:    `سند صرف رقم PMT-${String(voucherNumber).padStart(5,'0')} — ${description || 'دفعية للمورد'}`,
                        reference:      `PMT-${String(voucherNumber).padStart(5,'0')}`,
                        referenceType:  'voucher',
                        referenceId:    voucher.id,
                        financialYearId: financialYear.id,
                        companyId, isPosted: true,
                        lines: {
                            create: [
                                {
                                    accountId:   partnerAcc.id,
                                    debit:       amountNum,
                                    credit:      0,
                                    description: `سداد لجهة (${partnerName}) — PMT-${String(voucherNumber).padStart(5,'0')}`,
                                },
                                {
                                    accountId:   treasuryAccountId,
                                    debit:       0,
                                    credit:      amountNum,
                                    description: `صرف نقدي — PMT-${String(voucherNumber).padStart(5,'0')}`,
                                },
                            ],
                        },
                    },
                });
            }

            return voucher;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Purchase payment error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء سند الصرف', details: error.message }, { status: 500 });
    }
});
