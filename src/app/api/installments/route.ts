import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const plans = await prisma.installmentPlan.findMany({
            where: { companyId },
            include: {
                customer:     { select: { id: true, name: true, phone: true } },
                installments: { orderBy: { installmentNo: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(plans);
    } catch (error) {
        console.error(error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const isServices = (session.user as any).businessType === 'SERVICES';

        const {
            customerId, totalAmount, downPayment,
            interestRate, monthsCount, startDate,
            notes, treasuryId, cart = [],
            paymentType, activeMonths, 
            taxRate: taxR, taxAmount: taxA
        } = body;

        if (!customerId || !totalAmount || !monthsCount || !startDate)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        if (cart.length === 0)
            return NextResponse.json({ error: 'لا توجد منتجات' }, { status: 400 });

        const total         = parseFloat(totalAmount);
        const down          = parseFloat(downPayment)  || 0;
        const rate          = parseFloat(interestRate) || 0;
        const taxRate       = parseFloat(taxR) || 0;
        const taxAmount     = parseFloat(taxA) || 0;
        
        // Final total including tax for calculations
        const priceWithTax  = total + taxAmount;
        const remaining     = priceWithTax - down;
        const totalInterest = (remaining * rate) / 100;
        const grandTotal    = remaining + totalInterest;
        const installAmt    = grandTotal / monthsCount;
        const principalAmt  = remaining  / monthsCount;
        const interestAmt   = totalInterest / monthsCount;

        const lastPlan = await prisma.installmentPlan.findFirst({
            where:   { companyId },
            orderBy: { planNumber: 'desc' },
            select:  { planNumber: true },
        });
        const planNumber = (lastPlan?.planNumber || 0) + 1;

        const currentYear = await prisma.financialYear.findFirst({
            where:   { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });
        
        const productName = cart.map((i: any) => `${i.name} (${i.quantity})`).join(', ');

        const result = await prisma.$transaction(async (tx) => {
            
            // 1. Create hidden Invoice for the installment plan
            const lastInv = await tx.invoice.findFirst({
                where: { companyId, type: 'sale' },
                orderBy: { invoiceNumber: 'desc' },
                select: { invoiceNumber: true }
            });
            const invNum = (lastInv?.invoiceNumber || 0) + 1;

            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: invNum,
                    customerId,
                    date: new Date(startDate),
                    type: 'sale',
                    paymentMethod: 'installment_plan',
                    subtotal: total,
                    taxRate,
                    taxAmount,
                    
                    discount: 0,
                    total: priceWithTax,
                    paidAmount: down,
                    remaining: remaining,
                    notes: notes || `فاتورة مرتبطة بخطة تقسيط رقم ${planNumber}`,
                    companyId,
                    // @ts-ignore
                    branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                    lines: {
                        create: cart.map((item: any) => ({
                            itemId: item.id,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            totalPrice: item.total,
                        }))
                    }
                }
            });

            // 2. Create the Installment Plan
            const plan = await tx.installmentPlan.create({
                data: {
                    planNumber,
                    customerId,
                    productName:       productName || null,
                    totalAmount:       total,
                    downPayment:       down,
                    taxRate:           taxRate,
                    taxAmount:         taxAmount,
                    interestRate:      rate,
                    totalInterest,
                    grandTotal:        grandTotal,
                    monthsCount,
                    installmentAmount: installAmt,
                    startDate:         new Date(startDate),
                    notes:             notes || null,
                    status:            'active',
                    companyId,
                    invoiceId:         invoice.id,
                },
            });

            // 3. Deduct Inventory
            if (!isServices && currentYear) {
                const [inventoryAcc, cogsAcc] = await Promise.all([
                    tx.account.findFirst({
                        where: { companyId, type: 'asset', accountCategory: 'detail', OR: [{ name: { contains: 'مخزون' } }] }
                    }),
                    tx.account.findFirst({
                        where: { companyId, type: 'expense', accountCategory: 'detail', OR: [{ name: { contains: 'تكلفة' } }] }
                    }),
                ]);

                let totalCost = 0;

                for (const item of cart) {
                    const dbItem = await tx.item.findUnique({ where: { id: item.id }, select: { costPrice: true, id: true } });
                    if (dbItem) {
                        const itemCost = (dbItem.costPrice || 0) * item.quantity;
                        totalCost += itemCost;
                        
                        const warehouse = await tx.warehouse.findFirst({ where: { companyId } });
                        await tx.stockMovement.create({
                            data: {
                                itemId: dbItem.id,
                                type: 'out',
                                quantity: item.quantity,
                                reference: invoice.id,
                                date: new Date(),
                                warehouseId: warehouse?.id || '',
                                companyId,
                            }
                        });
                        
                        const stocks = await tx.stock.findMany({ where: { itemId: dbItem.id, quantity: { gt: 0 } }, orderBy: { quantity: 'desc' } });
                        let remQty = item.quantity;
                        for (const st of stocks) {
                            if (remQty <= 0) break;
                            const deduct = Math.min(remQty, st.quantity);
                            await tx.stock.update({ where: { id: st.id }, data: { quantity: { decrement: deduct } } });
                            remQty -= deduct;
                        }
                    }
                }

                // COGS Entry
                if (totalCost > 0 && inventoryAcc && cogsAcc) {
                    const lastEntry = await tx.journalEntry.findFirst({ where: { companyId }, orderBy: { entryNumber: 'desc' }, select: { entryNumber: true } });
                    await tx.journalEntry.create({
                        data: {
                            // @ts-ignore
                            branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: new Date(),
                            description: `إثبات تكلفة بضاعة مباعة لخطة التقسيط ${planNumber}`,
                            reference: `INST-${String(planNumber).padStart(5, '0')}`,
                            referenceType: 'installment_plan',
                            referenceId: plan.id,
                            financialYearId: currentYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    { accountId: cogsAcc.id, debit: totalCost, credit: 0, description: `تكلفة بضاعة مباعة` },
                                    { accountId: inventoryAcc.id, debit: 0, credit: totalCost, description: `صرف مخزون لخطة ${planNumber}` },
                                ],
                            },
                        }
                    });
                }
            }

            // 4. Update customer balance with Principal + Interest 
            await tx.customer.update({
                where: { id: customerId },
                data:  { balance: { increment: grandTotal } },
            });

            // 5. Create Installments
            let generated = [];
            for (let i = 1; i <= monthsCount; i++) {
                let dDate = new Date(startDate);
                if (paymentType === 'weekly') {
                    dDate.setDate(dDate.getDate() + (i * 7));
                } else if (paymentType === 'custom' && activeMonths) {
                    let yearOffset = Math.floor((i - 1) / activeMonths.length);
                    let monthIdx = (i - 1) % activeMonths.length;
                    let targetMonth = activeMonths[monthIdx];
                    dDate.setFullYear(dDate.getFullYear() + yearOffset);
                    dDate.setMonth(targetMonth - 1);
                    dDate.setDate(1);
                } else {
                    dDate.setMonth(dDate.getMonth() + i);
                }

                generated.push({
                    planId:            plan.id,
                    installmentNo:     i,
                    dueDate:           dDate,
                    amount:            installAmt,
                    principal:   principalAmt,
                    interest:    interestAmt,
                    remaining:         installAmt,
                    paidAmount:        0,
                    status:            'unpaid',
                    companyId,
                });
            }
            await tx.installment.createMany({ data: generated });

            // 6. Create Main Journal Entry (Sales + Interest)
            if (currentYear) {
                const salesAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'revenue', accountCategory: 'detail',
                        OR: isServices ? [
                            { code: '4200' }, { name: { contains: 'إيرادات الخدمات' } }, { name: { contains: 'خدمات' } },
                        ] : [
                            { code: '4100' }, { name: { contains: 'إيرادات المبيعات' } }, { name: { contains: 'مبيعات' } },
                        ],
                    },
                });
                const receivablesAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [{ name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }],
                    },
                });
                const interestAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'revenue', accountCategory: 'detail',
                        OR: [{ name: { contains: 'فوائد' } }, { name: { contains: 'إيرادات فوائد'} }],
                    },
                });
                const taxAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'liability', accountCategory: 'detail',
                        OR: [{ name: { contains: 'ضريبة القيمة المضافة المحصلة' } }, { name: { contains: 'ضريبة' } }, { name: { contains: 'VAT' } }],
                    },
                });

                if (receivablesAcc && salesAcc) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where:   { companyId },
                        orderBy: { entryNumber: 'desc' },
                        select:  { entryNumber: true },
                    });

                    await tx.journalEntry.create({
                        data: {
                            // @ts-ignore
                            branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                            entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                            date:            new Date(),
                            description:     `إثبات خطة تقسيط رقم ${planNumber} للعميل ${(await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } }))?.name || ''}`,
                            reference:       `INST-${String(planNumber).padStart(5, '0')}`,
                            referenceType:   'installment_plan',
                            referenceId:     plan.id,
                            financialYearId: currentYear.id,
                            companyId,
                            isPosted:        true,
                            lines: {
                                create: [
                                    {
                                        accountId:   receivablesAcc.id,
                                        debit:       remaining + totalInterest,
                                        credit:      0,
                                        description: `قيمة عقد تقسيط رقم ${planNumber}`,
                                    },
                                    {
                                        accountId:   salesAcc.id,
                                        debit:       0,
                                        credit:      total,
                                        description: `قيمة منتجات قسط رقم ${planNumber}`,
                                    },
                                    ...(taxAmount > 0 ? [{
                                        accountId:   taxAcc?.id || salesAcc.id,
                                        debit:       0,
                                        credit:      taxAmount,
                                        description: `ضريبة قسط رقم ${planNumber}`,
                                    }] : []),
                                    ...(totalInterest > 0 ? [{
                                        accountId:   interestAcc?.id || salesAcc.id,
                                        debit:       0,
                                        credit:      totalInterest,
                                        description: `فوائد قسط رقم ${planNumber}`,
                                    }] : []),
                                ],
                            },
                        },
                    });
                }
            }

            // 7. Handle down payment if provided
            if (down > 0 && treasuryId) {
                const treasury = await tx.treasury.findUnique({
                    where: { id: treasuryId, companyId },
                    select: { id: true, accountId: true }
                });

                if (treasury && treasury.accountId) {
                    await tx.treasury.update({
                        where: { id: treasuryId },
                        data:  { balance: { increment: down } }
                    });

                    await tx.customer.update({
                        where: { id: customerId },
                        data:  { balance: { decrement: down } }
                    });

                    if (currentYear) {
                        const receivablesAcc = await tx.account.findFirst({
                            where: { companyId, type: 'asset', accountCategory: 'detail', OR: [{ name: { contains: 'ذمم' } }, { name: { contains: 'عملاء' } }] }
                        });

                        if (receivablesAcc) {
                            const lastEntry2 = await tx.journalEntry.findFirst({
                                where:   { companyId },
                                orderBy: { entryNumber: 'desc' },
                                select:  { entryNumber: true },
                            });

                            await tx.journalEntry.create({
                                data: {
                                    // @ts-ignore
                                    branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                                    entryNumber:     (lastEntry2?.entryNumber || 0) + 1,
                                    date:            new Date(),
                                    description:     `دفعة مقدمة لخطة تقسيط ${planNumber}`,
                                    reference:       `INST-${String(planNumber).padStart(5, '0')}`,
                                    referenceType:   'installment_plan',
                                    referenceId:     plan.id,
                                    financialYearId: currentYear.id,
                                    companyId,
                                    isPosted:        true,
                                    lines: {
                                        create: [
                                            {
                                                accountId: treasury.accountId,
                                                debit:     down,
                                                credit:    0,
                                                description: `مقدم خطة ${planNumber}`,
                                            },
                                            {
                                                accountId: receivablesAcc.id,
                                                debit:     0,
                                                credit:    down,
                                                description: `مقدم خطة ${planNumber}`,
                                            }
                                        ]
                                    }
                                }
                            });
                        }
                    }
                }
            }

            return plan;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Create Installment Error:', error);
        return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

        const plan = await prisma.installmentPlan.findUnique({ where: { id, companyId } });
        if (!plan) return NextResponse.json({ error: 'الخطة غير موجودة' }, { status: 404 });
        if (plan.status !== 'active')
            return NextResponse.json({ error: 'لا يمكن حذف خطة غير نشطة' }, { status: 400 });

        const hasPaid = await prisma.installment.findFirst({
            where: { planId: id, status: { in: ['paid', 'partial'] } },
        });
        if (hasPaid)
            return NextResponse.json({ error: 'لا يمكن حذف خطة تم تحصيل أقساط منها' }, { status: 400 });

        await prisma.$transaction(async (tx) => {
            
            const addedToBalance = plan.grandTotal;
            const netBalance = addedToBalance - plan.downPayment;
            if (netBalance > 0) {
                await tx.customer.update({
                    where: { id: plan.customerId },
                    data: { balance: { decrement: netBalance } },
                });
            }

            if (plan.invoiceId) {
                const inv = await tx.invoice.findUnique({ where: { id: plan.invoiceId }, include: { lines: true } });
                if (inv) {
                    await tx.invoice.delete({ where: { id: plan.invoiceId } });
                    // Reverse stock movements
                    for (const line of inv.lines) {
                        const outMovements = await tx.stockMovement.findMany({
                            where: { companyId, reference: plan.invoiceId, type: 'out', itemId: line.itemId },
                        });
                        for (const mv of outMovements) {
                            await tx.stock.upsert({
                                where: { itemId_warehouseId: { itemId: mv.itemId, warehouseId: mv.warehouseId || '' } },
                                update: { quantity: { increment: mv.quantity } },
                                create: { itemId: mv.itemId, warehouseId: mv.warehouseId || '', quantity: mv.quantity },
                            });
                            await tx.stockMovement.create({
                                data: {
                                    type: 'in', date: new Date(),
                                    itemId: mv.itemId, warehouseId: mv.warehouseId,
                                    quantity: mv.quantity,
                                    reference: `INST-${plan.planNumber}`,
                                    notes: `عكس بيع تقسيط - حذف خطة #${plan.planNumber}`,
                                    companyId,
                                }
                            });
                        }
                    }
                }
            }

            const relatedEntries = await tx.journalEntry.findMany({
                where: {
                    companyId,
                    referenceId: id,
                    referenceType: { in: ['installment_plan', 'installment_cogs', 'installment_down'] },
                },
                select: { id: true },
            });
            if (relatedEntries.length > 0) {
                const entryIds = relatedEntries.map(e => e.id);
                await tx.journalEntryLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
                await tx.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
            }

            await tx.installmentPlan.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل في حذف الخطة' }, { status: 500 });
    }
});
