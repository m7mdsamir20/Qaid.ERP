import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const plan = await prisma.installmentPlan.findFirst({
            where: { id, companyId },
            include: {
                customer: { select: { id: true, name: true, phone: true } },
                installments: { orderBy: { installmentNo: 'asc' } },
            },
        });

        if (!plan)
            return NextResponse.json(null, { status: 404 });

        return NextResponse.json(plan);
    } catch {
        return NextResponse.json(null, { status: 500 });
    }
});
