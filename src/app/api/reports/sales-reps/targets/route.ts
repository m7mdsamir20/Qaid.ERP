import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        
        const { searchParams } = new URL(request.url);
        const yearParam = searchParams.get('year');
        const monthParam = searchParams.get('month');
        const salesRepId = searchParams.get('salesRepId');

        const now = new Date();
        const year = yearParam ? parseInt(yearParam) : now.getFullYear();
        const month = monthParam ? parseInt(monthParam) : (now.getMonth() + 1);

        // Calculate month start/end dates
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // 1. Fetch representatives
        const repsWhere: any = { companyId };
        if (salesRepId && salesRepId !== 'all') {
            repsWhere.id = salesRepId;
        }
        const reps = await prisma.salesRepresentative.findMany({
            where: repsWhere,
            orderBy: { name: 'asc' }
        });

        // 2. Fetch targets for that month/year
        const targetWhere: any = {
            companyId,
            year,
            month
        };
        if (salesRepId && salesRepId !== 'all') {
            targetWhere.salesRepId = salesRepId;
        }

        const targets = await prisma.salesTarget.findMany({
            where: targetWhere,
            select: {
                salesRepId: true,
                targetAmount: true,
                targetCount: true
            }
        });

        // 3. Fetch actual sales (approved invoices) for that month
        const invoiceWhere: any = {
            companyId,
            status: 'approved',
            type: 'sale',
            date: {
                gte: startDate,
                lte: endDate
            }
        };
        if (salesRepId && salesRepId !== 'all') {
            invoiceWhere.salesRepresentativeId = salesRepId;
        } else {
            invoiceWhere.salesRepresentativeId = { not: null };
        }

        const invoices = await prisma.invoice.findMany({
            where: invoiceWhere,
            select: {
                total: true,
                salesRepresentativeId: true
            }
        });

        // 4. Combine targets and actual achievements
        const reportData = reps.map(rep => {
            const repTarget = targets.find(t => t.salesRepId === rep.id);
            const repInvoices = invoices.filter(inv => inv.salesRepresentativeId === rep.id);

            const targetAmount = repTarget?.targetAmount || 0;
            const actualSales = repInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const salesCount = repInvoices.length;
            
            const achievementPercent = targetAmount > 0 ? (actualSales / targetAmount) * 100 : 0;

            return {
                id: rep.id,
                name: rep.name,
                code: rep.code,
                targetAmount,
                actualSales,
                salesCount,
                achievementPercent
            };
        });

        const totalTarget = reportData.reduce((sum, r) => sum + r.targetAmount, 0);
        const totalAchieved = reportData.reduce((sum, r) => sum + r.actualSales, 0);
        const overallAchievementPercent = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

        return NextResponse.json({
            reportData,
            summary: {
                totalTarget,
                totalAchieved,
                percent: overallAchievementPercent,
                year,
                month
            }
        });
    } catch (error) {
        console.error("Sales Rep Targets Report API Error:", error);
        return NextResponse.json({ error: "فشل في توليد تقرير أهداف المناديب" }, { status: 500 });
    }
});
