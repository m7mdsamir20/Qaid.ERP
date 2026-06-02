import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const user = session.user as any;
        const companyId = session.companyId || user?.companyId;
        const activeBranchId = session.branchId || user?.activeBranchId;
        const branchFilter = activeBranchId && activeBranchId !== 'all' ? { branchId: activeBranchId } : {};
        
        const projectWhere: any = { companyId, ...branchFilter };

        // 1. Projects Count by Status
        const [
            totalProjects,
            activeProjects,
            completedProjects,
            pausedProjects,
            cancelledProjects
        ] = await Promise.all([
            prisma.project.count({ where: projectWhere }),
            prisma.project.count({ where: { ...projectWhere, status: 'active' } }),
            prisma.project.count({ where: { ...projectWhere, status: 'completed' } }),
            prisma.project.count({ where: { ...projectWhere, status: 'paused' } }),
            prisma.project.count({ where: { ...projectWhere, status: 'cancelled' } }),
        ]);

        // 2. Financial Aggregates from Projects Model
        const projectFinances = await prisma.project.aggregate({
            where: projectWhere,
            _sum: {
                contractValue: true,
                estimatedCost: true,
                actualCost: true,
                expectedProfit: true,
            }
        });

        // 3. Progress Bills Aggregates
        const progressBillWhere = {
            companyId,
            project: {
                companyId,
                ...branchFilter
            }
        };
        const progressBillFinances = await prisma.progressBill.aggregate({
            where: progressBillWhere,
            _sum: {
                subtotal: true,
                retentionAmount: true,
                advanceDeduction: true,
                otherDeductions: true,
                netAmount: true,
                paidAmount: true,
                remaining: true,
            }
        });

        // 4. Subcontractor and Subcontracts Aggregates
        const totalSubcontractors = await prisma.subcontractor.count({
            where: { companyId }
        });

        const subContractsFinances = await prisma.subContract.aggregate({
            where: {
                companyId,
                project: {
                    companyId,
                    ...branchFilter
                }
            },
            _sum: {
                contractValue: true,
                paidAmount: true,
                remaining: true,
            }
        });

        // 5. Invoices associated with Projects (Expenses vs Revenues)
        const invoiceAggregates = await prisma.invoice.groupBy({
            by: ['type'],
            where: {
                companyId,
                projectId: { not: null },
                project: {
                    companyId,
                    ...branchFilter
                }
            },
            _sum: {
                total: true
            }
        });

        const projectSalesTotal = invoiceAggregates.find(i => i.type === 'sale')?._sum?.total || 0;
        const projectPurchasesTotal = invoiceAggregates.find(i => i.type === 'purchase')?._sum?.total || 0;

        // 6. Project Type Distribution
        const typeDistribution = await prisma.project.groupBy({
            by: ['projectType'],
            where: projectWhere,
            _count: { id: true },
            _sum: { contractValue: true }
        });

        // 7. Top Projects by Contract Value
        const topProjects = await prisma.project.findMany({
            where: projectWhere,
            orderBy: { contractValue: 'desc' },
            take: 5,
            include: {
                customer: { select: { name: true } },
                manager: { select: { name: true } }
            }
        });

        // 8. Top Subcontractors by Balance
        const topSubcontractors = await prisma.subcontractor.findMany({
            where: { companyId },
            orderBy: { balance: 'desc' },
            take: 5
        });

        // 9. Chart Data (Monthly Progress Billing vs Subcontractor Payments for the last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [monthlyBills, monthlySubcontracts] = await Promise.all([
            prisma.progressBill.findMany({
                where: {
                    ...progressBillWhere,
                    date: { gte: sixMonthsAgo }
                },
                select: {
                    date: true,
                    netAmount: true,
                    paidAmount: true
                }
            }),
            prisma.subContract.findMany({
                where: {
                    companyId,
                    project: {
                        companyId,
                        ...branchFilter
                    },
                    createdAt: { gte: sixMonthsAgo } // Subcontracts don't have a date field, using createdAt
                },
                select: {
                    createdAt: true,
                    contractValue: true,
                    paidAmount: true
                }
            })
        ]);

        // Construct month keys in chronological order
        const last6MonthsLabels: string[] = [];
        const monthlySummary: Record<string, { billed: number, billedPaid: number, subcontractVal: number, subcontractPaid: number }> = {};

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            // Format to Arabic: e.g. "يونيو 2026"
            const label = d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            last6MonthsLabels.push(label);
            monthlySummary[label] = { billed: 0, billedPaid: 0, subcontractVal: 0, subcontractPaid: 0 };
        }

        // Aggregate progress bills into months
        monthlyBills.forEach(bill => {
            const label = new Date(bill.date).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            if (monthlySummary[label]) {
                monthlySummary[label].billed += bill.netAmount || 0;
                monthlySummary[label].billedPaid += bill.paidAmount || 0;
            }
        });

        // Aggregate subcontracts into months
        monthlySubcontracts.forEach(contract => {
            const label = new Date(contract.createdAt).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
            if (monthlySummary[label]) {
                monthlySummary[label].subcontractVal += contract.contractValue || 0;
                monthlySummary[label].subcontractPaid += contract.paidAmount || 0;
            }
        });

        const chartData = last6MonthsLabels.map(label => ({
            month: label,
            ...monthlySummary[label]
        }));

        return NextResponse.json({
            projects: {
                total: totalProjects,
                active: activeProjects,
                completed: completedProjects,
                paused: pausedProjects,
                cancelled: cancelledProjects,
            },
            finances: {
                contractValue: projectFinances._sum?.contractValue || 0,
                estimatedCost: projectFinances._sum?.estimatedCost || 0,
                actualCost: projectFinances._sum?.actualCost || 0,
                expectedProfit: projectFinances._sum?.expectedProfit || 0,
                
                // Progress bills totals
                totalBilled: progressBillFinances._sum?.netAmount || 0,
                totalBilledPaid: progressBillFinances._sum?.paidAmount || 0,
                totalBilledRemaining: progressBillFinances._sum?.remaining || 0,
                retentionAmount: progressBillFinances._sum?.retentionAmount || 0,
                advanceDeduction: progressBillFinances._sum?.advanceDeduction || 0,
                otherDeductions: progressBillFinances._sum?.otherDeductions || 0,

                // Invoice relations
                projectSalesTotal,
                projectPurchasesTotal,
            },
            subcontractors: {
                total: totalSubcontractors,
                contractValue: subContractsFinances._sum?.contractValue || 0,
                paidAmount: subContractsFinances._sum?.paidAmount || 0,
                remaining: subContractsFinances._sum?.remaining || 0,
            },
            typeDistribution,
            topProjects,
            topSubcontractors,
            chartData
        });

    } catch (error: any) {
        console.error("[Projects Stats API Error]:", error);
        return NextResponse.json({ error: error.message || "فشل في معالجة إحصائيات المشاريع" }, { status: 500 });
    }
});
