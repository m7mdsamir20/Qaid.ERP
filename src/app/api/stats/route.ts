import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'today';
        const user = session.user as any;
        const companyId = user.companyId;
        const activeBranchId = user.activeBranchId;
        const branchFilter = activeBranchId && activeBranchId !== 'all' ? { branchId: activeBranchId } : {};

        // 1. حساب النطاقات الزمنية (Caching current time for precision)
        const now = new Date();
        let startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        let endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setDate(1); 
        }
        
        const dateFilter = { date: { gte: startDate, lte: endDate } };
        const chartStart = new Date(now);
        chartStart.setDate(chartStart.getDate() - 6);
        chartStart.setHours(0, 0, 0, 0);

        const safeQuery = async (fn: any, fallback: any) => {
            try { return await fn(); }
            catch (e) { return fallback; }
        };

        // 2. طلب البيانات بشكل متوازي (Unified & Fast)
        const [
            counts,
            treasuryBalanceData,
            kpis,
            lowStockItems,
            topDebtors,
            recentInvoices,
            chartRawData,
        ] = await Promise.all([
            // Counts
            Promise.all([
                safeQuery(() => prisma.customer.count({ where: { companyId } }), 0),
                safeQuery(() => prisma.supplier.count({ where: { companyId } }), 0),
                safeQuery(() => prisma.item.count({ where: { companyId } }), 0),
            ]),
            // Treasuries
            safeQuery(() => prisma.treasury.aggregate({ 
                where: { companyId, ...branchFilter },
                _sum: { balance: true }
            }), { _sum: { balance: 0 } }),
            // Period KPIs
            Promise.all([
                safeQuery(() => prisma.invoice.aggregate({
                    where: { companyId, type: 'sale', ...dateFilter, ...branchFilter },
                    _sum: { total: true }
                }), { _sum: { total: 0 } }),
                safeQuery(() => prisma.invoice.aggregate({
                    where: { companyId, type: 'purchase', ...dateFilter, ...branchFilter },
                    _sum: { total: true }
                }), { _sum: { total: 0 } }),
                safeQuery(() => prisma.invoice.aggregate({
                    where: { companyId, type: 'payment', ...dateFilter, ...branchFilter },
                    _sum: { total: true }
                }), { _sum: { total: 0 } }),
            ]),
            // Alerts & Data
            safeQuery(() => prisma.stock.findMany({
                where: { quantity: { lte: 10 }, item: { companyId } },
                include: { item: { select: { name: true, code: true } }, warehouse: { select: { name: true } } },
                orderBy: { quantity: 'asc' },
                take: 6
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
            // Chart Data
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

        // 3. معالجة بيانات الرسم البياني بكفاءة O(n)
        const dailySummary: Record<string, { sales: number, purchases: number, expenses: number }> = {};
        chartRawData.forEach((inv: any) => {
            const dateKey = new Date(inv.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (!dailySummary[dateKey]) dailySummary[dateKey] = { sales: 0, purchases: 0, expenses: 0 };
            if (inv.type === 'sale') dailySummary[dateKey].sales += inv.total;
            else if (inv.type === 'purchase') dailySummary[dateKey].purchases += inv.total;
            else if (inv.type === 'payment') dailySummary[dateKey].expenses += inv.total;
        });

        const last7DaysLabels = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            last7DaysLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        const chartData = last7DaysLabels.map(label => ({
            label,
            ...(dailySummary[label] || { sales: 0, purchases: 0, expenses: 0 })
        }));

        const salesTotal = kpis[0]._sum?.total || 0;
        const purchasesTotal = kpis[1]._sum?.total || 0;
        const expensesTotal = kpis[2]._sum?.total || 0;
        const isServices = user.businessType === 'SERVICES';

        return NextResponse.json({
            customers: counts[0],
            suppliers: counts[1],
            items: counts[2],
            treasuriesBalance: treasuryBalanceData._sum?.balance || 0,
            salesTodayTotal: salesTotal,
            salesTotal: salesTotal,
            purchasesTotal: purchasesTotal,
            lowStockItems,
            topDebtors,
            recentInvoices,
            chartData,
            netProfit: isServices ? (salesTotal - expensesTotal) : (salesTotal - purchasesTotal),
            expensesTotal,
        });
    } catch (error: any) {
        console.error("[Stats API Cache Error]:", error);
        return NextResponse.json({ error: "فشل في معالجة إحصائيات لوحة التحكم" }, { status: 500 });
    }
}, { cache: 30 });
