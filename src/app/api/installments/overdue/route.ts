import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const today = new Date();

        // Auto-update pending/partial installments to overdue if past due date
        await prisma.installment.updateMany({
            where: {
                companyId,
                status: { in: ['pending', 'partial'] },
                dueDate: { lt: today },
            },
            data: { status: 'overdue' },
        });

        const overdue = await prisma.installment.findMany({
            where: { companyId, status: 'overdue' },
            include: {
                plan: {
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        return NextResponse.json(overdue.map((i: any) => ({
            ...i,
            daysOverdue: Math.floor((today.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            customerName: i.plan.customer.name,
            customerPhone: i.plan.customer.phone,
            planNumber: i.plan.planNumber,
        })));
    } catch (error: any) {
        console.error("Overdue Installments API Error:", error);
        return NextResponse.json([], { status: 500 });
    }
});
