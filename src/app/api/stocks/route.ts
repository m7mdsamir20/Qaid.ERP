import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const stocks = await prisma.stock.findMany({
            where: { item: { companyId } },
        });
        return NextResponse.json(stocks);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});
