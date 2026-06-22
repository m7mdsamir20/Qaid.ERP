import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const salesReps = await prisma.salesRepresentative.findMany({
            where: { companyId },
            include: {
                employee: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, username: true } },
                _count: { select: { invoices: true, customers: true } }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Also fetch active users and active employees to populate dropdowns in the UI
        const url = new URL(request.url);
        if (url.searchParams.get('includeLookups') === 'true') {
            const [users, employees] = await Promise.all([
                prisma.user.findMany({
                    where: { companyId, status: 'active' },
                    select: { id: true, name: true, username: true }
                }),
                prisma.employee.findMany({
                    where: { companyId, status: 'active' },
                    select: { id: true, name: true, code: true }
                })
            ]);
            return NextResponse.json({ salesReps, users, employees });
        }

        return NextResponse.json(salesReps);
    } catch (error) {
        console.error('Error fetching sales reps:', error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { name, code, phone, email, commissionRate, commissionType, userId, employeeId, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: "اسم المندوب مطلوب" }, { status: 400 });
        }

        // Check if code is already taken for this company
        if (code) {
            const exists = await prisma.salesRepresentative.findFirst({
                where: { code, companyId }
            });
            if (exists) {
                return NextResponse.json({ error: "رمز المندوب مستخدم بالفعل" }, { status: 400 });
            }
        }

        const salesRep = await prisma.salesRepresentative.create({
            data: {
                name,
                code: code || null,
                phone: phone || null,
                email: email || null,
                commissionRate: Number(commissionRate) || 0,
                commissionType: commissionType || "invoice_total",
                userId: userId || null,
                employeeId: employeeId || null,
                isActive: isActive !== undefined ? isActive : true,
                companyId
            }
        });

        const ctx = extractLogContext(session, request);
        await logActivity({
            ...ctx,
            action: 'create',
            module: 'sales_reps',
            entityType: 'SalesRepresentative',
            entityId: salesRep.id,
            entityRef: salesRep.name,
            description: `أضاف مندوب مبيعات جديد: ${salesRep.name}`,
            newData: { name, code, phone, email, commissionRate, commissionType },
        });

        return NextResponse.json(salesRep, { status: 201 });
    } catch (error) {
        console.error('Error creating sales rep:', error);
        return NextResponse.json({ error: "فشل في إنشاء مندوب المبيعات" }, { status: 500 });
    }
});
