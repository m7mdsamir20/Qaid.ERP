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

        const updateData: any = {};
        if (body.code !== undefined) updateData.code = body.code;
        if (body.type !== undefined) updateData.type = body.type;
        if (body.value !== undefined) updateData.value = parseFloat(body.value);
        if (body.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = body.maxDiscountAmount ? parseFloat(body.maxDiscountAmount) : null;
        if (body.minOrderValue !== undefined) updateData.minOrderValue = body.minOrderValue ? parseFloat(body.minOrderValue) : null;
        if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
        if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
        if (body.usageLimit !== undefined) updateData.usageLimit = body.usageLimit ? parseInt(body.usageLimit) : null;
        if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

        const coupon = await prisma.coupon.updateMany({
            where: { id, companyId },
            data: updateData
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
