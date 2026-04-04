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
        const chartStart = new Date();
        chartStart.setDate(chartStart.getDate() - 6);
        chartStart.setHours(0, 0, 0, 0);

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

        // 12 queries بدل 32 - كل العمليات في Promise.all واحد
        const [
            customers,
            suppliers,
            items,
            treasuries,
            salesTodayAgg,
            salesTotalAgg,
            purchasesTotalAgg,
            expensesTotalData,
            lowStockItems,
            topDebtors,
            recentInvoices,
            invoicesLast7Days,
        ] = await Promise.all([
            safeQuery(() => prisma.customer.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.supplier.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.item.count({ where: { companyId } }), 0),
            safeQuery(() => prisma.treasury.findMany({ where: { companyId, ...branchFilter }, select: { name: true, balance: true } }), []),
            // aggregate بدل findMany للمبالغ
            safeQuery(() => prisma.invoice.aggregate({
                where: { companyId, type: 'sale', date: { gte: startOfDay, lte: endOfDay }, ...branchFilter },
                _sum: { total: true }
            }), { _sum: { total: 0 } }),
            safeQuery(() => prisma.invoice.aggregate({
                where: { companyId, type: 'sale', ...branchFilter },
                _sum: { total: true }
            }), { _sum: { total: 0 } }),
            safeQuery(() => prisma.invoice.aggregate({
                where: { companyId, type: 'purchase', ...branchFilter },
                _sum: { total: true }
            }), { _sum: { total: 0 } }),
            safeQuery(() => prisma.invoice.aggregate({
                where: { companyId, type: 'payment', ...branchFilter },
                _sum: { total: true }
            }), { _sum: { total: 0 } }),
            safeQuery(() => prisma.stock.findMany({
                where: { item: { companyId }, quantity: { lte: 10 } },
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
            // query واحد للـ chart بدل 21 query
            safeQuery(() => prisma.invoice.findMany({
                where: {
                    companyId,
                    type: { in: ['sale', 'purchase', 'payment'] },
                    date: { gte: chartStart },
                    ...branchFilter,
                },
                select: { type: true, date: true, total: true }
            }), []),
        ]);

        // تجميع بيانات الـ chart في JS بدل 21 query منفصلة
        const chartData = last7Days.map((day) => {
            const dayInvoices = (invoicesLast7Days as any[]).filter((inv: any) => {
                const d = new Date(inv.date);
                return d >= day.start && d <= day.end;
            });
            return {
                label: day.label,
                sales: dayInvoices.filter((i: any) => i.type === 'sale').reduce((s: number, i: any) => s + i.total, 0),
                purchases: dayInvoices.filter((i: any) => i.type === 'purchase').reduce((s: number, i: any) => s + i.total, 0),
                expenses: dayInvoices.filter((i: any) => i.type === 'payment').reduce((s: number, i: any) => s + i.total, 0),
            };
        });

        const treasuriesBalance = (treasuries as any[]).reduce((sum: number, t: any) => sum + t.balance, 0);
        const salesTodayTotal = (salesTodayAgg as any)?._sum?.total || 0;
        const totalSalesAmount = (salesTotalAgg as any)?._sum?.total || 0;
        const totalPurchasesAmount = (purchasesTotalAgg as any)?._sum?.total || 0;
        const isServices = (session.user as any).businessType === 'SERVICES';
        const expensesTotal = (expensesTotalData as any)?._sum?.total || 0;

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
