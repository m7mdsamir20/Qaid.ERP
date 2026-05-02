import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { navSections } from '@/constants/navigation';
import bcrypt from 'bcryptjs';
import { seedDefaultAccounts } from '@/app/api/accounts/seed/route';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const { name, username, email, phone, password, companyName, businessType = 'TRADING', countryCode, currency, timezone } = body;

        if (!name || !username || !email || !phone || !password || !companyName)
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });

        const MODULES_MAP: Record<string, string[]> = {
            TRADING: ['sales', 'purchases', 'inventory', 'installments', 'financials', 'reports'],
            SERVICES: ['sales', 'installments', 'inventory', 'accounting', 'treasury', 'reports'],
            RESTAURANTS: ['pos', 'tables', 'kitchen', 'sales', 'inventory', 'reports'], // Trial features (Delivery, Barcode, Purchases are locked)
        };

        const activeModules = MODULES_MAP[businessType] || MODULES_MAP['TRADING'];

        // ✅ تحديد العملة والمنطقة الزمنية تلقائياً من كود الدولة
        const companyCurrency = currency || 'EGP';
        const companyTimezone = timezone || 'Africa/Cairo';

        // تحقق من عدم التكرار
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });
        if (existing)
            return NextResponse.json({ error: 'البريد الإلكتروني أو اسم المستخدم مستخدم مسبقاً' }, { status: 400 });

        const hashed = await bcrypt.hash(password, 12);

        // إنشاء البيانات في عملية واحدة لضمان السلامة
        const result = await prisma.$transaction(async (tx) => {
            // إنشاء الشركة مع العملة والمنطقة الزمنية المحددة من الدولة
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    businessType,
                    activeModules: JSON.stringify(activeModules),
                    currency: companyCurrency,
                    countryCode: countryCode || 'EG',
                    timezone: companyTimezone,
                    isActive: true,
                    maxUsers: 5
                }
            });

            // ✅ بناء موديولات الاشتراك التفصيلية بدون صفحة تسوية الديون
            const featuresObject: Record<string, string[]> = {};
            activeModules.forEach((key: string) => {
                const section = navSections.find((s: any) => s.featureKey === key);
                if (section && section.links) {
                    featuresObject[key] = section.links.map((l: any) => l.id).filter((id: string) => id !== '/settlements');
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
                    features: JSON.stringify(featuresObject),
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

            // ✅ مخزن افتراضي للفرع الرئيسي
            await tx.warehouse.create({
                data: {
                    name: 'مخزن الفرع الرئيسي',
                    companyId: company.id,
                    branchId: mainBranch.id,
                }
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
