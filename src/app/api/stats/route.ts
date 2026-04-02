import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const branchFilter = activeBranchId && activeBranchId !== 'all' ? { branchId: activeBranchId } : {};

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const last7Days: { label: string; start: Date; end: Date }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d); start.setHours(0, 0, 0, 0);
            const end = new Date(d); end.setHours(23, 59, 59, 999);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            last7Days.push({ label: dayName, start, end });
        }

        const safeQuery = async (fn: any, fallback: any) => {
            try { return await fn(); }
            catch (e) { console.error("Query Error:", e); return fallback; }
        };

        const [
            customers,
            suppliers,
            items,
            treasuries,
            salesToday,
            salesTotal,
            purchasesTotal,
            lowStockItems,
            topDebtors,
            recentInvoices,
            expensesTotalData,
        ] = await Promise.all([
            safeQuery(() => prisma.customer.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.supplier.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.item.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.treasury.findMany({ where: { companyId, ...branchFilter }, select: { name: true, balance: true } }), []),
            safeQuery(() => prisma.invoice.findMany({
                where: { companyId, type: 'sale', date: { gte: startOfDay, lte: endOfDay }, ...branchFilter },
                select: { total: true }
            }), []),
            safeQuery(() => prisma.invoice.findMany({ where: { companyId, type: 'sale', ...branchFilter }, select: { total: true } }), []),
            safeQuery(() => prisma.invoice.findMany({ where: { companyId, type: 'purchase', ...branchFilter }, select: { total: true } }), []),
            safeQuery(() => prisma.stock.findMany({
                where: {
                    item: { companyId: companyId },
                    quantity: { lte: 10 }
                },
                include: { item: true, warehouse: true },
                orderBy: { quantity: 'asc' },
                take: 8
            }), []),
            safeQuery(() => prisma.customer.findMany({
                where: { companyId, balance: { gt: 0 } },
                select: { id: true, name: true, balance: true },
                orderBy: { balance: 'desc' },
                take: 5,
            }), []),
            safeQuery(() => prisma.invoice.findMany({
                where: { companyId, ...branchFilter },
                select: {
                    id: true, invoiceNumber: true, type: true, date: true, total: true,
                    customer: { select: { name: true } },
                    supplier: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }), []),
            safeQuery(() => prisma.invoice.aggregate({
                where: { companyId, type: 'payment', ...branchFilter },
                _sum: { total: true }
            }), { _sum: { total: 0 } }),
        ]);

        const chartData = await Promise.all(
            last7Days.map(async (day) => {
                const [daySales, dayPurchases, dayExpenses] = await Promise.all([
                    safeQuery(() => prisma.invoice.aggregate({
                        where: { companyId, type: 'sale', date: { gte: day.start, lte: day.end }, ...branchFilter },
                        _sum: { total: true },
                    }), { _sum: { total: 0 } }),
                    safeQuery(() => prisma.invoice.aggregate({
                        where: { companyId, type: 'purchase', date: { gte: day.start, lte: day.end }, ...branchFilter },
                        _sum: { total: true },
                    }), { _sum: { total: 0 } }),
                    safeQuery(() => prisma.invoice.aggregate({
                        where: { companyId, type: 'payment', date: { gte: day.start, lte: day.end }, ...branchFilter },
                        _sum: { total: true },
                    }), { _sum: { total: 0 } }),
                ]);
                return {
                    label: day.label,
                    sales: daySales._sum.total || 0,
                    purchases: dayPurchases._sum.total || 0,
                    expenses: dayExpenses._sum.total || 0,
                };
            })
        );

        const treasuriesBalance = treasuries.reduce((sum: number, t: { balance: number }) => sum + t.balance, 0);
        const salesTodayTotal = salesToday.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);
        const totalSalesAmount = salesTotal.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);
        const totalPurchasesAmount = purchasesTotal.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);
        const isServices = (session.user as any).businessType === 'SERVICES';
        const expensesTotal = expensesTotalData?._sum?.total || 0;

        return NextResponse.json({
            customers,
            suppliers,
            items,
            treasuriesBalance,
            salesTodayTotal,
            salesTotal: totalSalesAmount,
            purchasesTotal: totalPurchasesAmount,
            lowStockItems,
            topDebtors,
            recentInvoices,
            chartData,
            netProfit: isServices ? (totalSalesAmount - expensesTotal) : (totalSalesAmount - totalPurchasesAmount),
            treasuryList: treasuries,
            expensesTotal,
        });
    } catch (error: any) {
        console.error("Dashboard API Error DETAILS:", error);
        return NextResponse.json({ error: "فشل في سحب إحصائيات لوحة التحكم: " + (error.message || "خطأ مجهول") }, { status: 500 });
    }
});
