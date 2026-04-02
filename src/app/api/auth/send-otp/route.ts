import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to user record
        await prisma.user.update({
            where: { id: user.id },
            data: { otp }
        });

        // Email Transporter Config
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
        });

        // Send Email
        await transporter.sendMail({
            from: `"قيد ERP" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'كود التحقق - قيد ERP',
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 40px; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -1px;">قيد ERP</h1>
                    </div>
                    <div style="text-align: center; padding: 20px; background: #f8fafc; border-radius: 12px; margin-bottom: 30px;">
                        <p style="color: #475569; font-size: 16px; margin-bottom: 15px; font-weight: 600;">كود التحقق الخاص بك هو:</p>
                        <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #1e293b; font-family: 'Courier New', Courier, monospace; background: #f1f5f9; padding: 20px 0; border-radius: 8px;">
                            ${otp}
                        </div>
                    </div>
                    <p style="color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                        يرجى استخدام هذا الكود لإتمام عملية المصادقة. <br/>
                        <span style="color: #ef4444; font-weight: 700;">الكود صالح لمدة 10 دقائق فقط.</span>
                    </p>
                    <div style="height: 1px; background: #f1f5f9; margin: 30px 0;"></div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">هذا بريد مرسل آلياً، يرجى عدم الرد.</p>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('OTP error:', error);
        return NextResponse.json({ error: 'فشل إرسال الكود: ' + (error.message || 'خطأ غير معروف') }, { status: 500 });
    }
}, { isPublic: true, limit: 5, windowMs: 60 * 1000 }); // Strict rate limit for OTP
