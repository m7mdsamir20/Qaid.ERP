import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const POST = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;
        const branchId = (session.user as any).activeBranchId || null;

        // Fetch user permissions
        const user = session.user as any;
        if (!user.isSuperAdmin && user.role !== 'admin') {
            let hasApprove = false;
            try {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { customRole: { select: { permissions: true } } }
                });
                const perms = dbUser?.customRole?.permissions ? JSON.parse(dbUser.customRole.permissions) : {};
                hasApprove = perms['/sales']?.approve === true;
            } catch { hasApprove = false; }
            if (!hasApprove) {
                return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
            }
        }

        const { treasuryId, bankId } = body || {};
        const effectiveTreasuryId = treasuryId || bankId;

        // 1. Get the invoice and details
        const invoice = await prisma.invoice.findUnique({
            where: { id, companyId },
            include: { lines: { include: { item: true } }, customer: true, supplier: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
        }

        if (invoice.status !== 'pending') {
            return NextResponse.json({ error: "هذه الفاتورة معتمدة بالفعل أو ليست قيد الاعتماد" }, { status: 400 });
        }

        if (invoice.paidAmount > 0 && !effectiveTreasuryId) {
            return NextResponse.json({ error: "الرجاء تحديد الخزينة أو الحساب البنكي لاستلام المبلغ المدفوع" }, { status: 400 });
        }

        const isServices = (session.user as any).businessType?.toUpperCase() === 'SERVICES';

        // 2. Stock Check (prevent negative stock on approval)
        if (invoice.warehouseId) {
            const itemIds = invoice.lines.map(l => l.itemId);
            const stocks = await prisma.stock.findMany({
                where: { itemId: { in: itemIds }, warehouseId: invoice.warehouseId },
                select: { itemId: true, quantity: true }
            });
            const stockMap = Object.fromEntries(stocks.map(s => [s.itemId, s.quantity]));

            for (const line of invoice.lines) {
                // Only validate stock for items that are NOT services (i.e. products, raw materials, etc.)
                if (line.item.type !== 'service') {
                    const available = stockMap[line.itemId] ?? 0;
                    if (available < Number(line.quantity)) {
                        return NextResponse.json({
                            error: `الكمية المتاحة في المخزن غير كافية للصنف "${line.item.name}". المتاح: ${available}`
                        }, { status: 400 });
                    }
                }
            }
        }

        // 3. Find the open financial year
        const financialYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
        });

        if (!financialYear) {
            return NextResponse.json({ error: 'لا يمكن اعتماد الفاتورة: السنة المالية الحالية مغلقة أو غير موجودة' }, { status: 400 });
        }

        // Execute changes inside a safe transaction
        const approvedInvoice = await prisma.$transaction(async (tx) => {
            // Update snapshot balances of the invoice based on current customer balances
            let customerPrevBalance = 0;
            let customerNewBalance = 0;
            let supplierPrevBalance = 0;
            let supplierNewBalance = 0;

            if (invoice.customerId) {
                const customer = await tx.customer.findUnique({ where: { id: invoice.customerId }, select: { balance: true } });
                customerPrevBalance = customer?.balance || 0;
                customerNewBalance = customerPrevBalance + invoice.remaining;
            } else if (invoice.supplierId) {
                const supplier = await tx.supplier.findUnique({ where: { id: invoice.supplierId }, select: { balance: true } });
                supplierPrevBalance = supplier?.balance || 0;
                supplierNewBalance = supplierPrevBalance - invoice.remaining;
            }

            // A. Update invoice status and snapshots
            const updatedInv = await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'approved',
                    customerPrevBalance,
                    customerNewBalance,
                    supplierPrevBalance,
                    supplierNewBalance,
                    paymentMethod: treasuryId ? 'cash' : (bankId ? 'bank' : invoice.paymentMethod)
                },
                include: { lines: { include: { item: { include: { unit: true } } } }, customer: true }
            });

            // B. Update stock and movements
            if (invoice.warehouseId) {
                const stockLines = invoice.lines.filter((line: any) => line.item.type !== 'service');
                if (stockLines.length > 0) {
                    await Promise.all([
                        ...stockLines.map((line: any) => tx.stock.upsert({
                            where: { itemId_warehouseId: { itemId: line.itemId, warehouseId: invoice.warehouseId! } },
                            update: { quantity: { decrement: line.quantity } },
                            create: { itemId: line.itemId, warehouseId: invoice.warehouseId!, quantity: -line.quantity },
                        })),
                        ...stockLines.map((line: any) => tx.stockMovement.create({
                            data: {
                                type: 'out',
                                date: new Date(),
                                itemId: line.itemId,
                                warehouseId: invoice.warehouseId!,
                                quantity: -line.quantity,
                                reference: `SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                                notes: `اعتماد فاتورة مبيعات رقم SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                                companyId,
                                invoiceId: invoice.id,
                            },
                        })),
                    ]);
                }
            }

            // C. Update selling prices of items
            await Promise.all(invoice.lines.map((line: any) =>
                tx.item.update({
                    where: { id: line.itemId, companyId },
                    data: { sellPrice: Number(line.price) }
                })
            ));

            // D. Update Customer/Supplier financial balance
            if (invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId, companyId },
                    data: { balance: { increment: invoice.remaining } },
                });
            } else if (invoice.supplierId) {
                await tx.supplier.update({
                    where: { id: invoice.supplierId, companyId },
                    data: { balance: { decrement: invoice.remaining } },
                });
            }

            // E. Create automatic Journal Entry
            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const salesAccount = await tx.account.findFirst({
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
                const paid = invoice.paidAmount || 0;
                const remaining = invoice.total - paid;
                const netRevenue = invoice.taxInclusive ? (invoice.total - (invoice.taxAmount || 0)) : (invoice.subtotal - (invoice.discount || 0));

                if (paid > 0 && treasuryAccountId) {
                    journalLines.push({
                        accountId: treasuryAccountId,
                        debit: paid,
                        credit: 0,
                        description: `مبلغ مقبوض — فاتورة SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                    });
                }

                if (remaining > 0 && receivablesAccount) {
                    journalLines.push({
                        accountId: receivablesAccount.id,
                        debit: remaining,
                        credit: 0,
                        description: `ذمم عميل — فاتورة SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                    });
                }

                journalLines.push({
                    accountId: salesAccount.id,
                    debit: 0,
                    credit: netRevenue,
                    description: `فاتورة مبيعات رقم SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                });

                if ((invoice.taxAmount || 0) > 0 && taxAccount) {
                    journalLines.push({
                        accountId: taxAccount.id,
                        debit: 0,
                        credit: invoice.taxAmount,
                        description: `ضريبة القيمة المضافة — فاتورة SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                    });
                }

                // cost of goods sold
                if (!isServices) {
                    const inventoryAccount = await tx.account.findFirst({
                        where: {
                            companyId, accountCategory: 'detail',
                            OR: [
                                { code: '1131' },
                                { type: 'asset', name: { contains: 'مخزون' } },
                                { type: 'asset', name: { contains: 'بضاعة' } },
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
                            ],
                        },
                    });

                    if (inventoryAccount && cogsAccount) {
                        let totalCost = 0;
                        for (const line of invoice.lines) {
                            const item = await tx.item.findUnique({
                                where: { id: line.itemId },
                                select: { averageCost: true },
                            });
                            totalCost += (item?.averageCost || 0) * line.quantity;
                        }

                        if (totalCost > 0) {
                            journalLines.push({
                                accountId: cogsAccount.id,
                                debit: totalCost,
                                credit: 0,
                                description: `تكلفة بضاعة مباعة — فاتورة SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            });
                            journalLines.push({
                                accountId: inventoryAccount.id,
                                debit: 0,
                                credit: totalCost,
                                description: `تكلفة بضاعة مباعة — فاتورة SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            });
                        }
                    }
                }

                if (journalLines.length >= 2) {
                    await tx.journalEntry.create({
                        data: {
                            branchId: invoice.branchId,
                            entryNumber,
                            date: new Date(),
                            description: `اعتماد قيد فاتورة مبيعات رقم SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            reference: `SAL-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            referenceType: 'invoice',
                            referenceId: invoice.id,
                            financialYearId: financialYear.id,
                            companyId,
                            isPosted: true,
                            lines: { create: journalLines },
                        },
                    });
                }
            }

            // F. Add cash to treasury
            if (invoice.paidAmount > 0 && effectiveTreasuryId) {
                await tx.treasury.update({
                    where: { id: effectiveTreasuryId },
                    data: {
                        balance: { increment: invoice.paidAmount },
                    },
                });
            }

            return updatedInv;
        });

        const prefix = (session.user as any).businessType?.toUpperCase() === 'SERVICES' ? 'SRV' : 'SAL';
        const invCode = `${prefix}-${String(invoice.invoiceNumber).padStart(5, '0')}`;
        await logActivity({
            ...extractLogContext(session, request),
            action: 'approve',
            module: 'sales',
            entityType: 'Invoice',
            entityId: id,
            entityRef: invCode,
            description: `اعتمد فاتورة مبيعات رقم ${invCode}`,
            oldData: { status: 'pending' },
            newData: { status: 'approved' },
        });

        return NextResponse.json(approvedInvoice);
    } catch (error: any) {
        console.error('Invoice approval error:', error);
        return NextResponse.json({ error: 'فشل في اعتماد الفاتورة: ' + (error.message || '') }, { status: 500 });
    }
});
