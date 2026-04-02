import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        
        if (url.searchParams.get('justNextNum') === 'true') {
            const lastInvoice = await prisma.invoice.findFirst({
                where: { companyId, type: 'sale' },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            });
            return NextResponse.json({ nextNum: (lastInvoice?.invoiceNumber || 0) + 1 });
        }

        const id = url.searchParams.get('id');
        if (id) {
            const invoice = await prisma.invoice.findUnique({
                where: { id, companyId },
                include: {
                    customer: true,
                    supplier: true,
                    warehouse: true,
                    lines: { include: { item: { include: { unit: true } } } },
                }
            });
            return NextResponse.json(invoice);
        }

        const branchFilter = getBranchFilter(session);

        const [invoices, activeYear] = await Promise.all([
            prisma.invoice.findMany({
                where: {
                    companyId,
                    type: 'sale',
                    ...branchFilter,
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: true,
                    supplier: true,
                    lines: { include: { item: { include: { unit: true } } } },
                    returnInvoices: { include: { lines: true } },
                },
            }),
            prisma.financialYear.findFirst({
                where: { companyId, isOpen: true }
            })
        ]);

        const mappedInvoices = invoices.map(inv => {
            const linesWithReturned = inv.lines.map(line => {
                let alreadyReturned = 0;
                inv.returnInvoices.forEach(retInv => {
                    retInv.lines.forEach(retLine => {
                        if (retLine.itemId === line.itemId) {
                            alreadyReturned += retLine.quantity;
                        }
                    });
                });
                return { ...line, alreadyReturned };
            });
            return { ...inv, lines: linesWithReturned };
        });

        return NextResponse.json({ invoices: mappedInvoices, activeYear });
    } catch {
        return NextResponse.json({ invoices: [], activeYear: null }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const {
            date, customerId, supplierId, taxRate, taxInclusive, taxLabel,
            paidAmount, warehouseId, notes, attachments,
            financialYearId, dueDate, lines, discount, treasuryId, bankId, taxAmount 
        } = body;

        // Use bankId if treasuryId is missing
        const effectiveTreasuryId = treasuryId || bankId;

        const isServices = (session.user as any).businessType === 'SERVICES';

        // ① منع المخزون السالب — تحقق قبل إنشاء الفاتورة (فقط للتجاري)
        if (!isServices && warehouseId) {
            for (const line of lines) {
                const stock = await prisma.stock.findUnique({
                    where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } }
                });
                if (!stock || stock.quantity < Number(line.quantity)) {
                    const item = await prisma.item.findUnique({ where: { id: line.itemId }, select: { name: true } });
                    return NextResponse.json({
                        error: `الكمية المتاحة غير كافية للصنف "${item?.name || line.itemId}". المتاح: ${stock?.quantity ?? 0}`
                    }, { status: 400 });
                }
            }
        }

        // Calculate totals
        const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.price - (l.discount || 0)), 0);
        const afterDiscount = subtotal - (discount || 0);
        const total = afterDiscount + (taxAmount || 0); // taxAmount is 0 if inclusive or disabled
        const remaining = total - (paidAmount || 0);

        // Get the open financial year
        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear) {
            return NextResponse.json({ error: 'لا يمكن إصدار الفاتورة: السنة المالية الحالية مغلقة أو غير موجودة' }, { status: 400 });
        }

        const paymentMethod = treasuryId ? 'cash' : (bankId ? 'bank' : 'credit');

        // Execute everything in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // ① رقم الفاتورة داخل الـ transaction لمنع التكرار
            const lastInvoice = await tx.invoice.findFirst({
                where: { type: 'sale', companyId },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true },
            });
            const invoiceNumber = (lastInvoice?.invoiceNumber || 0) + 1;

            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            // 1. Create the invoice
            const invoiceData: any = {
                invoiceNumber,
                type: 'sale',
                date: new Date(),
                customerId: customerId || null,
                supplierId: supplierId || null,
                subtotal,
                discount: discount || 0,
                taxRate: taxRate || 0,
                taxAmount: taxAmount || 0,
                taxEnabled: (taxAmount || 0) > 0,
                total,
                paidAmount: paidAmount || 0,
                remaining,
                dueDate: dueDate ? new Date(dueDate) : null,
                paymentMethod,
                notes: notes || null,
                attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
                warehouseId: warehouseId || null,
                companyId,
                branchId: body.branchId || (session.user as any).activeBranchId || null,
                lines: {
                    create: await Promise.all(lines.map(async (line: { itemId: string; quantity: number; price: number; discount?: number }) => {
                        const item = await tx.item.findUnique({ where: { id: line.itemId } });
                        return {
                            itemId:   line.itemId,
                            quantity: line.quantity,
                            price:    line.price,
                            discount: line.discount || 0,
                            total:    (line.quantity * line.price) - (line.discount || 0) + ((line as any).taxAmount || 0),
                            unit:     (line as any).unit || null,
                            netPrice: line.price - ((line.discount || 0) / line.quantity),
                            unitCost: item?.averageCost || 0, // Store cost at time of sale
                            description: (line as any).description || null,
                            taxRate:     (line as any).taxRate || 0,
                            taxAmount:   (line as any).taxAmount || 0,
                        };
                    })),
                },
            };

            const invoice = await tx.invoice.create({
                data: invoiceData,
                include: { lines: { include: { item: { include: { unit: true } } } }, customer: true },
            });

            // 2. Update stock for each item (Sales -> decrement) - ONLY for trading
            if (!isServices && warehouseId) {
                for (const line of lines) {
                    await tx.stock.upsert({
                        where: {
                            itemId_warehouseId: {
                                itemId: line.itemId,
                                warehouseId: warehouseId,
                            },
                        },
                        update: {
                            quantity: { decrement: line.quantity },
                        },
                        create: {
                            itemId: line.itemId,
                            warehouseId: warehouseId,
                            quantity: -line.quantity,
                        },
                    });

                    // سجل حركة المخزون
                    await tx.stockMovement.create({
                        data: {
                            type: 'out',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId: warehouseId,
                            quantity: -line.quantity,
                            reference: `SAL-${invoiceNumber}`,
                            notes: `فاتورة مبيعات رقم ${invoiceNumber}`,
                            companyId,
                            invoiceId: invoice.id
                        } as any
                    });

                    // تحديث سعر البيع للصنف بناءً على السعر المدخل في الفاتورة
                    const currentItem = await tx.item.findUnique({
                        where: { id: line.itemId },
                        select: { sellPrice: true }
                    });
                    if (currentItem && currentItem.sellPrice !== line.price) {
                        await tx.item.update({
                            where: { id: line.itemId },
                            data: { sellPrice: line.price }
                        });
                    }
                }
            }

            if (customerId) {
                await tx.customer.update({
                    where: { id: customerId, companyId },
                    data: { balance: { increment: remaining } }, // مبيعات آجلة تزيد المديونية (موجب)
                });
            } else if (supplierId) {
                await tx.supplier.update({
                    where: { id: supplierId, companyId },
                    data: { balance: { decrement: remaining } }, // البيع للمورد ينقص حقه عندنا (موجب يقل)
                });
            }

            // 4. Create auto journal entry
            if (financialYear) {

                // ابحث عن الحسابات الصح
                const salesAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '4100' },
                            { type: 'revenue', name: { contains: 'إيرادات المبيعات' } },
                            { type: 'revenue', name: { contains: 'مبيعات' } },
                        ],
                    },
                });

                const receivablesAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1121' },
                            { type: 'asset', name: { contains: 'ذمم' } },
                            { type: 'asset', name: { contains: 'عملاء' } },
                            { type: 'asset', name: { contains: 'مدينون' } },
                        ],
                    },
                });

                const taxAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '2114' },
                            { type: 'liability', name: { contains: 'ضريبة القيمة المضافة المحصلة' } },
                            { type: 'liability', name: { contains: 'ضريبة' } },
                            { type: 'liability', name: { contains: 'VAT' } },
                        ],
                    },
                });

                // حساب الخزينة المختارة
                let treasuryAccountId: string | null = null;
                if (effectiveTreasuryId) {
                    const treas = await tx.treasury.findUnique({
                        where: { id: effectiveTreasuryId },
                        select: { accountId: true },
                    });
                    treasuryAccountId = treas?.accountId || null;
                }

                if (salesAccount) {
                    const journalLines: any[] = [];
                    const paid      = paidAmount || 0;
                    const remaining = total - paid;
                    const netRevenue = total - (taxAmount || 0);

                    // مدين: الصندوق/البنك لو في دفع فوري
                    if (paid > 0 && treasuryAccountId) {
                        journalLines.push({
                            accountId:   treasuryAccountId,
                            debit:       paid,
                            credit:      0,
                            description: `مبلغ مقبوض — فاتورة ${invoiceNumber}`,
                        });
                    }

                    // مدين: ذمم العملاء لو في باقي
                    if (remaining > 0 && receivablesAccount) {
                        journalLines.push({
                            accountId:   receivablesAccount.id,
                            debit:       remaining,
                            credit:      0,
                            description: `ذمم عميل — فاتورة ${invoiceNumber}`,
                        });
                    }

                    // دائن: إيرادات المبيعات
                    journalLines.push({
                        accountId:   salesAccount.id,
                        debit:       0,
                        credit:      netRevenue,
                        description: `فاتورة مبيعات رقم ${invoiceNumber}`,
                    });

                    // دائن: الضريبة
                    if ((taxAmount || 0) > 0 && taxAccount) {
                        journalLines.push({
                            accountId:   taxAccount.id,
                            debit:       0,
                            credit:      taxAmount,
                            description: `ضريبة القيمة المضافة — فاتورة ${invoiceNumber}`,
                        });
                    }

                    // قيد تكلفة البضاعة المباعة
                    const inventoryAccount = await tx.account.findFirst({
                        where: {
                            companyId, accountCategory: 'detail',
                            OR: [
                                { code: '1131' },
                                { type: 'asset', name: { contains: 'مخزون' } },
                                { type: 'asset', name: { contains: 'بضاعة' } },
                                { type: 'asset', name: { contains: 'بضائع' } },
                            ],
                        },
                    });

                    const cogsAccount = await tx.account.findFirst({
                        where: {
                            companyId, accountCategory: 'detail',
                            OR: [
                                { code: '5100' },
                                { type: 'expense', name: { contains: 'تكلفة' } },
                                { type: 'expense', name: { contains: 'COGS' } },
                                { type: 'expense', name: { contains: 'البضاعة المباعة' } },
                            ],
                        },
                    });

                    if (inventoryAccount && cogsAccount) {
                        // حساب إجمالي تكلفة الأصناف المباعة
                        let totalCost = 0;
                        for (const line of lines) {
                            const item = await tx.item.findUnique({
                                where: { id: line.itemId },
                                select: { averageCost: true },
                            });
                            totalCost += (item?.averageCost || 0) * line.quantity;
                        }

                        if (totalCost > 0) {
                            journalLines.push({
                                accountId:   cogsAccount.id,
                                debit:       totalCost,
                                credit:      0,
                                description: `تكلفة بضاعة مباعة — فاتورة ${invoiceNumber}`,
                            });
                            journalLines.push({
                                accountId:   inventoryAccount.id,
                                debit:       0,
                                credit:      totalCost,
                                description: `تكلفة بضاعة مباعة — فاتورة ${invoiceNumber}`,
                            });
                        }
                    }

                    if (journalLines.length >= 2) {
                        await tx.journalEntry.create({
                            data: {
                                entryNumber,
                                date:           new Date(),
                                description:    `قيد فاتورة مبيعات رقم ${invoiceNumber}`,
                                reference:      `SAL-${invoiceNumber}`,
                                referenceType:  'invoice',
                                referenceId:    invoice.id,
                                financialYearId: financialYear.id,
                                companyId,
                                isPosted:       true,
                                lines: { create: journalLines },
                            },
                        });
                    }
                }
            }

            // 5. If paid amount > 0 and treasury specified, add to treasury
            if (paidAmount > 0 && effectiveTreasuryId) {
                await tx.treasury.update({
                    where: { id: effectiveTreasuryId },
                    data: {
                        balance: { increment: paidAmount },
                    },
                });
            }

            return invoice;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Sales invoice error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء فاتورة المبيعات' }, { status: 500 });
    }
});
