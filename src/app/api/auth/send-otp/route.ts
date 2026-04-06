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
        const origin = request.nextUrl.origin;
        const logoUrl = `${origin}/logo-system.png`;

        await transporter.sendMail({
            from: `"قيد ERP" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'كود التحقق - قيد ERP',
            html: `
                <!DOCTYPE html>
                <html lang="ar" dir="rtl">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { margin: 0; padding: 0; background-color: #f7fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; }
                        .header { background: #0f172a; padding: 40px 20px; text-align: center; }
                        .logo { max-height: 50px; display: block; margin: 0 auto; filter: brightness(0) invert(1); }
                        .content { padding: 40px; text-align: center; }
                        .title { color: #1e293b; font-size: 24px; font-weight: 800; margin-bottom: 16px; margin-top: 0; }
                        .description { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
                        .otp-box { background: #f8fafc; border: 2px dashed #0f172a; border-radius: 16px; padding: 24px 0; margin-bottom: 32px; position: relative; }
                        .otp-code { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #0f172a; font-family: 'Courier New', Courier, monospace; display: block; margin: 0; }
                        .otp-label { color: #94a3b8; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; display: block; }
                        .warning { color: #ef4444; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
                        .footer { background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; }
                        .footer-text { color: #94a3b8; font-size: 12px; margin: 0; }
                        .btn { background: #0f172a; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; display: inline-block; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <img src="${logoUrl}" alt="قيد ERP" class="logo">
                        </div>
                        <div class="content">
                            <h1 class="title">مرحباً بك في قيد ERP</h1>
                            <p class="description">لقد طلبت كود التحقق لتسجيل الدخول أو إثبات الهوية. يرجى استخدام الكود التالي لإتمام العملية:</p>
                            
                            <div class="otp-box">
                                <span class="otp-label">كود التحقق الخاص بك هو:</span>
                                <span class="otp-code">${otp}</span>
                            </div>

                            <p class="warning">صلاحية هذا الكود هي 10 دقائق فقط. لا تقم بمشاركة هذا الكود مع أي شخص.</p>
                            
                            <p style="color: #475569; font-size: 14px; margin-bottom: 0;">إذا لم تطلب هذا الكود، فيمكنك تجاهل هذا البريد بأمان.</p>
                        </div>
                        <div class="footer">
                            <p class="footer-text">© ${new Date().getFullYear()} قيد ERP - نظام إدارة الموارد المتكاملة</p>
                            <p class="footer-text" style="margin-top: 8px;">مقر العمل - القاهرة، جمهورية مصر العربية</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('OTP error:', error);
        return NextResponse.json({ error: 'فشل إرسال الكود: ' + (error.message || 'خطأ غير معروف') }, { status: 500 });
    }
}, { isPublic: true, limit: 5, windowMs: 60 * 1000 }); // Strict rate limit for OTP
