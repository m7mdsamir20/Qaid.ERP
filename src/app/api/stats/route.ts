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

        const isServices = user.businessType === 'SERVICES';

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
            recentInvoicesRaw,
            recentVouchersRaw,
            recentPlansRaw,
            chartRawData,
            chartVoucherRawData,
        ] = await Promise.all([
            // Counts
            Promise.all([
                safeQuery(() => prisma.customer.count({ where: { companyId } }), 0),
                safeQuery(() => prisma.supplier.count({ where: { companyId } }), 0),
                safeQuery(() => prisma.item.count({ where: { companyId } }), 0),
            ]),
            // Treasuries
            Promise.all([
                safeQuery(() => prisma.treasury.aggregate({
                    where: { companyId, ...branchFilter },
                    _sum: { balance: true }
                }), { _sum: { balance: 0 } }),
                safeQuery(() => prisma.treasury.findMany({
                    where: { companyId, ...branchFilter },
                    select: { name: true, balance: true },
                    orderBy: { balance: 'desc' }
                }), []),
            ]),
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
                isServices
                    ? safeQuery(() => prisma.journalEntryLine.aggregate({
                        where: {
                            debit: { gt: 0 },
                            journalEntry: {
                                companyId,
                                referenceType: 'other_expense',
                                date: { gte: startDate, lte: endDate },
                            },
                        },
                        _sum: { debit: true }
                    }), { _sum: { debit: 0 } })
                    : safeQuery(() => prisma.invoice.aggregate({
                        where: { companyId, type: 'payment', ...dateFilter, ...branchFilter },
                        _sum: { total: true }
                    }), { _sum: { total: 0 } }),
            ]),
            // Alerts & Data (Fixed to match reorderLevel and aggregate per item)
            safeQuery(async () => {
                const items = await prisma.item.findMany({
                    where: { companyId },
                    include: { stocks: true }
                });
                return items.filter(i => {
                    const total = i.stocks.reduce((acc, s) => acc + s.quantity, 0);
                    return total <= (i.minLimit || 0);
                }).map(i => {
                    const total = i.stocks.reduce((acc, s) => acc + s.quantity, 0);
                    return {
                        id: i.id,
                        item: { name: i.name, code: i.code },
                        quantity: (Math.abs(total) < 0.001) ? 0 : total
                    };
                }).slice(0, 6);
            }, []),
            safeQuery(() => prisma.customer.findMany({
                where: { companyId, balance: { gt: 0 } },
                select: { id: true, name: true, balance: true },
                orderBy: { balance: 'desc' },
                take: 5,
            }), []),
            // Recent Invoices
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
            // Recent Vouchers
            safeQuery(() => prisma.voucher.findMany({
                where: { companyId, ...branchFilter },
                select: {
                    id: true, voucherNumber: true, type: true, date: true, amount: true,
                    customer: { select: { name: true } },
                    supplier: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }), []),
            // Recent Installment Plans
            safeQuery(() => prisma.installmentPlan.findMany({
                where: { companyId, ...branchFilter },
                select: {
                    id: true, planNumber: true, startDate: true, grandTotal: true,
                    customer: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }), []),
            // Chart Data (Invoices)
            safeQuery(() => prisma.invoice.findMany({
                where: {
                    companyId,
                    type: { in: ['sale', 'purchase', 'payment'] },
                    date: { gte: chartStart },
                    ...branchFilter,
                },
                select: { type: true, date: true, total: true }
            }), []),
            // Chart Data (Vouchers)
            safeQuery(() => prisma.voucher.findMany({
                where: {
                    companyId,
                    date: { gte: chartStart },
                    ...branchFilter,
                },
                select: { type: true, date: true, amount: true }
            }), []),
        ]);

        // Merge and Sort Recent Transactions
        const recentInvoices = [
            ...recentInvoicesRaw,
            ...recentVouchersRaw.map((v: any) => ({
                id: v.id, invoiceNumber: v.voucherNumber, 
                type: (v.description?.includes('قسط') || v.description?.includes('Installment')) ? 'installment_receipt' : v.type, 
                date: v.date, total: v.amount,
                customer: v.customer, supplier: v.supplier
            })),
            ...recentPlansRaw.map((p: any) => ({
                id: p.id, invoiceNumber: p.planNumber, type: 'installment' as any, date: p.startDate, total: p.grandTotal,
                customer: p.customer, supplier: null
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        // 3. معالجة بيانات الرسم البياني بكفاءة O(n)
        const dailySummary: Record<string, { sales: number, purchases: number, expenses: number }> = {};
        
        chartRawData.forEach((inv: any) => {
            const dateKey = new Date(inv.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (!dailySummary[dateKey]) dailySummary[dateKey] = { sales: 0, purchases: 0, expenses: 0 };
            if (inv.type === 'sale') dailySummary[dateKey].sales += inv.total;
            else if (inv.type === 'purchase') dailySummary[dateKey].purchases += inv.total;
            else if (inv.type === 'payment') dailySummary[dateKey].expenses += inv.total;
        });

        chartVoucherRawData.forEach((v: any) => {
            const dateKey = new Date(v.date).toLocaleDateString('en-US', { weekday: 'short' });
            if (!dailySummary[dateKey]) dailySummary[dateKey] = { sales: 0, purchases: 0, expenses: 0 };
            if (v.type === 'receipt') dailySummary[dateKey].sales += v.amount;
            else if (v.type === 'payment') dailySummary[dateKey].expenses += v.amount;
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
        const expensesTotal = isServices
            ? (kpis[2]._sum?.debit || 0)
            : (kpis[2]._sum?.total || 0);

        return NextResponse.json({
            customers: counts[0],
            suppliers: counts[1],
            items: counts[2],
            treasuriesBalance: treasuryBalanceData[0]._sum?.balance || 0,
            treasuryList: treasuryBalanceData[1],
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
