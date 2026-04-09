import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);

        const id = url.searchParams.get('id');
        if (id) {
            const invoice = await prisma.invoice.findUnique({
                where: { id, companyId },
                include: {
                    supplier: true,
                    customer: true,
                    warehouse: true,
                    lines: { include: { item: { include: { category: true, unit: true } } } },
                }
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
                        const opBal = await prisma.openingBalance.findUnique({
                            where: { accountId_financialYearId: { accountId: partyAccId, financialYearId: finYear.id } }
                        });
                        if (opBal) balance = Number(opBal.debit) - Number(opBal.credit);
                    }
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
                    
                    const isSupplier = !!invoice.supplierId;
                    if (isSupplier) (invoice as any).partyBalanceAtTime = -balance; 
                    else (invoice as any).partyBalanceAtTime = balance;
                }
            }
            return NextResponse.json(invoice);
        }

        if (url.searchParams.get('justNextNum') === 'true') {
            const lastInvoice = await prisma.invoice.findFirst({
                where: { companyId, type: 'purchase' },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            });
            return NextResponse.json({ nextNum: (lastInvoice?.invoiceNumber || 0) + 1 });
        }

        const branchFilter = getBranchFilter(session);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const skip = (page - 1) * limit;

        const where: any = { companyId, type: 'purchase', ...branchFilter };

        const [invoices, total, activeYear] = await Promise.all([
            prisma.invoice.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    invoiceNumber: true,
                    date: true,
                    total: true,
                    subtotal: true,
                    discount: true,
                    paidAmount: true,
                    remaining: true,
                    type: true,
                    supplier: { select: { id: true, name: true, balance: true } },
                    customer: { select: { id: true, name: true, balance: true } }
                }
            }),
            prisma.invoice.count({ where }),
            prisma.financialYear.findFirst({ where: { companyId, isOpen: true } })
        ]);
        return NextResponse.json({ invoices, activeYear, total, page, limit });
    } catch {
        return NextResponse.json({ invoices: [], activeYear: null }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    if ((session.user as any).businessType === 'SERVICES')
        return NextResponse.json({ error: 'النشاط الخدمي لا يدعم فواتير المشتريات' }, { status: 403 });
    try {
        const companyId = (session.user as any).companyId;
        const { 
            supplierId, customerId, warehouseId, lines, 
            discount, paidAmount, notes, treasuryId, bankId,
            taxRate, taxAmount
        } = body;

        const effectiveTreasuryId = treasuryId || bankId;

        const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.price - (l.discount || 0)), 0);
        const afterDiscount = subtotal - (discount || 0);
        const total = afterDiscount + (taxAmount || 0);
        const remaining = total - (paidAmount || 0);

        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear) {
            return NextResponse.json({ error: 'لا يمكن إنشاء القيد: السنة المالية الحالية مغلقة. يرجى فتح سنة مالية جديدة.' }, { status: 400 });
        }

        const paymentMethod = treasuryId ? 'cash' : (bankId ? 'bank' : 'credit');

        const activeBranchId = (session.user as any).activeBranchId;

        const result = await prisma.$transaction(async (tx) => {
            // ① رقم الفاتورة داخل الـ transaction لمنع التكرار
            const lastInvoice = await tx.invoice.findFirst({
                where: { type: 'purchase', companyId },
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

            const invoiceData: any = {
                invoiceNumber,
                type: 'purchase',
                date: new Date(),
                supplierId: supplierId || null,
                customerId: customerId || null,
                subtotal,
                discount: discount || 0,
                taxRate: taxRate || 0,
                taxAmount: taxAmount || 0,
                taxEnabled: (taxAmount || 0) > 0,
                total,
                paidAmount: paidAmount || 0,
                remaining,
                paymentMethod,
                notes: notes || null,
                warehouseId: warehouseId || null,
                branchId: body.branchId || (activeBranchId !== 'all' ? activeBranchId : null) || null,
                companyId,
                lines: {
                    create: lines.map((line: { itemId: string; quantity: number; price: number; discount?: number }) => ({
                        itemId: line.itemId,
                        quantity: line.quantity,
                        price: line.price,
                        discount: line.discount || 0,
                        total: (line.quantity * line.price) - (line.discount || 0),
                        unit: (line as any).unit || null,
                        netPrice: line.price - ((line.discount || 0) / line.quantity),
                    })),
                },
            };

            const invoice = await tx.invoice.create({
                data: invoiceData,
                include: { lines: true, supplier: true },
            });

            if (warehouseId) {
                const itemIds = lines.map((l: any) => l.itemId);

                // جيب كل الأصناف وكل مخزونهم دفعة واحدة بدل loop
                const [allItems, allStocks] = await Promise.all([
                    tx.item.findMany({
                        where: { id: { in: itemIds } },
                        select: { id: true, averageCost: true, costPrice: true }
                    }),
                    tx.stock.findMany({ where: { itemId: { in: itemIds } } })
                ]);

                const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));
                const stockMap: Record<string, number> = {};
                allStocks.forEach(s => {
                    stockMap[s.itemId] = (stockMap[s.itemId] || 0) + s.quantity;
                });

                // تحديث الأصناف والمخزون بشكل متوازي
                await Promise.all([
                    // تحديث averageCost لكل صنف
                    ...lines.map((line: any) => {
                        const item = itemMap[line.itemId];
                        if (!item) return Promise.resolve();
                        const currentTotalStock = stockMap[line.itemId] || 0;
                        const currentAvgCost = Number(item.averageCost) || Number(item.costPrice) || 0;
                        const newQty = Number(line.quantity);
                        const newPrice = Number(line.price);
                        const totalStockAfter = currentTotalStock + newQty;
                        const newAvgCost = (currentTotalStock > 0 && currentAvgCost > 0)
                            ? ((currentTotalStock * currentAvgCost) + (newQty * newPrice)) / totalStockAfter
                            : newPrice;
                        return tx.item.update({
                            where: { id: line.itemId },
                            data: { averageCost: newAvgCost, costPrice: newPrice }
                        });
                    }),
                    // upsert المخزون لكل صنف
                    ...lines.map((line: any) => tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                        update: { quantity: { increment: line.quantity } },
                        create: { itemId: line.itemId, warehouseId, quantity: line.quantity }
                    })),
                    // إنشاء حركات المخزون بشكل متوازي
                    ...lines.map((line: any) => tx.stockMovement.create({
                        data: {
                            type: 'in',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId,
                            quantity: line.quantity,
                            reference: `PUR-${invoiceNumber}`,
                            notes: `فاتورة مشتريات رقم ${invoiceNumber}`,
                            companyId,
                            invoiceId: invoice.id
                        } as any
                    }))
                ]);
            }

            if (supplierId) {
                await tx.supplier.update({
                    where: { id: supplierId, companyId },
                    data: { balance: { increment: remaining } },
                });
            } else if (customerId) {
                await tx.customer.update({
                    where: { id: customerId, companyId },
                    data: { balance: { decrement: remaining } },
                });
            }

            if (financialYear) {
                const journalLines: any[] = [];
                const paid      = paidAmount || 0;
                const remainingAmt = total - paid;
                const netCost   = total - (taxAmount || 0);

                const inventoryAccount = await tx.account.findFirst({
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

                const supplierAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '2111' },
                            { type: 'liability', name: { contains: 'موردين'    } },
                            { type: 'liability', name: { contains: 'مورد'      } },
                            { type: 'liability', name: { contains: 'دائنون'    } },
                            { type: 'liability', name: { contains: 'ذمم دائنة' } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                });

                const taxAccount = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { code: '1124' },
                            { type: 'asset', name: { contains: 'ضريبة القيمة المضافة المدفوعة' } },
                            { type: 'asset', name: { contains: 'ضريبة مدخلات' } },
                            { type: 'asset', name: { contains: 'ضريبة' } },
                            { type: 'asset', name: { contains: 'VAT' } },
                        ],
                    },
                });

                let treasuryAccountId: string | null = null;
                if (effectiveTreasuryId) {
                    const treas = await tx.treasury.findUnique({
                        where: { id: effectiveTreasuryId, companyId },
                        select: { accountId: true },
                    });
                    treasuryAccountId = treas?.accountId || null;
                }

                if (inventoryAccount) {
                    journalLines.push({
                        accountId:   inventoryAccount.id,
                        debit:       netCost,
                        credit:      0,
                        description: `فاتورة مشتريات رقم ${invoiceNumber}`,
                        customerId:  customerId || null,
                        supplierId:  supplierId || null,
                    });

                    if ((taxAmount || 0) > 0 && taxAccount) {
                        journalLines.push({
                            accountId:   taxAccount.id,
                            debit:       taxAmount,
                            credit:      0,
                            description: `ضريبة مدخلات — فاتورة ${invoiceNumber}`,
                            customerId:  customerId || null,
                            supplierId:  supplierId || null,
                        });
                    }

                    if (paid > 0 && treasuryAccountId) {
                        journalLines.push({
                            accountId:   treasuryAccountId,
                            debit:       0,
                            credit:      paid,
                            description: `دفعة فورية — فاتورة مشتريات ${invoiceNumber}`,
                            customerId:  customerId || null,
                            supplierId:  supplierId || null,
                        });
                    }

                    if (remainingAmt > 0 && supplierAccount) {
                        journalLines.push({
                            accountId:   supplierAccount.id,
                            debit:       0,
                            credit:      remainingAmt,
                            description: `مستحقات مورد — فاتورة مشتريات ${invoiceNumber}`,
                            customerId:  customerId || null,
                            supplierId:  supplierId || null,
                        });
                    }

                    if (journalLines.length >= 2) {
                        await tx.journalEntry.create({
                            data: {
                                entryNumber,
                                date:           new Date(),
                                description:    `قيد فاتورة مشتريات رقم ${invoiceNumber}`,
                                reference:      `PUR-${invoiceNumber}`,
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

            if (paidAmount > 0 && effectiveTreasuryId) {
                const treasury = await tx.treasury.findUnique({ where: { id: effectiveTreasuryId, companyId } });
                if (!treasury || treasury.balance < paidAmount) {
                    throw new Error("رصيد الخزينة/البنك غير كافٍ لإتمام العملية");
                }
                await tx.treasury.update({
                    where: { id: effectiveTreasuryId },
                    data: { balance: { decrement: paidAmount } },
                });
            }

            return invoice;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Purchase invoice error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء فاتورة المشتريات' }, { status: 500 });
    }
});
