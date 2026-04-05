import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { seedDefaultAccounts } from "@/app/api/accounts/seed/route";
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const { name, username, email, phone, password, companyName, businessType = 'TRADING' } = body;

        if (!name || !username || !email || !phone || !password || !companyName)
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });

        const MODULES_MAP: Record<string, string[]> = {
            TRADING: ['sales', 'purchases', 'inventory', 'installments', 'financials', 'reports'],
            SERVICES: ['sales', 'inventory', 'financials', 'reports'],
        };

        const activeModules = MODULES_MAP[businessType] || MODULES_MAP['TRADING'];

        // تحقق من عدم التكرار
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existing)
            return NextResponse.json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم مسبقاً' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 12);

        // إنشاء البيانات في عملية واحدة لضمان السلامة
        const result = await prisma.$transaction(async (tx) => {
            // إنشاء الشركة
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    businessType,
                    activeModules: JSON.stringify(activeModules),
                    isActive: true,
                    maxUsers: 5
                }
            });

            // إنشاء اشتراك تجريبي 14 يوم
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);
            await (tx as any).subscription.create({
                data: {
                    companyId: company.id,
                    plan: 'trial',
                    startDate: new Date(),
                    endDate,
                    isActive: true,
                    maxUsers: 3,
                    maxBranches: 1,
                    features: JSON.stringify(activeModules),
                    notes: 'فترة تجريبية 14 يوم',
                }
            });

            // ✅ إنشاء الفرع الرئيسي تلقائياً
            const mainBranch = await (tx as any).branch.create({
                data: {
                    name: 'الفرع الرئيسي',
                    code: 'MAIN',
                    isMain: true,
                    isActive: true,
                    companyId: company.id,
                }
            });

            // إنشاء دور المدير الافتراضي
            const adminRole = await tx.role.create({
                data: {
                    name: "مدير النظام",
                    permissions: JSON.stringify(["*"]),
                    companyId: company.id
                }
            });

            // إنشاء المستخدم (مدير - يرى كل الفروع، branchId = null افتراضياً)
            const user = await tx.user.create({
                data: {
                    name,
                    username,
                    email,
                    phone,
                    password: hashed,
                    role: 'admin',
                    roleId: adminRole.id,
                    status: 'active',
                    isPhoneVerified: false,
                    companyId: company.id,
                }
            });

            // ✅ السنة المالية
            const year = new Date().getFullYear();
            await tx.financialYear.create({
                data: {
                    name: `السنة المالية ${year}`,
                    startDate: new Date(`${year}-01-01`),
                    endDate: new Date(`${year}-12-31`),
                    companyId: company.id,
                    isOpen: true,
                },
            });

            return { company, user, mainBranch };
        });

        // ✅ شجرة الحسابات (75 حساب)
        try {
            await seedDefaultAccounts(result.company.id);
        } catch (seedErr) {
            console.error("Seed accounts error (non-fatal):", seedErr);
        }

        return NextResponse.json({ success: true, user: { id: result.user.id } }, { status: 201 });
    } catch (error: any) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء الحساب' }, { status: 500 });
    }
}, { isPublic: true, limit: 20, windowMs: 60 * 60 * 1000 }); // 20 registrations per hour
