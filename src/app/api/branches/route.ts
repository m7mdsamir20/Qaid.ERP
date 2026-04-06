import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET - جلب كل فروع الشركة
export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const branches = await (prisma as any).branch.findMany({
        where: { companyId },
        orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
        include: {
            _count: {
                select: {
                    warehouses: true,
                    treasuries: true,
                    employees: true,
                }
            }
        }
    });
    return NextResponse.json(branches);
}, { cache: 30 });

// POST - إضافة فرع جديد
export const POST = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const role = (session.user as any).role;

    if (role !== 'admin') {
        return NextResponse.json({ error: 'صلاحية المدير مطلوبة' }, { status: 403 });
    }

    if (!body?.name?.trim()) {
        return NextResponse.json({ error: 'اسم الفرع مطلوب' }, { status: 400 });
    }

    // التحقق من حد الفروع في الاشتراك
    const subscription = await (prisma as any).subscription.findUnique({
        where: { companyId }
    });
    const maxBranches = subscription?.maxBranches ?? 1;
    const currentCount = await (prisma as any).branch.count({ where: { companyId } });

    if (currentCount >= maxBranches) {
        return NextResponse.json({
            error: `وصلت للحد الأقصى للفروع (${maxBranches}). يرجى ترقية الاشتراك لإضافة المزيد.`
        }, { status: 403 });
    }

    const branch = await (prisma as any).branch.create({
        data: {
            name: body.name.trim(),
            code: body.code?.trim() || null,
            address: body.address?.trim() || null,
            phone: body.phone?.trim() || null,
            isMain: false,
            isActive: true,
            companyId,
        }
    });

    return NextResponse.json(branch, { status: 201 });
}, { requireAdmin: true });

// PUT - تعديل فرع
export const PUT = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;

    if (!body?.id) {
        return NextResponse.json({ error: 'معرف الفرع مطلوب' }, { status: 400 });
    }

    // التحقق أن الفرع ينتمي لهذه الشركة
    const existing = await (prisma as any).branch.findFirst({
        where: { id: body.id, companyId }
    });
    if (!existing) {
        return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    }

    const branch = await (prisma as any).branch.update({
        where: { id: body.id },
        data: {
            name: body.name?.trim() || existing.name,
            code: body.code?.trim() || existing.code,
            address: body.address?.trim() || null,
            phone: body.phone?.trim() || null,
            isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        }
    });

    return NextResponse.json(branch);
}, { requireAdmin: true });

// DELETE - حذف فرع (مع التحقق أنه مش الفرع الرئيسي)
export const DELETE = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'معرف الفرع مطلوب' }, { status: 400 });

    const branch = await (prisma as any).branch.findFirst({ where: { id, companyId } });
    if (!branch) return NextResponse.json({ error: 'الفرع غير موجود' }, { status: 404 });
    if (branch.isMain) return NextResponse.json({ error: 'لا يمكن حذف الفرع الرئيسي' }, { status: 400 });

    // التحقق من وجود بيانات مرتبطة
    const [warehouses, employees, invoices] = await Promise.all([
        (prisma as any).warehouse.count({ where: { branchId: id } }),
        (prisma as any).employee.count({ where: { branchId: id } }),
        (prisma as any).invoice.count({ where: { branchId: id } }),
    ]);

    if (warehouses > 0 || employees > 0 || invoices > 0) {
        return NextResponse.json({
            error: 'لا يمكن حذف الفرع لوجود بيانات مرتبطة به (مخازن، موظفين، أو فواتير)'
        }, { status: 400 });
    }

    await (prisma as any).branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
}, { requireAdmin: true });
