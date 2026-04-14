import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const customers = await prisma.customer.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(customers);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const openingBalance = parseFloat(body.openingBalance) || 0;
        const balanceType    = body.balanceType || 'debit';
        const signedBalance  = balanceType === 'credit'
            ? -Math.abs(openingBalance) // دائن (دفع مقدم / له عندنا) => سالب
            :  Math.abs(openingBalance);  // مدين (مديونية / عليه لنا) => موجب

        // ① إنشاء العميل
        const customer = await prisma.customer.create({
            data: {
                name:            body.name,
                phone:           body.phone           || null,
                addressRegion:   body.addressRegion   || null,
                addressCity:     body.addressCity     || null,
                addressDistrict: body.addressDistrict || null,
                addressStreet:   body.addressStreet   || null,
                type:            body.type            || 'individual',
                taxNumber:     body.taxNumber     || null,
                crNumber:      body.crNumber      || null,
                contactPerson: body.contactPerson || null,
                balance:       signedBalance,
                creditLimit:   parseFloat(body.creditLimit) || 0,
                companyId,
            },
        });

        // ② لو في رصيد افتتاحي — سجّله في OpeningBalance
        if (openingBalance > 0) {
            const receivablesAccount = await prisma.account.findFirst({
                where: {
                    companyId,
                    type: 'asset',
                    accountCategory: 'detail',
                    isParent: false,
                    OR: [
                        { name: { contains: 'عملاء' } },
                        { name: { contains: 'ذمم'   } },
                        { name: { contains: 'مدينون' } },
                    ],
                },
                orderBy: { code: 'asc' },
            });

            if (receivablesAccount) {
                const currentYear = await prisma.financialYear.findFirst({
                    where:   { companyId, isOpen: true },
                    orderBy: { startDate: 'desc' },
                });

                if (currentYear) {
                    const existing = await prisma.openingBalance.findUnique({
                        where: {
                            accountId_financialYearId: {
                                accountId:       receivablesAccount.id,
                                financialYearId: currentYear.id,
                            },
                        },
                    });

                    if (existing) {
                        await prisma.openingBalance.update({
                            where: { id: existing.id },
                            data: {
                                debit:  balanceType === 'debit'
                                    ? existing.debit  + openingBalance
                                    : existing.debit,
                                credit: balanceType === 'credit'
                                    ? existing.credit + openingBalance
                                    : existing.credit,
                            },
                        });
                    } else {
                        await prisma.openingBalance.create({
                            data: {
                                accountId:       receivablesAccount.id,
                                financialYearId: currentYear.id,
                                debit:           balanceType === 'debit'  ? openingBalance : 0,
                                credit:          balanceType === 'credit' ? openingBalance : 0,
                                companyId,
                            },
                        });
                    }
                }
            }
        }

        return NextResponse.json(customer, { status: 201 });
    } catch (error) {
        console.error("POST /api/customers Error:", error);
        return NextResponse.json({ error: 'فشل في إنشاء العميل' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const customer = await prisma.customer.update({
            where: { id: body.id, companyId: (session.user as any).companyId },
            data: {
                name:            body.name,
                phone:           body.phone           || null,
                addressRegion:   body.addressRegion   || null,
                addressCity:     body.addressCity     || null,
                addressDistrict: body.addressDistrict || null,
                addressStreet:   body.addressStreet   || null,
                type:            body.type            || 'individual',
                taxNumber:       body.taxNumber       || null,
                crNumber:        body.crNumber        || null,
                contactPerson:   body.contactPerson   || null,
                creditLimit:     parseFloat(body.creditLimit) || 0,
            },
        });
        return NextResponse.json(customer);
    } catch {
        return NextResponse.json({ error: 'فشل في تعديل العميل' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'معرف العميل مطلوب' }, { status: 400 });

        // ① تحقق من فواتير
        const hasInvoices = await prisma.invoice.findFirst({ where: { customerId: id } });
        if (hasInvoices) return NextResponse.json({ 
            error: 'لا يمكن حذف العميل لارتباطه بفواتير مسجلة' 
        }, { status: 400 });

        // ② تحقق من سندات
        const hasVouchers = await prisma.voucher.findFirst({ where: { customerId: id } });
        if (hasVouchers) return NextResponse.json({ 
            error: 'لا يمكن حذف العميل لارتباطه بسندات قبض مسجلة' 
        }, { status: 400 });

        // ③ جيب حساب العملاء في الشجرة
        const receivablesAccount = await prisma.account.findFirst({
            where: { companyId, name: { contains: 'عملاء' } },
            orderBy: { code: 'asc' },
        });

        // ④ جيب السنة المالية المفتوحة
        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });

        // ⑤ لو في حساب وسنة مالية — عدّل الرصيد الافتتاحي
        if (receivablesAccount && currentYear) {
            const ob = await prisma.openingBalance.findUnique({
                where: {
                    accountId_financialYearId: {
                        accountId: receivablesAccount.id,
                        financialYearId: currentYear.id,
                    },
                },
            });

            if (ob) {
                // جيب الرصيد الافتتاحي الأصلي للعميل من الـ OpeningBalance
                // مش من customer.balance عشان balance بيشمل الفواتير
                const customer = await prisma.customer.findFirst({ 
                    where: { id, companyId } 
                });
                
                if (customer) {
                    // احسب الرصيد الافتتاحي الأصلي من الحركات (لزيادة الأمان المحاسبي)
                    const allInvoices = await prisma.invoice.findMany({ where: { customerId: id } });
                    const allVouchers = await prisma.voucher.findMany({ where: { customerId: id } });

                    let transactionEffect = 0;
                    allInvoices.forEach((inv: any) => {
                        if (inv.type === 'sale') transactionEffect += (inv.total - inv.paidAmount);
                        if (inv.type === 'sale_return') transactionEffect -= (inv.total - inv.paidAmount);
                    });
                    allVouchers.forEach((v: any) => {
                        if (v.type === 'receipt') transactionEffect -= v.amount;
                        if (v.type === 'payment') transactionEffect += v.amount;
                    });

                    const originalOpeningBalance = customer.balance - transactionEffect;
                    const openingAmt = Math.abs(originalOpeningBalance);
                    const isDebit = originalOpeningBalance > 0; // الرصيد الموجب هو مدين (عليه لنا)

                    if (openingAmt > 0) {
                        const newDebit  = isDebit  ? Math.max(0, ob.debit  - openingAmt) : ob.debit;
                        const newCredit = !isDebit ? Math.max(0, ob.credit - openingAmt) : ob.credit;

                        if (newDebit === 0 && newCredit === 0) {
                            await prisma.openingBalance.delete({ where: { id: ob.id } });
                        } else {
                            await prisma.openingBalance.update({
                                where: { id: ob.id },
                                data: { debit: newDebit, credit: newCredit },
                            });
                        }
                    }
                }
            }
        }

        // ⑥ احذف العميل
        await prisma.customer.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/customers Error:", error);
        return NextResponse.json({ error: 'فشل في حذف العميل' }, { status: 500 });
    }
});
