import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        
        // جلب الموردين مع حركاتهم الأساسية للمراجعة
        const suppliers = await prisma.supplier.findMany({
            where: { companyId },
            include: {
                invoices: {
                    where: { type: { in: ['purchase', 'purchase_return'] } },
                    select: { type: true, total: true, paidAmount: true }
                },
                vouchers: {
                    where: { type: { in: ['payment', 'receipt'] } },
                    select: { type: true, amount: true }
                }
            },
            orderBy: { createdAt: 'asc' },
        });

        const enhancedSuppliers = suppliers.map(s => {
            return {
                ...s,
                invoices: undefined,
                vouchers: undefined
            };
        });

        return NextResponse.json(enhancedSuppliers);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const openingBalance = parseFloat(body.openingBalance) || 0;
        const balanceType    = body.balanceType || 'credit';

        const signedBalance = balanceType === 'credit'
            ?  Math.abs(openingBalance)  // دائن (له فلوس)
            : -Math.abs(openingBalance); // مدين (عليه فلوس)

        const result = await prisma.$transaction(async (tx) => {
            // ① إنشاء المورد
            const supplier = await tx.supplier.create({
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
                    balance:         signedBalance,
                    companyId,
                },
            });

            // ② تسجيل الرصيد الافتتاحي في شجرة الحسابات
            if (openingBalance > 0) {
                const payablesAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        type: 'liability',
                        accountCategory: 'detail',
                        isParent: false,
                        OR: [
                            { name: { contains: 'موردين'    } },
                            { name: { contains: 'مورد'      } },
                            { name: { contains: 'دائنون'    } },
                            { name: { contains: 'ذمم دائنة' } },
                            { name: { contains: 'دائنة'     } },
                        ],
                    },
                    orderBy: { code: 'asc' },
                });

                if (payablesAccount) {
                    const currentYear = await tx.financialYear.findFirst({
                        where:   { companyId, isOpen: true },
                        orderBy: { startDate: 'desc' },
                    });

                    if (currentYear) {
                        const existing = await tx.openingBalance.findUnique({
                            where: {
                                accountId_financialYearId: {
                                    accountId:       payablesAccount.id,
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
                                    accountId:       payablesAccount.id,
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
            return supplier;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("POST /api/suppliers Error:", error);
        return NextResponse.json({ error: 'فشل في إنشاء المورد' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const supplier = await prisma.supplier.update({
            where: { id: body.id, companyId },
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
            },
        });
        return NextResponse.json(supplier);
    } catch {
        return NextResponse.json({ error: 'فشل في تعديل المورد' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'معرف المورد مطلوب' }, { status: 400 });

        const hasInvoices = await prisma.invoice.findFirst({ where: { supplierId: id, companyId } });
        if (hasInvoices) return NextResponse.json({ error: 'لا يمكن حذف المورد لارتباطه بمشتريات مسجلة' }, { status: 400 });

        const hasVouchers = await prisma.voucher.findFirst({ where: { supplierId: id, companyId } });
        if (hasVouchers) return NextResponse.json({ error: 'لا يمكن حذف المورد لارتباطه بسندات صرف مسجلة' }, { status: 400 });

        await prisma.supplier.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'فشل في حذف المورد' }, { status: 500 });
    }
});
