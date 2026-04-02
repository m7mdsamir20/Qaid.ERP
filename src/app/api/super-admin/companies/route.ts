import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companies = await (prisma.company as any).findMany({
            include: {
                subscription: true,
                users: {
                    where:  { role: 'admin' },
                    select: { id: true, name: true, username: true, email: true, phone: true },
                    take: 1
                },
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(companies);
    } catch (error) {
        console.error('Fetch companies error:', error);
        return NextResponse.json([], { status: 500 });
    }
}, { requireSuperAdmin: true });

export const POST = withProtection(async (request, session, body) => {
    try {
        const {
            // بيانات الشركة
            name, nameEn, phone, email, address,
            // بيانات المدير
            adminName, adminUsername, adminEmail, adminPhone, adminPassword,
            // بيانات الاشتراك
            plan, startDate, endDate, maxUsers, maxBranches, features,
        } = body;

        if (!name || !adminUsername || !adminPassword || !startDate || !endDate)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        // تشفير الباسورد
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const result = await prisma.$transaction(async (tx) => {
            // ① إنشاء الشركة
            const company = await tx.company.create({
                data: {
                    name,
                    nameEn:   nameEn   || null,
                    phone:    phone    || null,
                    email:    email    || null,
                    address:  address  || null,
                    isActive: true,
                    maxUsers: parseInt(maxUsers) || 3,
                },
            });

            // ② إنشاء مستخدم أدمن للشركة
            await tx.user.create({
                data: {
                    name:      adminName     || name,
                    username:  adminUsername,
                    email:     adminEmail    || `${adminUsername}@${name}.com`,
                    phone:     adminPhone    || null,
                    password:  hashedPassword,
                    role:      'admin',
                    status:    'active',
                    companyId: company.id,
                    isPhoneVerified: true,
                },
            });

            // ③ إنشاء الاشتراك
            const featuresJson = typeof features === 'string'
                ? features
                : JSON.stringify(features || {});

            await (tx as any).subscription.create({
                data: {
                    companyId:  company.id,
                    plan:       plan       || 'basic',
                    startDate:  new Date(startDate),
                    endDate:    new Date(endDate),
                    isActive:   true,
                    maxUsers:   parseInt(maxUsers)    || 3,
                    maxBranches: parseInt(maxBranches) || 1,
                    features:   featuresJson,
                },
            });

            // ③-ب إنشاء الفرع الرئيسي تلقائياً
            await (tx as any).branch.create({
                data: {
                    name:      'الفرع الرئيسي',
                    code:      'MAIN',
                    isMain:    true,
                    isActive:  true,
                    companyId: company.id,
                },
            });

            // ④ إنشاء سنة مالية افتراضية
            const now = new Date();
            await tx.financialYear.create({
                data: {
                    name:      `السنة المالية ${now.getFullYear()}`,
                    startDate: new Date(`${now.getFullYear()}-01-01`),
                    endDate:   new Date(`${now.getFullYear()}-12-31`),
                    isOpen:    true,
                    companyId: company.id,
                },
            });

            return company;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        console.error('Create company error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء الحساب', details: error.message }, { status: 500 });
    }
}, { requireSuperAdmin: true });
