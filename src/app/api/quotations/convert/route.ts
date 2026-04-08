import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const branchId = (session.user as any).activeBranchId === 'all' ? null : (session.user as any).activeBranchId;
        const isServices = (session.user as any).businessType === 'SERVICES';
        const { quotationId } = body;

        // ① جيب عرض السعر بالأصناف
        // @ts-ignore
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId, companyId },
            include: { lines: true }
        });

        if (!quotation) return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
        if (quotation.status === 'converted') return NextResponse.json({ error: 'عرض السعر تم تحويله بالفعل' }, { status: 400 });

        // ② فحص المخزون قبل التحويل — للنشاط التجاري فقط
        if (!isServices && (quotation as any).warehouseId) {
            const itemIds = quotation.lines.map((l: any) => l.itemId).filter(Boolean);
            if (itemIds.length > 0) {
                const [stocks, itemNames] = await Promise.all([
                    prisma.stock.findMany({
                        where: { itemId: { in: itemIds }, warehouseId: (quotation as any).warehouseId },
                        select: { itemId: true, quantity: true }
                    }),
                    prisma.item.findMany({
                        where: { id: { in: itemIds } },
                        select: { id: true, name: true }
                    })
                ]);
                const stockMap = Object.fromEntries(stocks.map(s => [s.itemId, s.quantity]));
                const nameMap  = Object.fromEntries(itemNames.map(i => [i.id, i.name]));
                for (const line of quotation.lines) {
                    if (!line.itemId) continue;
                    const available = stockMap[line.itemId] ?? 0;
                    if (available < Number(line.quantity)) {
                        return NextResponse.json({
                            error: `الكمية المتاحة غير كافية للصنف "${nameMap[line.itemId] || line.itemId}". المتاح: ${available}`
                        }, { status: 400 });
                    }
                }
            }
        }

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear)
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {
            // ③ رقم الفاتورة
            const lastInvoice = await tx.invoice.findFirst({
                where: { companyId, type: 'sale' },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            });
            const invoiceNumber = (lastInvoice?.invoiceNumber || 0) + 1;

            // ④ إنشاء الفاتورة
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    type: 'sale',
                    date: new Date(),
                    customerId: quotation.customerId,
                    subtotal: quotation.subtotal,
                    discount: quotation.discount,
                    taxEnabled: quotation.taxEnabled,
                    taxRate: quotation.taxRate,
                    taxAmount: quotation.taxAmount,
                    taxInclusive: quotation.taxInclusive,
                    taxLabel: quotation.taxLabel,
                    total: quotation.total,
                    paidAmount: 0,
                    remaining: quotation.total,
                    paymentMethod: 'credit',
                    notes: (quotation.notes || '') + `\n(تم التحويل من عرض سعر رقم: ${quotation.quotationNumber})`,
                    companyId,
                    branchId,
                    warehouseId: (quotation as any).warehouseId || null,
                    lines: {
                        create: quotation.lines.map((l: any) => ({
                            itemId:      l.itemId,
                            quantity:    l.quantity,
                            price:       l.price,
                            discount:    l.discount || 0,
                            total:       l.total,
                            taxRate:     l.taxRate || 0,
                            taxAmount:   l.taxAmount || 0,
                            description: l.description || null,
                            unit:        l.unit || null,
                            unitCost:    l.unitCost || 0,
                        }))
                    }
                },
                include: { lines: true }
            });

            // ⑤ تحديث المخزون — للنشاط التجاري فقط
            const warehouseId = (quotation as any).warehouseId;
            if (!isServices && warehouseId) {
                await Promise.all([
                    ...quotation.lines.map((line: any) => tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                        update: { quantity: { decrement: line.quantity } },
                        create: { itemId: line.itemId, warehouseId, quantity: -line.quantity },
                    })),
                    ...quotation.lines.map((line: any) => tx.stockMovement.create({
                        data: {
                            type:      'out',
                            date:      new Date(),
                            itemId:    line.itemId,
                            warehouseId,
                            quantity:  -line.quantity,
                            reference: `SAL-${invoiceNumber}`,
                            notes:     `فاتورة محولة من عرض سعر رقم ${quotation.quotationNumber}`,
                            companyId,
                            invoiceId: invoice.id,
                        },
                    })),
                ]);
            }

            // ⑥ تحديث رصيد العميل
            if (quotation.customerId) {
                await tx.customer.update({
                    where: { id: quotation.customerId, companyId },
                    data:  { balance: { increment: quotation.total } },
                });
            }

            // ⑦ القيد المحاسبي
            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const [salesAcc, receivablesAcc, taxAcc] = await Promise.all([
                tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: isServices ? [
                            { code: '4200' },
                            { type: 'revenue', name: { contains: 'إيرادات الخدمات' } },
                            { type: 'revenue', name: { contains: 'خدمات' } },
                        ] : [
                            { code: '4100' },
                            { type: 'revenue', name: { contains: 'إيرادات المبيعات' } },
                            { type: 'revenue', name: { contains: 'مبيعات' } },
                        ],
                    },
                }),
                tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1121' },
                            { type: 'asset', name: { contains: 'ذمم'   } },
                            { type: 'asset', name: { contains: 'عملاء' } },
                        ],
                    },
                }),
                tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '2114' },
                            { type: 'liability', name: { contains: 'ضريبة القيمة المضافة المحصلة' } },
                            { type: 'liability', name: { contains: 'VAT' } },
                        ],
                    },
                }),
            ]);

            if (salesAcc && receivablesAcc) {
                const taxAmount  = Number(quotation.taxAmount) || 0;
                const netRevenue = quotation.total - taxAmount;

                const journalLines: any[] = [
                    {
                        accountId:   receivablesAcc.id,
                        debit:       quotation.total,
                        credit:      0,
                        description: `ذمم عميل — فاتورة محولة ${invoiceNumber}`,
                    },
                    {
                        accountId:   salesAcc.id,
                        debit:       0,
                        credit:      netRevenue,
                        description: `فاتورة محولة من عرض سعر رقم ${quotation.quotationNumber}`,
                    },
                ];

                if (taxAmount > 0 && taxAcc) {
                    journalLines.push({
                        accountId:   taxAcc.id,
                        debit:       0,
                        credit:      taxAmount,
                        description: `ضريبة القيمة المضافة — فاتورة ${invoiceNumber}`,
                    });
                }

                // قيد التكلفة — للنشاط التجاري فقط
                if (!isServices) {
                    const [inventoryAcc, cogsAcc] = await Promise.all([
                        tx.account.findFirst({
                            where: {
                                companyId, accountCategory: 'detail',
                                OR: [
                                    { code: '1131' },
                                    { type: 'asset', name: { contains: 'مخزون' } },
                                    { type: 'asset', name: { contains: 'بضاعة' } },
                                ],
                            },
                        }),
                        tx.account.findFirst({
                            where: {
                                companyId, accountCategory: 'detail',
                                OR: [
                                    { code: '5100' },
                                    { type: 'expense', name: { contains: 'تكلفة' } },
                                    { type: 'expense', name: { contains: 'البضاعة المباعة' } },
                                ],
                            },
                        }),
                    ]);

                    if (inventoryAcc && cogsAcc) {
                        let totalCost = 0;
                        for (const line of quotation.lines) {
                            if (!line.itemId) continue;
                            const item = await tx.item.findUnique({
                                where:  { id: line.itemId },
                                select: { averageCost: true },
                            });
                            totalCost += (item?.averageCost || 0) * Number(line.quantity);
                        }
                        if (totalCost > 0) {
                            journalLines.push({
                                accountId:   cogsAcc.id,
                                debit:       totalCost,
                                credit:      0,
                                description: `تكلفة بضاعة مباعة — فاتورة ${invoiceNumber}`,
                            });
                            journalLines.push({
                                accountId:   inventoryAcc.id,
                                debit:       0,
                                credit:      totalCost,
                                description: `تكلفة بضاعة مباعة — فاتورة ${invoiceNumber}`,
                            });
                        }
                    }
                }

                await tx.journalEntry.create({
                    data: {
                        entryNumber,
                        date:            new Date(),
                        description:     `قيد فاتورة محولة من عرض سعر رقم ${quotation.quotationNumber}`,
                        reference:       `SAL-${invoiceNumber}`,
                        referenceType:   'invoice',
                        referenceId:     invoice.id,
                        financialYearId: financialYear.id,
                        companyId,
                        isPosted:        true,
                        lines:           { create: journalLines },
                    },
                });
            }

            // ⑧ تحديث حالة عرض السعر
            // @ts-ignore
            await tx.quotation.update({
                where: { id: quotationId },
                data:  { status: 'converted', convertedInvoiceId: invoice.id }
            });

            return invoice;
        });

        return NextResponse.json({ success: true, invoiceId: result.id });
    } catch (error) {
        console.error("Quotation Convert Error:", error);
        return NextResponse.json({ error: 'فشل تحويل عرض السعر إلى فاتورة' }, { status: 500 });
    }
});
