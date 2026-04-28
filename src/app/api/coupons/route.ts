import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const coupons = await prisma.coupon.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(coupons);
    } catch (error: any) {
        console.error("Fetch Coupons Error:", error);
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const body = await request.json();

        // check code unique
        const exists = await prisma.coupon.findFirst({
            where: { companyId, code: body.code }
        });

        if (exists) {
            return NextResponse.json({ error: 'كود الخصم مستخدم مسبقاً' }, { status: 400 });
        }

        const coupon = await prisma.coupon.create({
            data: {
                ...body,
                companyId
            }
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        console.error("Create Coupon Error:", error);
        return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }
});
