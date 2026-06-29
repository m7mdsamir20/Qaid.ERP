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
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const salesRepId = searchParams.get('salesRepId');

        if (!from || !to) {
            return NextResponse.json({ error: "التاريخ من وإلى مطلوبين" }, { status: 400 });
        }

        const startDate = new Date(from);
        const endDate = new Date(to + 'T23:59:59.999');

        if (startDate > endDate) {
            return NextResponse.json({ error: "تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء" }, { status: 400 });
        }

        // 1. Fetch representatives
        const repsWhere: any = { companyId };
        if (salesRepId && salesRepId !== 'all') {
            repsWhere.id = salesRepId;
        }
        const reps = await prisma.salesRepresentative.findMany({
            where: repsWhere,
            orderBy: { name: 'asc' }
        });

        // 2. Fetch Invoices (Sales) for the period
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
                id: true,
                total: true,
                paidAmount: true,
                remaining: true,
                salesRepresentativeId: true
            }
        });

        // 3. Fetch Collections for the period
        const collectionWhere: any = {
            companyId,
            date: {
                gte: startDate,
                lte: endDate
            }
        };
        if (salesRepId && salesRepId !== 'all') {
            collectionWhere.salesRepId = salesRepId;
        }

        const collections = await prisma.collection.findMany({
            where: collectionWhere,
            select: {
                id: true,
                amount: true,
                salesRepId: true
            }
        });

        // 4. Calculate Targets for the period
        const monthsList: { year: number, month: number }[] = [];
        let curr = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        while (curr <= endMonth) {
            monthsList.push({ year: curr.getFullYear(), month: curr.getMonth() + 1 });
            curr.setMonth(curr.getMonth() + 1);
        }

        const targetWhere: any = {
            companyId,
            OR: monthsList.map(m => ({ year: m.year, month: m.month }))
        };
        if (salesRepId && salesRepId !== 'all') {
            targetWhere.salesRepId = salesRepId;
        }

        const targets = await prisma.salesTarget.findMany({
            where: targetWhere,
            select: {
                targetAmount: true,
                salesRepId: true
            }
        });

        // 5. Aggregate data per rep
        const reportData = reps.map(rep => {
            const repInvoices = invoices.filter(inv => inv.salesRepresentativeId === rep.id);
            const repCollections = collections.filter(col => col.salesRepId === rep.id);
            const repTargets = targets.filter(t => t.salesRepId === rep.id);

            const totalSales = repInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const totalCollected = repCollections.reduce((sum, col) => sum + col.amount, 0);
            const totalRemaining = repInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
            const targetAmount = repTargets.reduce((sum, t) => sum + t.targetAmount, 0);
            
            const achievementPercent = targetAmount > 0 ? (totalSales / targetAmount) * 100 : 0;

            return {
                id: rep.id,
                name: rep.name,
                code: rep.code,
                targetAmount,
                totalSales,
                totalCollected,
                totalRemaining,
                achievementPercent
            };
        });

        const totalSalesAll = reportData.reduce((sum, rep) => sum + rep.totalSales, 0);
        const totalCollectedAll = reportData.reduce((sum, rep) => sum + rep.totalCollected, 0);
        const totalRemainingAll = reportData.reduce((sum, rep) => sum + rep.totalRemaining, 0);
        const totalTargetAll = reportData.reduce((sum, rep) => sum + rep.targetAmount, 0);

        return NextResponse.json({
            reportData,
            totals: {
                sales: totalSalesAll,
                collected: totalCollectedAll,
                remaining: totalRemainingAll,
                target: totalTargetAll
            }
        });
    } catch (error) {
        console.error("Sales Rep Performance Report API Error:", error);
        return NextResponse.json({ error: "فشل في توليد تقرير الأداء" }, { status: 500 });
    }
});
