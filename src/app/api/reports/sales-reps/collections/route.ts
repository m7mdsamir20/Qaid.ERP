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
        const method = searchParams.get('method');
        const status = searchParams.get('status');

        const where: any = { companyId };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) {
                const endDate = new Date(to);
                endDate.setHours(23, 59, 59, 999);
                where.date.lte = endDate;
            }
        }

        if (salesRepId && salesRepId !== 'all') {
            where.salesRepId = salesRepId;
        }

        if (method && method !== 'all') {
            where.method = method;
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        const collections = await prisma.collection.findMany({
            where,
            include: {
                salesRep: { select: { id: true, name: true, code: true } },
                customer: { select: { id: true, name: true } },
                invoice: { select: { id: true, invoiceNumber: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Calculate summary cards
        const totalCollected = collections.reduce((sum, col) => sum + col.amount, 0);
        const cashAmount = collections.filter(c => c.method === 'cash').reduce((sum, c) => sum + c.amount, 0);
        const transferAmount = collections.filter(c => c.method === 'transfer').reduce((sum, c) => sum + c.amount, 0);
        const checkAmount = collections.filter(c => c.method === 'check').reduce((sum, c) => sum + c.amount, 0);
        const checkPendingAmount = collections.filter(c => c.method === 'check' && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

        return NextResponse.json({
            collections,
            summary: {
                total: totalCollected,
                cash: cashAmount,
                transfer: transferAmount,
                check: checkAmount,
                checkPending: checkPendingAmount
            }
        });
    } catch (error) {
        console.error("Sales Rep Collections Report API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير تحصيلات المناديب" }, { status: 500 });
    }
});
