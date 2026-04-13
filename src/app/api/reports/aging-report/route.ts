import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const branchId = request.nextUrl.searchParams.get('branchId');
        const branchFilter = branchId && branchId !== 'all' ? { branchId } : {};

        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                type: 'sale',
                remaining: { gt: 0 },
                ...branchFilter
            },
            include: { customer: { select: { id: true, name: true, phone: true } } },
            orderBy: { date: 'asc' },
        });

        const today = new Date();
        type AgingBucketKey = '0-30' | '31-60' | '61-90' | '91+';
        const buckets: Record<AgingBucketKey, { total: number; count: number }> = {
            '0-30': { total: 0, count: 0 },
            '31-60': { total: 0, count: 0 },
            '61-90': { total: 0, count: 0 },
            '91+': { total: 0, count: 0 },
        };

        const invoicesWithAge = unpaidInvoices.map(inv => {
            const dateToUse = inv.dueDate || inv.date;
            const ageDays = Math.floor((today.getTime() - new Date(dateToUse).getTime()) / (1000 * 3600 * 24));
            let category: AgingBucketKey;
            if (ageDays <= 30) {
                category = '0-30'; buckets['0-30'].total += inv.remaining; buckets['0-30'].count++;
            } else if (ageDays <= 60) {
                category = '31-60'; buckets['31-60'].total += inv.remaining; buckets['31-60'].count++;
            } else if (ageDays <= 90) {
                category = '61-90'; buckets['61-90'].total += inv.remaining; buckets['61-90'].count++;
            } else {
                category = '91+'; buckets['91+'].total += inv.remaining; buckets['91+'].count++;
            }
            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                date: inv.date,
                customer: inv.customer?.name || '—',
                phone: inv.customer?.phone || '',
                total: inv.total,
                remaining: inv.remaining,
                ageDays,
                category
            };
        });

        const totalAging = unpaidInvoices.reduce((s, i) => s + i.remaining, 0);

        return NextResponse.json({
            invoices: invoicesWithAge,
            buckets,
            totalAging,
        });
    } catch (error) {
        console.error("Aging Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير أعمار الديون" }, { status: 500 });
    }
});

