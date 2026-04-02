import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

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

        // تحقق مما إذا كان الكود المدخل يطابق الكود المحفوظ في قاعدة البيانات
        if (!user.otp || user.otp !== otp) {
            return NextResponse.json({ error: 'كود التحقق غير صحيح، يرجى المحاولة مرة أخرى' }, { status: 400 });
        }

        // تحديث حالة المستخدم لتأكيد الحساب ومسح الكود المستخدم
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                isPhoneVerified: true, // نستخدم هذا الحقل لتأكيد الحساب (إيميل/هاتف)
                otp: null              // مسح الكود لمنع استخدامه مرة أخرى
            }
        });

        return NextResponse.json({ success: true, message: 'تم التحقق من الحساب بنجاح' });
    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'حدث خطأ أثناء عملية التحقق من الكود' }, { status: 500 });
    }
}, { isPublic: true, limit: 10, windowMs: 60 * 1000 });
