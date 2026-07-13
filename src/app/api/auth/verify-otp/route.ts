import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { rateLimit } from '@/lib/rateLimit';
import bcrypt from 'bcryptjs';

export const POST = withProtection(async (request, session, body) => {
    try {
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json({ error: 'البريد الإلكتروني وكود التحقق مطلوبان' }, { status: 400 });
        }

        // Rate limit per email: 5 attempts per 15 minutes
        const { allowed: emailAllowed } = rateLimit(`otp-verify:${email}`, {
            max: 5, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000
        });
        if (!emailAllowed) {
            return NextResponse.json({ error: 'تجاوزت عدد المحاولات. يرجى طلب رمز جديد بعد 15 دقيقة' }, { status: 429 });
        }

        // Use generic error to avoid revealing whether email exists (I1 fix)
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
        }

        const isOtpValid = await bcrypt.compare(otp, user.otp);
        if (!isOtpValid) {
            return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
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
