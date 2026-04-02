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

        const {
            customerId, productName, totalAmount, downPayment,
            interestRate, monthsCount, startDate,
            notes, treasuryId, itemId, quantity,
            paymentType, activeMonths, 
            taxRate: taxR, taxAmount: taxA
        } = body;

        if (!customerId || !totalAmount || !monthsCount || !startDate)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

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

        const result = await prisma.$transaction(async (tx) => {
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
                },
            });

            await tx.customer.update({
                where: { id: customerId },
                data:  { balance: { increment: grandTotal } },
            });

            if (currentYear) {
                const salesAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'revenue', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'إيرادات المبيعات' } },
                            { name: { contains: 'مبيعات' } },
                        ],
                    },
                });
                const receivablesAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'ذمم'   } },
                            { name: { contains: 'عملاء' } },
                        ],
                    },
                });
                const interestAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'revenue', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'فوائد'        } },
                            { name: { contains: 'إيرادات فوائد'} },
                        ],
                    },
                });
                const taxAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'liability', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'ضريبة القيمة المضافة المحصلة' } },
                            { name: { contains: 'ضريبة' } },
                            { name: { contains: 'VAT' } },
                        ],
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
                            entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                            date:            new Date(),
                            description:     `إثبات خطة تقسيط رقم ${planNumber} للعميل ${(await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } }))?.name || ''}`,
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
                                        description: `قيمة منتج قسط رقم ${planNumber}`,
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

            if (itemId && currentYear) {
                const qty = parseInt(quantity) || 1;
                const item = await tx.item.findUnique({
                    where:  { id: itemId },
                    select: { id: true, name: true, costPrice: true },
                });

                if (item) {
                    const costPrice  = item.costPrice || 0;
                    const totalCost  = costPrice * qty;

                    if (totalCost > 0) {
                        const [inventoryAcc, cogsAcc] = await Promise.all([
                            tx.account.findFirst({
                                where: {
                                    companyId, type: 'asset', accountCategory: 'detail',
                                    OR: [
                                        { name: { contains: 'مخزون'   } },
                                        { name: { contains: 'بضاعة'   } },
                                        { name: { contains: 'مخزن'    } },
                                    ],
                                },
                            }),
                            tx.account.findFirst({
                                where: {
                                    companyId, type: 'expense', accountCategory: 'detail',
                                    OR: [
                                        { name: { contains: 'تكلفة البضاعة' } },
                                        { name: { contains: 'تكلفة المبيعات' } },
                                        { name: { contains: 'COGS'           } },
                                    ],
                                },
                            }),
                        ]);

                        if (inventoryAcc && cogsAcc) {
                            const lastEntry2 = await tx.journalEntry.findFirst({
                                where:   { companyId },
                                orderBy: { entryNumber: 'desc' },
                                select:  { entryNumber: true },
                            });

                            await tx.journalEntry.create({
                                data: {
                                    entryNumber:     (lastEntry2?.entryNumber || 0) + 1,
                                    date:            new Date(),
                                    description:     `تكلفة بضاعة مقسطة - خطة #${planNumber} - ${item.name}`,
                                    referenceType:   'installment_cogs',
                                    referenceId:     plan.id,
                                    financialYearId: currentYear.id,
                                    companyId,
                                    isPosted:        true,
                                    lines: {
                                        create: [
                                            {
                                                accountId:   cogsAcc.id,
                                                debit:       totalCost,
                                                credit:      0,
                                                description: `تكلفة ${item.name} × ${qty}`,
                                            },
                                            {
                                                accountId:   inventoryAcc.id,
                                                debit:       0,
                                                credit:      totalCost,
                                                description: `خصم مخزون ${item.name} × ${qty}`,
                                            },
                                        ],
                                    },
                                },
                            });
                        }

                        const stocks = await tx.stock.findMany({
                            where:   { itemId, quantity: { gt: 0 } },
                            orderBy: { updatedAt: 'asc' },
                        });

                        let remainingQty = qty;
                        for (const stock of stocks) {
                            if (remainingQty <= 0) break;
                            const deduct = Math.min(stock.quantity, remainingQty);

                            await tx.stock.update({
                                where: { id: stock.id },
                                data:  { quantity: { decrement: deduct } },
                            });

                            await tx.stockMovement.create({
                                data: {
                                    itemId,
                                    warehouseId: stock.warehouseId,
                                    type:        'out',
                                    date:        new Date(),
                                    quantity:    deduct,
                                    notes:       `بيع بالتقسيط - خطة #${planNumber}`,
                                    reference:   plan.id,
                                    companyId,
                                  },
                            });

                            remainingQty -= deduct;
                        }
                    }
                }
            }

            const start = new Date(startDate);
            let tempDate = new Date(start);

            for (let i = 1; i <= monthsCount; i++) {
                if (i > 1) {
                    tempDate.setMonth(tempDate.getMonth() + 1);
                }

                if (paymentType === 'seasonal' && activeMonths && Array.isArray(activeMonths) && activeMonths.length > 0) {
                    while (!activeMonths.includes(tempDate.getMonth() + 1)) {
                        tempDate.setMonth(tempDate.getMonth() + 1);
                    }
                }

                const dueDate = new Date(tempDate);

                await tx.installment.create({
                    data: {
                        planId:        plan.id,
                        installmentNo: i,
                        dueDate,
                        principal:     principalAmt,
                        interest:      interestAmt,
                        amount:        installAmt,
                        paidAmount:    0,
                        remaining:     installAmt,
                        status:        'pending',
                        companyId,
                    },
                });
            }

            if (down > 0 && currentYear && treasuryId) {
                const treasury = await tx.treasury.findUnique({
                    where:  { id: treasuryId },
                    select: { accountId: true },
                });

                const receivablesAcc = await tx.account.findFirst({
                    where: {
                        companyId, type: 'asset', accountCategory: 'detail',
                        OR: [
                            { name: { contains: 'ذمم'   } },
                            { name: { contains: 'عملاء' } },
                        ],
                    },
                });

                if (treasury?.accountId && receivablesAcc) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where:   { companyId },
                        orderBy: { entryNumber: 'desc' },
                        select:  { entryNumber: true },
                    });

                    await tx.journalEntry.create({
                        data: {
                            entryNumber:     (lastEntry?.entryNumber || 0) + 1,
                            date:            new Date(),
                            description:     `مقدم خطة تقسيط رقم ${planNumber} — ${(await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } }))?.name || ''}`,
                            referenceType:   'installment_down',
                            referenceId:     plan.id,
                            financialYearId: currentYear.id,
                            companyId,
                            isPosted:        true,
                            lines: {
                                create: [
                                    {
                                        accountId:   treasury.accountId,
                                        debit:       down,
                                        credit:      0,
                                        description: `مقدم تقسيط رقم ${planNumber}`,
                                    },
                                    {
                                        accountId:   receivablesAcc.id,
                                        debit:       0,
                                        credit:      down,
                                        description: `مقدم تقسيط رقم ${planNumber}`,
                                    },
                                ],
                            },
                        },
                    });

                    await tx.treasury.update({
                        where: { id: treasuryId },
                        data:  { balance: { increment: down } },
                    });

                    await tx.customer.update({
                        where: { id: customerId },
                        data:  { balance: { decrement: down } },
                    });
                }
            }

            return plan;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: 'فشل في إنشاء خطة التقسيط', details: error.message }, { status: 500 });
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
            // ① عكس رصيد العميل (grandTotal المضاف عند الإنشاء - المقدم المطروح)
            const netBalance = plan.grandTotal - plan.downPayment;
            if (netBalance > 0) {
                await tx.customer.update({
                    where: { id: plan.customerId },
                    data: { balance: { decrement: netBalance } },
                });
            }

            // ② حذف القيود المحاسبية المرتبطة بالخطة
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

            // ③ عكس حركات المخزون لو في صنف مرتبط
            const outMovements = await tx.stockMovement.findMany({
                where: { companyId, reference: id, type: 'out' },
            });
            for (const mv of outMovements) {
                await tx.stock.upsert({
                    where: { itemId_warehouseId: { itemId: mv.itemId, warehouseId: mv.warehouseId } },
                    update: { quantity: { increment: mv.quantity } },
                    create: { itemId: mv.itemId, warehouseId: mv.warehouseId, quantity: mv.quantity },
                });
                await tx.stockMovement.create({
                    data: {
                        type: 'in', date: new Date(),
                        itemId: mv.itemId, warehouseId: mv.warehouseId,
                        quantity: mv.quantity,
                        reference: id,
                        notes: `عكس بيع تقسيط - حذف خطة #${plan.planNumber}`,
                        companyId,
                    }
                });
            }

            // ④ احذف الخطة (الأقساط بتتحذف cascade)
            await tx.installmentPlan.delete({ where: { id } });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل في حذف الخطة' }, { status: 500 });
    }
});
