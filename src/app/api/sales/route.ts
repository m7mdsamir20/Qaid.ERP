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
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
        const skip = (page - 1) * limit;
        const search = url.searchParams.get('search') || '';

        const where: any = { companyId, type: 'sale', ...branchFilter };
        if (search) {
            where.OR = [
                { invoiceNumber: { equals: parseInt(search) || undefined } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

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
                    customer: { select: { id: true, name: true, balance: true } },
                    supplier: { select: { id: true, name: true, balance: true } }
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
    try {
        const user = session.user as any;
        const companyId = user.companyId;

        // Server-side permission enforcement
        if (!user.isSuperAdmin && user.role !== 'admin') {
            let perms: any = {};
            try {
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { customRole: { select: { permissions: true } } }
                });
                if (dbUser?.customRole?.permissions) perms = JSON.parse(dbUser.customRole.permissions);
            } catch {}
            if (Object.keys(perms).length > 0 && !perms['/sales']?.create) {
                return NextResponse.json({ error: 'ليس لديك صلاحية إنشاء فواتير مبيعات' }, { status: 403 });
            }
        }

        const {
            date, customerId, supplierId, taxRate, taxInclusive, taxLabel,
            paidAmount, warehouseId, notes, attachments,
            financialYearId, dueDate, lines, discount, treasuryId, bankId, taxAmount
        } = body;

        // Use bankId if treasuryId is missing
        const effectiveTreasuryId = treasuryId || bankId;

        const isServices = (session.user as any).businessType?.toUpperCase() === 'SERVICES';

        // ① منع المخزون السالب — تحقق قبل إنشاء الفاتورة (query واحد بدل N)
        if (!isServices && warehouseId) {
            const itemIds = lines.map((l: any) => l.itemId);
            const [stocks, itemNames] = await Promise.all([
                prisma.stock.findMany({
                    where: { itemId: { in: itemIds }, warehouseId },
                    select: { itemId: true, quantity: true }
                }),
                prisma.item.findMany({
                    where: { id: { in: itemIds } },
                    select: { id: true, name: true }
                })
            ]);
            const stockMap = Object.fromEntries(stocks.map(s => [s.itemId, s.quantity]));
            const nameMap = Object.fromEntries(itemNames.map(i => [i.id, i.name]));
            for (const line of lines) {
                const available = stockMap[line.itemId] ?? 0;
                if (available < Number(line.quantity)) {
                    return NextResponse.json({
                        error: `الكمية المتاحة غير كافية للصنف "${nameMap[line.itemId] || line.itemId}". المتاح: ${available}`
                    }, { status: 400 });
                }
            }
        }

        // Calculate totals
        const subtotal = lines.reduce((s: number, l: any) => s + (l.quantity * l.price - (l.discount || 0)), 0);
        const afterDiscount = subtotal - (discount || 0);

        // Logic for Tax: 
        // If inclusive: total = afterDiscount (tax is hidden inside)
        // If exclusive: total = afterDiscount + taxAmount
        const total = taxInclusive ? afterDiscount : afterDiscount + (taxAmount || 0);
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
            
            // Snapshot Balances
            let customerPrevBalance = 0;
            let customerNewBalance = 0;
            let supplierPrevBalance = 0;
            let supplierNewBalance = 0;

            if (customerId) {
                const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { balance: true } });
                customerPrevBalance = customer?.balance || 0;
                customerNewBalance = customerPrevBalance + remaining;
            } else if (supplierId) {
                const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { balance: true } });
                supplierPrevBalance = supplier?.balance || 0;
                supplierNewBalance = supplierPrevBalance - remaining; // Sale to supplier reduces their credit (or increases our debit)
            }

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
                taxInclusive: taxInclusive || false,
                total,
                paidAmount: paidAmount || 0,
                remaining,
                dueDate: dueDate ? new Date(dueDate) : null,
                paymentMethod,
                notes: notes || null,
                attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
                warehouseId: warehouseId || null,
                companyId,
                customerPrevBalance,
                customerNewBalance,
                supplierPrevBalance,
                supplierNewBalance,
                branchId: body.branchId || (session.user as any).activeBranchId || null,
                lines: {
                    create: lines.map((line: any) => ({
                        itemId: line.itemId,
                        quantity: line.quantity,
                        price: line.price,
                        discount: line.discount || 0,
                        total: (line.quantity * line.price) - (line.discount || 0) + (line.taxAmount || 0),
                        unit: line.unit || null,
                        netPrice: line.price - ((line.discount || 0) / line.quantity),
                        unitCost: line.unitCost || 0,
                        description: line.description || null,
                        taxRate: line.taxRate || 0,
                        taxAmount: line.taxAmount || 0,
                    })),
                },
            };

            const invoice = await tx.invoice.create({
                data: invoiceData,
                include: { lines: { include: { item: { include: { unit: true } } } }, customer: true },
            });

            // 2. تحديث المخزون بشكل متوازي بدل sequential
            if (!isServices && warehouseId) {
                await Promise.all([
                    // stock upserts كلها في وقت واحد
                    ...lines.map((line: any) => tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.itemId, warehouseId } },
                        update: { quantity: { decrement: line.quantity } },
                        create: { itemId: line.itemId, warehouseId, quantity: -line.quantity },
                    })),
                    // stock movements
                    ...lines.map((line: any) => tx.stockMovement.create({
                        data: {
                            type: 'out',
                            date: new Date(),
                            itemId: line.itemId,
                            warehouseId,
                            quantity: -line.quantity,
                            reference: `SAL-${String(invoiceNumber).padStart(5, '0')}`,
                            notes: `فاتورة مبيعات رقم SAL-${String(invoiceNumber).padStart(5, '0')}`,
                            companyId,
                            invoiceId: invoice.id,
                        },
                    })),
                ]);
            }

            // Update item selling prices to the latest price used in the invoice
            await Promise.all(lines.map((line: any) =>
                tx.item.update({
                    where: { id: line.itemId, companyId },
                    data: { sellPrice: Number(line.price) }
                })
            ));

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
                    const paid = paidAmount || 0;
                    const remaining = total - paid;
                    const netRevenue = taxInclusive ? (total - (taxAmount || 0)) : afterDiscount;

                    // مدين: الصندوق/البنك لو في دفع فوري
                    if (paid > 0 && treasuryAccountId) {
                        journalLines.push({
                            accountId: treasuryAccountId,
                            debit: paid,
                            credit: 0,
                            description: `مبلغ مقبوض — فاتورة SAL-${String(invoiceNumber).padStart(5, '0')}`,
                        });
                    }

                    // مدين: ذمم العملاء لو في باقي
                    if (remaining > 0 && receivablesAccount) {
                        journalLines.push({
                            accountId: receivablesAccount.id,
                            debit: remaining,
                            credit: 0,
                            description: `ذمم عميل — فاتورة SAL-${String(invoiceNumber).padStart(5, '0')}`,
                        });
                    }

                    // دائن: إيرادات المبيعات
                    journalLines.push({
                        accountId: salesAccount.id,
                        debit: 0,
                        credit: netRevenue,
                        description: `فاتورة مبيعات رقم SAL-${String(invoiceNumber).padStart(5, '0')}`,
                    });

                    // دائن: الضريبة
                    if ((taxAmount || 0) > 0 && taxAccount) {
                        journalLines.push({
                            accountId: taxAccount.id,
                            debit: 0,
                            credit: taxAmount,
                            description: `ضريبة القيمة المضافة — فاتورة SAL-${String(invoiceNumber).padStart(5, '0')}`,
                        });
                    }

                    // قيد تكلفة البضاعة المباعة — للنشاط التجاري فقط
                    if (!isServices) {
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
                                    accountId: cogsAccount.id,
                                    debit: totalCost,
                                    credit: 0,
                                    description: `تكلفة بضاعة مباعة — فاتورة SAL-${String(invoiceNumber).padStart(5, '0')}`,
                                });
                                journalLines.push({
                                    accountId: inventoryAccount.id,
                                    debit: 0,
                                    credit: totalCost,
                                    description: `تكلفة بضاعة مباعة — فاتورة SAL-${String(invoiceNumber).padStart(5, '0')}`,
                                });
                            }
                        }
                    }

                    if (journalLines.length >= 2) {
                        await tx.journalEntry.create({
                            data: {
                                entryNumber,
                                date: new Date(),
                                description: `قيد فاتورة مبيعات رقم SAL-${String(invoiceNumber).padStart(5, '0')}`,
                                reference: `SAL-${String(invoiceNumber).padStart(5, '0')}`,
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
