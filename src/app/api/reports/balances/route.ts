import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');

        const invoiceFilter: any = { companyId };
        const voucherFilter: any = { companyId };
        const planFilter: any = { companyId };
        if (branchId && branchId !== 'all') {
            invoiceFilter.branchId = branchId;
            voucherFilter.branchId = branchId;
            planFilter.branchId = branchId;
        }

        const [invoices, vouchers, plans, dbCustomers, dbSuppliers] = await Promise.all([
            prisma.invoice.findMany({
                where: invoiceFilter,
                select: { customerId: true, supplierId: true, total: true, type: true }
            }),
            prisma.voucher.findMany({
                where: voucherFilter,
                select: { customerId: true, supplierId: true, amount: true, type: true }
            }),
            prisma.installmentPlan.findMany({
                where: planFilter,
                select: { customerId: true, grandTotal: true, downPayment: true }
            }),
            prisma.customer.findMany({
                where: { companyId },
                select: { id: true, name: true, phone: true, balance: true }
            }),
            prisma.supplier.findMany({
                where: { companyId },
                select: { id: true, name: true, phone: true, balance: true }
            })
        ]);

        const customerBalances: Record<string, number> = {};
        const supplierBalances: Record<string, number> = {};

        const useDynamic = branchId && branchId !== 'all';

        if (useDynamic) {
            dbCustomers.forEach(c => { customerBalances[c.id] = 0; });
            dbSuppliers.forEach(s => { supplierBalances[s.id] = 0; });

            invoices.forEach(inv => {
                if (inv.customerId) {
                    if (inv.type === 'sale') customerBalances[inv.customerId] = (customerBalances[inv.customerId] || 0) + inv.total;
                    if (inv.type === 'sale_return') customerBalances[inv.customerId] = (customerBalances[inv.customerId] || 0) - inv.total;
                }
                if (inv.supplierId) {
                    if (inv.type === 'purchase') supplierBalances[inv.supplierId] = (supplierBalances[inv.supplierId] || 0) + inv.total;
                    if (inv.type === 'purchase_return') supplierBalances[inv.supplierId] = (supplierBalances[inv.supplierId] || 0) - inv.total;
                }
            });

            vouchers.forEach(v => {
                if (v.customerId) {
                    if (v.type === 'receipt') customerBalances[v.customerId] = (customerBalances[v.customerId] || 0) - v.amount;
                    if (v.type === 'payment') customerBalances[v.customerId] = (customerBalances[v.customerId] || 0) + v.amount;
                }
                if (v.supplierId) {
                    if (v.type === 'receipt') supplierBalances[v.supplierId] = (supplierBalances[v.supplierId] || 0) + v.amount;
                    if (v.type === 'payment') supplierBalances[v.supplierId] = (supplierBalances[v.supplierId] || 0) - v.amount;
                }
            });

            plans.forEach(p => {
                if (p.customerId) {
                    customerBalances[p.customerId] = (customerBalances[p.customerId] || 0) + (p.grandTotal - p.downPayment);
                }
            });
        } else {
            dbCustomers.forEach(c => { customerBalances[c.id] = c.balance; });
            dbSuppliers.forEach(s => { supplierBalances[s.id] = s.balance; });
        }

        const combined = [
            ...dbCustomers.map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                balance: customerBalances[c.id] || 0,
                type: 'عميل',
                partnerType: 'customer' as const
            })),
            ...dbSuppliers.map(s => ({
                id: s.id,
                name: s.name,
                phone: s.phone,
                balance: supplierBalances[s.id] || 0,
                type: 'مورد',
                partnerType: 'supplier' as const
            }))
        ];

        combined.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

        return NextResponse.json({
            data: combined,
            totalCustomerBalance: dbCustomers.reduce((sum, c) => sum + (customerBalances[c.id] || 0), 0),
            totalSupplierBalance: dbSuppliers.reduce((sum, s) => sum + (supplierBalances[s.id] || 0), 0)
        });

    } catch (error) {
        console.error("Balances API Error:", error);
        return NextResponse.json({ error: "فشل استخراج التقرير" }, { status: 500 });
    }
});

