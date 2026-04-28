import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const id = params.id;
        const body = await request.json();

        // check code unique if changed
        if (body.code) {
            const exists = await prisma.coupon.findFirst({
                where: { companyId, code: body.code, id: { not: id } }
            });
            if (exists) {
                return NextResponse.json({ error: 'كود الخصم مستخدم مسبقاً' }, { status: 400 });
            }
        }

        const coupon = await prisma.coupon.updateMany({
            where: { id, companyId },
            data: body
        });

        return NextResponse.json(coupon);
    } catch (error: any) {
        console.error("Update Coupon Error:", error);
        return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const id = params.id;

        await prisma.coupon.deleteMany({
            where: { id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete Coupon Error:", error);
        return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }
});
