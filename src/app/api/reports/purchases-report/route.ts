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

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        const branchId = searchParams.get('branchId');

        const where: {
            companyId: string;
            type: 'purchase';
            date?: { gte?: Date; lte?: Date };
            branchId?: string;
        } = { companyId, type: 'purchase' };
        if (from)     where.date = { ...where.date, gte: new Date(from) };
        if (to)       where.date = { ...where.date, lte: new Date(to + 'T23:59:59') };
        if (branchId && branchId !== 'all') where.branchId = branchId;

        const invoices = await prisma.invoice.findMany({
            where,
            include: { 
                supplier: { select: { name: true } }, 
                lines: { include: { item: { select: { name: true } } } } 
            },
            orderBy: { date: 'desc' },
        });

        const totalPurchases = invoices.reduce((s, i) => s + i.total, 0);
        const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0);
        const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
        const totalRemaining = invoices.reduce((s, i) => s + i.remaining, 0);

        return NextResponse.json({ 
            invoices, 
            totalPurchases, 
            totalDiscount, 
            totalPaid, 
            totalRemaining 
        });
    } catch (error) {
        console.error("Purchases Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب التقرير" }, { status: 500 });
    }
});

