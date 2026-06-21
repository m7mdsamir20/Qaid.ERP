import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 100);
    const skip = (page - 1) * pageSize;

    const where: any = { companyId };
    if (search) {
        where.customer = {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ],
        };
    }

    const [records, total] = await Promise.all([
        prisma.customerPoints.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { balance: 'desc' },
            include: {
                customer: { select: { name: true, phone: true } },
            },
        }),
        prisma.customerPoints.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, pageSize });
});
