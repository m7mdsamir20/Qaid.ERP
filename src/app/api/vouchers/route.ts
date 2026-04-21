import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const type = request.nextUrl.searchParams.get('type');

        const activeBranchId = (session.user as any).activeBranchId;
        const whereClause: any = { companyId };
        if (type) whereClause.type = type;
        if (activeBranchId && activeBranchId !== 'all') whereClause.branchId = activeBranchId;

        const vouchers = await prisma.voucher.findMany({
            where: whereClause,
            include: {
                customer: true,
                supplier: true,
                treasury: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(vouchers);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { type, amount, description, customerId, supplierId, treasuryId, date } = body;

        if (!type || !amount || !treasuryId || (!customerId && !supplierId)) {
            return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
        }

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear) {
            return NextResponse.json({ error: "لا توجد سنة مالية مفتوحة" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const lastVoucher = await tx.voucher.findFirst({
                where: { companyId, type, voucherNumber: { lt: 1000000 } },
                orderBy: { voucherNumber: 'desc' },
            });
            const voucherNumber = (lastVoucher?.voucherNumber || 0) + 1;

            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const voucher = await (tx as any).voucher.create({
                data: {
                    voucherNumber,
                    type,
                    date: date ? new Date(date) : new Date(),
                    amount: parseFloat(amount),
                    description,
                    customerId: customerId || null,
                    supplierId: supplierId || null,
                    treasuryId,
                    financialYearId: financialYear.id,
                    companyId,
                    branchId: body.branchId || (session.user as any).activeBranchId || null,
                },
                include: { customer: true, supplier: true, treasury: true }
            });

            // تحديث رصيد الخزينة والطرف الآخر (المورد/العميل)
            if (type === 'receipt') {
                // سند قبض: زيادة رصيد الخزينة
                await tx.treasury.update({
                    where: { id: treasuryId, companyId },
                    data: { balance: { increment: parseFloat(amount) } },
                });

                if (customerId) {
                    // قبض من عميل: ينقص مديونيتة (الموجبة)
                    await tx.customer.update({
                        where: { id: customerId, companyId },
                        data: { balance: { decrement: parseFloat(amount) } },
                    });
                    // توزيع الدفعة على فواتير البيع من الأقدم للأحدث
                    const unpaidSaleInvoices = await tx.invoice.findMany({
                        where: { companyId, customerId, type: 'sale', remaining: { gt: 0.001 } },
                        orderBy: { date: 'asc' },
                        select: { id: true, remaining: true },
                    });
                    let leftToSettle = parseFloat(amount);
                    for (const inv of unpaidSaleInvoices) {
                        if (leftToSettle <= 0) break;
                        const toApply = Math.min(leftToSettle, inv.remaining);
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { paidAmount: { increment: toApply }, remaining: { decrement: toApply } },
                        });
                        leftToSettle -= toApply;
                    }
                } else if (supplierId) {
                    // قبض من مورد (إيداع أو مرتجع مالي): ينقص مديونيتنا له (الموجب يقل)
                    await tx.supplier.update({
                        where: { id: supplierId, companyId },
                        data: { balance: { decrement: parseFloat(amount) } },
                    });
                }
            } else if (type === 'payment') {
                // سند صرف: تأكد من وجود رصيد أولاً
                const treasury = await tx.treasury.findUnique({ where: { id: treasuryId, companyId } });
                if (!treasury || treasury.balance < amount) {
                    throw new Error("رصيد الخزينة/البنك غير كافٍ لإتمام العملية");
                }

                // نقص رصيد الخزينة
                await tx.treasury.update({
                    where: { id: treasuryId },
                    data: { balance: { decrement: parseFloat(amount) } },
                });

                if (supplierId) {
                    // صرف لمورد: نقص حقه عندنا (الموجب)
                    await tx.supplier.update({
                        where: { id: supplierId, companyId },
                        data: { balance: { decrement: parseFloat(amount) } },
                    });
                    // توزيع الدفعة على فواتير الشراء من الأقدم للأحدث
                    const unpaidPurchaseInvoices = await tx.invoice.findMany({
                        where: { companyId, supplierId, type: 'purchase', remaining: { gt: 0.001 } },
                        orderBy: { date: 'asc' },
                        select: { id: true, remaining: true },
                    });
                    let leftToSettle = parseFloat(amount);
                    for (const inv of unpaidPurchaseInvoices) {
                        if (leftToSettle <= 0) break;
                        const toApply = Math.min(leftToSettle, inv.remaining);
                        await tx.invoice.update({
                            where: { id: inv.id },
                            data: { paidAmount: { increment: toApply }, remaining: { decrement: toApply } },
                        });
                        leftToSettle -= toApply;
                    }
                } else if (customerId) {
                    // صرف لعميل (رد رصيد أو دفعة إضافية): يزيد مديونيته (الموجبة)
                    await tx.customer.update({
                        where: { id: customerId, companyId },
                        data: { balance: { increment: parseFloat(amount) } },
                    });
                }
            }

            // القيود اليومية الآلية
            const treasury = await tx.treasury.findUnique({
                where: { id: treasuryId, companyId },
                select: { accountId: true },
            });

            if (treasury?.accountId) {
                let targetAccountId: string | null = null;
                let partyName = (voucher as any).customer?.name || (voucher as any).supplier?.name || '';

                if (customerId) {
                    const acc = await tx.account.findFirst({
                        where: {
                            companyId, type: 'asset', accountCategory: 'detail',
                            OR: [{ name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }, { name: { contains: 'مدينون' } }],
                        },
                    });
                    targetAccountId = acc?.id || null;
                } else if (supplierId) {
                    const acc = await tx.account.findFirst({
                        where: {
                            companyId, type: 'liability', accountCategory: 'detail',
                            OR: [{ name: { contains: 'موردين' } }, { name: { contains: 'دائنون' } }, { name: { contains: 'ذمم دائنة' } }],
                        },
                    });
                    targetAccountId = acc?.id || null;
                }

                if (targetAccountId) {
                    if (type === 'receipt') {
                        await tx.journalEntry.create({
                            data: {
                                entryNumber, date: new Date(),
                                description: `سند قبض رقم RCP-${String(voucherNumber).padStart(5, '0')}`,
                                reference: `RCP-${String(voucherNumber).padStart(5, '0')}`,
                                referenceType: 'receipt', referenceId: voucher.id,
                                financialYearId: financialYear.id, companyId, isPosted: true,
                                lines: {
                                    create: [
                                        { accountId: treasury.accountId, debit: parseFloat(amount), credit: 0, description: `قبض من ${partyName}` },
                                        { accountId: targetAccountId, debit: 0, credit: parseFloat(amount), description: `سداد سند قبض رقم RCP-${String(voucherNumber).padStart(5, '0')}` },
                                    ],
                                },
                            },
                        });
                    } else if (type === 'payment') {
                        await tx.journalEntry.create({
                            data: {
                                entryNumber, date: new Date(),
                                description: `سند صرف رقم PMT-${String(voucherNumber).padStart(5, '0')}`,
                                reference: `PMT-${String(voucherNumber).padStart(5, '0')}`,
                                referenceType: 'payment', referenceId: voucher.id,
                                financialYearId: financialYear.id, companyId, isPosted: true,
                                lines: {
                                    create: [
                                        { accountId: targetAccountId, debit: parseFloat(amount), credit: 0, description: `سداد لـ ${partyName}` },
                                        { accountId: treasury.accountId, debit: 0, credit: parseFloat(amount), description: `سند صرف رقم PMT-${String(voucherNumber).padStart(5, '0')}` },
                                    ],
                                },
                            },
                        });
                    }
                }
            }

            return voucher;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Voucher error:', error);
        return NextResponse.json({ error: error.message || 'فشل في إنشاء السند' }, { status: 500 });
    }
});
