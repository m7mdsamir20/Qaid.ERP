import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const monthFilter = searchParams.get('month'); // 'current', 'next'
        const now = new Date();
        
        let dateWhere: any = {};
        
        if (monthFilter === 'current') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            dateWhere = { dueDate: { gte: start, lte: end } };
        } else if (monthFilter === 'next') {
            const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
            dateWhere = { dueDate: { gte: start, lte: end } };
        }

        const installments = await prisma.installment.findMany({
            where: {
                companyId,
                status: { in: ['pending', 'partial', 'overdue'] },
                ...dateWhere,
            },
            include: {
                plan: {
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        const results = installments.map(i => {
            const due = new Date(i.dueDate);
            const isOverdue = due < now;
            return {
                ...i,
                customer: i.plan.customer,
                isOverdue,
                daysOverdue: isOverdue ? Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0,
            };
        });

        return NextResponse.json(results);
    } catch (error: any) {
        console.error("Due Installments API Error:", error);
        return NextResponse.json([], { status: 500 });
    }
});
