import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        // ✅ جلب العملاء مع حركاتهم لحساب الرصيد الفعلي (الديناميكي)
        const customers = await prisma.customer.findMany({
            where: { companyId },
            include: {
                invoices: {
                    where: { type: { in: ['sale', 'sale_return'] } },
                    select: { type: true, total: true }
                },
                vouchers: {
                    where: { type: { in: ['receipt', 'payment'] } },
                    select: { type: true, amount: true }
                },
                installmentPlans: {
                    select: { grandTotal: true, downPayment: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        const enhancedCustomers = customers.map(c => {
            return {
                ...c,
                invoices: undefined,
                vouchers: undefined,
                installmentPlans: undefined
            };
        });

        return NextResponse.json(enhancedCustomers);
    } catch (error) {
        console.error("GET Customers Error:", error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const openingBalance = parseFloat(body.openingBalance) || 0;
        const balanceType    = body.balanceType || 'debit';
        const signedBalance  = balanceType === 'credit'
            ? -Math.abs(openingBalance)
            :  Math.abs(openingBalance);

        const result = await prisma.$transaction(async (tx) => {
            // ① إنشاء العميل
            const customer = await tx.customer.create({
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

            // ② تسجيل الرصيد الافتتاحي في شجرة الحسابات
            if (openingBalance > 0) {
                const receivablesAccount = await tx.account.findFirst({
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
                    const currentYear = await tx.financialYear.findFirst({
                        where:   { companyId, isOpen: true },
                        orderBy: { startDate: 'desc' },
                    });

                    if (currentYear) {
                        const existing = await tx.openingBalance.findUnique({
                            where: {
                                accountId_financialYearId: {
                                    accountId:       receivablesAccount.id,
                                    financialYearId: currentYear.id,
                                },
                            },
                        });

                        if (existing) {
                            await tx.openingBalance.update({
                                where: { id: existing.id },
                                data: {
                                    debit:  balanceType === 'debit' ? existing.debit  + openingBalance : existing.debit,
                                    credit: balanceType === 'credit' ? existing.credit + openingBalance : existing.credit,
                                },
                            });
                        } else {
                            await tx.openingBalance.create({
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
            return customer;
        });

        return NextResponse.json(result, { status: 201 });
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

        const hasInvoices = await prisma.invoice.findFirst({ where: { customerId: id } });
        if (hasInvoices) return NextResponse.json({ error: 'لا يمكن حذف العميل لارتباطه بفواتير مسجلة' }, { status: 400 });

        const hasVouchers = await prisma.voucher.findFirst({ where: { customerId: id } });
        if (hasVouchers) return NextResponse.json({ error: 'لا يمكن حذف العميل لارتباطه بسندات قبض مسجلة' }, { status: 400 });

        await prisma.customer.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/customers Error:", error);
        return NextResponse.json({ error: 'فشل في حذف العميل' }, { status: 500 });
    }
});
