import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        const { searchParams } = request.nextUrl;
        const dateParam = searchParams.get('date');
        const branchId = searchParams.get('branchId');
        const targetDate = dateParam ? new Date(dateParam) : new Date();

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const branchFilter = branchId && branchId !== 'all' ? { branchId } : {};

        const whereToday = {
            companyId,
            date: { gte: startOfDay, lte: endOfDay },
            ...branchFilter
        };

        // 1. Sales Invoices
        const sales = await prisma.invoice.findMany({
            where: { ...whereToday, type: 'sale' },
            select: { total: true, paidAmount: true, remaining: true }
        });

        // 2. Purchase Invoices
        const purchases = await prisma.invoice.findMany({
            where: { ...whereToday, type: 'purchase' },
            select: { total: true, paidAmount: true, remaining: true }
        });

        // 3. Vouchers
        const vouchers = await prisma.voucher.findMany({
            where: whereToday,
            include: { treasury: true }
        });

        // 4. Treasury Balances
        const treasuries = await prisma.treasury.findMany({
            where: { companyId, ...branchFilter }
        });

        // 5. Returns
        const saleReturns = await prisma.invoice.findMany({
            where: { ...whereToday, type: 'sale_return' },
            select: { total: true }
        });
        const purchaseReturns = await prisma.invoice.findMany({
            where: { ...whereToday, type: 'purchase_return' },
            select: { total: true }
        });

        const report = {
            salesCount: sales.length,
            totalSales: sales.reduce((sum, s) => sum + s.total, 0),
            salesPaid: sales.reduce((sum, s) => sum + s.paidAmount, 0),

            purchasesCount: purchases.length,
            totalPurchases: purchases.reduce((sum, p) => sum + p.total, 0),
            purchasesPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),

            receipts: vouchers.filter(v => v.type === 'receipt').reduce((sum, v) => sum + v.amount, 0),
            payments: vouchers.filter(v => v.type === 'payment').reduce((sum, v) => sum + v.amount, 0),

            saleReturnsTotal: saleReturns.reduce((sum, r) => sum + r.total, 0),
            purchaseReturnsTotal: purchaseReturns.reduce((sum, r) => sum + r.total, 0),

            treasuries: treasuries.map(t => ({
                name: t.name,
                type: t.type,
                balance: t.balance
            })),

            totalCashBalance: treasuries.filter(t => t.type === 'cash').reduce((sum, t) => sum + t.balance, 0),
            totalBankBalance: treasuries.filter(t => t.type === 'bank').reduce((sum, t) => sum + t.balance, 0),
        };

        return NextResponse.json(report);
    } catch (error) {
        console.error("Daily Report API Error:", error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
});

