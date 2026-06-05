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
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const salesRepId = searchParams.get('salesRepId');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        // 1. Fetch sales reps
        const repsWhere: any = { companyId };
        if (salesRepId && salesRepId !== 'all') {
            repsWhere.id = salesRepId;
        }
        const reps = await prisma.salesRepresentative.findMany({
            where: repsWhere,
            orderBy: { name: 'asc' }
        });

        // 2. Fetch invoices
        const invoiceWhere: any = {
            companyId,
            status: 'approved',
            type: 'sale'
        };
        if (from) {
            invoiceWhere.date = { ...invoiceWhere.date, gte: new Date(from) };
        }
        if (to) {
            invoiceWhere.date = { ...invoiceWhere.date, lte: new Date(to + 'T23:59:59') };
        }
        if (salesRepId && salesRepId !== 'all') {
            invoiceWhere.salesRepresentativeId = salesRepId;
        } else {
            invoiceWhere.salesRepresentativeId = { not: null };
        }

        const invoices = await prisma.invoice.findMany({
            where: invoiceWhere,
            include: {
                customer: { select: { id: true, name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // 3. Aggregate data per representative
        const reportData = reps.map(rep => {
            const repInvoices = invoices.filter(inv => inv.salesRepresentativeId === rep.id);
            const totalSales = repInvoices.reduce((sum, inv) => sum + inv.total, 0);
            const totalCollected = repInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
            const totalRemaining = repInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

            // Calculate commission using both methods so UI can toggle
            const commissionByTotal = totalSales * (rep.commissionRate / 100);
            const commissionByCollected = totalCollected * (rep.commissionRate / 100);

            return {
                id: rep.id,
                name: rep.name,
                code: rep.code,
                commissionRate: rep.commissionRate,
                commissionType: rep.commissionType, // default
                totalSales,
                totalCollected,
                totalRemaining,
                commissionByTotal,
                commissionByCollected,
                invoices: repInvoices.map(inv => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    date: inv.date,
                    total: inv.total,
                    paidAmount: inv.paidAmount,
                    remaining: inv.remaining,
                    customerName: inv.customer?.name || '—',
                    paymentMethod: inv.paymentMethod
                }))
            };
        });

        // Calculate totals across all reps
        const totalSalesAll = reportData.reduce((sum, rep) => sum + rep.totalSales, 0);
        const totalCollectedAll = reportData.reduce((sum, rep) => sum + rep.totalCollected, 0);
        const totalRemainingAll = reportData.reduce((sum, rep) => sum + rep.totalRemaining, 0);

        return NextResponse.json({
            reportData,
            totalSalesAll,
            totalCollectedAll,
            totalRemainingAll
        });

    } catch (error) {
        console.error("Sales Representative Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير المناديب" }, { status: 500 });
    }
});
