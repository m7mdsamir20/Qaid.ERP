import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const suppliers = await prisma.supplier.findMany({
            where: { companyId },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(suppliers);
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
            ?  Math.abs(openingBalance)  // دائن (له فلوس) => موجب في حسابات الموردين
            : -Math.abs(openingBalance); // مدين (عليه فلوس - دفعة مقدمة) => سالب

        const supplier = await prisma.supplier.create({
            data: {
                name:          body.name,
                phone:         body.phone         || null,
                address:       body.address       || null,
                type:          body.type          || 'individual',
                taxNumber:     body.taxNumber     || null,
                crNumber:      body.crNumber      || null,
                contactPerson: body.contactPerson || null,
                balance:       signedBalance,
                companyId,
            },
        });

        if (openingBalance > 0) {
            const payablesAccount = await prisma.account.findFirst({
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
                const currentYear = await prisma.financialYear.findFirst({
                    where:   { companyId, isOpen: true },
                    orderBy: { startDate: 'desc' },
                });

                if (currentYear) {
                    const existing = await prisma.openingBalance.findUnique({
                        where: {
                            accountId_financialYearId: {
                                accountId:       payablesAccount.id,
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

        return NextResponse.json(supplier, { status: 201 });
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
                name:          body.name,
                phone:         body.phone         || null,
                address:       body.address       || null,
                type:          body.type          || 'individual',
                taxNumber:     body.taxNumber     || null,
                crNumber:      body.crNumber      || null,
                contactPerson: body.contactPerson || null,
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

        // ① تحقق من فواتير (مشتريات)
        const hasInvoices = await prisma.invoice.findFirst({ where: { supplierId: id, companyId } });
        if (hasInvoices) return NextResponse.json({ 
            error: 'لا يمكن حذف المورد لارتباطه بفواتير مسجلة' 
        }, { status: 400 });

        // ② تحقق من سندات (صرف)
        const hasVouchers = await prisma.voucher.findFirst({ where: { supplierId: id, companyId } });
        if (hasVouchers) return NextResponse.json({ 
            error: 'لا يمكن حذف المورد لارتباطه بسندات صرف مسجلة' 
        }, { status: 400 });

        // ③ جيب حساب الموردين في الشجرة (باستخدام نفس فلاتر الإنشاء لضمان المطابقة)
        const payablesAccount = await prisma.account.findFirst({
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

        // ④ جيب السنة المالية المفتوحة
        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });

        // ⑤ لو في حساب وسنة مالية — عدّل الرصيد الافتتاحي
        if (payablesAccount && currentYear) {
            const ob = await prisma.openingBalance.findUnique({
                where: {
                    accountId_financialYearId: {
                        accountId: payablesAccount.id,
                        financialYearId: currentYear.id,
                    },
                },
            });

            if (ob) {
                const supplier = await prisma.supplier.findFirst({ 
                    where: { id, companyId } 
                });
                
                if (supplier) {
                    // احسب الرصيد الافتتاحي عبر عكس أثر الحركات (للموردين تكون الفاتورة سلبية والسند إيجابي)
                    const allInvoices = await prisma.invoice.findMany({ where: { supplierId: id, companyId } });
                    const allVouchers = await prisma.voucher.findMany({ where: { supplierId: id, companyId } });

                    let transactionEffect = 0;
                    allInvoices.forEach((inv: any) => {
                        // المشتريات تزيد مديونية المورد (+)، والمرتجع ينقصها (-)
                        if (inv.type === 'purchase') transactionEffect += (inv.total - inv.paidAmount);
                        if (inv.type === 'purchase_return') transactionEffect -= (inv.total - inv.paidAmount);
                    });
                    allVouchers.forEach((v: any) => {
                        // الصرف للمورد ينقص مديونيته (-)، والقبض منه يزيدها (+)
                        if (v.type === 'payment') transactionEffect -= v.amount;
                        if (v.type === 'receipt') transactionEffect += v.amount;
                    });

                    const originalOpeningBalance = supplier.balance - transactionEffect;
                    const openingAmt = Math.abs(originalOpeningBalance);
                    const isDebit = originalOpeningBalance < 0; // "عليه فلوس" (مدين) للمورد يكون سالباً

                    if (openingAmt > 0) {
                        const newDebit  = isDebit  ? Math.max(0, ob.debit  - openingAmt) : ob.debit;
                        const newCredit = !isDebit ? Math.max(0, ob.credit - openingAmt) : ob.credit;

                        if (newDebit <= 0.01 && newCredit <= 0.01) {
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

        // ⑥ احذف المورد عاديا
        await prisma.supplier.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/suppliers Error:", error);
        return NextResponse.json({ error: 'فشل في حذف المورد' }, { status: 500 });
    }
});
