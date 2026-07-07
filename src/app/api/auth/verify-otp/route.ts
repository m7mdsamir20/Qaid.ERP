import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import bcrypt from 'bcryptjs';

export const POST = withProtection(async (request, session, body) => {
    try {
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json({ error: 'البريد الإلكتروني وكود التحقق مطلوبان' }, { status: 400 });
        }

        // ابحث عن المستخدم عن طريق البريد الإلكتروني
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        // تحقق من صلاحية الكود
        if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: 'انتهت صلاحية كود التحقق، يرجى طلب كود جديد' }, { status: 400 });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
            return NextResponse.json({ error: 'كود التحقق غير صحيح، يرجى المحاولة مرة أخرى' }, { status: 400 });
        }

        // تحديث حالة المستخدم لتأكيد الحساب ومسح الكود المستخدم
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isPhoneVerified: true,
                otp: null,
                otpExpiresAt: null
            }
        });

        return NextResponse.json({ success: true, message: 'تم التحقق من الحساب بنجاح' });
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'حدث خطأ أثناء عملية التحقق من الكود' }, { status: 500 });
    }
}, { isPublic: true, limit: 10, windowMs: 60 * 1000 });
