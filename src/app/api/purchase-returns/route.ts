import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (id) {
            const invoice = await prisma.invoice.findUnique({
                where: { id, companyId },
                include: { supplier: true, customer: true, lines: { include: { item: { include: { unit: true } } } } },
            });

            if (invoice) {
                const party = invoice.supplier || invoice.customer;
                if (party && (party as any).accountId) {
                    const partyAccId = (party as any).accountId;
                    const finYear = await prisma.financialYear.findFirst({
                        where: { companyId, startDate: { lte: invoice.date }, endDate: { gte: invoice.date } }
                    });
                    let balance = 0;
                    if (finYear) {
                        const lines = await prisma.journalEntryLine.findMany({
                            where: {
                                accountId: partyAccId,
                                OR: [
                                    { customerId: invoice.customerId || undefined },
                                    { supplierId: invoice.supplierId || undefined }
                                ],
                                journalEntry: { companyId, createdAt: { lt: invoice.createdAt } }
                            } as any,
                            select: { debit: true, credit: true }
                        });
                        lines.forEach(l => { balance += (Number(l.debit) - Number(l.credit)); });
                    }
                    
                    const isSupplier = !!invoice.supplierId;
                    if (isSupplier) (invoice as any).partyBalanceAtTime = -balance; 
                    else (invoice as any).partyBalanceAtTime = balance;
                }
            }
            return NextResponse.json(invoice);
        }

        const invoices = await prisma.invoice.findMany({
            where: { companyId, type: 'purchase_return' },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                supplier: true,
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
        const { supplierId, customerId, warehouseId, lines, originalInvoiceId, refundMethod, paidAmount, notes, treasuryId, bankId, totalDiscount, netTotal } = body;

        const effectiveTreasuryId = treasuryId || bankId;

        const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.price), 0);
        const discount = totalDiscount || 0;
        const taxAmount = body.taxEnabled && !body.taxInclusive ? (body.taxAmount || 0) : 0;
        const total = netTotal ?? (subtotal - discount + taxAmount);
        const remaining = total - (paidAmount || 0);

        const financialYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });

        const paymentMethod = treasuryId ? 'cash' : (bankId ? 'bank' : 'credit');

        const result = await prisma.$transaction(async (tx) => {
            const lastInvoice = await tx.invoice.findFirst({
                where: { type: 'purchase_return', companyId },
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
                type: 'purchase_return',
                date: new Date(),
                supplierId: supplierId || null,
                customerId: customerId || null,
                ...(originalInvoiceId ? { originalInvoiceId } : {}),
                subtotal,
                discount,
                taxEnabled: body.taxEnabled ?? false,
                taxRate: body.taxRate ?? 0,
                taxAmount: body.taxAmount ?? 0,
                taxInclusive: body.taxInclusive ?? false,
                taxLabel: body.taxLabel ?? null,
                total: subtotal - discount,
                paidAmount: paidAmount || 0,
                remaining,
                paymentMethod,
                notes: notes || null,
                warehouseId: warehouseId || null,
                companyId,
                lines: {
                    create: lines.map((l: any) => ({
                        itemId: l.itemId,
                        quantity: l.quantity,
                        price: l.price,
                        discount: l.discount || 0,
                        total: (l.quantity * l.price) - (l.discount || 0),
                    })),
                },
            };

            const invoice = await tx.invoice.create({
                data: invoiceData,
                include: { lines: { include: { item: { include: { unit: true } } } }, supplier: true },
            });

            if (warehouseId) {
                for (const line of lines) {
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                        update: { quantity: { decrement: line.quantity } },
                        create: { itemId: line.itemId, warehouseId, quantity: -line.quantity },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: 'return_out',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId,
                            quantity: line.quantity,
                            reference: `PRET-${invoiceNumber}`,
                            notes: `مرتجع مشتريات رقم ${invoiceNumber}`,
                            invoiceId: invoice.id,
                            companyId,
                        } as any,
                    });
                }
            }

            const movingAmount = total - (paidAmount || 0); // Amount to adjust on balance
            if (movingAmount > 0) {
                if (supplierId) {
                    await tx.supplier.update({ 
                        where: { id: supplierId, companyId }, 
                        data: { balance: { decrement: movingAmount } } 
                    });
                } else if (customerId) {
                    await tx.customer.update({ 
                        where: { id: customerId, companyId }, 
                        data: { balance: { increment: movingAmount } } 
                    });
                }
            }

            if ((refundMethod === 'cash' || refundMethod === 'bank') && (paidAmount || 0) > 0) {
                if (effectiveTreasuryId) {
                    await tx.treasury.update({
                        where: { id: effectiveTreasuryId, companyId },
                        data: { balance: { increment: paidAmount } }
                    });
                }
            }

            if (financialYear) {
                const partnerAcc = supplierId ? await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '2111' },
                            { type: 'liability', name: { contains: 'موردين'    } },
                            { type: 'liability', name: { contains: 'دائنون'    } },
                            { type: 'liability', name: { contains: 'ذمم دائنة' } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                }) : await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1121' },
                            { type: 'asset', name: { contains: 'عملاء'     } },
                            { type: 'asset', name: { contains: 'مدينون'    } },
                            { type: 'asset', name: { contains: 'ذمم مدينة' } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                });

                const inventoryAcc = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1131' },
                            { type: 'asset', name: { contains: 'مخزون'   } },
                            { type: 'asset', name: { contains: 'بضاعة'   } },
                            { type: 'asset', name: { contains: 'بضائع'   } },
                            { type: 'asset', name: { contains: 'مشتريات' } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                });

                let treasuryAccountId: string | null = null;
                if (effectiveTreasuryId) {
                    const treas = await tx.treasury.findUnique({
                        where: { id: effectiveTreasuryId, companyId },
                        select: { accountId: true },
                    });
                    treasuryAccountId = treas?.accountId || null;
                }

                if (partnerAcc && inventoryAcc) {
                    const netTotal = total - (taxAmount || 0);

                    const journalLines: any[] = [
                        {
                            accountId: partnerAcc.id,
                            debit: supplierId ? total : 0,
                            credit: customerId ? total : 0,
                            description: `تخفيض مستحقات — مرتجع ${invoiceNumber}`,
                        },
                        {
                            accountId: inventoryAcc.id,
                            debit: 0,
                            credit: netTotal,
                            description: `مرتجع مشتريات رقم ${invoiceNumber} (صافي)`,
                        },
                    ];

                    const taxAmtVal = Number(body.taxAmount || 0);
                    if (taxAmtVal > 0 && body.taxEnabled) {
                        const inputTaxAccount = await tx.account.findFirst({
                            where: {
                                companyId, accountCategory: 'detail',
                                OR: [
                                    { code: '1124' },
                                    { type: 'asset', name: { contains: 'ضريبة القيمة المضافة المدفوعة' } },
                                    { type: 'asset', name: { contains: 'ضريبة مدخلات' } },
                                    { type: 'asset', name: { contains: 'ضريبة' } },
                                    { type: 'asset', name: { contains: 'VAT' } },
                                ]
                            }
                        });

                        if (inputTaxAccount) {
                            journalLines.push({
                                accountId: inputTaxAccount.id,
                                debit: 0,
                                credit: taxAmtVal,
                                description: `عكس ضريبة مدخلات مرتجع مشتريات ${invoiceNumber}`,
                            });
                        }
                    }

                    if ((refundMethod === 'cash' || refundMethod === 'bank') && (paidAmount || 0) > 0 && treasuryAccountId) {
                        journalLines.push({
                            accountId: treasuryAccountId,
                            debit: paidAmount,
                            credit: 0,
                            description: `استلام نقدي — مرتجع مشتريات ${invoiceNumber}`,
                        });
                        journalLines[0][supplierId ? 'debit' : 'credit'] = total - (paidAmount || 0);
                    }

                    await tx.journalEntry.create({
                        data: {
                            entryNumber, date: new Date(),
                            description: `قيد مرتجع مشتريات رقم ${invoiceNumber}`,
                            reference: `PRET-${invoiceNumber}`,
                            referenceType: 'invoice',
                            referenceId: invoice.id,
                            financialYearId: financialYear.id,
                            companyId, isPosted: true,
                            lines: { create: journalLines },
                        },
                    });
                }
            }

            return invoice;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Purchase return error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء مرتجع المشتريات', details: error.message }, { status: 500 });
    }
});
