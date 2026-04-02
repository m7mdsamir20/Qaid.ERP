import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        
        const type = searchParams.get('type') || 'collection';
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const customerId = searchParams.get('customerId');

        const now = new Date();

        // ── Collection Report ──
        if (type === 'collection') {
            const where: any = {
                companyId,
                status: 'paid'
            };

            if (from || to) {
                where.paidAt = {};
                if (from) where.paidAt.gte = new Date(from);
                if (to) {
                    const endDate = new Date(to);
                    endDate.setHours(23, 59, 59, 999);
                    where.paidAt.lte = endDate;
                }
            }

            const installments = await prisma.installment.findMany({
                where,
                include: {
                    plan: {
                        include: {
                            customer: { select: { id: true, name: true, phone: true } },
                        },
                    },
                },
                orderBy: { paidAt: 'desc' },
            });

            const total = installments.reduce((s, i) => s + (i.paidAmount || 0), 0);
            return NextResponse.json({ installments, total });
        }

        // ── Overdue/Due Report ──
        if (type === 'overdue') {
            const monthParam = searchParams.get('month'); // 'current', 'next'
            
            const where: any = {
                companyId,
                status: { in: ['pending', 'partial', 'overdue'] },
            };

            if (monthParam === 'current') {
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                where.dueDate = { gte: start, lte: end };
            } else if (monthParam === 'next') {
                const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
                where.dueDate = { gte: start, lte: end };
            } else {
                where.dueDate = { lt: now };
            }

            if (customerId) {
                where.plan = { customerId };
            }

            const installments = await prisma.installment.findMany({
                where,
                include: {
                    plan: {
                        include: {
                            customer: { select: { id: true, name: true, phone: true } },
                        },
                    },
                },
                orderBy: { dueDate: 'asc' },
            });

            const withDays = installments.map(i => {
                const due = new Date(i.dueDate);
                const isOverdue = due < now;
                return {
                    ...i,
                    daysOverdue: isOverdue ? Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0,
                    isOverdue,
                };
            });

            const total = withDays.reduce((s, i) => s + (i.remaining || 0), 0);
            return NextResponse.json({ installments: withDays, total });
        }

        // ── Customer Statement ──
        if (type === 'customer') {
            if (!customerId) {
                return NextResponse.json({ plans: [], summary: {} });
            }

            const plans = await prisma.installmentPlan.findMany({
                where: { companyId, customerId },
                include: {
                    customer: { select: { id: true, name: true, phone: true } },
                    installments: { orderBy: { installmentNo: 'asc' } },
                },
                orderBy: { createdAt: 'desc' },
            });

            const totalPlans = plans.length;
            const totalAmount = plans.reduce((s, p) => s + p.grandTotal, 0);
            const totalPaid = plans.reduce((s, p) =>
                s + p.installments.reduce((ss, i) => ss + (i.paidAmount || 0), 0), 0);
            const totalRemaining = plans.reduce((s, p) =>
                s + p.installments.filter(i => i.status !== 'paid')
                    .reduce((ss, i) => ss + (i.remaining || 0), 0), 0);
            const totalOverdue = plans.reduce((s, p) =>
                s + p.installments.filter(i =>
                    i.status !== 'paid' && new Date(i.dueDate) < now)
                    .reduce((ss, i) => ss + (i.remaining || 0), 0), 0);

            return NextResponse.json({ 
                plans, 
                summary: { totalPlans, totalAmount, totalPaid, totalRemaining, totalOverdue } 
            });
        }

        return NextResponse.json({ error: 'invalid report type' }, { status: 400 });
    } catch (error: any) {
        console.error("Installment Reports API Error:", error);
        return NextResponse.json({ error: 'فشل في توليد التقرير' }, { status: 500 });
    }
});
