import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const subtotalStr = searchParams.get('subtotal');

        if (!code) {
            return NextResponse.json({ error: 'كود الخصم مطلوب' }, { status: 400 });
        }

        const subtotal = parseFloat(subtotalStr || '0');

        const coupon = await prisma.coupon.findFirst({
            where: {
                companyId,
                code: { equals: code, mode: 'insensitive' },
            }
        });

        if (!coupon) {
            return NextResponse.json({ error: 'كود الخصم غير صحيح' }, { status: 404 });
        }

        if (!coupon.isActive) {
            return NextResponse.json({ error: 'كود الخصم غير مفعل' }, { status: 400 });
        }

        const now = new Date();
        if (coupon.startDate && now < coupon.startDate) {
            return NextResponse.json({ error: 'كود الخصم لم يبدأ بعد' }, { status: 400 });
        }
        if (coupon.endDate && now > coupon.endDate) {
            return NextResponse.json({ error: 'كود الخصم منتهي الصلاحية' }, { status: 400 });
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return NextResponse.json({ error: 'تم تجاوز الحد الأقصى لاستخدام الكوبون' }, { status: 400 });
        }

        if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
            return NextResponse.json({ error: `الحد الأدنى لاستخدام الكوبون هو ${coupon.minOrderValue}` }, { status: 400 });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.type === 'fixed') {
            discount = coupon.value;
        } else if (coupon.type === 'percentage') {
            discount = (subtotal * coupon.value) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        }

        // Discount cannot exceed subtotal
        if (discount > subtotal) {
            discount = subtotal;
        }

        return NextResponse.json({
            valid: true,
            discount: Math.round(discount * 100) / 100,
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value
            }
        });

    } catch (error: any) {
        console.error("Coupon Validate Error:", error);
        return NextResponse.json({ error: 'حدث خطأ أثناء التحقق من الكوبون' }, { status: 500 });
    }
});
