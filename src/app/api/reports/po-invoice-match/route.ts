import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const branchId = searchParams.get('branchId');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        const where: any = { companyId };
        if (from) where.date = { ...where.date, gte: new Date(from) };
        if (to)   where.date = { ...where.date, lte: new Date(to + 'T23:59:59') };

        if (branchId && branchId !== 'all') {
            where.branchId = branchId;
        } else {
            const bf = getBranchFilter(session);
            if (bf.branchId) where.branchId = bf.branchId;
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
                invoices: { select: { id: true, invoiceNumber: true, total: true, date: true } }
            },
            orderBy: { date: 'desc' },
        });

        // Map data to reconciliation details
        const matches = purchaseOrders.map(po => {
            const invoicedTotal = po.invoices.reduce((s, inv) => s + inv.total, 0);
            const variance = po.total - invoicedTotal;
            return {
                id: po.id,
                orderNumber: po.orderNumber,
                date: po.date,
                supplierName: po.supplier.name,
                poTotal: po.total,
                invoicedTotal,
                variance,
                invoicesCount: po.invoices.length,
                invoicesList: po.invoices.map(inv => ({
                    invoiceNumber: inv.invoiceNumber,
                    total: inv.total
                }))
            };
        });

        const totalPoAmount = matches.reduce((s, m) => s + m.poTotal, 0);
        const totalInvoicedAmount = matches.reduce((s, m) => s + m.invoicedTotal, 0);
        const totalVariance = totalPoAmount - totalInvoicedAmount;

        return NextResponse.json({
            matches,
            totalPoAmount,
            totalInvoicedAmount,
            totalVariance
        });
    } catch (error) {
        console.error("PO Invoice Reconciliation API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير المطابقة" }, { status: 500 });
    }
});
