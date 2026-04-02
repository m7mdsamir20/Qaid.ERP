import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const invoices = await prisma.invoice.findMany({
            where: { companyId, type: 'sale_return' },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                lines: { include: { item: { include: { unit: true } } } },
            },
        });
        return NextResponse.json({ returns: invoices });
    } catch {
        return NextResponse.json({ returns: [] }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { customerId, warehouseId, originalInvoiceId, lines, discount, paidAmount, notes, treasuryId, bankId } = body;

        const effectiveTreasuryId = treasuryId || bankId;

        const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.price - (l.discount || 0)), 0);
        const taxAmount = body.taxEnabled && !body.taxInclusive ? (body.taxAmount || 0) : 0;
        const total = (subtotal - (discount || 0)) + taxAmount;
        const remaining = total - (paidAmount || 0);

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        const paymentMethod = treasuryId ? 'cash' : (bankId ? 'bank' : 'credit');

        const result = await prisma.$transaction(async (tx) => {
            const lastInvoice = await tx.invoice.findFirst({
                where: { type: 'sale_return', companyId },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true },
            });
            const invoiceNumber = (lastInvoice?.invoiceNumber || 0) + 1;

            const lastEntry = financialYear ? await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            }) : null;
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const invoiceData: any = {
                invoiceNumber,
                type: 'sale_return',
                date: new Date(),
                customerId,
                originalInvoiceId,
                subtotal,
                discount: discount || 0,
                taxEnabled: body.taxEnabled ?? false,
                taxRate: body.taxRate ?? 0,
                taxAmount: body.taxAmount ?? 0,
                taxInclusive: body.taxInclusive ?? false,
                taxLabel: body.taxLabel ?? null,
                total: subtotal - (discount || 0),
                paidAmount: paidAmount || 0,
                remaining,
                paymentMethod,
                notes: notes || null,
                warehouseId: warehouseId || null,
                companyId,
                lines: {
                    create: lines.map((line: any) => ({
                        itemId: line.itemId,
                        quantity: line.quantity,
                        price: line.price,
                        discount: line.discount || 0,
                        total: (line.quantity * line.price) - (line.discount || 0),
                    })),
                },
            };

            const invoice = await tx.invoice.create({
                data: invoiceData,
                include: { lines: true, customer: true },
            });

            if (warehouseId) {
                for (const line of lines) {
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                        update: { quantity: { increment: line.quantity } },
                        create: { itemId: line.itemId, warehouseId, quantity: line.quantity },
                    });

                    await tx.stockMovement.create({
                        data: {
                            type: 'return_in',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId: warehouseId,
                            quantity: line.quantity,
                            reference: `SRET-${invoiceNumber}`,
                            notes: `مرتجع مبيعات رقم ${invoiceNumber}`,
                            companyId,
                            invoiceId: invoice.id
                        } as any
                    });
                }
            }

            await tx.customer.update({
                where: { id: customerId },
                data: { balance: { decrement: remaining } },
            });

            if (financialYear) {
                const salesAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '4100' },
                            { type: 'revenue', name: { contains: 'مبيعات' } },
                            { type: 'revenue', name: { contains: 'إيرادات المبيعات' } },
                        ],
                    },
                });

                const receivablesAcc = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1121' },
                            { type: 'asset', name: { contains: 'ذمم' } },
                            { type: 'asset', name: { contains: 'عملاء' } },
                        ],
                    },
                });

                if (salesAccount && receivablesAcc) {
                    const taxAmtVal = Number(body.taxAmount || 0);
                    const netTotal = total - taxAmtVal;
                    const paidAmt = Number(paidAmount || 0);
                    const remainingAmt = total - paidAmt;

                    // بناء القيد بشكل متوازن دائماً:
                    // مدين: حساب المبيعات (netTotal) + ضريبة (taxAmtVal إن وجدت) = total
                    // دائن: ذمم عملاء (remainingAmt) + خزينة (paidAmt إن وجد) = total
                    const journalLines: any[] = [
                        {
                            accountId: salesAccount.id,
                            debit: netTotal,
                            credit: 0,
                            description: `مرتجع مبيعات رقم ${invoiceNumber} (صافي)`,
                        },
                        {
                            accountId: receivablesAcc.id,
                            debit: 0,
                            credit: remainingAmt,
                            description: `تخفيض مديونية ${(invoice as any).customer?.name || ''}`,
                        },
                    ];

                    // عكس الضريبة
                    if (taxAmtVal > 0 && body.taxEnabled) {
                        const taxAccountResult = await tx.account.findFirst({
                            where: {
                                companyId, accountCategory: 'detail',
                                OR: [
                                    { code: '2114' },
                                    { type: 'liability', name: { contains: 'ضريبة القيمة المضافة المحصلة' } },
                                    { type: 'liability', name: { contains: 'ضريبة' } },
                                    { type: 'liability', name: { contains: 'VAT' } },
                                ]
                            }
                        });

                        if (taxAccountResult) {
                            journalLines.push({
                                accountId: taxAccountResult.id,
                                debit: taxAmtVal,
                                credit: 0,
                                description: `عكس ضريبة القيمة المضافة - مرتجع مبيعات ${invoiceNumber}`,
                            });
                        } else {
                            // لم يوجد حساب الضريبة — أضف الضريبة على المبيعات للحفاظ على التوازن
                            journalLines[0].debit = total;
                        }
                    }

                    // سطر الخزينة لو في استرداد نقدي
                    if (paidAmt > 0 && effectiveTreasuryId) {
                        const treas = await tx.treasury.findUnique({
                            where: { id: effectiveTreasuryId, companyId },
                            select: { accountId: true },
                        });
                        if (treas?.accountId) {
                            journalLines.push({
                                accountId: treas.accountId,
                                debit: 0,
                                credit: paidAmt,
                                description: `استرداد نقدي - مرتجع مبيعات ${invoiceNumber}`,
                            });
                        }
                    }

                    const inventoryAcc = await tx.account.findFirst({
                        where: {
                            companyId, accountCategory: 'detail',
                            OR: [
                                { code: '1131' },
                                { type: 'asset', name: { contains: 'مخزون' } },
                                { type: 'asset', name: { contains: 'بضاعة' } },
                            ],
                        },
                    });

                    const cogsAcc = await tx.account.findFirst({
                        where: {
                            companyId, accountCategory: 'detail',
                            OR: [
                                { code: '5100' },
                                { type: 'expense', name: { contains: 'تكلفة' } },
                                { type: 'expense', name: { contains: 'البضاعة المباعة' } },
                            ],
                        },
                    });

                    if (inventoryAcc && cogsAcc) {
                        let totalCost = 0;
                        const originalInvoice = originalInvoiceId ? await tx.invoice.findUnique({
                            where: { id: originalInvoiceId },
                            include: { lines: true }
                        }) : null;

                        for (const line of lines) {
                            const originalLine = originalInvoice?.lines.find(ol => ol.itemId === line.itemId);
                            const costToUse = originalLine?.unitCost || 0;
                            
                            // If we can't find the original cost, fallback to current average cost
                            if (!costToUse) {
                                const item = await tx.item.findUnique({
                                    where: { id: line.itemId },
                                    select: { averageCost: true },
                                });
                                totalCost += (item?.averageCost || 0) * line.quantity;
                            } else {
                                totalCost += costToUse * line.quantity;
                            }
                        }

                        if (totalCost > 0) {
                            journalLines.push({
                                accountId: inventoryAcc.id,
                                debit: totalCost,
                                credit: 0,
                                description: `إعادة بضاعة مرتجعة`,
                            });
                            journalLines.push({
                                accountId: cogsAcc.id,
                                debit: 0,
                                credit: totalCost,
                                description: `عكس تكلفة مرتجع مبيعات`,
                            });
                        }
                    }

                    await tx.journalEntry.create({
                        data: {
                            entryNumber, date: new Date(),
                            description: `قيد مرتجع مبيعات رقم ${invoiceNumber}`,
                            reference: `SRET-${invoiceNumber}`,
                            referenceType: 'invoice',
                            referenceId: invoice.id,
                            financialYearId: financialYear.id,
                            companyId, isPosted: true,
                            lines: { create: journalLines },
                        },
                    });
                }
            }

            if (paidAmount > 0 && effectiveTreasuryId) {
                const treasury = await tx.treasury.findUnique({ where: { id: effectiveTreasuryId } });
                if (!treasury || treasury.balance < paidAmount) {
                    throw new Error("رصيد الخزينة/البنك غير كافٍ لرد المبلغ نقداً");
                }
                await tx.treasury.update({
                    where: { id: effectiveTreasuryId },
                    data: { balance: { decrement: paidAmount } },
                });
            }

            return invoice;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Sale return error:', error);
        return NextResponse.json({ error: error.message || 'فشل في إنشاء مرتجع المبيعات' }, { status: 500 });
    }
});
